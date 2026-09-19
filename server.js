import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  NAVY, GOOD, MID, LOW, MAIN_TRAITS, SUPPORT_TRAITS, TRAIT_BY_KEY, GROUP_META,
  average, toDisplay, bandVerdict, computeRoleFit,
} from "./traits.js";

const INK_SOFT = "#4A5563";
const LINE = "#CFC9B8";
const FIELD = "#F5F3EC";
const PAGE_MARGIN = 50;

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const adminSessions = new Set();

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

function requireAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: "Accesso non autorizzato" });
  }
  next();
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        main_axes JSONB,
        support_axes JSONB,
        aspirations JSONB,
        invalidated BOOLEAN DEFAULT FALSE,
        flagged_axes JSONB,
        needs_review BOOLEAN DEFAULT FALSE,
        attention_failed BOOLEAN DEFAULT FALSE,
        too_many_skips BOOLEAN DEFAULT FALSE,
        skipped INTEGER DEFAULT 0,
        straightlining BOOLEAN DEFAULT FALSE,
        longest_run INTEGER DEFAULT 0,
        social_desirability BOOLEAN DEFAULT FALSE
      )
    `);
    console.log("✅ Database inizializzato");
  } catch (error) {
    console.error("❌ Errore init database:", error);
  }
}

initializeDatabase();

function rowToResult(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    submittedAt: row.submitted_at,
    mainAxes: row.main_axes,
    supportAxes: row.support_axes,
    aspirazioni: row.aspirations,
    invalidated: row.invalidated,
    flaggedAxes: row.flagged_axes,
    needsReview: row.needs_review,
    attentionFailed: row.attention_failed,
    tooManySkips: row.too_many_skips,
    skipped: row.skipped,
    straightLining: row.straightlining,
    longestRun: row.longest_run,
    socialDesirability: row.social_desirability,
  };
}

app.post("/api/submit", async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      mainAxes,
      supportAxes,
      aspirations,
      invalidated,
      flaggedAxes,
      needsReview,
      attentionFailed,
      tooManySkips,
      skipped,
      straightLining,
      longestRun,
      socialDesirability,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Nome e email obbligatori" });
    }

    const result = await pool.query(
      `INSERT INTO quiz_results (
        name, email, role, main_axes, support_axes, aspirations,
        invalidated, flagged_axes, needs_review, attention_failed,
        too_many_skips, skipped, straightlining, longest_run, social_desirability
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        name,
        email,
        role,
        JSON.stringify(mainAxes),
        JSON.stringify(supportAxes),
        JSON.stringify(aspirations),
        invalidated,
        JSON.stringify(flaggedAxes),
        needsReview,
        attentionFailed,
        tooManySkips,
        skipped,
        straightLining,
        longestRun,
        socialDesirability,
      ]
    );

    const resultId = result.rows[0].id;
    res.json({ success: true, resultId, message: "Risultato salvato" });
  } catch (error) {
    console.error("❌ Errore submit:", error);
    res.status(500).json({ error: "Errore nel salvataggio" });
  }
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "Area titolare non configurata" });
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Password non corretta" });
  }
  const token = crypto.randomBytes(32).toString("hex");
  adminSessions.add(token);
  res.json({ token });
});

app.get("/api/results", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM quiz_results ORDER BY submitted_at DESC"
    );
    res.json(result.rows.map(rowToResult));
  } catch (error) {
    console.error("❌ Errore elenco risultati:", error);
    res.status(500).json({ error: "Errore nel recupero" });
  }
});

app.get("/api/results/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM quiz_results WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Risultato non trovato" });
    }

    res.json(rowToResult(result.rows[0]));
  } catch (error) {
    console.error("❌ Errore recupero:", error);
    res.status(500).json({ error: "Errore nel recupero" });
  }
});

const PAGE_RIGHT = 595.28 - PAGE_MARGIN; // A4 width in pt
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_MARGIN;

function ensureSpace(doc, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

function sectionTitle(doc, text) {
  ensureSpace(doc, 30);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK_SOFT).text(text.toUpperCase(), PAGE_MARGIN, doc.y, { characterSpacing: 0.3 });
  doc.moveDown(0.5);
}

function drawDivider(doc) {
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_RIGHT, doc.y).strokeColor(LINE).lineWidth(1).stroke();
  doc.moveDown(1);
}

function drawHeader(doc, row) {
  doc.font("Times-Bold").fontSize(26).fillColor(NAVY).text("TRAMA", PAGE_MARGIN, PAGE_MARGIN);
  doc.font("Helvetica").fontSize(10.5).fillColor(INK_SOFT).text(
    `${row.name}  ·  ${row.role || ""}  ·  ${new Date(row.submittedAt).toLocaleDateString("it-IT")}`
  );
  doc.moveDown(0.6);

  const badgeText = row.invalidated ? "Profilo non attendibile" : "Profilo attendibile";
  const badgeColor = row.invalidated ? MID : GOOD;
  doc.font("Helvetica-Bold").fontSize(9.5);
  const badgeW = doc.widthOfString(badgeText) + 20;
  const badgeY = doc.y;
  doc.roundedRect(PAGE_MARGIN, badgeY, badgeW, 18, 9).fillColor(badgeColor, 0.15).fill();
  doc.fillColor(badgeColor, 1).text(badgeText, PAGE_MARGIN + 10, badgeY + 4.5);
  doc.y = badgeY + 26;
  drawDivider(doc);

  if (row.invalidated) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(LOW).text("Questa mappa non è affidabile");
    doc.font("Helvetica").fontSize(9.5).fillColor(INK_SOFT).text(
      "I controlli sparsi nel questionario hanno rilevato incoerenze tra le risposte: quanto segue va letto con cautela, non come un giudizio definitivo.",
      { width: CONTENT_WIDTH }
    );
    doc.moveDown(1);
  }
}

function drawGroupCards(doc, scoreMap) {
  const groups = ["essere", "fare", "avere"];
  const gap = 12;
  const cardW = (CONTENT_WIDTH - gap * 2) / 3;
  const cardH = 62;
  ensureSpace(doc, cardH + 20);
  const top = doc.y;
  groups.forEach((gk, i) => {
    const meta = GROUP_META[gk];
    const score = average(MAIN_TRAITS.filter((t) => t.group === gk).map((t) => scoreMap[t.key]));
    const display = toDisplay(score);
    const x = PAGE_MARGIN + i * (cardW + gap);
    doc.rect(x, top, cardW, cardH).fillColor(FIELD).fill();
    doc.rect(x, top, 4, cardH).fillColor(meta.color).fill();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(meta.color).text(meta.label, x + 14, top + 10, { characterSpacing: 0.5 });
    doc.font("Times-Bold").fontSize(22).fillColor(meta.color).text(display === null ? "—" : `${display > 0 ? "+" : ""}${display}`, x + 14, top + 24);
    doc.font("Helvetica").fontSize(8.5).fillColor(INK_SOFT).text(meta.caption, x + 14, top + 48);
  });
  doc.y = top + cardH + 22;
}

function drawMainTraits(doc, mainAxes) {
  sectionTitle(doc, "Grafico attitudinale (scala -100 / +100)");
  const n = mainAxes.length;
  const gap = 3;
  const colW = (CONTENT_WIDTH - gap * (n - 1)) / n;
  const labelH = 20;
  const half = 44; // altezza massima della barra da un lato della base
  const blockH = labelH + half * 2 + 14;
  ensureSpace(doc, blockH + 10);
  const top = doc.y;
  const baselineY = top + labelH + half;
  const barW = Math.min(18, colW * 0.55);

  mainAxes.forEach((a, i) => {
    const trait = TRAIT_BY_KEY[a.key];
    const display = toDisplay(a.score);
    const color = trait ? GROUP_META[trait.group].color : INK_SOFT;
    const x = PAGE_MARGIN + i * (colW + gap);

    doc.font("Helvetica-Bold").fontSize(6).fillColor("#1a1a1a")
      .text(trait ? trait.short : a.label, x, top, { width: colW, align: "center" });

    doc.moveTo(x, baselineY).lineTo(x + colW, baselineY)
      .strokeColor(LINE).lineWidth(0.5).dash(1.5, { space: 1.5 }).stroke();
    doc.undash();

    if (display === null) return;
    const barLen = Math.max(2, Math.round((Math.abs(display) / 100) * half));
    const bx = x + (colW - barW) / 2;
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(color);
    if (display >= 0) {
      doc.rect(bx, baselineY - barLen, barW, barLen).fillColor(color).fill();
      doc.text(`${display > 0 ? "+" : ""}${display}`, x, Math.max(top + labelH, baselineY - barLen - 9), { width: colW, align: "center" });
    } else {
      doc.rect(bx, baselineY, barW, barLen).fillColor(color).fill();
      doc.text(`${display}`, x, baselineY + barLen + 2, { width: colW, align: "center" });
    }
  });
  doc.y = top + blockH;
  doc.moveDown(0.4);
}

function drawSupportTraits(doc, supportAxes) {
  sectionTitle(doc, "Tratti complementari");
  const rowH = 20;
  const labelW = 170;
  const valueW = 40;
  const barW = CONTENT_WIDTH - labelW - valueW - 10;
  supportAxes.forEach((a) => {
    ensureSpace(doc, rowH);
    const trait = TRAIT_BY_KEY[a.key];
    const v = bandVerdict(trait, a.score);
    const display = toDisplay(a.score);
    const fillPct = display === null ? 0 : Math.max(2, Math.min(100, (display + 100) / 2)) / 100;
    const y = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor("#1a1a1a").text(a.label, PAGE_MARGIN, y + 2, { width: labelW });
    doc.roundedRect(PAGE_MARGIN + labelW, y + 2, barW, 6, 3).fillColor("#DDD6C4").fill();
    if (fillPct > 0) doc.roundedRect(PAGE_MARGIN + labelW, y + 2, barW * fillPct, 6, 3).fillColor(v.color).fill();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(v.color).text(
      display === null ? "—" : `${display > 0 ? "+" : ""}${display}`,
      PAGE_MARGIN + labelW + barW + 8, y, { width: valueW - 8 }
    );
    doc.y = y + rowH;
  });
  doc.moveDown(0.6);
}

function drawOutOfBand(doc, mainAxes, supportAxes) {
  const outOfBand = [...mainAxes, ...supportAxes]
    .map((a) => ({ a, v: bandVerdict(TRAIT_BY_KEY[a.key], a.score) }))
    .filter((x) => (x.v.state === "under" || x.v.state === "over") && x.v.note);
  if (!outOfBand.length) return;
  sectionTitle(doc, "Cosa guardare insieme");
  outOfBand.forEach(({ a, v }) => {
    ensureSpace(doc, 34);
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(v.color).text(`${a.label} · ${v.label}`);
    doc.font("Helvetica").fontSize(9).fillColor(INK_SOFT).text(v.note, { width: CONTENT_WIDTH });
    doc.moveDown(0.5);
  });
  doc.moveDown(0.3);
}

function drawRoleFit(doc, scoreMap, role) {
  const fits = computeRoleFit(scoreMap).sort((x, y) => y.pct - x.pct).slice(0, 4);
  if (!fits.length) return;
  sectionTitle(doc, "Ruoli più vicini al profilo");
  fits.forEach((f) => {
    ensureSpace(doc, 16);
    const isCurrent = f.role === role;
    doc.font("Helvetica").fontSize(9.5).fillColor(isCurrent ? GOOD : "#1a1a1a")
      .text(`${f.role}${isCurrent ? "  (ruolo attuale)" : ""}`, PAGE_MARGIN, doc.y, { continued: true, width: CONTENT_WIDTH - 50 });
    doc.font("Helvetica-Bold").text(`  ${f.pct}`, { align: "right" });
  });
  doc.moveDown(0.8);
}

function drawAspirations(doc, asp) {
  sectionTitle(doc, "Obiettivi e prospettive");
  doc.font("Helvetica").fontSize(9.5).fillColor("#1a1a1a");
  const line = (label, value) => {
    if (!value) return;
    ensureSpace(doc, 16);
    doc.font("Helvetica-Bold").text(`${label}: `, PAGE_MARGIN, doc.y, { continued: true, width: CONTENT_WIDTH });
    doc.font("Helvetica").text(value);
    doc.moveDown(0.3);
  };
  line("Tra 1-3 anni", asp.visione);
  line("Priorità", (asp.rankImportanza || []).join(", "));
  line("Motivazioni", (asp.motivazioni || []).join(", "));
  line("Bisogni", (asp.bisogni || []).join(", "));
  line("Cosa pesa", asp.pesa);
  line("Cosa migliorerebbe", asp.migliorerei);
}

function renderResultPdf(doc, row) {
  const scoreMap = {};
  [...(row.mainAxes || []), ...(row.supportAxes || [])].forEach((a) => { scoreMap[a.key] = a.score; });

  drawHeader(doc, row);
  drawGroupCards(doc, scoreMap);
  drawMainTraits(doc, row.mainAxes || []);
  drawSupportTraits(doc, row.supportAxes || []);
  drawOutOfBand(doc, row.mainAxes || [], row.supportAxes || []);
  drawRoleFit(doc, scoreMap, row.role);
  drawAspirations(doc, row.aspirazioni || {});

  ensureSpace(doc, 40);
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(8.5).fillColor(INK_SOFT).text(
    "Questa mappa non va usata come unico strumento per valutare le attitudini professionali di una persona.",
    { width: CONTENT_WIDTH }
  );
}

app.post("/api/download-pdf", async (req, res) => {
  try {
    const { resultId } = req.body;
    if (!resultId) {
      return res.status(400).json({ error: "resultId obbligatorio" });
    }

    const dbResult = await pool.query(
      "SELECT * FROM quiz_results WHERE id = $1",
      [resultId]
    );
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: "Risultato non trovato" });
    }
    const row = rowToResult(dbResult.rows[0]);

    const isAdmin = adminSessions.has(getBearerToken(req));
    if (row.invalidated && !isAdmin) {
      return res.status(403).json({ error: "Profilo non attendibile: PDF non disponibile" });
    }

    const { default: PDFDocument } = await import("pdfkit");

    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="trama-${resultId}.pdf"`);
    doc.pipe(res);

    renderResultPdf(doc, row);

    doc.end();
  } catch (error) {
    console.error("❌ Errore PDF:", error);
    res.status(500).json({ error: "Errore nella generazione del PDF" });
  }
});

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TRAMA avviato su porta ${PORT}`);
});
