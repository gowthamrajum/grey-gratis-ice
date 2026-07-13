// server.js (Turso/libSQL edition)
const express = require("express");
// const sqlite3 = require("sqlite3").verbose();
const { createClient } = require("@libsql/client");
const bodyParser = require("body-parser");
const stringSimilarity = require("string-similarity");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");

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

// Lightweight song list with pagination + search (no lyrics payload)
app.get("/songs/list", async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = (req.query.search || "").trim();
    const offset = (page - 1) * limit;

    const whereClause = search ? "WHERE song_name LIKE ?" : "";
    const searchParam = search ? [`%${search}%`] : [];

    const countRow = await get(`SELECT COUNT(*) as total FROM songs ${whereClause}`, searchParam);
    const total = Number(countRow.total);

    const rows = await all(
      `SELECT song_id, song_name, created_at, last_updated_at, created_by, last_updated_by
       FROM songs ${whereClause}
       ORDER BY last_updated_at DESC, song_id DESC
       LIMIT ? OFFSET ?`,
      [...searchParam, limit, offset]
    );

    res.json({
      songs: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.post("/songs", async (req, res) => {
  try {
    const { song_name, main_stanza, stanzas } = req.body;
    if (!song_name || !main_stanza || !stanzas)
      return res.status(400).send("Missing required fields");

    const rows = await all("SELECT song_id, song_name FROM songs", []);
    const conflict = rows.find(
      (song) => stringSimilarity.compareTwoStrings(song_name, song.song_name) >= 0.8
    );
    if (conflict) return res.status(409).json({
      matched_song: {
        song_id: conflict.song_id,
        song_name: conflict.song_name
      }
    });

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
// ✅ AI Lyrics Parser
// -------------------------------
app.post("/songs/parse-lyrics", async (req, res) => {
  try {
    const { rawLyrics } = req.body;
    if (!rawLyrics || !rawLyrics.trim()) {
      return res.status(400).json({ error: "rawLyrics is required" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(501).json({ error: "AI parsing not configured" });
    }

    const anthropic = new Anthropic({ apiKey });

    // Extract a likely song identifier from the first few lines for web search
    const firstLines = rawLyrics.trim().split("\n").slice(0, 3).join(" ").substring(0, 120);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        }
      ],
      messages: [
        {
          role: "user",
          content: `You are an expert in Telugu Christian worship songs.

STEP 1 — WEB SEARCH:
Search the web for this song to find properly structured lyrics. Try searching for:
- "${firstLines} Telugu Christian song lyrics"
- Any recognisable Telugu or English phrases from the lyrics below

Use the web search results to cross-reference and verify the song structure: which part is the pallavi (chorus), which are the charanams (stanzas), and ensure you have complete, accurate Telugu and English transliteration.

STEP 2 — PARSE:
Using BOTH the pasted lyrics AND any web results, produce a structured JSON.

RULES:
1. Identify the "main_stanza" (pallavi/chorus) — the part that repeats between stanzas. Include any bridge/pre-chorus sections here too.
2. Identify numbered stanzas (charanams) — the unique verse sections.
3. Each section must have BOTH Telugu and English transliteration lines. If the user only pasted one language for a section, use the web search results to fill in the other.
4. Remove (x2), (x3) repeat markers from the text.
5. Remove stanza number prefixes like "1.", "2." from the text.
6. If the same block of text appears multiple times, it's the chorus — include it only once in main_stanza.
7. The song_name should be the first meaningful English transliteration phrase (title of the song).
8. Keep Telugu lines as proper Telugu script. Keep English lines as English/Latin transliteration.
9. Each line should be a single displayable line (not too long — split long lines naturally at phrase boundaries).

IMPORTANT: After searching and analysing, return ONLY valid JSON as your final text output — no markdown fences, no explanation. Use this exact structure:
{
  "song_name": "English name of the song",
  "main_stanza": {
    "telugu": ["line1", "line2", ...],
    "english": ["transliteration1", "transliteration2", ...]
  },
  "stanzas": [
    {
      "stanza_number": 1,
      "telugu": ["line1", "line2", ...],
      "english": ["transliteration1", "transliteration2", ...]
    }
  ]
}

RAW LYRICS:
${rawLyrics}`
        }
      ]
    });

    // Claude may return multiple content blocks (tool_use, tool_result, text).
    // We need the final text block which contains the JSON.
    let jsonText = "";
    for (const block of message.content) {
      if (block.type === "text") {
        jsonText = block.text;
      }
    }

    if (!jsonText) {
      return res.status(500).json({ error: "No text response from AI" });
    }

    // Extract JSON (handle potential markdown wrapping)
    let jsonStr = jsonText.trim();
    if (jsonStr.startsWith("\`\`\`")) {
      jsonStr = jsonStr.replace(/^\`\`\`(?:json)?\n?/, "").replace(/\n?\`\`\`$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    res.json(parsed);
  } catch (err) {
    console.error("AI lyrics parse failed:", err.message);
    res.status(500).json({ error: "AI parsing failed", detail: err.message });
  }
});

// -------------------------------
// ✅ Health Check
// -------------------------------
app.get("/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------
// ✅ ESV (Crossway) proxy
// -------------------------------
// Holds the ESV API key SERVER-SIDE (ESV_API_KEY env var) so no client — desktop
// app or otherwise — ever needs it, and the key never lives in a public repo or
// build. Cantica calls these instead of api.esv.org directly. This is Crossway's
// intended model (fetch the text from your server). Non-commercial church use; the
// client shows the required ESV attribution. Small in-memory cache stays well
// under Crossway's 500-verse limit and is cleared on restart.
const ESV_API_KEY = process.env.ESV_API_KEY || "";
const esvCache = new Map(); // q -> { passages, canonical }
let esvCacheVerses = 0;
const ESV_CACHE_CAP = 450;

app.get("/esv/status", (req, res) => {
  res.json({ available: !!ESV_API_KEY });
});

app.get("/esv/passage", async (req, res) => {
  if (!ESV_API_KEY) return res.status(503).json({ error: "ESV not configured", needKey: true });
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "missing q" });

  const cached = esvCache.get(q);
  if (cached) return res.json(cached);

  const params = new URLSearchParams({
    q,
    "include-passage-references": "false",
    "include-verse-numbers": "true",
    "include-first-verse-numbers": "true",
    "include-footnotes": "false",
    "include-headings": "false",
    "include-short-copyright": "false",
    "include-passage-horizontal-lines": "false",
    "include-heading-horizontal-lines": "false",
    "indent-poetry": "false"
  });
  try {
    const r = await fetch(`https://api.esv.org/v3/passage/text/?${params.toString()}`, {
      headers: { Authorization: `Token ${ESV_API_KEY}` }
    });
    if (r.status === 401 || r.status === 403) return res.status(502).json({ error: "ESV key rejected" });
    if (!r.ok) return res.status(502).json({ error: `ESV HTTP ${r.status}` });
    const data = await r.json();
    const out = {
      passages: Array.isArray(data.passages) ? data.passages : [],
      canonical: data.canonical || q
    };
    const nVerses = ((out.passages[0] || "").match(/\[\d+\]/g) || []).length;
    if (esvCacheVerses + nVerses > ESV_CACHE_CAP) { esvCache.clear(); esvCacheVerses = 0; }
    esvCache.set(q, out);
    esvCacheVerses += nVerses;
    res.json(out);
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
});

// -------------------------------
// ✅ Live broadcast relay (Lumen Presenter → OBS browser source)
// -------------------------------
// A tiny in-memory pub/sub: the presenter POSTs the current live slide state; a
// web page / OBS Browser Source subscribes over SSE (or short-polls) and renders
// a transparent lyrics/scripture lower-third. No DB, no extra process — it just
// rides along on this service.
//
// OPEN BY DEFAULT: with no env vars set, publishing and viewing are open so the
// presenter can just press "Broadcast" — no keys to configure. Rooms are namespaced
// so installs don't collide. If you *want* to lock it down, set either/both of
// these and the matching side will then require it:
//   BROADCAST_ADMIN_TOKEN   — required to publish
//   BROADCAST_VIEWER_TOKEN  — required to view/subscribe
const BROADCAST_ADMIN_TOKEN = process.env.BROADCAST_ADMIN_TOKEN || "";
const BROADCAST_VIEWER_TOKEN = process.env.BROADCAST_VIEWER_TOKEN || "";
const broadcastRooms = new Map(); // room -> { rev, state, clients:Set<res> }

function bcRoom(name) {
  const key = String(name || "main").slice(0, 64);
  let r = broadcastRooms.get(key);
  if (!r) { r = { rev: 0, state: null, clients: new Set(), createdAt: Date.now(), updatedAt: 0 }; broadcastRooms.set(key, r); }
  return r;
}
function bcToken(req) {
  const h = req.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : (req.query.token || req.query.key || "");
}
function bcView(req) {
  return req.query.view === "users" ? "users" : req.query.view === "stream" ? "stream" : null;
}
// Project the stored state onto one channel. New presenters post a channel-
// partitioned payload { ...shared, users:{slide,next}, stream:{slide,next} }, so
// an item that's off-air for a channel never carries its lyrics to that
// channel's page. Pick the requested slice and flatten it to { ...shared, slide,
// next }. Legacy flat payloads (or no view) are returned unchanged.
function projectState(state, view) {
  if (!state || typeof state !== "object") return state;
  if (!state.users && !state.stream) return state; // legacy flat payload
  const chan = view === "users" ? state.users : view === "stream" ? state.stream : (state.stream || state.users);
  const { users, stream, ...shared } = state;
  return { ...shared, slide: chan ? chan.slide : null, next: chan ? chan.next : null };
}
function bcFrame(r, view) {
  return `event: state\ndata: ${JSON.stringify({ rev: r.rev, state: projectState(r.state, view) })}\n\n`;
}
// Optional gate: only enforced when a token is configured for that side.
function bcAllowed(configured, req) {
  return !configured || bcToken(req) === configured;
}

// Presenter publishes the current live state.
app.post("/broadcast/:room", (req, res) => {
  if (!bcAllowed(BROADCAST_ADMIN_TOKEN, req)) return res.status(401).json({ error: "unauthorized" });
  const r = bcRoom(req.params.room);
  r.state = req.body != null ? req.body : null;
  r.rev++;
  r.updatedAt = Date.now();
  // Each subscriber gets its own channel's projection (users vs stream).
  for (const c of r.clients) { try { c.res.write(bcFrame(r, c.view)); } catch (_) {} }
  res.json({ ok: true, rev: r.rev, clients: r.clients.size });
});

// Viewer polls the latest state (fallback when SSE is unavailable).
app.get("/broadcast/:room/state", (req, res) => {
  if (!bcAllowed(BROADCAST_VIEWER_TOKEN, req)) return res.status(401).json({ error: "unauthorized" });
  const r = bcRoom(req.params.room);
  res.set("Cache-Control", "no-store");
  res.json({ rev: r.rev, state: projectState(r.state, bcView(req)) });
});

// Viewer subscribes over Server-Sent Events (instant updates).
app.get("/broadcast/:room/stream", (req, res) => {
  if (!bcAllowed(BROADCAST_VIEWER_TOKEN, req)) return res.status(401).end();
  const r = bcRoom(req.params.room);
  const view = bcView(req);
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (res.flushHeaders) res.flushHeaders();
  res.write("retry: 3000\n\n");
  res.write(bcFrame(r, view)); // send current state immediately
  const client = { res, view };
  r.clients.add(client);
  const hb = setInterval(() => { try { res.write(": hb\n\n"); } catch (_) {} }, 15000);
  req.on("close", () => { clearInterval(hb); r.clients.delete(client); });
});

// The OBS overlay page itself (self-contained; token comes in the query string).
// Single source of truth is broadcast/obs.html in the Lumen app repo — we fetch
// the latest (cached 5 min) so pushing the app updates the overlay with no hand-
// copy. public/broadcast.html is the offline fallback if GitHub is unreachable.
const OVERLAY_URL = "https://raw.githubusercontent.com/gowthamrajum/lumen-presenter/main/broadcast/obs.html";
const OVERLAY_TTL_MS = 5 * 60 * 1000;
let overlayCache = { html: null, at: 0 };

async function getOverlay() {
  const now = Date.now();
  if (overlayCache.html && now - overlayCache.at < OVERLAY_TTL_MS) return overlayCache.html;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(OVERLAY_URL, { signal: controller.signal, headers: { "User-Agent": "lumen-relay" } });
    clearTimeout(t);
    if (res.ok) {
      const html = await res.text();
      if (html && /<html/i.test(html)) { overlayCache = { html, at: now }; return html; }
    }
  } catch (_) { /* fall through to fallback */ }
  if (overlayCache.html) return overlayCache.html; // serve a stale copy over nothing
  try { return require("fs").readFileSync(path.join(__dirname, "public", "broadcast.html"), "utf8"); } catch (_) { return null; }
}

app.get("/broadcast/:room/view", async (req, res) => {
  const html = await getOverlay();
  if (!html) return res.status(503).send("overlay unavailable");
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "no-store");
  res.send(html);
});

// -------------------------------
// ✅ Live sessions directory
// -------------------------------
// Two index pages that list the broadcasts currently on air:
//   GET /sessions      — operator/admin view: each session links to BOTH the
//                        User (full audience) page and the OBS lower-third.
//   GET /usersessions  — public view: each session links to the User page ONLY
//                        (no OBS overlay links) so it's safe to share widely.
// Backed by GET /sessions.json (the pages poll it, so the list stays live).
// A "session" is a room that has published state and was active recently.
const SESSION_TTL_MS = 60 * 60 * 1000; // treat a room silent for >1h as ended

// The slide currently visible on a channel. State may be channel-partitioned
// ({users,stream}) or a legacy flat payload. Returns null when nothing shows.
function currentSlide(st, chan) {
  if (!st || typeof st !== "object") return null;
  const flat = !st.users && !st.stream ? (st.slide || null) : null;
  if (chan === "users") return (st.users && st.users.slide) || flat || null;
  if (chan === "stream") return (st.stream && st.stream.slide) || flat || null;
  return (st.users && st.users.slide) || (st.stream && st.stream.slide) || flat || null;
}

function activeSessions(view) {
  const now = Date.now();
  const out = [];
  for (const [room, r] of broadcastRooms) {
    if (!r.updatedAt || now - r.updatedAt > SESSION_TTL_MS) continue;
    if (r.state == null) continue;
    const usersSlide = currentSlide(r.state, "users");
    const streamSlide = currentSlide(r.state, "stream");
    // Pick the slide for the requested directory; hide the room entirely when
    // it's off-air there (e.g. an item toggled off broadcast publishes nulls).
    const slide = view === "users" ? usersSlide : view === "stream" ? streamSlide : (usersSlide || streamSlide);
    if (!slide) continue;
    out.push({
      room,
      // A section label ("Pallavi", "John 3:16") or caption — never lyric bodies.
      label: (slide.label || slide.caption) || "On air",
      kind: slide.kind || "",
      hasUsers: !!usersSlide,
      hasStream: !!streamSlide,
      updatedAt: r.updatedAt,
      viewers: r.clients.size
    });
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

app.get("/sessions.json", (req, res) => {
  res.set("Cache-Control", "no-store");
  const view = req.query.view === "users" ? "users" : req.query.view === "stream" ? "stream" : null;
  res.json({ sessions: activeSessions(view), now: Date.now() });
});

// One self-contained page powers both directories; `showObs` toggles the OBS
// link column. The list is built on the client from /sessions.json (values are
// inserted with textContent / encodeURIComponent, so room names can't inject).
function sessionsPage(showObs) {
  const heading = showObs ? "Live Sessions" : "Live Services";
  const blurb = showObs
    ? "Broadcasts currently on air. Open the audience view, or grab the OBS lower-third."
    : "Services currently streaming. Tap one to watch.";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${heading} · Lumen</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    background: radial-gradient(circle at 50% 0%, #1c1440 0%, #0c0a1e 60%, #06050f 100%);
    color: #eef0f6; padding: 28px 18px 60px;
  }
  .wrap { max-width: 720px; margin: 0 auto; }
  .head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
  .mark { color: #ffd27f; font-size: 26px; line-height: 1; }
  h1 { font-size: 22px; margin: 0; font-weight: 800; letter-spacing: 0.01em; }
  .blurb { color: #a6accd; font-size: 13.5px; margin: 2px 0 22px; line-height: 1.5; }
  .live-dot { width: 9px; height: 9px; border-radius: 50%; background: #ff4d67; box-shadow: 0 0 10px #ff4d67; display: inline-block; }
  .list { display: flex; flex-direction: column; gap: 12px; }
  .card {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;
    flex-wrap: wrap;
  }
  .card .info { flex: 1; min-width: 0; }
  .card .title { font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px; }
  .card .sub { color: #9aa0c2; font-size: 12px; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #ff6b81; }
  .actions { display: flex; gap: 8px; flex: 0 0 auto; }
  a.btn {
    text-decoration: none; font-size: 13px; font-weight: 700; padding: 9px 14px; border-radius: 10px;
    border: 1px solid transparent; white-space: nowrap;
  }
  a.user { background: linear-gradient(180deg, #4f83ff, #3f6fe0); color: #fff; }
  a.user:active { transform: translateY(1px); }
  a.obs { background: rgba(255,255,255,0.08); color: #dfe3f2; border-color: rgba(255,255,255,0.14); }
  .empty { text-align: center; color: #9aa0c2; padding: 60px 20px; line-height: 1.6; }
  .empty .mk { font-size: 40px; color: #ffd27f; margin-bottom: 10px; }
  .foot { color: #6b7099; font-size: 11px; text-align: center; margin-top: 26px; }
</style>
</head>
<body data-obs="${showObs ? "1" : "0"}">
  <div class="wrap">
    <div class="head"><span class="mark">&#10022;</span><h1>${heading}</h1></div>
    <div class="blurb">${blurb}</div>
    <div id="list" class="list"></div>
    <div id="empty" class="empty" hidden>
      <div class="mk">&#10022;</div>
      <div>No live services right now.<br/>This page updates automatically when one starts.</div>
    </div>
    <div class="foot">Auto-updating · Lumen Presenter</div>
  </div>
<script>
  var SHOW_OBS = document.body.getAttribute('data-obs') === '1';
  function ago(ts, now) {
    var s = Math.max(0, Math.round((now - ts) / 1000));
    if (s < 5) return 'just now';
    if (s < 60) return s + 's ago';
    var m = Math.round(s / 60);
    if (m < 60) return m + 'm ago';
    return Math.round(m / 60) + 'h ago';
  }
  function viewUrl(room, mode) {
    var u = '/broadcast/' + encodeURIComponent(room) + '/view';
    return mode === 'audience' ? u + '?mode=audience' : u;
  }
  function render(data) {
    var list = document.getElementById('list');
    var empty = document.getElementById('empty');
    var sessions = (data && data.sessions) || [];
    list.textContent = '';
    empty.hidden = sessions.length > 0;
    sessions.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'card';

      var info = document.createElement('div');
      info.className = 'info';
      var title = document.createElement('div');
      title.className = 'title';
      var dot = document.createElement('span');
      dot.className = 'live-dot';
      var tt = document.createElement('span');
      tt.textContent = s.label || 'On air';
      title.appendChild(dot); title.appendChild(tt);
      var sub = document.createElement('div');
      sub.className = 'sub';
      var viewers = s.viewers ? (' · ' + s.viewers + ' watching') : '';
      sub.textContent = s.room + ' · ' + ago(s.updatedAt, data.now) + viewers;
      info.appendChild(title); info.appendChild(sub);

      var actions = document.createElement('div');
      actions.className = 'actions';
      if (s.hasUsers !== false) {
        var user = document.createElement('a');
        user.className = 'btn user';
        user.href = viewUrl(s.room, 'audience');
        user.target = '_blank'; user.rel = 'noopener';
        user.textContent = 'Watch';
        actions.appendChild(user);
      }
      if (SHOW_OBS && s.hasStream) {
        var obs = document.createElement('a');
        obs.className = 'btn obs';
        obs.href = viewUrl(s.room, 'obs');
        obs.target = '_blank'; obs.rel = 'noopener';
        obs.textContent = 'OBS';
        actions.appendChild(obs);
      }

      card.appendChild(info); card.appendChild(actions);
      list.appendChild(card);
    });
  }
  // The user directory only lists rooms with User (audience) content; the
  // operator directory lists any on-air room.
  var VIEW_QS = SHOW_OBS ? '' : '?view=users';
  function tick() {
    fetch('/sessions.json' + VIEW_QS, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(render)
      .catch(function () {});
  }
  tick();
  setInterval(tick, 8000);
</script>
</body>
</html>`;
}

app.get("/sessions", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.type("html").send(sessionsPage(true));
});
app.get("/usersessions", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.type("html").send(sessionsPage(false));
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