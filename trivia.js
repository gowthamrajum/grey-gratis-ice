// Bible trivia — questions with four options and the right one recorded.
//
// The questions live in trivia/questions.json (built by
// trivia/build-questions.py, each with the verse that settles it) and are
// loaded into the trivia_questions table at startup: new ones are added, ones
// already there are left alone, so editing the file grows the game and an
// admin's edits on the relay are never overwritten. Changing the set by hand
// — add, correct, remove — takes the admin PIN, the same one the background
// library uses.
//
//   GET    /trivia                  every question (filter: ?category=&difficulty=)
//   GET    /trivia?count=10&random=1 a round, shuffled
//   GET    /trivia/meta             how many, by category and difficulty
//   GET    /trivia/:id              one question
//   POST   /trivia                  add one            (admin)
//   PUT    /trivia/:id              correct one        (admin)
//   DELETE /trivia/:id              remove one         (admin)
//
// The right answer is in every response — `answer` (0–3, the index into
// `options`) and `answerText` — because the screen that asks is the screen
// that reveals.
const fs = require("fs");
const path = require("path");

const CATEGORIES = ["Old Testament", "New Testament", "General"];
const DIFFICULTIES = ["easy", "medium", "hard"];

async function initTriviaDb(run, get) {
  await run(`
    CREATE TABLE IF NOT EXISTS trivia_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL UNIQUE,
      options TEXT NOT NULL,
      answer INTEGER NOT NULL,
      reference TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      difficulty TEXT DEFAULT 'medium',
      createdAt TEXT NOT NULL
    )
  `);
  // Seed from the dataset. INSERT OR IGNORE on the unique question: anything
  // already in the table — including an admin's corrections — stays as it is.
  let added = 0;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "trivia", "questions.json"), "utf8"));
    const now = new Date().toISOString();
    for (const q of data) {
      const clean = validate(q);
      if (clean.error) continue;
      const r = await run(
        `INSERT OR IGNORE INTO trivia_questions (question, options, answer, reference, category, difficulty, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clean.question, JSON.stringify(clean.options), clean.answer, clean.reference, clean.category, clean.difficulty, now]
      );
      added += r.rowsAffected || 0;
    }
  } catch (e) {
    console.warn("Trivia dataset not loaded:", e.message);
  }
  const row = await get("SELECT COUNT(*) AS n FROM trivia_questions");
  console.log(`Trivia: ${Number(row?.n ?? 0)} questions${added ? ` (${added} new from the dataset)` : ""}.`);
}

/** A question as stored, or { error } saying what is wrong with it. */
function validate(q) {
  if (!q || typeof q !== "object") return { error: "Send a question." };
  const question = String(q.question ?? "").trim();
  if (!question) return { error: "The question is empty." };
  const options = Array.isArray(q.options) ? q.options.map((o) => String(o ?? "").trim()) : [];
  if (options.length !== 4 || options.some((o) => !o)) return { error: "A question needs exactly four options." };
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return { error: "The four options must all be different." };
  const answer = Number(q.answer);
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) return { error: "answer is the index of the right option, 0–3." };
  const category = CATEGORIES.includes(q.category) ? q.category : "General";
  const difficulty = DIFFICULTIES.includes(q.difficulty) ? q.difficulty : "medium";
  return { question, options, answer, reference: String(q.reference ?? "").trim(), category, difficulty };
}

function rowOut(r) {
  let options = [];
  try { options = JSON.parse(r.options); } catch (_) {}
  const answer = Number(r.answer);
  return {
    id: Number(r.id),
    question: r.question,
    options,
    answer,
    answerText: options[answer] ?? "",
    reference: r.reference || "",
    category: r.category,
    difficulty: r.difficulty
  };
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function register(app, { run, get, all, adminOk }) {
  app.get("/trivia", async (req, res) => {
    try {
      const where = [];
      const params = [];
      if (CATEGORIES.includes(req.query.category)) { where.push("category = ?"); params.push(req.query.category); }
      if (DIFFICULTIES.includes(req.query.difficulty)) { where.push("difficulty = ?"); params.push(req.query.difficulty); }
      const rows = await all(
        `SELECT * FROM trivia_questions ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id`,
        params
      );
      let questions = rows.map(rowOut);
      const random = req.query.random === "1" || req.query.random === "true";
      if (random) questions = shuffle(questions);
      const count = Number(req.query.count);
      if (Number.isInteger(count) && count > 0) questions = questions.slice(0, count);
      res.set("Cache-Control", "no-store");
      res.json({ questions, total: rows.length });
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  // Before /trivia/:id, or "meta" would be read as an id.
  app.get("/trivia/meta", async (_req, res) => {
    try {
      const rows = await all("SELECT category, difficulty, COUNT(*) AS n FROM trivia_questions GROUP BY category, difficulty");
      const byCategory = {};
      const byDifficulty = {};
      let total = 0;
      for (const r of rows) {
        const n = Number(r.n);
        byCategory[r.category] = (byCategory[r.category] ?? 0) + n;
        byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] ?? 0) + n;
        total += n;
      }
      res.json({ total, byCategory, byDifficulty, categories: CATEGORIES, difficulties: DIFFICULTIES });
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  app.get("/trivia/:id", async (req, res) => {
    try {
      const r = await get("SELECT * FROM trivia_questions WHERE id = ?", [req.params.id]);
      if (!r) return res.status(404).send("No such question.");
      res.json(rowOut(r));
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  app.post("/trivia", async (req, res) => {
    if (!adminOk(req)) return res.status(403).json({ error: "admin-only", message: "Only an admin can add trivia questions." });
    const q = validate(req.body);
    if (q.error) return res.status(400).json({ error: "invalid", message: q.error });
    try {
      const r = await run(
        `INSERT INTO trivia_questions (question, options, answer, reference, category, difficulty, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [q.question, JSON.stringify(q.options), q.answer, q.reference, q.category, q.difficulty, new Date().toISOString()]
      );
      res.status(201).json(rowOut(await get("SELECT * FROM trivia_questions WHERE id = ?", [Number(r.lastInsertRowid)])));
    } catch (e) {
      if (/UNIQUE constraint failed/i.test(e.message || "")) {
        return res.status(409).json({ error: "duplicate", message: "That question is already in the set." });
      }
      res.status(500).send(e.message);
    }
  });

  app.put("/trivia/:id", async (req, res) => {
    if (!adminOk(req)) return res.status(403).json({ error: "admin-only", message: "Only an admin can change trivia questions." });
    const q = validate(req.body);
    if (q.error) return res.status(400).json({ error: "invalid", message: q.error });
    try {
      const r = await run(
        `UPDATE trivia_questions SET question = ?, options = ?, answer = ?, reference = ?, category = ?, difficulty = ? WHERE id = ?`,
        [q.question, JSON.stringify(q.options), q.answer, q.reference, q.category, q.difficulty, req.params.id]
      );
      if (!r.rowsAffected) return res.status(404).send("No such question.");
      res.json(rowOut(await get("SELECT * FROM trivia_questions WHERE id = ?", [req.params.id])));
    } catch (e) {
      if (/UNIQUE constraint failed/i.test(e.message || "")) {
        return res.status(409).json({ error: "duplicate", message: "Another question already reads exactly like that." });
      }
      res.status(500).send(e.message);
    }
  });

  app.delete("/trivia/:id", async (req, res) => {
    if (!adminOk(req)) return res.status(403).json({ error: "admin-only", message: "Only an admin can remove trivia questions." });
    try {
      const r = await run("DELETE FROM trivia_questions WHERE id = ?", [req.params.id]);
      if (!r.rowsAffected) return res.status(404).send("No such question.");
      res.json({ ok: true });
    } catch (e) {
      res.status(500).send(e.message);
    }
  });
}

module.exports = { register, initTriviaDb, validate };
