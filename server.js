// server.js (Turso/libSQL edition)
const express = require("express");
// const sqlite3 = require("sqlite3").verbose();
const { createClient } = require("@libsql/client");
const bodyParser = require("body-parser");
const stringSimilarity = require("string-similarity");
const cors = require("cors");

const app = express();

// ---------- DB (Turso/libSQL) ----------
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,   // e.g. libsql://<db-name>-<org>.turso.io
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Helpers to mirror sqlite-style usage
async function run(sql, params = []) {
  return db.execute({ sql, args: params }); // returns { rowsAffected, lastInsertRowid, rows }
}
async function get(sql, params = []) {
  const r = await db.execute({ sql, args: params });
  return r.rows[0] || null;
}
async function all(sql, params = []) {
  const r = await db.execute({ sql, args: params });
  return r.rows;
}

app.use(bodyParser.json({ limit: "50mb" }));

// ✅ CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://worshipready.onrender.com",
  "https://grey-gratis-ice.onrender.com"
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const key = `${o.protocol}//${o.hostname}${o.port ? `:${o.port}` : ""}`;
    return allowedOrigins.includes(key);
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    console.warn("❌ CORS blocked:", origin);
    cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// -------------------------------
// ✅ DB Setup (same schema)
// -------------------------------
async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS presentations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      randomId TEXT NOT NULL UNIQUE,
      presentationName TEXT NOT NULL,
      slideOrder INTEGER,
      slideData TEXT NOT NULL,
      createdDateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedDateTime DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS songs (
      song_id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_name TEXT NOT NULL,
      main_stanza TEXT NOT NULL,
      stanzas TEXT NOT NULL,
      created_at TEXT,
      last_updated_at TEXT,
      created_by TEXT DEFAULT 'System',
      last_updated_by TEXT DEFAULT ''
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS psalms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      telugu TEXT NOT NULL,
      english TEXT NOT NULL
    )
  `);

  await run(`
    UPDATE songs
    SET 
      created_at = COALESCE(created_at, datetime('now')),
      last_updated_at = COALESCE(last_updated_at, datetime('now')),
      created_by = COALESCE(created_by, 'System'),
      last_updated_by = COALESCE(last_updated_by, '')
  `);
}

// -------------------------------
// ✅ Presentations API
// -------------------------------
app.post("/presentations", async (req, res) => {
  try {
    const { presentationName, createdDateTime } = req.body;
    if (!presentationName || !createdDateTime)
      return res.status(400).send("presentationName and createdDateTime required.");
    // no-op row in your design; keeping behavior
    return res.status(201).send("Presentation initialized.");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.post("/presentations/slide", async (req, res) => {
  try {
    const { presentationName, slideOrder, slideData, randomId } = req.body;
    if (!presentationName || !slideData || !randomId)
      return res.status(400).send("presentationName, randomId and slideData are required.");
    const now = new Date().toISOString();
    await run(
      `INSERT INTO presentations (randomId, presentationName, slideOrder, slideData, createdDateTime, updatedDateTime)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomId, presentationName, slideOrder ?? null, slideData, now, now]
    );
    res.status(201).send("Slide added.");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/presentations/older", async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 48;
    const thresholdDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const rows = await all(
      `SELECT presentationName, MIN(createdDateTime) AS createdDateTime
       FROM presentations
       WHERE datetime(createdDateTime) < datetime(?)
       GROUP BY presentationName
       ORDER BY createdDateTime DESC`,
      [thresholdDate]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.put("/presentations/slide", async (req, res) => {
  try {
    const { presentationName, randomId, slideData } = req.body;
    if (!presentationName || !randomId || !slideData)
      return res.status(400).send("presentationName, randomId and slideData are required.");
    const now = new Date().toISOString();
    const r = await run(
      `UPDATE presentations 
       SET slideData = ?, updatedDateTime = ? 
       WHERE presentationName = ? AND randomId = ?`,
      [slideData, now, presentationName, randomId]
    );
    if (!r.rowsAffected) return res.status(404).send("Slide not found.");
    res.send("Slide updated.");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/presentations/:name/slides", async (req, res) => {
  try {
    const rows = await all(
      `SELECT randomId, slideData, createdDateTime 
       FROM presentations 
       WHERE presentationName = ? 
       ORDER BY datetime(createdDateTime) ASC`,
      [req.params.name]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.delete("/presentations/slide/:presentationName/:randomId", async (req, res) => {
  try {
    const r = await run(
      `DELETE FROM presentations WHERE presentationName = ? AND randomId = ?`,
      [req.params.presentationName, req.params.randomId]
    );
    if (!r.rowsAffected) return res.status(404).send("Slide not found.");
    res.send(`Slide with ID "${req.params.randomId}" deleted.`);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/presentations", async (req, res) => {
  try {
    const rows = await all(
      `SELECT DISTINCT presentationName FROM presentations ORDER BY presentationName ASC`
    );
    res.json(rows.map(r => r.presentationName));
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.delete("/presentations/:presentationName", async (req, res) => {
  try {
    const { presentationName } = req.params;
    const r = await run(
      `DELETE FROM presentations WHERE presentationName = ?`,
      [presentationName]
    );
    if (!r.rowsAffected) return res.status(404).send("No presentation found with that name.");
    res.send(`Deleted ${r.rowsAffected} slide(s) from presentation "${presentationName}".`);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// -------------------------------
// ✅ Songs API
// -------------------------------
app.post("/songs", async (req, res) => {
  try {
    const { song_name, main_stanza, stanzas } = req.body;
    if (!song_name || !main_stanza || !stanzas)
      return res.status(400).send("Missing required fields");

    const rows = await all("SELECT song_name FROM songs", []);
    const conflict = rows.find(
      (song) => stringSimilarity.compareTwoStrings(song_name, song.song_name) >= 0.8
    );
    if (conflict) return res.status(409).send("A similar song already exists");

    const now = new Date().toISOString();
    const r = await run(
      `INSERT INTO songs (song_name, main_stanza, stanzas, created_at, last_updated_at, created_by, last_updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [song_name, JSON.stringify(main_stanza), JSON.stringify(stanzas), now, now, "System", ""]
    );

    // libSQL returns lastInsertRowid
    res.json({ song_id: Number(r.lastInsertRowid) });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.put("/songs/:id", async (req, res) => {
  try {
    const { song_name, main_stanza, stanzas, last_updated_by } = req.body;
    const now = new Date().toISOString();
    const updatedBy = last_updated_by || "System";

    const r = await run(
      `UPDATE songs 
       SET song_name = ?, main_stanza = ?, stanzas = ?, last_updated_at = ?, last_updated_by = ?
       WHERE song_id = ?`,
      [song_name, JSON.stringify(main_stanza), JSON.stringify(stanzas), now, updatedBy, req.params.id]
    );
    if (!r.rowsAffected) return res.status(404).send("Song not found");
    res.send("Song updated");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/songs", async (req, res) => {
  try {
    const { name, created_by, last_updated_by, created_from, created_to, updated_from, updated_to } = req.query;

    let baseQuery = "SELECT * FROM songs WHERE 1=1";
    const params = [];

    if (name) { baseQuery += " AND song_name LIKE ?"; params.push(`%${name}%`); }
    if (created_by) { baseQuery += " AND created_by = ?"; params.push(created_by); }
    if (last_updated_by) { baseQuery += " AND last_updated_by = ?"; params.push(last_updated_by); }
    if (created_from) { baseQuery += " AND date(created_at) >= date(?)"; params.push(created_from); }
    if (created_to) { baseQuery += " AND date(created_at) <= date(?)"; params.push(created_to); }
    if (updated_from) { baseQuery += " AND date(last_updated_at) >= date(?)"; params.push(updated_from); }
    if (updated_to) { baseQuery += " AND date(last_updated_at) <= date(?)"; params.push(updated_to); }

    const rows = await all(baseQuery, params);

    const data = rows.map((row) => ({
      song_id: row.song_id,
      song_name: row.song_name,
      main_stanza: row.main_stanza ? JSON.parse(row.main_stanza) : undefined,
      stanzas: row.stanzas ? JSON.parse(row.stanzas) : undefined,
      created_at: row.created_at,
      last_updated_at: row.last_updated_at,
      created_by: row.created_by,
      last_updated_by: row.last_updated_by,
    }));

    res.json(data);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/songs/:id", async (req, res) => {
  try {
    const row = await get("SELECT * FROM songs WHERE song_id = ?", [req.params.id]);
    if (!row) return res.status(404).send("Song not found");
    res.json({
      song_id: row.song_id,
      song_name: row.song_name,
      main_stanza: row.main_stanza ? JSON.parse(row.main_stanza) : undefined,
      stanzas: row.stanzas ? JSON.parse(row.stanzas) : undefined,
      created_at: row.created_at,
      last_updated_at: row.last_updated_at,
      created_by: row.created_by,
      last_updated_by: row.last_updated_by,
    });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.delete("/songs/:id", async (req, res) => {
  try {
    const r = await run("DELETE FROM songs WHERE song_id = ?", [req.params.id]);
    if (!r.rowsAffected) return res.status(404).send("Song not found.");
    res.send("Song deleted successfully.");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.delete("/songs/by-name/:name", async (req, res) => {
  try {
    const r = await run(
      "DELETE FROM songs WHERE LOWER(song_name) = LOWER(?)",
      [req.params.name]
    );
    if (!r.rowsAffected) return res.status(404).send("No song found with that name.");
    res.send("Song(s) deleted successfully.");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// -------------------------------
// ✅ Psalms API
// -------------------------------
app.post("/psalms", async (req, res) => {
  try {
    const { chapter, verse, telugu, english } = req.body;
    if (!chapter || !verse || !telugu || !english)
      return res.status(400).send("All fields are required.");
    const r = await run(
      "INSERT INTO psalms (chapter, verse, telugu, english) VALUES (?, ?, ?, ?)",
      [chapter, verse, telugu, english]
    );
    res.send({ id: Number(r.lastInsertRowid) });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/psalms/:chapter/range", async (req, res) => {
  try {
    const { start, end } = req.query;
    const rows = await all(
      "SELECT * FROM psalms WHERE chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse ASC",
      [req.params.chapter, start, end]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/psalms/:chapter/:verse", async (req, res) => {
  try {
    const row = await get(
      "SELECT * FROM psalms WHERE chapter = ? AND verse = ?",
      [req.params.chapter, req.params.verse]
    );
    if (!row) return res.status(404).send("Verse not found.");
    res.json(row);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/psalms/:chapter", async (req, res) => {
  try {
    const rows = await all(
      "SELECT * FROM psalms WHERE chapter = ? ORDER BY verse ASC",
      [req.params.chapter]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.put("/psalms/:id", async (req, res) => {
  try {
    const { chapter, verse, telugu, english } = req.body;
    const r = await run(
      "UPDATE psalms SET chapter = ?, verse = ?, telugu = ?, english = ? WHERE id = ?",
      [chapter, verse, telugu, english, req.params.id]
    );
    if (!r.rowsAffected) return res.status(404).send("Psalm not found.");
    res.send("Psalm updated.");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.delete("/psalms/:id", async (req, res) => {
  try {
    const r = await run("DELETE FROM psalms WHERE id = ?", [req.params.id]);
    if (!r.rowsAffected) return res.status(404).send("Psalm not found.");
    res.send("Psalm deleted successfully.");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.post("/psalms/bulk", async (req, res) => {
  try {
    const verses = req.body;
    if (!Array.isArray(verses) || verses.length === 0)
      return res.status(400).send("Must be a non-empty array of verses.");

    // Simple transaction for consistency
    await run("BEGIN");
    for (const { chapter, verse, telugu, english } of verses) {
      if (chapter && verse && telugu && english) {
        await run(
          "INSERT INTO psalms (chapter, verse, telugu, english) VALUES (?, ?, ?, ?)",
          [chapter, verse, telugu, english]
        );
      }
    }
    await run("COMMIT");

    res.send("Psalms inserted successfully.");
  } catch (e) {
    await run("ROLLBACK").catch(() => {});
    res.status(500).send(e.message);
  }
});

// -------------------------------
// ✅ Health Check
// -------------------------------
app.get("/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------
// ✅ Start Server
// -------------------------------
const PORT = process.env.PORT || 3000;

async function deleteOldPresentationsCompletely() {
  try {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const rows = await all(
      `SELECT presentationName
       FROM presentations
       GROUP BY presentationName
       HAVING MAX(datetime(createdDateTime)) < datetime(?)`,
      [twoDaysAgo]
    );

    const oldPresentationNames = rows.map(r => r.presentationName);
    if (oldPresentationNames.length === 0) {
      console.log("🧼 No stale presentations to delete.");
      return;
    }

    const placeholders = oldPresentationNames.map(() => '?').join(',');
    const r = await run(
      `DELETE FROM presentations WHERE presentationName IN (${placeholders})`,
      oldPresentationNames
    );
    console.log(`🧹 Deleted ${r.rowsAffected} slide(s) from presentations:`, oldPresentationNames);
  } catch (err) {
    console.error("❌ Error during cleanup:", err.message);
  }
}

function scheduleRandomCleanup() {
  const randomHour = Math.floor(Math.random() * 24);
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setDate(now.getDate() + 1);
  nextRun.setHours(randomHour, 0, 0, 0);
  const delay = nextRun - now;
  console.log(`⏰ Next cleanup scheduled at ${nextRun.toLocaleString()}`);

  setTimeout(async () => {
    await deleteOldPresentationsCompletely();
    scheduleRandomCleanup();
  }, delay);
}

(async () => {
  await initDb();
  await deleteOldPresentationsCompletely();
  scheduleRandomCleanup();
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
})();