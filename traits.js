/* ---------------------------------------------------------------------- */
/* Metadata e calcolo punteggi condivisi tra frontend (grafico a schermo)   */
/* e backend (PDF): un'unica fonte per tratti, fasce e colori.             */
/* ---------------------------------------------------------------------- */

export const NAVY = "#061931";
export const GOOD = "#4F8A0B";
export const MID = "#B8862E";
export const LOW = "#A6432F";
export const ESSERE_C = "#5F9E14";
export const FARE_C = "#14406E";
export const AVERE_C = "#C08A2E";

export const MAIN_TRAITS = [
  { key: "organizzazione", label: "Organizzazione", short: "Organizzazione", group: "essere",
    band: [35, 100], up: "Ordine · Chiarezza · Metodo", down: "Confusione · Disordine · Rimandi",
    under: "Fatica a tenere insieme scadenze e priorità: rischia di lavorare sempre in emergenza." },
  { key: "auto_motivazione", label: "Auto-Motivazione", short: "Auto-Motivazione", group: "essere",
    band: [35, 100], up: "Ambizione · Si carica da solo", down: "Si spegne · Va spinto",
    under: "Ha bisogno di una spinta esterna costante: senza obiettivi dati, tende a fermarsi." },
  { key: "gestione_pressioni", label: "Gestione Pressioni", short: "Gestione Pressioni", group: "essere",
    band: [0, 45], up: "Si blinda · Tiene dentro · Gossip", down: "Esplode · Reattivo · A caldo",
    over: "Tiene tutto dentro. Non esplode, ma accumula: le cose non dette diventano tensione o gossip. È il segnale che precede le dimissioni silenziose.",
    under: "Reagisce a caldo: sotto pressione alza la voce o risponde male, poi se ne pente." },
  { key: "autodisciplina", label: "Autodisciplina", short: "Autodisciplina", group: "fare",
    band: [35, 100], up: "Affidabile · Costante · Rigore", down: "Rimanda · Zona comfort · Tampona",
    under: "Parte bene ma non chiude: le cose iniziate restano aperte se nessuno le richiede." },
  { key: "assertivita", label: "Assertività", short: "Assertività", group: "fare",
    band: [25, 85], up: "Diretto · Deciso · Incisivo", down: "Inibito · Gira intorno · Non chiede",
    over: "Molto diretto: efficace, ma può risultare spigoloso con chi è più cauto.",
    under: "Non chiede e non dice di no: si carica cose che non gli spettano senza farlo presente." },
  { key: "persuasione", label: "Persuasione", short: "Persuasione", group: "fare",
    band: [20, 100], up: "Persuasivo · Coinvolge · Emoziona", down: "Spiega · Non convince · Logica",
    under: "Spiega bene ma non smuove: le sue idee passano poco, anche quando sono giuste." },
  { key: "hr_management", label: "HR Management", short: "HR Management", group: "avere",
    band: [25, 100], up: "Sviluppa · Motiva · Delega", down: "Fa da solo · Non coinvolge",
    under: "Tende a rifare le cose al posto degli altri invece di insegnarle: non fa crescere." },
  { key: "causativita", label: "Causatività", short: "Causatività", group: "avere",
    band: [35, 100], up: "Causa · Responsabile · Risolve", down: "Effetto · Permaloso · Dà la colpa",
    under: "Si vive come effetto di quello che succede: le cause sono quasi sempre fuori da sé." },
  { key: "comprensione", label: "Comprensione", short: "Comprensione", group: "avere",
    band: [25, 90], up: "Empatia · Ascolto · Tolleranza", down: "Criticismo · Distacco · Giudica",
    over: "Assorbe molto degli altri: attenzione a non caricarsi problemi che non sono suoi.",
    under: "Ascolta poco e giudica in fretta: coglie i fatti ma non i bisogni non detti." },
  { key: "espansivita", label: "Espansività", short: "Espansività", group: "avere",
    band: [10, 100], up: "Caloroso · Spigliato · Aperto", down: "Timido · Chiuso · Selettivo",
    under: "Con le persone nuove aspetta: il primo passo lo lascia sempre agli altri." },
];

export const SUPPORT_TRAITS = [
  { key: "leadership_naturale", label: "Leadership Naturale", band: [20, 100],
    under: "Non trascina: ha idee ma non le porta avanti se non gliene viene dato il ruolo." },
  { key: "resistenza_cambiamento", label: "Resistenza al Cambiamento", band: [-100, 0],
    over: "Fa resistenza ai cambiamenti: strumenti e metodi nuovi vengono adottati tardi e controvoglia." },
  { key: "successo", label: "Successo", band: [20, 100],
    under: "Percorso frammentato: poche cose portate fino al risultato." },
  { key: "responsabilita", label: "Responsabilità", band: [30, 100],
    under: "Preferisce non avere numeri di cui rispondere: cerca sicurezza più che risultato." },
  { key: "divertimento", label: "Divertimento", band: [20, 100],
    under: "Non trova più gusto in quello che fa. È il primo segnale, in anticipo di mesi, di chi sta per andarsene." },
  { key: "fame", label: "Fame", band: [25, 100],
    under: "Si accontenta del livello raggiunto: difficile che spinga senza essere spinto." },
  { key: "servizio", label: "Servizio", band: [25, 100],
    under: "Fa quello che gli viene chiesto e si ferma lì: il cliente non lo cerca per nome." },
  { key: "finanze", label: "Finanze", band: [10, 100],
    under: "Gestisce il denaro senza controllo: poca visibilità su entrate e uscite." },
  { key: "problem_solving", label: "Problem Solving", band: [30, 100],
    under: "Davanti a un problema nuovo si blocca o lo passa a qualcun altro." },
  { key: "onesta", label: "Onestà", band: [40, 100],
    under: "Tende a minimizzare quando la verità è scomoda: i problemi emergono tardi." },
  { key: "allineamento_valori", label: "Allineamento ai Valori", band: [20, 100],
    under: "Poco allineato con i valori dell'azienda: il rapporto rischia di reggersi solo sullo stipendio." },
];

export const ALL_TRAITS = [...MAIN_TRAITS, ...SUPPORT_TRAITS];
export const TRAIT_BY_KEY = Object.fromEntries(ALL_TRAITS.map((t) => [t.key, t]));

export const GROUP_META = {
  essere: { label: "ESSERE", caption: "chi sei", color: ESSERE_C },
  fare: { label: "FARE", caption: "come agisci", color: FARE_C },
  avere: { label: "AVERE", caption: "con gli altri", color: AVERE_C },
};

export const ROLES = [
  "Produzione / allestimento", "Grafica", "Contabilità", "Accoglienza clienti",
  "Gestione clienti", "CEO", "Responsabile produzione", "Responsabile grafica",
  "Responsabile clienti",
];

export const ROLE_FIT_AXES = {
  "Produzione / allestimento": ["autodisciplina", "organizzazione", "problem_solving", "servizio"],
  "Grafica": ["problem_solving", "organizzazione", "comprensione", "fame"],
  "Contabilità": ["autodisciplina", "onesta", "organizzazione", "finanze"],
  "Accoglienza clienti": ["servizio", "comprensione", "espansivita"],
  "Gestione clienti": ["servizio", "assertivita", "comprensione", "persuasione"],
  "CEO": ["causativita", "fame", "leadership_naturale", "responsabilita"],
  "Responsabile produzione": ["leadership_naturale", "organizzazione", "hr_management", "problem_solving"],
  "Responsabile grafica": ["leadership_naturale", "hr_management", "comprensione", "fame"],
  "Responsabile clienti": ["leadership_naturale", "servizio", "assertivita", "persuasione"],
};
export const ROLE_TAGLINES = {
  "Produzione / allestimento": "cura, precisione, mani in pasta",
  "Grafica": "occhio, gusto, dettaglio",
  "Contabilità": "numeri, ordine, riservatezza",
  "Accoglienza clienti": "primo sorriso, ascolto, calore",
  "Gestione clienti": "relazione, problem solving, fiducia",
  "CEO": "visione, rotta, responsabilità",
  "Responsabile produzione": "regia, qualità, squadra",
  "Responsabile grafica": "creatività, guida, standard",
  "Responsabile clienti": "relazione, squadra, soluzioni",
};

export function average(arr) {
  const nums = arr.filter((n) => typeof n === "number");
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
export function toDisplay(score) {
  if (score === null || score === undefined) return null;
  return Math.max(-100, Math.min(100, Math.round((score - 3) * 50)));
}
export function bandVerdict(trait, score) {
  const d = toDisplay(score);
  if (d === null || !trait || !trait.band) return { state: "na", color: "#4A5563", label: "—" };
  const [lo, hi] = trait.band;
  if (d < lo) return { state: "under", color: LOW, label: "Sotto la fascia utile", note: trait.under };
  if (d > hi) return { state: "over", color: MID, label: "Sopra la fascia utile", note: trait.over };
  return { state: "ok", color: GOOD, label: "Nella fascia utile" };
}
export function computeRoleFit(scoreMap) {
  return ROLES.map((r) => {
    const vals = (ROLE_FIT_AXES[r] || []).map((k) => scoreMap[k]).filter((v) => typeof v === "number");
    const avg = average(vals);
    return { role: r, pct: avg === null ? null : Math.round(((avg - 1) / 4) * 100) };
  }).filter((x) => x.pct !== null);
}
