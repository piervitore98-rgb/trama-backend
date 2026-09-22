import React, { useState, useMemo } from "react";
import { ChevronLeft, Lock, X, GitFork, Zap, ShieldCheck, ListChecks, Clock, Lightbulb } from "lucide-react";
import {
  NAVY, GOOD, MID, LOW, ESSERE_C, FARE_C, AVERE_C,
  MAIN_TRAITS, SUPPORT_TRAITS, TRAIT_BY_KEY, GROUP_META,
  ROLES, ROLE_FIT_AXES, ROLE_TAGLINES,
  average, toDisplay, bandVerdict, computeRoleFit,
} from "./traits.js";
import agaLogo from "./assets/aga-logo.png";

/* ---------------------------------------------------------------------- */
/* Palette — colori del marchio Arti Grafiche Alberobello                  */
/* navy #061931 · verde #80CC28                                            */
/* ---------------------------------------------------------------------- */
const GREEN = "#80CC28";
const GREEN_DEEP = "#4F8A0B";

const PAPER = "#EDEAE1";
const FIELD = "#F5F3EC";
const INK = NAVY;
const INK_SOFT = "#4A5563";
const LINE = "#CFC9B8";
const ACCENT = GREEN_DEEP;
const ACCENT_FILL = GREEN;
const CANVAS = "#DDD8C9";

const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', monospace";

/* ---------------------------------------------------------------------- */
/* BANCO DOMANDE                                                           */
/* L = affermazione (scala d'accordo) · B = comportamento realmente        */
/* accaduto (Sì/No) · G = logica con risposta oggettiva · C = scelta A/B   */
/* p: +1 = alza il tratto, −1 = lo abbassa                                 */
/* ---------------------------------------------------------------------- */
const L = (k, t, p = 1) => ({ kind: "likert", axisKey: k, text: t, polarity: p });
const B = (k, t, p = 1) => ({ kind: "behav", axisKey: k, text: t, polarity: p });
const G = (k, t, options, correct) => ({ kind: "logic", axisKey: k, text: t, options, correct });
const C = (t, aLabel, aTrait, bLabel, bTrait) => ({ kind: "choice", text: t, a: { label: aLabel, trait: aTrait }, b: { label: bLabel, trait: bTrait } });

const QUESTION_BANK = [
  /* ---- Organizzazione ---- */
  L("organizzazione", "Riesco a pianificare la mia giornata senza andare sempre in affanno."),
  L("organizzazione", "Quando ho più lavori aperti insieme, so dare le priorità giuste."),
  L("organizzazione", "Spesso mi accorgo di una scadenza solo quando è ormai vicina.", -1),
  B("organizzazione", "Hai in casa una scorta di qualcosa che finisce spesso (caffè, carta, lampadine), comprata prima che finisse?"),
  B("organizzazione", "Riusciresti a ritrovare in meno di un minuto un documento che hai usato tre mesi fa?"),
  B("organizzazione", "Quando parti per un viaggio, la valigia è pronta la sera prima?"),
  B("organizzazione", "Nell'ultimo mese ti è capitato di uscire di casa e accorgerti di aver dimenticato qualcosa che ti serviva?", -1),
  B("organizzazione", "Ti è capitato di ricomprare una cosa che avevi già, perché non la trovavi o non ricordavi di averla?", -1),
  B("organizzazione", "Nell'ultimo anno hai pagato una mora, una multa o un sovrapprezzo per una scadenza saltata?", -1),

  /* ---- Auto-Motivazione ---- */
  L("auto_motivazione", "Credo che le mie capacità potranno portarmi lontano in questo mestiere."),
  L("auto_motivazione", "Ho bisogno che qualcuno mi spinga per restare motivato/a a lungo.", -1),
  B("auto_motivazione", "Hai un obiettivo per i prossimi tre anni scritto da qualche parte?"),
  B("auto_motivazione", "Se prendi un impegno con te stesso (sport, dieta, studio), dopo un mese lo stai ancora rispettando?"),
  B("auto_motivazione", "Nell'ultimo mese ti è capitato più volte di spostare la sveglia in avanti?", -1),
  B("auto_motivazione", "Nell'ultimo anno hai rimandato una cosa che volevi fare aspettando il momento giusto?", -1),

  /* ---- Gestione Pressioni: alto = tiene dentro, basso = esplode ---- */
  L("gestione_pressioni", "Quando qualcosa mi dà fastidio al lavoro, preferisco tenermelo per me."),
  L("gestione_pressioni", "Quando qualcosa va storto, se ne accorgono tutti dal tono di voce.", -1),
  B("gestione_pressioni", "C'è una conversazione che stai rimandando da più di due settimane?"),
  B("gestione_pressioni", "C'è qualcuno con cui hai smesso di dire quello che pensi, per quieto vivere?"),
  B("gestione_pressioni", "Ti è mai capitato di parlare di qualcuno alle sue spalle invece che direttamente con lui?"),
  B("gestione_pressioni", "C'è qualcosa che devi dire a qualcuno da più di due settimane e non gliel'hai ancora detta?"),
  B("gestione_pressioni", "Nell'ultimo mese hai alzato la voce o risposto male a qualcuno al lavoro?", -1),
  B("gestione_pressioni", "Nell'ultimo mese ti è capitato di reagire a caldo e poi pentirtene?", -1),

  /* ---- Autodisciplina ---- */
  L("autodisciplina", "Anche i compiti che mi piacciono meno li porto a termine, non li rimando."),
  L("autodisciplina", "Capita che rimandi le cose scomode finché qualcuno non me le richiede.", -1),
  B("autodisciplina", "L'ultima volta che hai detto «lo faccio entro venerdì», è successo davvero entro venerdì?"),
  B("autodisciplina", "Hai in questo momento almeno una cosa iniziata da più di un mese e ancora non finita?", -1),
  B("autodisciplina", "Nell'ultima settimana hai fatto all'ultimo momento qualcosa che potevi fare prima?", -1),
  B("autodisciplina", "Nell'ultimo anno hai lasciato a metà un corso, un abbonamento in palestra o un percorso iniziato?", -1),

  /* ---- Assertività ---- */
  L("assertivita", "Se non sono d'accordo con una decisione, lo faccio presente."),
  L("assertivita", "Spesso preferisco lasciar perdere piuttosto che far notare che qualcosa non mi sta bene.", -1),
  B("assertivita", "Nell'ultimo mese hai detto un «no» a qualcuno che ci contava?"),
  B("assertivita", "Nell'ultimo anno hai chiesto un aumento, uno sconto o una condizione migliore?"),
  B("assertivita", "Nell'ultimo mese hai avuto un confronto diretto con qualcuno e vi siete chiariti in giornata?"),

  /* ---- Persuasione ---- */
  L("persuasione", "Quando propongo un'idea, di solito riesco a coinvolgere chi mi ascolta."),
  L("persuasione", "Spiego le cose in modo chiaro e logico, ma raramente riesco a smuovere chi mi ascolta.", -1),
  B("persuasione", "Nell'ultimo anno qualcuno ha comprato o provato qualcosa perché gliel'hai consigliato tu?"),
  B("persuasione", "Ti è capitato di notare che qualcuno ha copiato un tuo modo di fare o di dire le cose?"),
  B("persuasione", "Nell'ultimo anno hai fatto cambiare idea a qualcuno su una cosa a cui teneva?"),

  /* ---- HR Management ---- */
  L("hr_management", "Do un feedback utile alle persone anche quando non tocca formalmente a me farlo."),
  L("hr_management", "Se un collega sbaglia, preferisco correggere il lavoro io stesso piuttosto che spiegargli come si fa.", -1),
  B("hr_management", "Quando racconti un progetto, le persone ti chiedono come possono parteciparvi?"),
  B("hr_management", "Nell'ultimo anno hai insegnato a qualcuno qualcosa che poi ha continuato a fare da solo?"),
  B("hr_management", "Quando qualcuno sbaglia un lavoro, alla fine lo rifai tu?", -1),

  /* ---- Causatività ---- */
  L("causativita", "Per guadagnare di più, la prima cosa che deve cambiare è quanto porto io."),
  L("causativita", "Quando qualcosa va storto, di solito è perché altri non hanno fatto la loro parte.", -1),
  B("causativita", "Pensando all'ultima volta che un tuo risultato è andato male: la causa principale era fuori dal tuo controllo?", -1),
  B("causativita", "Quando un lavoro è di tutti, ti capita di dare per scontato che se ne occupi qualcun altro?", -1),
  B("causativita", "L'ultima volta che hai lasciato un lavoro o un incarico, l'hai deciso tu?"),

  /* ---- Comprensione ---- */
  L("comprensione", "Cerco di capire il punto di vista di chi ha un'opinione diversa dalla mia."),
  L("comprensione", "Quando qualcuno mi parla di un problema, penso già a come risolverlo prima che finisca di spiegare.", -1),
  B("comprensione", "Nell'ultimo anno qualcuno ti ha chiesto un consiglio su una questione privata?"),
  B("comprensione", "Ti è capitato di capire che una persona stava male prima che te lo dicesse?"),
  B("comprensione", "Nell'ultimo mese qualcuno ti ha raccontato una cosa personale che di solito non dice in giro?"),

  /* ---- Espansività ---- */
  L("espansivita", "Il primo contatto con persone nuove non mi mette in difficoltà."),
  L("espansivita", "Con le persone che non conosco, aspetto che siano loro a fare il primo passo.", -1),
  B("espansivita", "All'ultimo evento dove non conoscevi nessuno, hai parlato con qualcuno di nuovo?"),
  B("espansivita", "Ti è capitato che qualcuno chiedesse di parlare proprio con te e non con un tuo collega?"),
  B("espansivita", "Ti dà fastidio se una persona che conosci poco ti dà una pacca sulla spalla?", -1),

  /* ---- Leadership Naturale ---- */
  L("leadership_naturale", "Quando lavoro in gruppo, tendo naturalmente a prendere in mano la situazione."),
  L("leadership_naturale", "Preferisco seguire che guidare, anche quando avrei qualcosa da dire.", -1),
  B("leadership_naturale", "Nell'ultimo anno qualcuno ha seguito una tua proposta senza che tu avessi l'autorità per imporla?"),
  B("leadership_naturale", "Ti è capitato che, in un gruppo senza un capo designato, gli altri si girassero verso di te?"),

  /* ---- Resistenza al Cambiamento: alto = resiste ---- */
  L("resistenza_cambiamento", "Preferisco il modo in cui ho sempre fatto le cose, anche quando ce n'è uno più nuovo."),
  L("resistenza_cambiamento", "Quando cambia un metodo, una macchina o un programma, mi adatto senza troppa resistenza.", -1),
  B("resistenza_cambiamento", "Le cose che facevi cinque anni fa le fai ancora nello stesso modo?"),
  B("resistenza_cambiamento", "Nell'ultimo anno hai cambiato una tua abitudine perché una persona te l'aveva fatta notare?", -1),
  B("resistenza_cambiamento", "Negli ultimi sei mesi hai iniziato a usare uno strumento o un programma nuovo di tua iniziativa?", -1),

  /* ---- Successo ---- */
  L("successo", "Nei lavori che ho fatto finora, sono riuscito/a quasi sempre a ottenere risultati concreti."),
  B("successo", "Nell'ultimo anno hai raggiunto un obiettivo che ti eri dato all'inizio dell'anno?"),
  B("successo", "Nella tua storia lavorativa ci sono più di due interruzioni che non hai scelto tu?", -1),
  B("successo", "Sei rimasto in almeno un lavoro abbastanza a lungo da vedere il risultato di quello che avevi avviato?"),

  /* ---- Responsabilità (fisso vs risultati) ---- */
  L("responsabilita", "È giusto che chi porta più risultati guadagni di più."),
  L("responsabilita", "Se un collega con il mio stesso ruolo porta il doppio dei miei risultati, è giusto che guadagni più di me."),
  L("responsabilita", "Preferirei essere pagato/a in base ai risultati piuttosto che alle ore."),
  L("responsabilita", "Preferisco uno stipendio fisso e sicuro, senza risultati da portare.", -1),
  L("responsabilita", "Il valore del mio lavoro si misura soprattutto sul tempo che ci metto.", -1),
  L("responsabilita", "Chi è in azienda da più tempo dovrebbe guadagnare qualcosa in più, anche a parità di risultati.", -1),
  B("responsabilita", "Hai mai guadagnato in base a quanto vendevi (provvigioni, una tua attività)?"),
  B("responsabilita", "Ti metterebbe a disagio avere il tuo nome scritto accanto a un numero che vedono tutti?", -1),

  /* ---- Divertimento ---- */
  L("divertimento", "Il lavoro che faccio oggi mi dà energia, non me la toglie."),
  L("divertimento", "Ultimamente conto i giorni che mancano al weekend più di quanto vorrei.", -1),
  B("divertimento", "Nell'ultimo mese hai raccontato a qualcuno fuori dal lavoro una cosa bella successa al lavoro?"),
  B("divertimento", "Nell'ultimo mese ti è capitato almeno una volta di perdere la cognizione del tempo perché eri preso/a da quello che facevi?"),
  B("divertimento", "Nell'ultimo mese hai pensato, anche solo di sfuggita, che vorresti fare altro?", -1),

  /* ---- Fame ---- */
  L("fame", "Non mi accontento facilmente del livello che ho raggiunto."),
  L("fame", "Il livello che ho raggiunto oggi mi basta, non sento il bisogno di spingere oltre.", -1),
  B("fame", "Negli ultimi tre mesi hai speso soldi tuoi per imparare qualcosa (un corso, un libro, un abbonamento)?"),
  B("fame", "Negli ultimi sei mesi hai usato giorni di ferie o weekend per imparare o costruire qualcosa di tuo?"),
  B("fame", "Nell'ultimo anno hai chiesto tu di occuparti di qualcosa di più grande di quello che facevi?"),

  /* ---- Servizio ---- */
  L("servizio", "Seguo la persona che assisto finché il suo problema non è davvero risolto."),
  L("servizio", "Con le persone che non conosco preferisco restare sulle mie, almeno all'inizio.", -1),
  B("servizio", "Nell'ultimo mese hai fatto qualcosa in più di quello che ti era stato chiesto, per un cliente o un collega?"),
  B("servizio", "Ti è capitato che un cliente tornasse chiedendo espressamente di te?"),

  /* ---- Finanze ---- */
  L("finanze", "Arrivo spesso a fine mese senza sapere bene dove sono finiti i soldi.", -1),
  B("finanze", "Se smettessi di lavorare oggi, i risparmi ti coprirebbero almeno sei mesi?"),
  B("finanze", "Sapresti dire, più o meno, quanto hai speso il mese scorso?"),
  B("finanze", "Nell'ultimo anno hai pagato interessi o rate su un acquisto di cui potevi fare a meno?", -1),

  /* ---- Problem Solving (include logica oggettiva) ---- */
  L("problem_solving", "Di fronte a un problema nuovo, di solito trovo più di una possibile soluzione."),
  L("problem_solving", "Quando incontro un problema che non conosco, preferisco che se ne occupi qualcun altro.", -1),
  G("problem_solving", "Un lavoro divisibile richiede 6 giorni a 2 persone. Quante persone servono per finirlo in 3 giorni?",
    ["3 persone", "4 persone", "6 persone", "12 persone"], 1),
  G("problem_solving", "Un lavoro, da solo, ti porta via 6 ore. Insieme a un collega lo finite in 4 ore. Quante ore ci metterebbe lui da solo?",
    ["8 ore", "10 ore", "12 ore", "2 ore"], 2),
  G("problem_solving", "Una macchina stampa 1.200 volantini in 30 minuti. Quanti ne stampa in un'ora e mezza?",
    ["2.400", "3.000", "3.600", "4.800"], 2),
  G("problem_solving", "Un lavoro costa 800 € e ci guadagni il 25% sul prezzo di vendita. A quanto lo vendi?",
    ["1.000 €", "1.066 €", "1.200 €", "1.600 €"], 1),

  /* ---- Onestà ---- */
  L("onesta", "Se sbaglio, lo dico subito, anche quando la notizia non è piacevole."),
  L("onesta", "A volte è meglio far credere che vada tutto bene piuttosto che creare inutili allarmismi.", -1),
  B("onesta", "Se ricevi il resto sbagliato a tuo favore, torni indietro per dare il resto giusto?"),
  B("onesta", "Se al ristorante ti portano un piatto diverso da quello che avevi ordinato, lo fai presente?"),
  B("onesta", "Nell'ultimo mese hai detto a qualcuno una verità scomoda che ti conveniva tenerti per te?"),

  /* ---- Allineamento ai Valori ---- */
  L("allineamento_valori", "Penso che i risultati vadano guadagnati con l'impegno, non che siano dovuti."),
  L("allineamento_valori", "Condivido i valori con cui è stata costruita questa azienda."),
  L("allineamento_valori", "A volte penso che l'azienda dovrebbe pensare al mio benessere indipendentemente da quanto rendo.", -1),
  B("allineamento_valori", "Nell'ultimo anno hai difeso l'azienda o un collega davanti a qualcuno che li criticava?"),

  /* ---- Scelte A/B ---- */
  C("Una cosa è andata storta nel tuo gruppo. La prima domanda che ti fai è:",
    "Cosa potevo fare di diverso io", "causativita",
    "Come sta chi ci ha lavorato", "comprensione"),
  C("Fine anno. Ti fa più piacere:",
    "Aver superato l'obiettivo", "fame",
    "Aver lavorato con persone con cui stavi bene", "comprensione"),
  C("Un cliente ti chiede una cosa impossibile nei tempi. Tu:",
    "Glielo dici subito, chiaramente", "assertivita",
    "Cerchi comunque un modo per farcela", "servizio"),
  C("Ti offrono lo stesso lavoro con due paghe. Scegli:",
    "Fisso sicuro, un po' più basso", "sicurezza",
    "Base più bassa, ma premio sui risultati", "responsabilita"),
  C("Devi imparare un programma nuovo. Di solito:",
    "Lo apri e cominci a provare", "problem_solving",
    "Aspetti che qualcuno te lo spieghi", "resistenza_cambiamento"),
  C("Un collega sbaglia un lavoro importante. Tu:",
    "Lo rifai tu, è più veloce", "resistenza_cambiamento",
    "Ti fermi e gli spieghi come si fa", "hr_management"),
  C("Preferiresti che il tuo lavoro fosse valutato su:",
    "Quanto sei presente e disponibile", "sicurezza",
    "I risultati che porti a fine mese", "responsabilita"),
];

/* domande di controllo attenzione (senza opzione di salto) */
const ATTENTION_ITEMS = [
  { text: "Questa è una domanda di controllo: scegli «Più no che sì» per continuare.", correct: 2 },
  { text: "Controllo attenzione: seleziona «No, per niente» per proseguire.", correct: 1 },
];

/* ---------------------------------------------------------------------- */
/* Sezione finale                                                          */
/* ---------------------------------------------------------------------- */
const LIKERT_OPTIONS = ["Sì, decisamente", "Più sì che no", "Dipende, non saprei", "Più no che sì", "No, per niente"];
const BEHAV_OPTIONS = [
  { label: "Sì", v: 5 },
  { label: "Più sì che no", v: 4 },
  { label: "Dipende, non saprei", v: 3 },
  { label: "Più no che sì", v: 2 },
  { label: "No", v: 1 },
];
const SKIP = "Preferisco non rispondere";

const RANK_OPTIONS = [
  "Buone condizioni di lavoro", "Sentirsi coinvolti nei problemi del lavoro",
  "Una disciplina non opprimente", "Pieno apprezzamento per il lavoro svolto",
  "Lealtà della direzione verso i lavoratori", "Buon livello salariale",
  "Promozioni e crescita insieme all'azienda", "Comprensione e interesse verso i problemi personali",
  "Sicurezza del posto di lavoro", "Lavoro interessante",
];
const VISIONE_OPTIONS = [
  "Più esperto/a in quello che faccio già", "A guidare o coordinare altre persone",
  "In un altro reparto o ruolo", "Mi trovo bene così, vorrei restare qui", "Non lo so ancora",
];
const MOTIVAZIONI_OPTIONS = [
  "Imparare cose nuove", "Essere autonomo/a nelle decisioni", "Il rapporto con i colleghi",
  "Il rapporto con i clienti", "Essere riconosciuto/a per quello che faccio",
  "La stabilità del posto", "Il guadagno", "Vedere il lavoro fatto bene",
];
const BISOGNI_OPTIONS = [
  "Formazione o corsi", "Più autonomia nelle decisioni", "Feedback più frequenti su come sto lavorando",
  "Strumenti o macchinari migliori", "Obiettivi più chiari", "Più tempo", "Qualcuno che mi faccia da guida",
];
const ASCOLTO_OPTIONS = ["Per niente", "Poco", "Abbastanza", "Molto", "Moltissimo"];
const CAMBIO_OPTIONS = ["Per niente, va bene così", "Un po'", "Abbastanza", "Molto", "Moltissimo, ho bisogno di cambiare"];

const TAIL_QUESTIONS = [
  { id: "visione", kind: "single", text: "Tra 1-3 anni, come ti vedi in azienda?", options: VISIONE_OPTIONS, valueType: "label" },
  { id: "rankImportanza", kind: "rank", text: "Metti in ordine di importanza per te, dalla più alla meno importante:", options: RANK_OPTIONS },
  { id: "motivazioni", kind: "multi", text: "Cosa ti motiva di più ogni giorno? (scegli fino a 3)", options: MOTIVAZIONI_OPTIONS, max: 3 },
  { id: "bisogni", kind: "multi", text: "Di cosa avresti più bisogno per crescere? (scegli fino a 3)", options: BISOGNI_OPTIONS, max: 3 },
  { id: "ascolto", kind: "single", text: "Quanto ti senti ascoltato/a e valorizzato/a in azienda oggi?", options: ASCOLTO_OPTIONS, valueType: "scale" },
  { id: "cambiamentoDesiderio", kind: "single", text: "Quanto vorresti che il tuo ruolo cambiasse nei prossimi 1-2 anni?", options: CAMBIO_OPTIONS, valueType: "scale" },
  { id: "pesa", kind: "text", text: "C'è qualcosa che ti pesa o ti frena in questo momento? (facoltativo)" },
  { id: "migliorerei", kind: "text", text: "Se potessi cambiare o migliorare una cosa nel tuo lavoro da domani, cosa sceglieresti? (facoltativo)" },
];

const TOTAL_QUESTIONS = QUESTION_BANK.length + ATTENTION_ITEMS.length + TAIL_QUESTIONS.length;

/* ---------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ---------------------------------------------------------------------- */
function pdfFileName(name) {
  const slug = (name || "").trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]+/gu, "");
  return `Trama-${slug || "risultato"}.pdf`;
}
function weightedAvg(list) {
  if (!list || !list.length) return null;
  const num = list.reduce((s, x) => s + x.v * x.w, 0);
  const den = list.reduce((s, x) => s + x.w, 0);
  return den === 0 ? null : num / den;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildQuestions() {
  const scored = shuffle(QUESTION_BANK).map((q, i) => ({ ...q, id: `q${i}` }));
  const attention = ATTENTION_ITEMS.map((a, i) => ({ ...a, kind: "attention", id: `att${i}` }));
  // le domande di controllo cadono a circa un terzo e due terzi del percorso
  const out = scored.slice();
  out.splice(Math.floor(out.length / 3), 0, attention[0]);
  out.splice(Math.floor((out.length * 2) / 3), 0, attention[1]);
  return [...out, ...TAIL_QUESTIONS];
}

/* ---------------------------------------------------------------------- */
/* UI atoms                                                                */
/* ---------------------------------------------------------------------- */
function RegistrationMark({ size = 14, color = INK_SOFT, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.2" />
      <line x1="12" y1="0" x2="12" y2="24" stroke={color} strokeWidth="1.2" />
      <line x1="0" y1="12" x2="24" y2="12" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}
function TramaMark({ size = 40 }) {
  // piccola trama intrecciata: rappresenta il nome del test, distinta dal logo AGA
  const step = size / 3.4;
  const strand = step * 0.52;
  const cells = [0, 1, 2];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {cells.map((r) => (
        <rect key={`h${r}`} x="0" y={r * step + step / 2 - strand / 2} width={size} height={strand} rx={strand / 3} fill={NAVY} opacity="0.85" />
      ))}
      {cells.map((c) => (
        <rect key={`v${c}`} x={c * step + step / 2 - strand / 2} y="0" width={strand} height={size} rx={strand / 3} fill={GREEN} opacity="0.92" />
      ))}
    </svg>
  );
}
function WeaveHero() {
  const W = 560, H = 132, step = 22, strand = 12;
  const rows = Math.ceil(H / step), cols = Math.ceil(W / step);
  const hor = [], ver = [], over = [];
  for (let r = 0; r < rows; r++) {
    const y = r * step + step / 2 - strand / 2;
    hor.push(<rect key={`h${r}`} x="0" y={y} width={W} height={strand} rx="3" fill={NAVY} opacity="0.78" />);
  }
  for (let c = 0; c < cols; c++) {
    const x = c * step + step / 2 - strand / 2;
    ver.push(<rect key={`v${c}`} x={x} y="0" width={strand} height={H} rx="3" fill={GREEN} opacity="0.9" />);
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 !== 0) continue;
      const y = r * step + step / 2 - strand / 2;
      const x = c * step + step / 2 - strand / 2;
      over.push(<rect key={`o${r}-${c}`} x={x - 6} y={y} width={strand + 12} height={strand} rx="3" fill={NAVY} opacity="0.78" />);
    }
  }
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 20, background: PAPER }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} aria-label="Fibre di carta intrecciate">
        <defs>
          <linearGradient id="tramaFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={PAPER} stopOpacity="1" />
            <stop offset="42%" stopColor={PAPER} stopOpacity="0.92" />
            <stop offset="100%" stopColor={PAPER} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill={PAPER} />
        {hor}{ver}{over}
        <rect x="0" y="0" width={W} height={H} fill="url(#tramaFade)" />
      </svg>
    </div>
  );
}

function IntroPoint({ Icon, children }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 15, alignItems: "flex-start" }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
        background: `${ACCENT_FILL}2E`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={15} color={GREEN_DEEP} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: INK_SOFT }}>{children}</div>
    </div>
  );
}

function OptionRow({ label, selected, onClick, muted }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "block", width: "100%", textAlign: "left", boxSizing: "border-box",
      padding: "14px 18px", marginBottom: 10, borderRadius: 12,
      border: selected ? `2px solid ${ACCENT}` : `1px solid ${LINE}`,
      background: selected ? `${ACCENT}12` : FIELD,
      fontFamily: SANS, fontSize: muted ? 13.5 : 15,
      color: muted ? INK_SOFT : INK,
      fontWeight: selected ? 500 : 400, cursor: "pointer", transition: "all .12s ease",
    }}>{label}</button>
  );
}
function CheckRow({ label, selected, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled && !selected} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", boxSizing: "border-box",
      padding: "13px 18px", marginBottom: 9, borderRadius: 12,
      border: selected ? `2px solid ${ACCENT}` : `1px solid ${LINE}`,
      background: selected ? `${ACCENT}12` : FIELD,
      opacity: disabled && !selected ? 0.45 : 1,
      fontFamily: SANS, fontSize: 15, cursor: disabled && !selected ? "not-allowed" : "pointer",
    }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `1.5px solid ${selected ? ACCENT : INK_SOFT}`, background: selected ? ACCENT : "transparent" }} />
      {label}
    </button>
  );
}
function ProgressBar({ step, total }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ height: 3, background: LINE, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: INK, transition: "width .2s ease" }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: INK_SOFT, marginTop: 6, letterSpacing: 0.3 }}>Domanda {step} di {total}</div>
    </div>
  );
}
function BackLink({ onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: INK_SOFT, fontFamily: SANS, fontSize: 13.5, cursor: "pointer", padding: "4px 0", marginTop: 22 }}>
      <ChevronLeft size={15} /> Torna indietro
    </button>
  );
}
function Card({ children }) {
  return (
    <div style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 18, padding: "34px 30px", position: "relative" }}>
      <RegistrationMark style={{ position: "absolute", top: 14, left: 14, opacity: 0.35 }} />
      <RegistrationMark style={{ position: "absolute", top: 14, right: 14, opacity: 0.35 }} />
      {children}
    </div>
  );
}
function FieldLabel({ children, style }) {
  return <div style={{ fontSize: 14.5, fontWeight: 500, marginBottom: 10, ...style }}>{children}</div>;
}
function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4}
      style={{ width: "100%", boxSizing: "border-box", background: FIELD, border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", fontSize: 14.5, color: INK, resize: "vertical", outline: "none" }} />
  );
}
function PrimaryButton({ onClick, children, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: disabled ? LINE : INK, color: disabled ? INK_SOFT : PAPER, border: "none",
      borderRadius: 9999, padding: "12px 24px", fontFamily: SANS, fontWeight: 500, fontSize: 14.5,
      cursor: disabled ? "not-allowed" : "pointer", marginTop: 6,
    }}>{children}</button>
  );
}
function RankQuestion({ options, value, onChange }) {
  const ranked = value || [];
  const remaining = options.filter((o) => !ranked.includes(o));
  return (
    <div>
      {ranked.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {ranked.map((o, i) => (
            <div key={o} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", marginBottom: 6, borderRadius: 10, background: `${ACCENT}12`, border: `1px solid ${ACCENT}55` }}>
              <span style={{ fontFamily: MONO, fontSize: 12, color: ACCENT, fontWeight: 700, width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 14 }}>{o}</span>
            </div>
          ))}
          <button type="button" onClick={() => onChange(ranked.slice(0, -1))} style={{ background: "none", border: "none", color: INK_SOFT, fontSize: 12.5, cursor: "pointer", marginTop: 2 }}>
            Annulla l'ultima scelta
          </button>
        </div>
      )}
      {remaining.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: INK_SOFT, marginBottom: 8 }}>Tocca la più importante tra quelle rimaste ({remaining.length}):</div>
          {remaining.map((o) => <OptionRow key={o} label={o} selected={false} onClick={() => onChange([...ranked, o])} />)}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main                                                                     */
/* ---------------------------------------------------------------------- */
export default function TramaQuiz() {
  const [phase, setPhase] = useState("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [consent, setConsent] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [tailAnswers, setTailAnswers] = useState({ motivazioni: [], bisogni: [], rankImportanza: [] });

  const [saveState, setSaveState] = useState("idle");
  const [resultId, setResultId] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const introValid = name.trim().length > 1 && emailValid && role && consent;

  function startQuiz() {
    setQuestions(buildQuestions());
    setQIndex(0);
    setPhase("quiz");
  }
  function goNext() {
    if (qIndex < questions.length - 1) setQIndex(qIndex + 1);
    else { setPhase("risultato"); setSaveState("saving"); }
  }
  function goBack() {
    if (qIndex > 0) setQIndex(qIndex - 1); else setPhase("intro");
  }
  function answerAndAdvance(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setTimeout(() => goNext(), 240);
  }
  function answerSingle(id, value) {
    setTailAnswers((prev) => ({ ...prev, [id]: value }));
    setTimeout(() => goNext(), 240);
  }
  function toggleMulti(id, value, max) {
    setTailAnswers((prev) => {
      const cur = prev[id] || [];
      let next;
      if (cur.includes(value)) next = cur.filter((v) => v !== value);
      else if (cur.length >= max) next = cur;
      else next = [...cur, value];
      return { ...prev, [id]: next };
    });
  }
  const setText = (id, v) => setTailAnswers((p) => ({ ...p, [id]: v }));
  const setRank = (id, arr) => setTailAnswers((p) => ({ ...p, [id]: arr }));

  /* ---- scoring ---- */
  const results = useMemo(() => {
    if (phase !== "risultato") return null;

    const contrib = {};
    const add = (key, v, w) => {
      if (!key || v === null || v === undefined) return;
      (contrib[key] = contrib[key] || []).push({ v, w });
    };
    const polarised = {}; // key -> {pos:[], neg:[]} per il controllo di coerenza
    const addPol = (key, side, v) => {
      polarised[key] = polarised[key] || { pos: [], neg: [] };
      polarised[key][side].push(v);
    };

    let skipped = 0;
    questions.forEach((q) => {
      const a = answers[q.id];
      if (q.kind === "likert" || q.kind === "behav") {
        if (a === "skip") { skipped++; return; }
        if (typeof a !== "number") return;
        const v = q.polarity === -1 ? 6 - a : a;
        add(q.axisKey, v, q.kind === "behav" ? 2 : 1);
        addPol(q.axisKey, q.polarity === -1 ? "neg" : "pos", v);
      } else if (q.kind === "logic") {
        if (a === "skip") { skipped++; return; }
        if (typeof a !== "number") return;
        add(q.axisKey, a === q.correct ? 5 : 1, 2);
      } else if (q.kind === "choice") {
        if (a === "skip") { skipped++; return; }
        if (a !== "a" && a !== "b") return;
        add(q.a.trait, a === "a" ? 5 : 1, 1.5);
        add(q.b.trait, a === "b" ? 5 : 1, 1.5);
      }
    });

    const scoreTrait = (t) => ({
      key: t.key, label: t.label, short: t.short, group: t.group,
      score: weightedAvg(contrib[t.key]),
    });
    const mainAxes = MAIN_TRAITS.map(scoreTrait);
    const supportAxes = SUPPORT_TRAITS.map(scoreTrait);

    // --- CONTROLLI DI ATTENDIBILITÀ ---

    // 1. Coerenza interna: le affermazioni dirette e quelle invertite dello stesso
    //    tratto devono raccontare la stessa cosa. Se si contraddicono, il tratto è "sporco".
    const flaggedAxes = [];
    Object.entries(polarised).forEach(([key, g]) => {
      if (!g.pos.length || !g.neg.length) return;
      if (Math.abs(average(g.pos) - average(g.neg)) >= 2) {
        flaggedAxes.push((TRAIT_BY_KEY[key] || {}).label || key);
      }
    });
    const needsReview = flaggedAxes.length >= 3;

    // 2. Controlli attenzione espliciti
    const attentionPool = questions.filter((q) => q.kind === "attention");
    const attentionFailed = attentionPool.some((q) => answers[q.id] !== q.correct);

    // 3. Troppe domande saltate
    const scorable = questions.filter((q) => ["likert", "behav", "logic", "choice"].includes(q.kind)).length;
    const tooManySkips = skipped > scorable * 0.2;

    // 4. Risposte "a macchinetta": stessa identica risposta per una lunga sequenza
    let longestRun = 0, run = 0, prev = null;
    questions.forEach((q) => {
      if (!["likert", "behav"].includes(q.kind)) return;
      const a = answers[q.id];
      if (a !== undefined && a === prev) run++; else run = 1;
      prev = a;
      if (run > longestRun) longestRun = run;
    });
    const straightLining = longestRun >= 16;

    // 5. Profilo "troppo bello": quasi tutto al massimo favorevole.
    //    Chi risponde come pensa che si debba rispondere finisce sempre qui.
    const allAdjusted = [];
    Object.values(polarised).forEach((g) => { allAdjusted.push(...g.pos, ...g.neg); });
    const topShare = allAdjusted.length
      ? allAdjusted.filter((v) => v >= 5).length / allAdjusted.length : 0;
    const socialDesirability = allAdjusted.length >= 30 && topShare > 0.7;

    const invalidated = needsReview || attentionFailed || tooManySkips || straightLining || socialDesirability;
    return {
      mainAxes, supportAxes, flaggedAxes, needsReview, attentionFailed, skipped, tooManySkips,
      straightLining, socialDesirability, longestRun, topShare, invalidated,
    };
  }, [phase, questions, answers]);

  React.useEffect(() => {
    if (phase === "risultato" && results && saveState === "saving") {
      const payload = {
        name: name.trim(), email: email.trim(), role,
        mainAxes: results.mainAxes, supportAxes: results.supportAxes,
        needsReview: results.needsReview, flaggedAxes: results.flaggedAxes,
        attentionFailed: results.attentionFailed, skipped: results.skipped,
        tooManySkips: results.tooManySkips, straightLining: results.straightLining,
        socialDesirability: results.socialDesirability, longestRun: results.longestRun,
        invalidated: results.invalidated,
        aspirations: {
          visione: tailAnswers.visione, rankImportanza: tailAnswers.rankImportanza || [],
          motivazioni: tailAnswers.motivazioni || [], bisogni: tailAnswers.bisogni || [],
          ascolto: tailAnswers.ascolto, cambiamentoDesiderio: tailAnswers.cambiamentoDesiderio,
          pesa: tailAnswers.pesa || "", migliorerei: tailAnswers.migliorerei || "",
        },
      };
      (async () => {
        try {
          const res = await fetch("/api/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (res.ok && data.resultId) {
            setResultId(data.resultId);
            setSaveState("saved");
          } else {
            setSaveState("error");
          }
        } catch (e) { setSaveState("error"); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, results]);

  async function downloadPdf() {
    if (!resultId) return;
    try {
      const res = await fetch("/api/download-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId }),
      });
      if (!res.ok) throw new Error("pdf error");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFileName(name);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { /* il pulsante resta disponibile, l'utente può riprovare */ }
  }

  const q = phase === "quiz" ? questions[qIndex] : null;

  return (
    <div style={{ fontFamily: SANS, background: CANVAS, minHeight: "100%", padding: "28px 14px", color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
        input, select, textarea { font-family: 'IBM Plex Sans', sans-serif; }
        ::selection { background: ${ACCENT_FILL}44; }
      `}</style>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 22, paddingLeft: 4 }}>
          <img src={agaLogo} alt="Arti Grafiche Alberobello" style={{ height: 58, width: "auto", display: "block" }} />
        </div>

        {phase === "intro" && (
          <Card>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: ACCENT, letterSpacing: 0.4, marginBottom: 10 }}>test attitudinale</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <TramaMark size={36} />
              <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 34, letterSpacing: 1, margin: 0, color: NAVY }}>TRAMA</h1>
            </div>
            <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 20, lineHeight: 1.35, margin: "0 0 18px", color: INK_SOFT }}>
              Un foglio sembra una superficie liscia. Poi lo guardi controluce...
            </h2>

            <WeaveHero />

            <p style={{ fontSize: 15, lineHeight: 1.65, color: INK_SOFT, marginBottom: 14 }}>
              E quello che sembrava uno non è uno: è una trama. Migliaia di fibre intrecciate, ognuna
              con la sua direzione. È la trama a decidere come il foglio si piega, quanto regge,
              come prende l'inchiostro. Non si vede, ma comanda tutto.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: INK_SOFT, marginBottom: 14 }}>
              Anche le persone hanno una trama. <b style={{ color: INK }}>TRAMA</b> sta per
              <b style={{ color: INK }}> Talenti, Risorse, Attitudini, Motivazioni, Aspirazioni</b>:
              non giudica e non aggiunge niente, separa i fili di cui sei fatto e li rende visibili
              uno per uno — quelli che usi ogni giorno senza accorgertene.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: INK_SOFT, marginBottom: 24 }}>
              Alla fine non esce un voto. Esce una mappa: dove sei forte, dove puoi crescere, in quale
              ruolo renderesti di più. La leggeremo insieme, di persona.
            </p>

            <div style={{ background: FIELD, borderRadius: 12, padding: "20px 20px 8px", marginBottom: 26 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: INK }}>Prima di iniziare</div>

              <IntroPoint Icon={GitFork}>
                Rispondi per come ti comporti davvero, non per come hai imparato che si dovrebbe.
                Non esiste la risposta giusta: la stessa risposta racconta qualità diverse. A
                «vai d'accordo con tutti i colleghi?», un sì descrive chi tiene al gruppo e un no chi
                spinge per cambiare le cose. Due profili diversi, nessuno dei due sbagliato.
              </IntroPoint>

              <IntroPoint Icon={Zap}>
                Attenzione all'automatismo: a «le brutte notizie ti scoraggiano?» chi ha fatto dei corsi
                risponde no per riflesso, ma guardandosi davvero spesso la risposta onesta è «più sì che no».
              </IntroPoint>

              <IntroPoint Icon={ShieldCheck}>
                Il test se ne accorge se le risposte si allontanano troppo da come sei: ci sono controlli
                sparsi nel questionario e le domande vengono confrontate tra loro. Se scattano, il profilo
                risulta non attendibile e va rifatto. Non è un tranello, serve a non farti perdere tempo.
              </IntroPoint>

              <IntroPoint Icon={ListChecks}>
                Le risposte sono: <b style={{ color: INK }}>Sì · Più sì che no · Dipende, non saprei ·
                Più no che sì · No · {SKIP}</b>. Le vie di mezzo usale quando servono davvero, e
                «{SKIP}» il meno possibile: troppe rendono il profilo illeggibile.
              </IntroPoint>

              <IntroPoint Icon={Clock}>
                Prenditi 25 minuti in un momento tranquillo: telefono in silenzioso, niente altro aperto.
                Non avere fretta, il tempo che impieghi non incide in alcun modo sul punteggio.
                È un momento dedicato a te.
              </IntroPoint>

              <IntroPoint Icon={Lightbulb}>
                Quando una domanda parla di lavoro, pensa a quello che fai adesso (o all'ultimo che hai
                fatto). C'è anche un piccolo blocco di problemi da risolvere: lì ragionaci con calma, è normale.
              </IntroPoint>
            </div>

            <div style={{ fontFamily: MONO, fontSize: 11, color: INK_SOFT, marginBottom: 22 }}>
              {TOTAL_QUESTIONS} domande · una per schermata · uguali per tutti i ruoli
            </div>
            <FieldLabel>Nome e cognome</FieldLabel>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome"
              style={{ width: "100%", boxSizing: "border-box", background: FIELD, border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", fontSize: 14.5, marginBottom: 20, outline: "none" }} />
            <FieldLabel>Email</FieldLabel>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@azienda.it"
              style={{ width: "100%", boxSizing: "border-box", background: FIELD, border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", fontSize: 14.5, marginBottom: 20, outline: "none" }} />
            <FieldLabel>Per quale ruolo ti candidi/lavori?</FieldLabel>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: FIELD, border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", fontSize: 14.5, marginBottom: 24, outline: "none" }}>
              <option value="">— seleziona —</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: INK_SOFT, marginBottom: 26, cursor: "pointer" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
              <span>Capisco che le mie risposte saranno lette dal titolare per aiutarmi a crescere in azienda, e non saranno condivise con persone esterne.</span>
            </label>
            <PrimaryButton onClick={startQuiz} disabled={!introValid}>Inizia</PrimaryButton>
          </Card>
        )}

        {phase === "quiz" && q && (
          <Card>
            <ProgressBar step={qIndex + 1} total={questions.length} />
            <div style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.4, marginBottom: 24, minHeight: 56 }}>{q.text}</div>

            {(q.kind === "likert" || q.kind === "attention") && (
              <div>
                {LIKERT_OPTIONS.map((label, i) => (
                  <OptionRow key={label} label={label} selected={answers[q.id] === 5 - i} onClick={() => answerAndAdvance(q.id, 5 - i)} />
                ))}
                {q.kind === "likert" && <OptionRow label={SKIP} muted selected={answers[q.id] === "skip"} onClick={() => answerAndAdvance(q.id, "skip")} />}
              </div>
            )}

            {q.kind === "behav" && (
              <div>
                {BEHAV_OPTIONS.map((o) => (
                  <OptionRow key={o.label} label={o.label} selected={answers[q.id] === o.v} onClick={() => answerAndAdvance(q.id, o.v)} />
                ))}
                <OptionRow label={SKIP} muted selected={answers[q.id] === "skip"} onClick={() => answerAndAdvance(q.id, "skip")} />
              </div>
            )}

            {q.kind === "logic" && (
              <div>
                {q.options.map((label, i) => (
                  <OptionRow key={label} label={label} selected={answers[q.id] === i} onClick={() => answerAndAdvance(q.id, i)} />
                ))}
                <OptionRow label={SKIP} muted selected={answers[q.id] === "skip"} onClick={() => answerAndAdvance(q.id, "skip")} />
              </div>
            )}

            {q.kind === "choice" && (
              <div>
                <OptionRow label={q.a.label} selected={answers[q.id] === "a"} onClick={() => answerAndAdvance(q.id, "a")} />
                <OptionRow label={q.b.label} selected={answers[q.id] === "b"} onClick={() => answerAndAdvance(q.id, "b")} />
                <OptionRow label={SKIP} muted selected={answers[q.id] === "skip"} onClick={() => answerAndAdvance(q.id, "skip")} />
              </div>
            )}

            {q.kind === "single" && (
              <div>
                {q.options.map((label, i) => {
                  const value = q.valueType === "scale" ? 5 - i : label;
                  return <OptionRow key={label} label={label} selected={tailAnswers[q.id] === value} onClick={() => answerSingle(q.id, value)} />;
                })}
              </div>
            )}

            {q.kind === "rank" && (
              <div>
                <RankQuestion options={q.options} value={tailAnswers[q.id]} onChange={(v) => setRank(q.id, v)} />
                <PrimaryButton onClick={goNext} disabled={(tailAnswers[q.id] || []).length < q.options.length}>Continua</PrimaryButton>
              </div>
            )}

            {q.kind === "multi" && (
              <div>
                {q.options.map((label) => {
                  const cur = tailAnswers[q.id] || [];
                  return <CheckRow key={label} label={label} selected={cur.includes(label)} disabled={cur.length >= q.max} onClick={() => toggleMulti(q.id, label, q.max)} />;
                })}
                <PrimaryButton onClick={goNext} disabled={(tailAnswers[q.id] || []).length === 0}>Continua</PrimaryButton>
              </div>
            )}

            {q.kind === "text" && (
              <div>
                <TextArea value={tailAnswers[q.id] || ""} onChange={(v) => setText(q.id, v)} placeholder="Scrivi qui, con calma…" />
                <PrimaryButton onClick={goNext}>Continua</PrimaryButton>
              </div>
            )}

            <BackLink onClick={goBack} />
          </Card>
        )}

        {phase === "risultato" && results && (
          results.invalidated
            ? <InvalidatedScreen name={name} saveState={saveState} />
            : <ResultScreen name={name} role={role} results={results} tailAnswers={tailAnswers} saveState={saveState} resultId={resultId} onDownloadPdf={downloadPdf} />
        )}

        <div style={{ textAlign: "center", marginTop: 26, marginBottom: 6 }}>
          <button onClick={() => setShowAdmin(true)} style={{ background: "none", border: "none", color: INK_SOFT, opacity: 0.55, fontSize: 11.5, fontFamily: SANS, cursor: "pointer" }}>Area titolare</button>
        </div>
      </div>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Grafico attitudinale — tutte le colonne condividono la stessa baseline  */
/* ---------------------------------------------------------------------- */
const TITLE_H = 30;   // altezza fissa: i nomi su due righe non spostano nulla
const WORDS_H = 44;   // altezza fissa delle parole-chiave
const HALF = 78;      // mezza altezza della zona barre

function TraitColumn({ trait, score }) {
  const display = toDisplay(score);
  const color = GROUP_META[trait.group] ? GROUP_META[trait.group].color : INK_SOFT;
  const barPx = display === null ? 0 : Math.round((Math.abs(display) / 100) * HALF);
  const starred = display !== null && Math.abs(display) >= 70;

  return (
    <div style={{ width: 86, flexShrink: 0, textAlign: "center" }}>
      <div style={{ height: TITLE_H, fontSize: 10.5, fontWeight: 600, lineHeight: 1.25, overflow: "hidden" }}>{trait.short}</div>
      <div style={{ height: WORDS_H, fontSize: 9, color, lineHeight: 1.3, overflow: "hidden" }}>{trait.up}</div>

      {/* zona barre: altezza fissa, baseline esattamente a metà */}
      <div style={{ position: "relative", height: HALF * 2 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: HALF, borderTop: `1px dashed ${LINE}` }} />
        {display !== null && (
          <>
            <div style={{
              position: "absolute", left: "50%", transform: "translateX(-50%)", width: 22, borderRadius: 3, background: color,
              height: Math.max(barPx, 3),
              ...(display >= 0 ? { bottom: HALF } : { top: HALF }),
            }} />
            <div style={{
              position: "absolute", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap",
              fontSize: 12, fontWeight: 700, color,
              ...(display >= 0 ? { bottom: HALF + Math.max(barPx, 3) + 2 } : { top: HALF + Math.max(barPx, 3) + 2 }),
            }}>{display > 0 ? "+" : ""}{display}</div>
            {starred && (
              <div style={{
                position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 11, color: ACCENT,
                ...(display >= 0 ? { bottom: HALF + Math.max(barPx, 3) + 19 } : { top: HALF + Math.max(barPx, 3) + 19 }),
              }}>★</div>
            )}
          </>
        )}
      </div>

      <div style={{ height: WORDS_H, fontSize: 9, color: INK_SOFT, lineHeight: 1.3, overflow: "hidden", marginTop: 4 }}>{trait.down}</div>
    </div>
  );
}

function GroupCard({ groupKey, score }) {
  const meta = GROUP_META[groupKey];
  const d = toDisplay(score);
  return (
    <div style={{ background: FIELD, borderLeft: `4px solid ${meta.color}`, borderRadius: 8, padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, letterSpacing: 0.3 }}>{meta.label}</span>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: meta.color, marginBottom: 2 }}>
        {d === null ? "—" : `${d > 0 ? "+" : ""}${d}`}
      </div>
      <div style={{ fontSize: 11.5, color: INK_SOFT }}>{meta.caption}</div>
    </div>
  );
}

function SliderRow({ traitKey, label, score }) {
  const d = toDisplay(score);
  const v = bandVerdict(TRAIT_BY_KEY[traitKey], score);
  const fillPct = d === null ? 0 : Math.max(2, Math.min(100, (d + 100) / 2));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
      <div style={{ width: 168, fontSize: 12.5, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 7, borderRadius: 9999, background: "#DDD6C4", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fillPct}%`, borderRadius: 9999, background: v.color }} />
      </div>
      <div style={{ width: 38, textAlign: "right", fontSize: 12.5, fontWeight: 600, color: v.color, flexShrink: 0 }}>
        {d === null ? "—" : `${d > 0 ? "+" : ""}${d}`}
      </div>
    </div>
  );
}

function RoleFitCard({ role, pct, current }) {
  return (
    <div style={{ background: current ? `${ACCENT}0D` : FIELD, border: current ? `1px solid ${ACCENT}55` : `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", flex: "1 1 30%", minWidth: 130 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{role} {current && <span style={{ color: ACCENT, fontWeight: 500 }}>(il tuo ruolo)</span>}</div>
      <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: current ? ACCENT : INK, marginBottom: 2 }}>{pct}</div>
      <div style={{ fontSize: 11.5, color: INK_SOFT }}>{ROLE_TAGLINES[role]}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
function InvalidatedScreen({ name, saveState }) {
  return (
    <Card>
      <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 9999, background: `${INK_SOFT}18`, color: INK_SOFT }}>Profilo non attendibile</span>
      <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 26, margin: "18px 0 14px" }}>Questa volta la trama non si legge</h2>
      <p style={{ fontSize: 15, lineHeight: 1.65, color: INK_SOFT, marginBottom: 14 }}>
        I controlli sparsi nel questionario si sono accorti che alcune risposte non tornano tra loro,
        quindi il profilo non è abbastanza affidabile da mostrartelo. Non è un tranello e non è un
        giudizio: capita, magari il momento non era quello giusto.
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.65, color: INK_SOFT, marginBottom: 22 }}>
        Parlane con il titolare: potrete rifarlo con calma, in un momento più tranquillo.
      </p>
      <div style={{ fontFamily: MONO, fontSize: 11, color: saveState === "error" ? LOW : INK_SOFT }}>
        {saveState === "saving" && "Salvataggio in corso…"}
        {saveState === "saved" && "Risposte salvate."}
        {saveState === "error" && "Non sono riuscito a salvare — avvisa il titolare."}
      </div>
    </Card>
  );
}

function ResultScreen({ name, role, results, tailAnswers, saveState, resultId, onDownloadPdf }) {
  const scoreMap = {};
  [...results.mainAxes, ...results.supportAxes].forEach((a) => { scoreMap[a.key] = a.score; });

  const roleFits = computeRoleFit(scoreMap);
  const currentFit = roleFits.find((r) => r.role === role);
  const otherTop2 = roleFits.filter((r) => r.role !== role).sort((a, b) => b.pct - a.pct).slice(0, 2);
  const today = new Date().toLocaleDateString("it-IT");
  const topRanked = (tailAnswers.rankImportanza || []).slice(0, 3);

  const outOfBand = [...results.mainAxes, ...results.supportAxes]
    .map((a) => ({ a, v: bandVerdict(TRAIT_BY_KEY[a.key], a.score) }))
    .filter((x) => (x.v.state === "under" || x.v.state === "over") && x.v.note);

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 9999, background: `${GOOD}18`, color: GOOD }}>✓ Profilo attendibile</span>
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: INK_SOFT }}>{today} · {role}</span>
      </div>
      <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 26, margin: "0 0 18px" }}>La mappa di {name || "oggi"}</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 26, flexWrap: "wrap" }}>
        {["essere", "fare", "avere"].map((gk) => (
          <GroupCard key={gk} groupKey={gk} score={average(MAIN_TRAITS.filter((d) => d.group === gk).map((d) => scoreMap[d.key]))} />
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: INK_SOFT, marginBottom: 10 }}>Grafico attitudinale (scala −100 / +100)</div>
      <div style={{ overflowX: "auto", paddingBottom: 6 }}>
        <div style={{ display: "flex", gap: 4, width: "max-content", alignItems: "flex-start" }}>
          {results.mainAxes.map((a) => <TraitColumn key={a.key} trait={TRAIT_BY_KEY[a.key]} score={a.score} />)}
        </div>
      </div>
      <div style={{ fontSize: 11, color: INK_SOFT, marginBottom: 22 }}>← scorri per vedere tutte le dimensioni →</div>

      <div style={{ marginBottom: 22, paddingTop: 18, borderTop: `1px solid ${LINE}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: INK_SOFT, marginBottom: 12 }}>Tratti di supporto (stessa scala −100/+100)</div>
        {results.supportAxes.map((a) => <SliderRow key={a.key} traitKey={a.key} label={a.label} score={a.score} />)}
      </div>

      {outOfBand.length > 0 && (
        <div style={{ marginBottom: 22, paddingTop: 18, borderTop: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: INK_SOFT, marginBottom: 12 }}>Cosa guardare insieme</div>
          {outOfBand.map(({ a, v }) => (
            <div key={a.key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: v.color, marginBottom: 2 }}>{a.label} · {v.label}</div>
              <div style={{ fontSize: 13, color: INK_SOFT, lineHeight: 1.5 }}>{v.note}</div>
            </div>
          ))}
        </div>
      )}

      {(currentFit || otherTop2.length > 0) && (
        <div style={{ marginBottom: 22, paddingTop: 18, borderTop: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: INK_SOFT, marginBottom: 12 }}>Ruoli in tipografia vicini al tuo profilo</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {currentFit && <RoleFitCard role={currentFit.role} pct={currentFit.pct} current />}
            {otherTop2.map((r) => <RoleFitCard key={r.role} role={r.role} pct={r.pct} />)}
          </div>
        </div>
      )}

      <div style={{ paddingTop: 18, borderTop: `1px solid ${LINE}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: INK_SOFT, marginBottom: 10 }}>Dove vuoi andare</div>
        <div style={{ fontSize: 14, marginBottom: 8 }}><b>Tra 1-3 anni:</b> {tailAnswers.visione}</div>
        {topRanked.length > 0 && <div style={{ fontSize: 14, marginBottom: 8 }}><b>Le tue 3 priorità:</b> {topRanked.map((t, i) => `${i + 1}. ${t}`).join(" · ")}</div>}
        <div style={{ fontSize: 14, marginBottom: 8 }}><b>Cosa ti motiva:</b> {(tailAnswers.motivazioni || []).join(", ")}</div>
        <div style={{ fontSize: 14, marginBottom: 8 }}><b>Di cosa hai bisogno:</b> {(tailAnswers.bisogni || []).join(", ")}</div>
        {tailAnswers.pesa && <div style={{ fontSize: 14, marginBottom: 8 }}><b>Cosa pesa:</b> {tailAnswers.pesa}</div>}
        {tailAnswers.migliorerei && <div style={{ fontSize: 14 }}><b>Cosa migliorerebbe:</b> {tailAnswers.migliorerei}</div>}
      </div>

      <p style={{ fontSize: 13.5, color: INK_SOFT, marginTop: 22, lineHeight: 1.55 }}>
        Grazie{name ? `, ${name}` : ""}. Queste risposte restano tra te e il titolare: sono un punto di partenza per una conversazione, non un giudizio.
      </p>
      <p style={{ fontSize: 11.5, color: ACCENT, marginTop: 10, lineHeight: 1.5 }}>
        Questa mappa non va usata come unico strumento per valutare le attitudini professionali di una persona.
      </p>
      <div style={{ fontFamily: MONO, fontSize: 11, color: saveState === "error" ? LOW : INK_SOFT, marginTop: 14 }}>
        {saveState === "saving" && "Salvataggio in corso…"}
        {saveState === "saved" && "Risposte salvate."}
        {saveState === "error" && "Non sono riuscito a salvare — fai uno screenshot e avvisa il titolare."}
      </div>
      {saveState === "saved" && resultId && (
        <button onClick={onDownloadPdf} style={{ marginTop: 16, background: INK, color: PAPER, border: "none", borderRadius: 9999, padding: "10px 20px", fontSize: 13.5, cursor: "pointer" }}>
          Scarica PDF
        </button>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Area titolare                                                            */
/* ---------------------------------------------------------------------- */
function AdminPanel({ onClose }) {
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState(null);
  const [checkingLogin, setCheckingLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [openKey, setOpenKey] = useState(null);

  async function login() {
    setCheckingLogin(true); setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.token) setAdminToken(data.token);
      else setError(data.error || "Password non corretta.");
    } catch (e) { setError("Non sono riuscito a contattare il server."); }
    finally { setCheckingLogin(false); }
  }

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/results", { headers: { Authorization: `Bearer ${adminToken}` } });
      if (!res.ok) throw new Error("errore risposta");
      const list = await res.json();
      const items = list.map((data) => ({ key: data.id, data }));
      items.sort((a, b) => new Date(b.data.submittedAt) - new Date(a.data.submittedAt));
      setRows(items);
    } catch (e) { setError("Non sono riuscito a leggere le risposte salvate."); }
    finally { setLoading(false); }
  }
  React.useEffect(() => { if (adminToken) load(); }, [adminToken]);

  async function downloadPdf(resultId, name) {
    try {
      const res = await fetch("/api/download-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ resultId }),
      });
      if (!res.ok) throw new Error("pdf error");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFileName(name);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { /* l'admin può riprovare dal pulsante */ }
  }

  const scoreLine = (a) => {
    const d = toDisplay(a.score);
    const v = bandVerdict(TRAIT_BY_KEY[a.key], a.score);
    return (
      <span key={a.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
        <span>{a.label}</span>
        <span style={{ color: v.color, fontWeight: 500 }}>{d === null ? "—" : `${d > 0 ? "+" : ""}${d}`}</span>
      </span>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,15,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 14px", zIndex: 50, overflowY: "auto" }}>
      <div style={{ background: PAPER, borderRadius: 16, maxWidth: 640, width: "100%", padding: "28px 26px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: INK_SOFT }}><X size={18} /></button>

        {!adminToken ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Lock size={16} color={INK_SOFT} />
              <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 600 }}>Area titolare</div>
            </div>
            <p style={{ fontSize: 13.5, color: INK_SOFT, marginBottom: 16 }}>Inserisci la password per vedere le risposte di tutti.</p>
            <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} type="password" placeholder="Password"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: `1px solid ${LINE}`, marginBottom: 14, fontSize: 14 }} />
            <button onClick={login} disabled={checkingLogin}
              style={{ background: INK, color: PAPER, border: "none", borderRadius: 9999, padding: "10px 20px", fontSize: 14, cursor: "pointer", opacity: checkingLogin ? 0.6 : 1 }}>
              {checkingLogin ? "Verifica…" : "Entra"}
            </button>
            {error && <div style={{ color: LOW, fontSize: 13, marginTop: 10 }}>{error}</div>}
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Risposte ricevute</div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: INK_SOFT, marginBottom: 18 }}>{rows.length} compilazioni</div>
            {loading && <div style={{ fontSize: 13.5, color: INK_SOFT }}>Caricamento…</div>}
            {error && <div style={{ fontSize: 13.5, color: LOW }}>{error}</div>}
            {!loading && rows.length === 0 && <div style={{ fontSize: 13.5, color: INK_SOFT }}>Ancora nessuna risposta.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rows.map((row) => {
                const isOpen = openKey === row.key;
                const d = row.data;
                const flags = [...d.mainAxes, ...d.supportAxes]
                  .map((a) => ({ a, v: bandVerdict(TRAIT_BY_KEY[a.key], a.score) }))
                  .filter((x) => (x.v.state === "under" || x.v.state === "over") && x.v.note);
                return (
                  <div key={row.key} style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: "14px 16px", background: FIELD }}>
                    <div onClick={() => setOpenKey(isOpen ? null : row.key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                          {d.name}
                          {d.invalidated && <span title="Test non validato" style={{ color: ACCENT, marginLeft: 6 }}>⚠</span>}
                        </div>
                        <div style={{ fontSize: 12, color: INK_SOFT }}>{d.role} · {new Date(d.submittedAt).toLocaleDateString("it-IT")}</div>
                      </div>
                      <span style={{ fontSize: 12, color: INK_SOFT }}>{isOpen ? "chiudi" : "apri"}</span>
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: 14, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
                        {d.invalidated && (
                          <div style={{ fontSize: 12.5, color: ACCENT, marginBottom: 14, lineHeight: 1.5, background: `${MID}14`, borderRadius: 8, padding: "10px 12px" }}>
                            <b>Test non validato</b> — alla persona non è stata mostrata la mappa,
                            ma qui sotto la vedi comunque per intero. Leggila con cautela: i controlli
                            dicono che potrebbe non rispecchiare com'è davvero.
                            {d.needsReview && <div>· Risposte contraddittorie su: {(d.flaggedAxes || []).join(", ")}</div>}
                            {d.attentionFailed && <div>· Domanda di controllo attenzione sbagliata</div>}
                            {d.tooManySkips && <div>· Troppe domande saltate ({d.skipped})</div>}
                            {d.straightLining && <div>· Stessa risposta ripetuta {d.longestRun} volte di fila</div>}
                            {d.socialDesirability && <div>· Profilo troppo uniforme al massimo: ha risposto come "si dovrebbe"</div>}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                          {["essere", "fare", "avere"].map((gk) => {
                            const keys = MAIN_TRAITS.filter((t) => t.group === gk).map((t) => t.key);
                            const sc = average(d.mainAxes.filter((a) => keys.includes(a.key)).map((a) => a.score));
                            return <GroupCard key={gk} groupKey={gk} score={sc} />;
                          })}
                        </div>

                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Grafico attitudinale</div>
                        <div style={{ overflowX: "auto", paddingBottom: 6, marginBottom: 16 }}>
                          <div style={{ display: "flex", gap: 4, width: "max-content", alignItems: "flex-start" }}>
                            {d.mainAxes.map((a) => <TraitColumn key={a.key} trait={TRAIT_BY_KEY[a.key]} score={a.score} />)}
                          </div>
                        </div>

                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Tratti principali (ESSERE/FARE/AVERE)</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px", marginBottom: 14 }}>{d.mainAxes.map(scoreLine)}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Tratti complementari</div>
                        <div style={{ marginBottom: 14 }}>
                          {d.supportAxes.map((a) => <SliderRow key={a.key} traitKey={a.key} label={a.label} score={a.score} />)}
                        </div>
                        {flags.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Fuori fascia utile</div>
                            {flags.map(({ a, v }) => (
                              <div key={a.key} style={{ fontSize: 12, color: INK_SOFT, marginBottom: 6, lineHeight: 1.45 }}>
                                <b style={{ color: v.color }}>{a.label}:</b> {v.note}
                              </div>
                            ))}
                          </div>
                        )}
                        {(() => {
                          const sm = {};
                          [...d.mainAxes, ...d.supportAxes].forEach((a) => { sm[a.key] = a.score; });
                          const fits = computeRoleFit(sm).sort((x, y) => y.pct - x.pct).slice(0, 4);
                          if (!fits.length) return null;
                          return (
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Ruoli più vicini al profilo</div>
                              {fits.map((f) => (
                                <div key={f.role} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                                  <span>{f.role} {f.role === d.role && <span style={{ color: ACCENT }}>· attuale</span>}</span>
                                  <span style={{ fontWeight: 600 }}>{f.pct}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Obiettivi e prospettive</div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                          <div><b>Tra 1-3 anni:</b> {d.aspirazioni.visione}</div>
                          <div><b>Priorità (ordine):</b> {(d.aspirazioni.rankImportanza || []).map((t, i) => `${i + 1}. ${t}`).join(" · ")}</div>
                          <div><b>Motivazioni:</b> {(d.aspirazioni.motivazioni || []).join(", ")}</div>
                          <div><b>Bisogni:</b> {(d.aspirazioni.bisogni || []).join(", ")}</div>
                          <div><b>Ascolto/valorizzazione:</b> {d.aspirazioni.ascolto}/5</div>
                          <div><b>Desiderio di cambiamento:</b> {d.aspirazioni.cambiamentoDesiderio}/5</div>
                          {d.aspirazioni.pesa && <div><b>Cosa pesa:</b> {d.aspirazioni.pesa}</div>}
                          {d.aspirazioni.migliorerei && <div><b>Migliorerebbe:</b> {d.aspirazioni.migliorerei}</div>}
                        </div>
                        <button onClick={() => downloadPdf(d.id, d.name)} style={{ marginTop: 16, background: INK, color: PAPER, border: "none", borderRadius: 9999, padding: "9px 18px", fontSize: 12.5, cursor: "pointer" }}>
                          Scarica PDF
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
