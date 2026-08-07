// server.js (Turso/libSQL edition)
const express = require("express");
// const sqlite3 = require("sqlite3").verbose();
const { createClient } = require("@libsql/client");
const bodyParser = require("body-parser");
const stringSimilarity = require("string-similarity");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");
const { r2Config, presignUpload, MAX_BYTES: R2_MAX_BYTES } = require("./r2");
const push = require("./push");
const access = require("./access");

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

// ---------- author ----------
// The column is TEXT. It began as a bare English name, became a JSON object
// with one credit per language, and now holds a list of names per language —
// a song frequently has several writers ("Enosh Kumar, David Paluri &
// Elizabeth Cynthia"), and a single string forces every consumer to re-split it.
//
// Nothing is migrated up front: every read goes through fromColumn() and every
// write through toColumn(), so all three stored shapes keep working.
const AUTHOR_EN = "Authored by";   // English credits, English label
const AUTHOR_TE = "\u0c30\u0c1a\u0c28";           // Telugu credits, Telugu label ("rachana")
const AUTHOR_TE_LEGACY = "Rachana"; // the label before it was written in Telugu

function emptyAuthor() {
  return { [AUTHOR_EN]: [], [AUTHOR_TE]: [] };
}

// "A, B & C" -> ["A", "B", "C"]. Comma and ampersand are the only separators
// the data actually uses; splitting on anything else would cut real names.
function splitNames(v) {
  if (Array.isArray(v)) {
    return v.flatMap(splitNames);
  }
  if (typeof v !== "string") return [];
  return v
    .split(/\s*[,&]\s*/)
    .map((x) => x.trim().replace(/^[-\u2013\u2014,;]+|[-\u2013\u2014,;]+$/g, "").trim())
    .filter(Boolean);
}

// Column text -> the object the API hands out. Always both keys, always arrays.
function authorFromColumn(raw) {
  const out = emptyAuthor();
  if (raw === null || raw === undefined) return out;
  const s = String(raw).trim();
  if (!s) return out;
  if (s.startsWith("{")) {
    try {
      const o = JSON.parse(s);
      if (o && typeof o === "object" && !Array.isArray(o)) {
        const te = o[AUTHOR_TE] !== undefined ? o[AUTHOR_TE] : o[AUTHOR_TE_LEGACY];
        out[AUTHOR_EN] = splitNames(o[AUTHOR_EN]);
        out[AUTHOR_TE] = splitNames(te);
        return out;
      }
    } catch { /* not JSON after all — fall through and keep it as a name */ }
  }
  out[AUTHOR_EN] = splitNames(s);     // legacy row: a bare English name
  return out;
}

// What a client sent -> column text. Accepts the object form, an array, or a
// bare string, so older clients that still PUT a plain name keep working.
// Returns null when the caller said nothing, which the PUT COALESCEs into
// "leave it alone".
function authorToColumn(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return "";
    // Already the serialized map (an older deploy stored it as text, or a client
    // sent it pre-stringified). Re-encode it rather than filing the whole JSON
    // blob away as somebody's name.
    if (s.startsWith("{")) {
      try {
        const o = JSON.parse(s);
        if (o && typeof o === "object" && !Array.isArray(o) &&
            (AUTHOR_EN in o || AUTHOR_TE in o || AUTHOR_TE_LEGACY in o)) {
          return authorToColumn(o);
        }
      } catch { /* not the map — it really is a name */ }
    }
    return JSON.stringify({ ...emptyAuthor(), [AUTHOR_EN]: splitNames(s) });
  }
  if (Array.isArray(value)) {
    const en = splitNames(value);
    return en.length ? JSON.stringify({ ...emptyAuthor(), [AUTHOR_EN]: en }) : "";
  }
  if (typeof value === "object") {
    const teRaw = value[AUTHOR_TE] !== undefined ? value[AUTHOR_TE] : value[AUTHOR_TE_LEGACY];
    const en = splitNames(value[AUTHOR_EN]);
    const te = splitNames(teRaw);
    if (!en.length && !te.length) return "";
    return JSON.stringify({ [AUTHOR_EN]: en, [AUTHOR_TE]: te });
  }
  return null;
}

app.use(bodyParser.json({ limit: "50mb" }));

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://localhost:4178",
  // Cantica Live companion app (public read consumer of the broadcast relay)
  "https://gowthamrajum.github.io",
  "https://worshipready.onrender.com",
  "https://grey-gratis-ice.onrender.com",
  // Cantica Web — Telugu Community Church site on Render (custom domain + default)
  "https://live.teluguchurchdfw.org",
  "https://cantica-web.onrender.com"
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
    console.warn("CORS blocked:", origin);
    cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Shared background-image library for the Cantica presenter. Rehosted here (off
// worshipReady) so the desktop output, web audience and OBS overlay all load the
// same stable URLs — grey-gratis-ice.onrender.com/backgrounds/<category>/<file>.
// Drop more JPGs into public/backgrounds/<category>/ and they're served at once.
app.use("/backgrounds", express.static(path.join(__dirname, "public", "backgrounds"), { maxAge: "7d" }));
app.options("*", cors(corsOptions));

// -------------------------------
// DB Setup (same schema)
// -------------------------------
// CREATE TABLE IF NOT EXISTS cannot add a column: where a table already exists in
// production it is left exactly as it was, so a new column in the CREATE above
// reaches fresh databases only. ALTER TABLE is what actually adds it — and since
// it throws once the column is there, every restart after the first lands in the
// catch. Anything other than that one error is a real failure and rethrows.
async function addColumnIfMissing(table, columnDef) {
  try {
    await run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    console.log(`Added column to ${table}: ${columnDef}`);
  } catch (e) {
    if (!/duplicate column name/i.test((e && e.message) || "")) throw e;
  }
}

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
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serviceDay TEXT NOT NULL,
      serviceDate TEXT NOT NULL,
      serviceData TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      createdDateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedDateTime DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // One service per slot. The POST checks first and answers 409, but two callers
  // racing land here — so the constraint, not the check, is what guarantees it.
  await run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_services_date_day
    ON services (serviceDate, serviceDay)
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
      last_updated_by TEXT DEFAULT '',
      author TEXT DEFAULT '',
      source TEXT DEFAULT ''
    )
  `);

  // Who wrote the song. Blank for every existing song until someone fills it in.
  // Declared last above so a fresh database column-orders the same way a migrated
  // one does (ALTER can only append).
  await addColumnIfMissing("songs", "author TEXT DEFAULT ''");

  // Which catalogue a song was taken from, so a later import can tell what it
  // already holds without re-matching lyrics. Short slugs: "clz", "sv".
  await addColumnIfMissing("songs", "source TEXT DEFAULT ''");

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
      last_updated_by = COALESCE(last_updated_by, ''),
      author = COALESCE(author, ''),
      source = COALESCE(source, '')
  `);
}

// -------------------------------
// Presentations API
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
// Services API (saved worship services)
// -------------------------------
// A service is one gathering: the day it happens ("Sunday", "Sunday Morning",
// "Good Friday"), the calendar date, and the whole deck as one JSON object —
// items, background, theme, whatever the presenter saves. serviceData is stored
// verbatim as TEXT so the server never has to know the deck's shape; the
// body-parser limit (50mb) is the only bound on how big it gets.
//
// (serviceDate, serviceDay) is UNIQUE. Posting the same slot twice answers 409
// with the existing row and the exact call to edit it, rather than silently
// forking a second copy of the same service.
//
// Retention: a service is tagged active on creation and purged automatically
// once its serviceDate is more than SERVICE_RETENTION_DAYS old (see
// purgeExpiredServices below), so this table stays small on its own.
const SERVICE_RETENTION_DAYS = 7;

// Accept 'YYYY-MM-DD' or any ISO string starting with one; keep just the date so
// stored dates compare lexicographically (which is also chronologically).
function normalizeServiceDate(v) {
  const m = String(v == null ? "" : v).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}
// The deck arrives as a JSON object; a caller that already stringified it works too.
function serializeServiceData(v) {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() ? v : null;
  if (typeof v === "object") { try { return JSON.stringify(v); } catch (_) { return null; } }
  return null;
}
function parseServiceData(s) {
  try { return JSON.parse(s); } catch (_) { return s; }
}
function isUniqueViolation(e) {
  return /UNIQUE constraint failed/i.test((e && e.message) || "");
}
function serviceRow(row) {
  return {
    id: Number(row.id),
    serviceDay: row.serviceDay,
    serviceDate: row.serviceDate,
    active: !!row.active,
    createdDateTime: row.createdDateTime,
    updatedDateTime: row.updatedDateTime
  };
}
// The 409 body: everything the caller needs to switch from "create" to "edit"
// without a second round-trip to find the existing service.
function serviceConflict(existing) {
  return {
    error: "conflict",
    message: `A service already exists for ${existing.serviceDay} on ${existing.serviceDate}. Edit the existing service instead of creating a new one.`,
    existing: serviceRow(existing),
    editWith: { method: "PUT", url: `/services/${Number(existing.id)}` }
  };
}

// Create a service.
// -------------------------------
// Services: change feed
// -------------------------------
// Cantica polls /services to notice that Sunday's set has moved on, and a poll
// is only ever as fresh as its interval. This is the push side: every create,
// edit, delete and purge announces itself, so a save on the phone reaches the
// projection machine while the person who made it is still looking at it.
//
// Deliberately contentless — an event says "services changed", not what to. The
// listener already knows how to fetch what it needs, and a payload here would
// be a second copy of that logic to keep in step.
const serviceClients = new Set();

function servicesChanged(what) {
  const frame = `event: services\ndata: ${JSON.stringify({ what, at: Date.now() })}\n\n`;
  for (const res of serviceClients) {
    try { res.write(frame); } catch (_) { serviceClients.delete(res); }
  }
}

app.get("/services/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (res.flushHeaders) res.flushHeaders();
  res.write("retry: 3000\n\n");
  res.write(`event: services\ndata: ${JSON.stringify({ what: "hello", at: Date.now() })}\n\n`);
  serviceClients.add(res);
  const hb = setInterval(() => { try { res.write(": hb\n\n"); } catch (_) {} }, 15000);
  req.on("close", () => { clearInterval(hb); serviceClients.delete(res); });
});

app.post("/services", async (req, res) => {
  const { serviceDay, serviceDate, serviceData } = req.body || {};
  const day = String(serviceDay == null ? "" : serviceDay).trim();
  const date = normalizeServiceDate(serviceDate);
  const data = serializeServiceData(serviceData);
  if (!day) return res.status(400).send("serviceDay is required.");
  if (!date) return res.status(400).send("serviceDate is required (YYYY-MM-DD).");
  if (!data) return res.status(400).send("serviceData (a JSON object) is required.");

  try {
    const clash = await get(
      `SELECT id, serviceDay, serviceDate, active, createdDateTime, updatedDateTime
       FROM services WHERE serviceDate = ? AND serviceDay = ?`,
      [date, day]
    );
    if (clash) return res.status(409).json(serviceConflict(clash));

    const now = new Date().toISOString();
    const r = await run(
      `INSERT INTO services (serviceDay, serviceDate, serviceData, active, createdDateTime, updatedDateTime)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [day, date, data, now, now]
    );
    servicesChanged("created");
    res.status(201).json({
      id: Number(r.lastInsertRowid),
      serviceDay: day,
      serviceDate: date,
      active: true,
      createdDateTime: now,
      updatedDateTime: now
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      // Lost the race between the check above and the insert — same answer.
      const clash = await get(
        `SELECT id, serviceDay, serviceDate, active, createdDateTime, updatedDateTime
         FROM services WHERE serviceDate = ? AND serviceDay = ?`,
        [date, day]
      ).catch(() => null);
      if (clash) return res.status(409).json(serviceConflict(clash));
    }
    res.status(500).send(e.message);
  }
});

// List every service. Deliberately WITHOUT serviceData — the decks are large and
// a directory only needs the labels. Optional ?from=&to= narrow by serviceDate.
app.get("/services", async (req, res) => {
  try {
    const from = normalizeServiceDate(req.query.from);
    const to = normalizeServiceDate(req.query.to);

    let sql = `SELECT id, serviceDay, serviceDate, active, createdDateTime, updatedDateTime,
                      LENGTH(serviceData) AS serviceDataLength
               FROM services WHERE 1=1`;
    const params = [];
    if (from) { sql += " AND serviceDate >= ?"; params.push(from); }
    if (to) { sql += " AND serviceDate <= ?"; params.push(to); }
    sql += " ORDER BY serviceDate DESC, id DESC";

    const rows = await all(sql, params);
    res.json({
      services: rows.map((row) => ({
        ...serviceRow(row),
        // characters, not bytes — a cheap "how big is this deck" for the list UI
        serviceDataLength: Number(row.serviceDataLength)
      })),
      total: rows.length,
      retentionDays: SERVICE_RETENTION_DAYS
    });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// One service, including the full deck.
app.get("/services/:id", async (req, res) => {
  try {
    const row = await get("SELECT * FROM services WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).send("Service not found.");
    res.json({ ...serviceRow(row), serviceData: parseServiceData(row.serviceData) });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// Edit an existing service — what a 409 from POST /services points the caller to.
// serviceData is replaced wholesale; day/date are only touched when supplied.
app.put("/services/:id", async (req, res) => {
  const { serviceDay, serviceDate, serviceData } = req.body || {};
  const data = serializeServiceData(serviceData);
  if (!data) return res.status(400).send("serviceData (a JSON object) is required.");
  const day = serviceDay === undefined ? null : String(serviceDay == null ? "" : serviceDay).trim();
  const date = serviceDate === undefined ? null : normalizeServiceDate(serviceDate);
  if (serviceDay !== undefined && !day) return res.status(400).send("serviceDay cannot be empty.");
  if (serviceDate !== undefined && !date) return res.status(400).send("serviceDate must be YYYY-MM-DD.");

  try {
    const now = new Date().toISOString();
    const sets = ["serviceData = ?", "updatedDateTime = ?"];
    const params = [data, now];
    if (day) { sets.push("serviceDay = ?"); params.push(day); }
    if (date) { sets.push("serviceDate = ?"); params.push(date); }
    params.push(req.params.id);

    const r = await run(`UPDATE services SET ${sets.join(", ")} WHERE id = ?`, params);
    if (!r.rowsAffected) return res.status(404).send("Service not found.");
    const row = await get(
      `SELECT id, serviceDay, serviceDate, active, createdDateTime, updatedDateTime
       FROM services WHERE id = ?`,
      [req.params.id]
    );
    servicesChanged("updated");
    res.json(serviceRow(row));
  } catch (e) {
    // Moving this service onto a slot another service already occupies.
    if (isUniqueViolation(e)) {
      return res.status(409).json({
        error: "conflict",
        message: "Another service already exists for that day and date. Edit that one instead."
      });
    }
    res.status(500).send(e.message);
  }
});

app.delete("/services/:id", async (req, res) => {
  try {
    const r = await run("DELETE FROM services WHERE id = ?", [req.params.id]);
    if (!r.rowsAffected) return res.status(404).send("Service not found.");
    servicesChanged("deleted");
    res.send("Service deleted.");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// -------------------------------
// Songs API
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
      `SELECT song_id, song_name, author, source, created_at, last_updated_at, created_by, last_updated_by
       FROM songs ${whereClause}
       ORDER BY last_updated_at DESC, song_id DESC
       LIMIT ? OFFSET ?`,
      [...searchParam, limit, offset]
    );

    res.json({
      songs: rows.map((r) => ({ ...r, author: authorFromColumn(r.author) })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// How many songs there are, and where they came from. Registered ahead of
// /songs/:id so "count" is read as the route and not as a song id.
//
// Songs POSTed before the source column existed — and any POSTed without one
// since — carry an empty source. They are reported as `untagged` rather than
// invented into a catalogue, so `sources` only ever names a real one.
app.get("/songs/count", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const whereClause = search ? "WHERE song_name LIKE ?" : "";
    const searchParam = search ? [`%${search}%`] : [];

    const rows = await all(
      `SELECT TRIM(COALESCE(source, '')) AS source, COUNT(*) AS n
       FROM songs ${whereClause}
       GROUP BY 1
       ORDER BY n DESC, source ASC`,
      searchParam
    );

    const sources = {};
    let untagged = 0;
    let total = 0;
    for (const r of rows) {
      const n = Number(r.n);
      total += n;
      if (r.source) sources[r.source] = n;
      else untagged += n;
    }

    res.json({ total, sources, untagged });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.post("/songs", async (req, res) => {
  try {
    const { song_name, main_stanza, stanzas, author, source } = req.body;
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
      `INSERT INTO songs (song_name, main_stanza, stanzas, author, source, created_at, last_updated_at, created_by, last_updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        song_name,
        JSON.stringify(main_stanza),
        JSON.stringify(stanzas),
        authorToColumn(author) ?? "",
        typeof source === "string" ? source.trim() : "",
        now, now, "System", ""
      ]
    );

    // libSQL returns lastInsertRowid
    res.json({ song_id: Number(r.lastInsertRowid) });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.put("/songs/:id", async (req, res) => {
  try {
    const { song_name, main_stanza, stanzas, last_updated_by, author, source } = req.body;
    const now = new Date().toISOString();
    const updatedBy = last_updated_by || "System";

    const r = await run(
      // author is COALESCEd rather than overwritten: the existing clients don't
      // know the field yet, and a PUT without it must not wipe an author someone
      // has already filled in.
      `UPDATE songs
       SET song_name = ?, main_stanza = ?, stanzas = ?, author = COALESCE(?, author), source = COALESCE(?, source), last_updated_at = ?, last_updated_by = ?
       WHERE song_id = ?`,
      [
        song_name,
        JSON.stringify(main_stanza),
        JSON.stringify(stanzas),
        authorToColumn(author),
        source === undefined || source === null ? null : String(source).trim(),
        now,
        updatedBy,
        req.params.id
      ]
    );
    if (!r.rowsAffected) return res.status(404).send("Song not found");
    res.send("Song updated");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/songs", async (req, res) => {
  try {
    const { name, author, created_by, last_updated_by, created_from, created_to, updated_from, updated_to } = req.query;

    let baseQuery = "SELECT * FROM songs WHERE 1=1";
    const params = [];

    if (name) { baseQuery += " AND song_name LIKE ?"; params.push(`%${name}%`); }
    // Partial match like song_name rather than exact like created_by: an author is
    // hand-typed, so "samuel" should find "Rev. K. Samuel".
    if (author) { baseQuery += " AND author LIKE ?"; params.push(`%${author}%`); }
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
      author: authorFromColumn(row.author),
      source: row.source || "",
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
      author: authorFromColumn(row.author),
      source: row.source || "",
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
// Psalms API
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
// AI Lyrics Parser
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
- "${firstLines} Telugu Christian song writer lyricist composer"
- Any recognisable Telugu or English phrases from the lyrics below

Use the web search results to cross-reference and verify the song structure: which part is the pallavi (chorus), which are the charanams (stanzas), and ensure you have complete, accurate Telugu and English transliteration. Note who WROTE the song if the results state it plainly.

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
10. "author" is the person who WROTE the song (lyricist/composer). Take it only from the web results, never from the pasted text alone. Telugu Christian songs are very often traditional or unattributed, and a wrong name is worse than no name: if the search does not clearly identify the writer, return "" and move on. Never infer an author from a singer, a YouTube channel, an uploader, an album, a music director or a church name — those are performers and publishers, not writers. Do not return hedges like "Unknown" or "Traditional"; return "" instead.

IMPORTANT: After searching and analysing, return ONLY valid JSON as your final text output — no markdown fences, no explanation. Use this exact structure:
{
  "song_name": "English name of the song",
  "author": "Who wrote the song, or \\"\\" if the search did not clearly establish it",
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
    // The author is best-effort — the model is told to return "" when the search
    // doesn't establish it. Normalize a missing/null/hedged value to "" so the
    // field is always a plain string the client can post straight to /songs.
    parsed.author = typeof parsed.author === "string" ? parsed.author.trim() : "";
    if (/^(unknown|traditional|n\/?a|none|not\s+found|unattributed|anonymous)\.?$/i.test(parsed.author)) {
      parsed.author = "";
    }
    res.json(parsed);
  } catch (err) {
    console.error("AI lyrics parse failed:", err.message);
    res.status(500).json({ error: "AI parsing failed", detail: err.message });
  }
});

// -------------------------------
// Service media
// -------------------------------
// A phone can put a welcome clip into Sunday's order, and the projection
// machine has to be able to fetch it. This relay cannot be where it lives — its
// disk is wiped on every restart — so the file goes to Cloudflare R2 and only
// its URL comes back here, inside the deck like any other background.
//
// The browser uploads DIRECTLY to R2 with a presigned URL. Nothing large passes
// through this instance: it signs, and that is all. See r2.js.
//
// Dormant until R2 is configured, and it says so rather than failing: the app
// asks first and hides the upload option, so nobody is offered something that
// cannot work.
// Notifications for the church app. Registered before the media routes only
// because they belong beside each other; both are self-contained and dormant
// until their keys are set.
push.register(app, { run, get, all });

// Who may open the builder, and who is holding a service open.
access.register(app);

app.get("/media/config", (req, res) => {
  res.json({ enabled: r2Config().ok, maxBytes: R2_MAX_BYTES });
});

app.post("/media/upload-url", (req, res) => {
  const { name, contentType, size } = req.body || {};
  const out = presignUpload(name, contentType, Number(size));
  if (out.error === "not-configured") {
    return res.status(503).json({ error: "not-configured", message: "No media store is configured." });
  }
  if (out.error === "type-not-allowed") {
    return res.status(415).json({ error: out.error, message: "That kind of file can't go in a service." });
  }
  if (out.error === "too-large") {
    return res
      .status(413)
      .json({ error: out.error, message: `Too big — the limit is ${Math.round(R2_MAX_BYTES / 1048576)} MB.` });
  }
  if (out.error) return res.status(400).json({ error: out.error, message: "That file couldn't be accepted." });
  res.json(out);
});

// -------------------------------
// Health Check
// -------------------------------
app.get("/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------
// ESV (Crossway) proxy
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
// Live broadcast relay (Lumen Presenter → OBS browser source)
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
  const v = req.query.view;
  return v === "users" ? "users" : v === "stream" ? "stream" : v === "operator" ? "operator" : null;
}
// Project the stored state onto one channel. New presenters post a channel-
// partitioned payload { ...shared, users:{slide,next}, stream:{slide,next},
// operator:{slide,next} }, so an item that's off-air for a channel never carries
// its lyrics to that channel's page. Pick the requested slice and flatten it to
// { ...shared, slide, next }. The `operator` slice is UNSUPPRESSED (a phone
// operator sees every slide like the desktop presenter); users/stream inherit
// the per-item broadcast restrictions. Legacy flat payloads are returned as-is.
function projectState(state, view) {
  if (!state || typeof state !== "object") return state;
  if (!state.users && !state.stream && !state.operator) return state; // legacy flat payload
  const chan =
    view === "operator" ? (state.operator || state.stream || state.users) :
    view === "users" ? state.users :
    view === "stream" ? state.stream :
    (state.stream || state.users);
  const { users, stream, operator, ...shared } = state;
  return { ...shared, slide: chan ? chan.slide : null, next: chan ? chan.next : null };
}
// Concurrent AUDIENCE watchers = SSE clients on the "users" channel (excludes the
// OBS overlay on "stream" and phone operators on "operator"). This is the number
// the audience/operator "who's watching" badge shows.
function usersCount(r) {
  let n = 0;
  for (const c of r.clients) if (c.view === "users") n++;
  return n;
}
function bcFrame(r, view) {
  return `event: state\ndata: ${JSON.stringify({ rev: r.rev, state: projectState(r.state, view), viewers: usersCount(r) })}\n\n`;
}
// A tiny standalone frame so the live watcher count updates the instant someone
// joins or leaves — not only when the next slide is published.
function viewersFrame(r) {
  return `event: viewers\ndata: ${JSON.stringify({ count: usersCount(r) })}\n\n`;
}
function broadcastViewers(r) {
  const frame = viewersFrame(r);
  for (const c of r.clients) { try { c.res.write(frame); } catch (_) {} }
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
  res.json({ rev: r.rev, state: projectState(r.state, bcView(req)), viewers: usersCount(r) });
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
  res.write(viewersFrame(r)); // this client's starting count (any channel)
  if (view === "users") broadcastViewers(r); // a watcher joined → tell the room
  const hb = setInterval(() => { try { res.write(": hb\n\n"); } catch (_) {} }, 15000);
  req.on("close", () => {
    clearInterval(hb);
    r.clients.delete(client);
    if (view === "users") broadcastViewers(r); // a watcher left → tell the room
  });
});

// -------------------------------
// Remote control channel (phone remote ⇄ desktop presenter)
// -------------------------------
// A phone "remote" can drive the SAME live deck the desktop presenter owns.
// The relay holds no deck — just as it mirrors state above, here it's only the
// command pipe. Flow:
//   1. The presenter opens the room's control STREAM, listening with the room's
//      control PIN. Subscribing registers/refreshes that PIN (the presenter is
//      the authority for its own random room slug). "Presenter" is the desktop
//      app or, since Cantica Web can broadcast a saved service itself, a phone.
//   2. A phone POSTs a command (next/prev/goto/blackout/clear/logo/end) with the PIN.
//   3. We fan the command out to the presenter, which runs it against its deck and
//      republishes state — so the phone sees the result on the normal state feed.
// Trust model matches the existing broadcast: the room slug is an unguessable
// random string, and the PIN adds a second factor specifically for control.
//
// `end` asks the presenter to take the room off air altogether. Like every other
// command the relay only carries it: the presenter is what stops publishing and
// blacks the room out, because the relay has no deck to stop.
// "verse" carries a payload rather than an index: the operator's phone already
// has both bibles, so it resolves the reference itself and sends the finished
// lines. That keeps the relay ignorant of scripture — it forwards `arg`
// verbatim, as it always has — and means the presenter needs no bible either.
const CONTROL_CMDS = new Set(["next", "prev", "goto", "blackout", "clear", "logo", "end", "verse"]);

function bcControl(r) {
  if (!r.control) r.control = { pin: "", clients: new Set(), seq: 0, updatedAt: 0, operator: null };
  return r.control;
}

// -------------------------------
// One remote at a time
// -------------------------------
// Two phones driving one deck fight each other: both hold a stale idea of where
// the service is, and every tap on one yanks the screen away from the other. So
// a room has a single OPERATOR SEAT, claimed by the phone that connects first
// and refused to any other.
//
// This constrains the REMOTE only. The presenter — the desktop, or the phone
// that started the broadcast from Cantica Web — drives its own deck directly and
// never posts here, so the originator always keeps control of its own service.
//
// The seat is a lease rather than a lock: the holder renews it while its screen
// is open, and a phone that goes flat or walks out of range stops renewing, so
// the seat frees itself instead of stranding the room until a restart.
const OPERATOR_TTL_MS = 40 * 1000;

/** The seat's current holder, or null once its lease has lapsed. */
function heldOperator(ctl) {
  if (!ctl.operator) return null;
  if (Date.now() - ctl.operator.at > OPERATOR_TTL_MS) {
    ctl.operator = null;
    return null;
  }
  return ctl.operator;
}

// Take the seat, or renew it. The same operatorId asking again is the heartbeat.
//
// `role` is only for saying who has it — "presenter" is the device the broadcast
// was started from, "remote" a phone that connected to it — so a refused phone
// can be told which of the two to go and ask.
//
// `force` takes the seat from whoever holds it. That is no new privilege: this
// call already requires the room's control PIN, and a PIN holder can drive the
// deck and end the broadcast outright. It exists so the device that started the
// broadcast can take back a seat it handed to a phone that has since wandered off.
app.post("/broadcast/:room/control/claim", (req, res) => {
  const ctl = bcControl(bcRoom(req.params.room));
  const body = req.body || {};
  const pin = String(body.pin || "");
  const who = String(body.operatorId || "");
  const role = body.role === "presenter" ? "presenter" : "remote";
  if (!ctl.pin) return res.status(409).json({ error: "presenter-offline" });
  if (pin !== ctl.pin) return res.status(401).json({ error: "bad-pin" });
  if (!who) return res.status(400).json({ error: "bad-operator" });
  const held = heldOperator(ctl);
  if (held && held.id !== who && !body.force) {
    return res.status(409).json({
      error: "operator-taken",
      role: held.role,
      since: held.since,
      freeInMs: OPERATOR_TTL_MS - (Date.now() - held.at)
    });
  }
  const now = Date.now();
  const mine = held && held.id === who;
  ctl.operator = { id: who, role, at: now, since: mine ? held.since : now };
  res.json({ ok: true, ttlMs: OPERATOR_TTL_MS, since: ctl.operator.since });
});

// Hand the seat back on the way out, so the next phone doesn't wait out the lease.
app.post("/broadcast/:room/control/release", (req, res) => {
  const ctl = bcControl(bcRoom(req.params.room));
  const who = String((req.body || {}).operatorId || "");
  const held = heldOperator(ctl);
  if (held && who && held.id === who) ctl.operator = null;
  res.json({ ok: true });
});

// Desktop presenter subscribes here (SSE) to receive remote commands. Passing a
// pin registers it as the room's control PIN.
app.get("/broadcast/:room/control/stream", (req, res) => {
  const r = bcRoom(req.params.room);
  const ctl = bcControl(r);
  const pin = String(req.query.pin || "");
  if (pin) { ctl.pin = pin; ctl.updatedAt = Date.now(); }
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (res.flushHeaders) res.flushHeaders();
  res.write("retry: 3000\n\n");
  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  ctl.clients.add(res);
  const hb = setInterval(() => { try { res.write(": hb\n\n"); } catch (_) {} }, 15000);
  req.on("close", () => {
    clearInterval(hb);
    ctl.clients.delete(res);
    // Nothing is presenting any more, so the seat belongs to no service: the
    // next broadcast in this room starts with it free rather than inheriting
    // whoever happened to be operating the last one.
    if (ctl.clients.size === 0) ctl.operator = null;
  });
});

// Phone remote posts a command. Requires the room's control PIN and a presenter
// actually listening (otherwise the command has nowhere to land).
app.post("/broadcast/:room/control", (req, res) => {
  const r = bcRoom(req.params.room);
  const ctl = bcControl(r);
  const body = req.body || {};
  const pin = String(body.pin || "");
  const cmd = String(body.cmd || "");
  if (!ctl.pin) return res.status(409).json({ error: "presenter-offline" });
  if (pin !== ctl.pin) return res.status(401).json({ error: "bad-pin" });
  if (!CONTROL_CMDS.has(cmd)) return res.status(400).json({ error: "bad-cmd" });
  if (ctl.clients.size === 0) return res.status(409).json({ error: "presenter-offline" });
  // Only the phone holding the seat may drive. An unclaimed room still accepts
  // commands, so a remote too old to claim one keeps working exactly as before.
  const held = heldOperator(ctl);
  if (held && held.id !== String(body.operatorId || "")) {
    return res.status(409).json({ error: "not-operator" });
  }
  // Driving is itself a sign of life, so it renews the lease.
  if (held) held.at = Date.now();
  ctl.seq++;
  const frame = `event: command\ndata: ${JSON.stringify({ seq: ctl.seq, cmd, arg: body.arg ?? null })}\n\n`;
  for (const c of ctl.clients) { try { c.write(frame); } catch (_) {} }
  res.json({ ok: true, seq: ctl.seq, presenters: ctl.clients.size });
});

// Phone remote checks a room before it starts sending (clean connect UX): is a
// presenter online, does the room require a PIN, is the given PIN right — and is
// somebody already operating it, so the second phone is turned away at the door
// rather than after it thinks it has connected.
app.get("/broadcast/:room/control/status", (req, res) => {
  const r = bcRoom(req.params.room);
  const ctl = bcControl(r);
  const pin = String(req.query.pin || "");
  const who = String(req.query.operatorId || "");
  const held = heldOperator(ctl);
  res.set("Cache-Control", "no-store");
  res.json({
    online: ctl.clients.size > 0,
    hasPin: !!ctl.pin,
    pinOk: !!ctl.pin && pin === ctl.pin,
    operatorHeld: !!held,
    operatorMine: !!held && !!who && held.id === who,
    operatorRole: held ? held.role || "remote" : null
  });
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
// Live sessions directory
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
    const slide = view === "users" ? usersSlide : view === "stream" ? streamSlide : (usersSlide || streamSlide);
    // List a room as soon as it's actively broadcasting (recent state) — even
    // before any slide is live. Until a slide goes live it shows the branded
    // standby; the operator no longer has to pick a slide for it to appear here.
    out.push({
      room,
      // Label by the presenter-published service name; fall back to a section
      // label / caption (never lyric bodies), then a waiting placeholder.
      label: (r.state && r.state.name) || (slide && (slide.label || slide.caption)) || "Waiting to start",
      kind: (slide && slide.kind) || "",
      hasUsers: !!usersSlide,
      hasStream: !!streamSlide,
      waiting: !slide,
      updatedAt: r.updatedAt,
      viewers: usersCount(r)
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
    : "Services currently on air. Tap one to watch.";
  const ICON = "https://raw.githubusercontent.com/gowthamrajum/lumen-presenter/main/build/apple-touch-icon.png?v=2";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0a0720" />
<title>${heading} · Cantica</title>
<link rel="apple-touch-icon" href="${ICON}" />
<link rel="icon" type="image/png" href="${ICON}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anek+Telugu:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  /* TailAdmin tokens (matches the Cantica audience app) */
  :root {
    color-scheme: dark;
    --brand-500: #465fff; --brand-600: #3641f5;
    --surface: radial-gradient(circle at 50% -8%, #1d2939 0%, #101828 55%, #0c111d 100%);
    --card: #1a2231; --card-border: #1d2939; --txt: #ffffff; --txt-muted: #98a2b3;
    --shadow: 0 1px 3px rgba(0,0,0,.28), 0 1px 2px rgba(0,0,0,.18);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; min-height: 100dvh;
    font-family: 'Anek Telugu', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    background: var(--surface); background-attachment: fixed; color: var(--txt);
    -webkit-font-smoothing: antialiased;
    padding: calc(28px + env(safe-area-inset-top)) 18px calc(60px + env(safe-area-inset-bottom));
  }
  .wrap { max-width: 640px; margin: 0 auto; }
  .head { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
  .mark { width: 34px; height: 34px; border-radius: 9px; flex: 0 0 auto; }
  h1 { font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -.01em; }
  .blurb { color: var(--txt-muted); font-size: 14px; margin: 2px 0 22px; line-height: 1.5; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #f04438;
    box-shadow: 0 0 0 4px rgba(240,68,56,.22); display: inline-block; flex: 0 0 auto; }
  .live-dot.waiting { background: #f79009; box-shadow: 0 0 0 4px rgba(247,144,9,.2); }
  .list { display: flex; flex-direction: column; gap: 12px; }
  .card {
    background: var(--card); border: 1px solid var(--card-border); box-shadow: var(--shadow);
    border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;
    flex-wrap: wrap; text-decoration: none; color: inherit;
    transition: border-color .2s ease, transform .05s ease;
  }
  a.card:hover { border-color: #2a3550; }
  a.card:active { transform: translateY(1px); }
  .card .info { flex: 1; min-width: 0; }
  .card .title { font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 9px; color: var(--txt); min-width: 0; }
  .card .title > span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card .sub { color: var(--txt-muted); font-size: 12px; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .actions { display: flex; gap: 8px; flex: 0 0 auto; }
  a.btn, span.btn {
    text-decoration: none; font-size: 13px; font-weight: 700; padding: 9px 15px; border-radius: 10px;
    border: 1px solid transparent; white-space: nowrap;
  }
  .btn.user { background: var(--brand-500); color: #fff; }
  a.obs { background: rgba(255,255,255,0.06); color: #d0d5dd; border-color: var(--card-border); }
  .empty { text-align: center; color: var(--txt-muted); padding: 64px 20px; line-height: 1.6; font-size: 14px; }
  .empty img { width: 64px; height: 64px; border-radius: 14px; opacity: .92; margin-bottom: 12px; }
  .foot { color: #667085; font-size: 11px; text-align: center; margin-top: 28px; }
</style>
</head>
<body data-obs="${showObs ? "1" : "0"}">
  <div class="wrap">
    <div class="head"><img class="mark" src="${ICON}" alt="" /><h1>${heading}</h1></div>
    <div class="blurb">${blurb}</div>
    <div id="list" class="list"></div>
    <div id="empty" class="empty" hidden>
      <img src="${ICON}" alt="" />
      <div>No live services right now.<br/>This page updates automatically when one starts.</div>
    </div>
    <div class="foot">Auto-updating · Cantica</div>
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
      // Audience directory: the whole card links straight to the channel page.
      // Operator directory: a plain card with Watch (new tab) + OBS buttons.
      var card = document.createElement(SHOW_OBS ? 'div' : 'a');
      card.className = 'card';
      if (!SHOW_OBS) card.href = viewUrl(s.room, 'audience');

      var info = document.createElement('div');
      info.className = 'info';
      var title = document.createElement('div');
      title.className = 'title';
      var dot = document.createElement('span');
      dot.className = 'live-dot' + (s.waiting ? ' waiting' : '');
      var tt = document.createElement('span');
      tt.textContent = s.label || 'On air';
      title.appendChild(dot); title.appendChild(tt);
      var sub = document.createElement('div');
      sub.className = 'sub';
      var viewers = s.viewers ? (' · ' + s.viewers + ' watching') : '';
      sub.textContent = (s.waiting ? 'Waiting to start · ' : '') + s.room + ' · ' + ago(s.updatedAt, data.now) + viewers;
      info.appendChild(title); info.appendChild(sub);

      var actions = document.createElement('div');
      actions.className = 'actions';
      if (SHOW_OBS) {
        if (s.hasUsers !== false) {
          var user = document.createElement('a');
          user.className = 'btn user';
          user.href = viewUrl(s.room, 'audience');
          user.target = '_blank'; user.rel = 'noopener';
          user.textContent = 'Watch';
          actions.appendChild(user);
        }
        if (s.hasStream) {
          var obs = document.createElement('a');
          obs.className = 'btn obs';
          obs.href = viewUrl(s.room, 'obs');
          obs.target = '_blank'; obs.rel = 'noopener';
          obs.textContent = 'OBS';
          actions.appendChild(obs);
        }
      } else {
        var go = document.createElement('span');
        go.className = 'btn user';
        go.textContent = 'Watch ›';
        actions.appendChild(go);
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
// Public audience directory: lists the services on air; tapping one opens that
// channel's page. Same as /usersessions, at a friendlier URL.
app.get("/broadcasts", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.type("html").send(sessionsPage(false));
});

// -------------------------------
// Start Server
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
      console.log("No stale presentations to delete.");
      return;
    }

    const placeholders = oldPresentationNames.map(() => '?').join(',');
    const r = await run(
      `DELETE FROM presentations WHERE presentationName IN (${placeholders})`,
      oldPresentationNames
    );
    console.log(`Deleted ${r.rowsAffected} slide(s) from presentations:`, oldPresentationNames);
  } catch (err) {
    console.error("Error during cleanup:", err.message);
  }
}

// Services are tagged active when created and live for SERVICE_RETENTION_DAYS
// past the date they were held; after that they're purged automatically so the
// table never grows without bound. The cutoff is compared against serviceDate
// (not createdDateTime) so a service planned weeks ahead is never purged before
// it happens. Stored dates are normalized 'YYYY-MM-DD', so a string compare is a
// date compare. Runs hourly, so a service outlives its window by at most an hour.
async function purgeExpiredServices() {
  try {
    const cutoff = new Date(Date.now() - SERVICE_RETENTION_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const r = await run("DELETE FROM services WHERE serviceDate < ?", [cutoff]);
    if (r.rowsAffected) {
      servicesChanged("purged");
      console.log(`Purged ${r.rowsAffected} service(s) older than ${SERVICE_RETENTION_DAYS} days (before ${cutoff}).`);
    }
  } catch (err) {
    console.error("Error purging services:", err.message);
  }
}

function scheduleRandomCleanup() {
  const randomHour = Math.floor(Math.random() * 24);
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setDate(now.getDate() + 1);
  nextRun.setHours(randomHour, 0, 0, 0);
  const delay = nextRun - now;
  console.log(`Next cleanup scheduled at ${nextRun.toLocaleString()}`);

  setTimeout(async () => {
    await deleteOldPresentationsCompletely();
    scheduleRandomCleanup();
  }, delay);
}

(async () => {
  await initDb();
  await push.initPushDb(run);
  await deleteOldPresentationsCompletely();
  scheduleRandomCleanup();
  await purgeExpiredServices();
  setInterval(purgeExpiredServices, 60 * 60 * 1000);
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
})();