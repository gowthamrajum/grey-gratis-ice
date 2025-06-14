const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const stringSimilarity = require("string-similarity");
const cors = require("cors");

const app = express();
const db = new sqlite3.Database("./data/sqlite.db");
// ✅ Middlewares
app.use(cors({
  origin: function (origin, callback) {
    // ✅ Allow Electron (no origin), Vite dev, and Glitch frontend
    const allowedOrigins = [
      "http://localhost:5173",
      "https://your-glitch-app.glitch.me"
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

app.options('*', cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use((req, res, next) => req.method === "OPTIONS" ? res.sendStatus(204) : next());

// -------------------------------
// ✅ DB Setup
// -------------------------------
db.serialize(() => {
  db.run(`
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

  db.run(`
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

  db.run(`
    CREATE TABLE IF NOT EXISTS psalms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      telugu TEXT NOT NULL,
      english TEXT NOT NULL
    )
  `);

  // Patch old records if needed
  db.run(`
    UPDATE songs
    SET 
      created_at = COALESCE(created_at, datetime('now')),
      last_updated_at = COALESCE(last_updated_at, datetime('now')),
      created_by = COALESCE(created_by, 'System'),
      last_updated_by = COALESCE(last_updated_by, '')
  `);
});

// -------------------------------
// ✅ Presentations API
// -------------------------------
app.post("/presentations", (req, res) => {
  const { presentationName, createdDateTime } = req.body;
  if (!presentationName || !createdDateTime)
    return res.status(400).send("presentationName and createdDateTime required.");
  res.status(201).send("Presentation initialized.");
});

app.post("/presentations/slide", (req, res) => {
  const { presentationName, slideOrder, slideData, randomId } = req.body;
  if (!presentationName || !slideData || !randomId)
    return res.status(400).send("presentationName, randomId and slideData are required.");
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO presentations (randomId, presentationName, slideOrder, slideData, createdDateTime, updatedDateTime)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [randomId, presentationName, slideOrder ?? null, slideData, now, now],
    function (err) {
      if (err) return res.status(500).send(err.message);
      res.status(201).send("Slide added.");
    }
  );
});

app.get("/presentations/older", (req, res) => {
  const hours = parseInt(req.query.hours) || 48;
  const thresholdDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  db.all(
    `SELECT presentationName, MIN(createdDateTime) AS createdDateTime
     FROM presentations
     WHERE datetime(createdDateTime) < datetime(?)
     GROUP BY presentationName
     ORDER BY createdDateTime DESC`,
    [thresholdDate],
    (err, rows) => {
      if (err) return res.status(500).send(err.message);
      res.json(rows);
    }
  );
});

app.put("/presentations/slide", (req, res) => {
  const { presentationName, randomId, slideData } = req.body;
  if (!presentationName || !randomId || !slideData)
    return res.status(400).send("presentationName, randomId and slideData are required.");
  const now = new Date().toISOString();
  db.run(
    `UPDATE presentations SET slideData = ?, updatedDateTime = ? WHERE presentationName = ? AND randomId = ?`,
    [slideData, now, presentationName, randomId],
    function (err) {
      if (err) return res.status(500).send(err.message);
      if (this.changes === 0) return res.status(404).send("Slide not found.");
      res.send("Slide updated.");
    }
  );
});

app.get("/presentations/:name/slides", (req, res) => {
  db.all(
    `SELECT randomId, slideData, createdDateTime 
     FROM presentations 
     WHERE presentationName = ? 
     ORDER BY datetime(createdDateTime) ASC`,
    [req.params.name],
    (err, rows) => {
      if (err) return res.status(500).send(err.message);
      res.json(rows);
    }
  );
});

app.delete("/presentations/slide/:presentationName/:randomId", (req, res) => {
  db.run(
    `DELETE FROM presentations WHERE presentationName = ? AND randomId = ?`,
    [req.params.presentationName, req.params.randomId],
    function (err) {
      if (err) return res.status(500).send(err.message);
      if (this.changes === 0) return res.status(404).send("Slide not found.");
      res.send(`Slide with ID "${req.params.randomId}" deleted.`);
    }
  );
});

app.get("/presentations", (req, res) => {
  db.all(
    `SELECT DISTINCT presentationName FROM presentations ORDER BY presentationName ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).send(err.message);
      res.json(rows.map(r => r.presentationName));
    }
  );
});
app.delete("/presentations/:presentationName", (req, res) => {
  const { presentationName } = req.params;
  db.run(
    `DELETE FROM presentations WHERE presentationName = ?`,
    [presentationName],
    function (err) {
      if (err) return res.status(500).send(err.message);
      if (this.changes === 0)
        return res.status(404).send("No presentation found with that name.");
      res.send(`Deleted ${this.changes} slide(s) from presentation "${presentationName}".`);
    }
  );
});
// -------------------------------
// ✅ Songs API
// -------------------------------
app.post("/songs", (req, res) => {
  const { song_name, main_stanza, stanzas } = req.body;
  if (!song_name || !main_stanza || !stanzas)
    return res.status(400).send("Missing required fields");

  db.all("SELECT * FROM songs", [], (err, rows) => {
    if (err) return res.status(500).send(err.message);

    const conflict = rows.find((song) =>
      stringSimilarity.compareTwoStrings(song_name, song.song_name) >= 0.8
    );
    if (conflict) return res.status(409).send("A similar song already exists");

    const now = new Date().toISOString();
    db.run(
      `INSERT INTO songs (song_name, main_stanza, stanzas, created_at, last_updated_at, created_by, last_updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [song_name, JSON.stringify(main_stanza), JSON.stringify(stanzas), now, now, "System", ""],
      function (err) {
        if (err) return res.status(500).send(err.message);
        res.json({ song_id: this.lastID });
      }
    );
  });
});

app.put("/songs/:id", (req, res) => {
  const { song_name, main_stanza, stanzas, last_updated_by } = req.body;
  const now = new Date().toISOString();
  const updatedBy = last_updated_by || "System";

  db.run(
    `UPDATE songs 
     SET song_name = ?, main_stanza = ?, stanzas = ?, last_updated_at = ?, last_updated_by = ? 
     WHERE song_id = ?`,
    [song_name, JSON.stringify(main_stanza), JSON.stringify(stanzas), now, updatedBy, req.params.id],
    function (err) {
      if (err) return res.status(500).send(err.message);
      if (this.changes === 0) return res.status(404).send("Song not found");
      res.send("Song updated");
    }
  );
});

app.get("/songs", (req, res) => {
  const { name, created_by, last_updated_by, created_from, created_to, updated_from, updated_to } = req.query;

  let baseQuery = "SELECT * FROM songs WHERE 1=1";
  const params = [];

  if (name) {
    baseQuery += " AND song_name LIKE ?";
    params.push(`%${name}%`);
  }

  if (created_by) {
    baseQuery += " AND created_by = ?";
    params.push(created_by);
  }

  if (last_updated_by) {
    baseQuery += " AND last_updated_by = ?";
    params.push(last_updated_by);
  }

  if (created_from) {
    baseQuery += " AND date(created_at) >= date(?)";
    params.push(created_from);
  }

  if (created_to) {
    baseQuery += " AND date(created_at) <= date(?)";
    params.push(created_to);
  }

  if (updated_from) {
    baseQuery += " AND date(last_updated_at) >= date(?)";
    params.push(updated_from);
  }

  if (updated_to) {
    baseQuery += " AND date(last_updated_at) <= date(?)";
    params.push(updated_to);
  }

  db.all(baseQuery, params, (err, rows) => {
    if (err) return res.status(500).send(err.message);

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
  });
});

app.get("/songs/:id", (req, res) => {
  db.get("SELECT * FROM songs WHERE song_id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).send(err.message);
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
  });
});

app.delete("/songs/:id", (req, res) => {
  db.run("DELETE FROM songs WHERE song_id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).send(err.message);
    if (this.changes === 0) return res.status(404).send("Song not found.");
    res.send("Song deleted successfully.");
  });
});

app.delete("/songs/by-name/:name", (req, res) => {
  db.run(
    "DELETE FROM songs WHERE LOWER(song_name) = LOWER(?)",
    [req.params.name],
    function (err) {
      if (err) return res.status(500).send(err.message);
      if (this.changes === 0) return res.status(404).send("No song found with that name.");
      res.send("Song(s) deleted successfully.");
    }
  );
});

// -------------------------------
// ✅ Psalms API (unchanged)
// -------------------------------
// (keep your psalms APIs here...)

// Psalms APIs
app.post("/psalms", (req, res) => {
  const { chapter, verse, telugu, english } = req.body;
  if (!chapter || !verse || !telugu || !english)
    return res.status(400).send("All fields are required.");
  db.run(
    "INSERT INTO psalms (chapter, verse, telugu, english) VALUES (?, ?, ?, ?)",
    [chapter, verse, telugu, english],
    function (err) {
      if (err) return res.status(500).send(err.message);
      res.send({ id: this.lastID });
    }
  );
});

app.get("/psalms/:chapter/range", (req, res) => {
  const { start, end } = req.query;
  db.all(
    "SELECT * FROM psalms WHERE chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse ASC",
    [req.params.chapter, start, end],
    (err, rows) => {
      if (err) return res.status(500).send(err.message);
      res.json(rows);
    }
  );
});

app.get("/psalms/:chapter/:verse", (req, res) => {
  db.get(
    "SELECT * FROM psalms WHERE chapter = ? AND verse = ?",
    [req.params.chapter, req.params.verse],
    (err, row) => {
      if (err) return res.status(500).send(err.message);
      if (!row) return res.status(404).send("Verse not found.");
      res.json(row);
    }
  );
});

app.get("/psalms/:chapter", (req, res) => {
  db.all(
    "SELECT * FROM psalms WHERE chapter = ? ORDER BY verse ASC",
    [req.params.chapter],
    (err, rows) => {
      if (err) return res.status(500).send(err.message);
      res.json(rows);
    }
  );
});

app.put("/psalms/:id", (req, res) => {
  const { chapter, verse, telugu, english } = req.body;
  db.run(
    "UPDATE psalms SET chapter = ?, verse = ?, telugu = ?, english = ? WHERE id = ?",
    [chapter, verse, telugu, english, req.params.id],
    function (err) {
      if (err) return res.status(500).send(err.message);
      if (this.changes === 0) return res.status(404).send("Psalm not found.");
      res.send("Psalm updated.");
    }
  );
});

app.delete("/psalms/:id", (req, res) => {
  db.run("DELETE FROM psalms WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).send(err.message);
    if (this.changes === 0) return res.status(404).send("Psalm not found.");
    res.send("Psalm deleted successfully.");
  });
});
app.post("/psalms/bulk", (req, res) => {
  const verses = req.body;
  if (!Array.isArray(verses) || verses.length === 0)
    return res.status(400).send("Must be a non-empty array of verses.");

  const stmt = db.prepare("INSERT INTO psalms (chapter, verse, telugu, english) VALUES (?, ?, ?, ?)");
  
  db.serialize(() => {
    verses.forEach(({ chapter, verse, telugu, english }) => {
      if (chapter && verse && telugu && english)
        stmt.run([chapter, verse, telugu, english]);
    });

    stmt.finalize((err) => {
      if (err) return res.status(500).send(err.message);
      res.send("Psalms inserted successfully.");
    });
  });
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
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});