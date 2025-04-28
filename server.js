const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const stringSimilarity = require("string-similarity");
const cors = require("cors");

const app = express();
const db = new sqlite3.Database("sqlite.db");

// ✅ Middlewares
app.use(cors({
  origin: (_, cb) => cb(null, true),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
  optionsSuccessStatus: 204,
}));
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
      stanzas TEXT NOT NULL
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
});

// -------------------------------
// ✅ Slide API
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

app.put("/presentations/slide", (req, res) => {
  const { presentationName, randomId, slideData } = req.body;
  if (!presentationName || !randomId || !slideData)
    return res.status(400).send("presentationName, randomId and slideData are required.");
  const now = new Date().toISOString();
  db.run(
    `UPDATE presentations 
     SET slideData = ?, updatedDateTime = ? 
     WHERE presentationName = ? AND randomId = ?`,
    [slideData, now, presentationName, randomId],
    function (err) {
      if (err) return res.status(500).send(err.message);
      if (this.changes === 0) return res.status(404).send("Slide not found.");
      res.send("Slide updated.");
    }
  );
});

app.delete("/presentations/slide/:presentationName/:randomId", (req, res) => {
  const { presentationName, randomId } = req.params;
  db.run(
    `DELETE FROM presentations WHERE presentationName = ? AND randomId = ?`,
    [presentationName, randomId],
    function (err) {
      if (err) return res.status(500).send(err.message);
      if (this.changes === 0) return res.status(404).send("Slide not found.");
      res.send(`Slide with ID "${randomId}" deleted.`);
    }
  );
});

app.get("/presentations/:name/slides", (req, res) => {
  const name = req.params.name;
  db.all(
    `SELECT randomId, slideData, createdDateTime 
     FROM presentations 
     WHERE presentationName = ? 
     ORDER BY datetime(createdDateTime) ASC`,
    [name],
    (err, rows) => {
      if (err) return res.status(500).send(err.message);
      res.json(rows);
    }
  );
});

app.get("/slide/:randomId", (req, res) => {
  db.get(`SELECT slideData FROM presentations WHERE randomId = ?`, [req.params.randomId], (err, row) => {
    if (err) return res.status(500).send(err.message);
    if (!row) return res.status(404).send("Slide not found.");
    res.send(row.slideData);
  });
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
app.get("/presentations", (req, res) => {
  db.all(
    `SELECT DISTINCT presentationName FROM presentations ORDER BY presentationName ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).send(err.message);
      const names = rows.map((row) => row.presentationName);
      res.json(names);
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

    db.run(
      "INSERT INTO songs (song_name, main_stanza, stanzas) VALUES (?, ?, ?)",
      [song_name, JSON.stringify(main_stanza), JSON.stringify(stanzas)],
      function (err) {
        if (err) return res.status(500).send(err.message);
        res.json({ song_id: this.lastID });
      }
    );
  });
});

app.put("/songs/:id", (req, res) => {
  const { song_name, main_stanza, stanzas } = req.body;
  db.run(
    "UPDATE songs SET song_name = ?, main_stanza = ?, stanzas = ? WHERE song_id = ?",
    [song_name, JSON.stringify(main_stanza), JSON.stringify(stanzas), req.params.id],
    function (err) {
      if (err) return res.status(500).send(err.message);
      if (this.changes === 0) return res.status(404).send("Song not found");
      res.send("Song updated");
    }
  );
});

app.get("/songs", (req, res) => {
  const { name } = req.query;
  const query = name
    ? ["SELECT * FROM songs WHERE song_name LIKE ?", [`%${name}%`]]
    : ["SELECT song_id, song_name FROM songs", []];
  db.all(...query, (err, rows) => {
    if (err) return res.status(500).send(err.message);
    const data = rows.map((row) => ({
      ...row,
      main_stanza: row.main_stanza ? JSON.parse(row.main_stanza) : undefined,
      stanzas: row.stanzas ? JSON.parse(row.stanzas) : undefined,
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
      main_stanza: JSON.parse(row.main_stanza),
      stanzas: JSON.parse(row.stanzas),
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
// ✅ Psalms API
// -------------------------------
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
  if (!start || !end)
    return res.status(400).send("Provide start and end verse numbers.");
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
      res.send("Verses inserted successfully.");
    });
  });
});

app.delete("/psalms", (req, res) => {
  const { confirm } = req.query;
  if (confirm !== "yes")
    return res.status(400).send("Pass ?confirm=yes to delete all psalms.");
  db.run("DELETE FROM psalms", function (err) {
    if (err) return res.status(500).send(err.message);
    res.send(`All ${this.changes} verses deleted.`);
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
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});