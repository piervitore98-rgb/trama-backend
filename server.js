import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

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

    const NAVY = "#061931";
    const INK_SOFT = "#4A5563";
    const LINE = "#CFC9B8";

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="trama-${resultId}.pdf"`);
    doc.pipe(res);

    doc.fontSize(24).fillColor(NAVY).font("Helvetica-Bold").text("TRAMA Quiz");
    doc.fontSize(11).fillColor(INK_SOFT).font("Helvetica").text(
      `${row.name} · ${row.role || ""} · ${new Date(row.submittedAt).toLocaleDateString("it-IT")}`
    );
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor(LINE).stroke();
    doc.moveDown();

    if (row.invalidated) {
      doc.fontSize(13).fillColor("#A6432F").font("Helvetica-Bold").text("Profilo non attendibile");
      doc.fontSize(10).fillColor(INK_SOFT).font("Helvetica").text(
        "I controlli sul questionario hanno rilevato incoerenze: il profilo sotto va letto con cautela."
      );
      doc.moveDown();
    }

    doc.fontSize(14).fillColor(NAVY).font("Helvetica-Bold").text("Tratti principali");
    doc.moveDown(0.3);
    (row.mainAxes || []).forEach((a) => {
      doc.fontSize(11).fillColor(INK_SOFT).font("Helvetica").text(`${a.label}: ${a.score}`);
    });

    doc.moveDown();
    doc.fontSize(14).fillColor(NAVY).font("Helvetica-Bold").text("Tratti complementari");
    doc.moveDown(0.3);
    (row.supportAxes || []).forEach((a) => {
      doc.fontSize(11).fillColor(INK_SOFT).font("Helvetica").text(`${a.label}: ${a.score}`);
    });

    const asp = row.aspirazioni || {};
    doc.moveDown();
    doc.fontSize(14).fillColor(NAVY).font("Helvetica-Bold").text("Obiettivi e prospettive");
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor(INK_SOFT).font("Helvetica");
    if (asp.visione) doc.text(`Tra 1-3 anni: ${asp.visione}`);
    if ((asp.rankImportanza || []).length) doc.text(`Priorità: ${asp.rankImportanza.join(", ")}`);
    if ((asp.motivazioni || []).length) doc.text(`Motivazioni: ${asp.motivazioni.join(", ")}`);
    if ((asp.bisogni || []).length) doc.text(`Bisogni: ${asp.bisogni.join(", ")}`);
    if (asp.pesa) doc.text(`Cosa pesa: ${asp.pesa}`);
    if (asp.migliorerei) doc.text(`Cosa migliorerebbe: ${asp.migliorerei}`);

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
