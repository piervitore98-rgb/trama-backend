import express from "express";
import cors from "cors";
import pkg from "pg";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

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

app.get("/api/results/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM quiz_results WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Risultato non trovato" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      submittedAt: row.submitted_at,
      mainAxes: row.main_axes,
      supportAxes: row.support_axes,
      aspirations: row.aspirations,
      invalidated: row.invalidated,
      flaggedAxes: row.flagged_axes,
      needsReview: row.needs_review,
      attentionFailed: row.attention_failed,
      tooManySkips: row.too_many_skips,
      skipped: row.skipped,
      straightLining: row.straightlining,
      longestRun: row.longest_run,
      socialDesirability: row.social_desirability,
    });
  } catch (error) {
    console.error("❌ Errore recupero:", error);
    res.status(500).json({ error: "Errore nel recupero" });
  }
});

app.post("/api/download-pdf", async (req, res) => {
  try {
    const { resultId, mainAxes, supportAxes, aspirations, name, email, role } = req.body;

    const doc = new PDFDocument({ margin: 50 });

    const NAVY = "#061931";
    const GREEN = "#80CC28";
    const INK_SOFT = "#4A5563";
    const LINE = "#CFC9B8";

    doc.fontSize(24).fillColor(NAVY).font("Helvetica-Bold").text("TRAMA Quiz", { align: "left" });
    doc.fontSize(11).fillColor(INK_SOFT).font("Helvetica").text(`Risultati - ${new Date().toLocaleDateString("it-IT")}`, { align: "left" });
    doc.moveTo(50, 90).lineTo(550, 90).strokeColor(LINE).stroke();
ls -la
git init
git add .
git commit -m "Backend TRAMA Quiz"
git remote add origin https://github.com/piervitore98-rgb/trama-backend.git
git branch -M main
git push -u origin main
echo "web: node server.js" > Procfile
git add Procfile
git commit -m "Add Procfile"
git push
cat > railway.json << 'EOF'
{
  "build": {
    "builder": "nixpacks"
  }
}
