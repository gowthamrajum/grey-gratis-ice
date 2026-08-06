#!/usr/bin/env node
// Song review server — a hostable UI for deciding what to do with every song
// that never made it into the library, plus the ones the sanitiser could not
// decide on its own.
//
//   node song-review/build-queue.js     # build data/review-queue.json first
//   node song-review/server.js          # then serve it
//
//   PORT                 listen port (default 4000)
//   TURSO_DATABASE_URL   if set, decisions persist to libSQL (survives a redeploy)
//   TURSO_AUTH_TOKEN     token for the above
//   REVIEW_TOKEN         if set, every request must carry ?k=<token> or a Bearer
//                        header. Set this before putting the server on the open
//                        internet — the decisions are writable by anyone who can
//                        reach it.
//
// Without TURSO_*, decisions go to data/decisions.json. That is fine locally,
// but most hosts have an ephemeral filesystem — set the Turso vars there, or
// download your decisions from /export before the dyno restarts.

const express = require("express");
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "data");
const QUEUE = path.join(DATA, "review-queue.json");
const FILE_STORE = path.join(DATA, "decisions.json");
const PORT = process.env.PORT || 4000;
const TOKEN = process.env.REVIEW_TOKEN || "";

if (!fs.existsSync(QUEUE)) {
  console.error("data/review-queue.json missing — run: node song-review/build-queue.js");
  process.exit(1);
}
const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const byId = new Map(queue.items.map((x) => [x.id, x]));

// ---------- persistence ----------
let db = null;
const useTurso = !!process.env.TURSO_DATABASE_URL;
if (useTurso) {
  const { createClient } = require("@libsql/client");
  db = createClient({ url: process.env.TURSO_DATABASE_URL,
                      authToken: process.env.TURSO_AUTH_TOKEN });
}

async function initStore() {
  if (!db) {
    if (!fs.existsSync(FILE_STORE)) fs.writeFileSync(FILE_STORE, "{}", "utf8");
    return;
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS song_reviews (
      item_id    TEXT PRIMARY KEY,
      decision   TEXT,
      comment    TEXT,
      reviewer   TEXT,
      updated_at TEXT)`);
}

// Tolerate the file being absent or truncated — a review server must not die
// because its store vanished, and on an ephemeral host that will happen.
function readFileStore() {
  try {
    return JSON.parse(fs.readFileSync(FILE_STORE, "utf8")) || {};
  } catch {
    return {};
  }
}

async function getAll() {
  if (!db) return readFileStore();
  const r = await db.execute("SELECT * FROM song_reviews");
  return Object.fromEntries(r.rows.map((x) => [x.item_id, {
    decision: x.decision, comment: x.comment,
    reviewer: x.reviewer, updated_at: x.updated_at }]));
}

async function save(id, rec) {
  if (!db) {
    const all = readFileStore();
    all[id] = rec;
    fs.mkdirSync(path.dirname(FILE_STORE), { recursive: true });
    fs.writeFileSync(FILE_STORE, JSON.stringify(all, null, 1), "utf8");
    return;
  }
  await db.execute({
    sql: `INSERT INTO song_reviews (item_id, decision, comment, reviewer, updated_at)
          VALUES (?,?,?,?,?)
          ON CONFLICT(item_id) DO UPDATE SET
            decision=excluded.decision, comment=excluded.comment,
            reviewer=excluded.reviewer, updated_at=excluded.updated_at`,
    args: [id, rec.decision, rec.comment, rec.reviewer, rec.updated_at],
  });
}

// ---------- app ----------
// Readable JSON: 2-space indent, and Telugu left as real characters —
// JSON.stringify does not escape non-ASCII, so do not add an escaper here.
function pretty(res, obj) {
  res.type("application/json; charset=utf-8").send(JSON.stringify(obj, null, 2));
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (!TOKEN) return next();
  const hdr = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (req.query.k === TOKEN || hdr === TOKEN) return next();
  res.status(401).type("text/plain").send("REVIEW_TOKEN required: append ?k=<token>");
});

app.get("/api/queue", async (_req, res) => {
  const dec = await getAll();
  res.json({
    library: queue.library, total: queue.total,
    items: queue.items.map((x) => ({
      id: x.id, source: x.source, sourceName: x.sourceName, title: x.title,
      author: x.author, reason: x.reason, songId: x.songId || null,
      hasSource: !!(x.sourceUrl || x.scraped), issues: x.issues,
      severity: x.issues.some((i) => i.s === "critical") ? "critical"
              : x.issues.some((i) => i.s === "warning") ? "warning" : "info",
      decision: (dec[x.id] || {}).decision || null,
    })),
  });
});

// the whole queue, untrimmed — every field the build wrote, plus any decision
app.get("/api/queue/raw", async (_req, res) => {
  const dec = await getAll();
  pretty(res, {
    builtFrom: queue.builtFrom, library: queue.library, total: queue.total,
    items: queue.items.map((x) => ({ ...x, review: dec[x.id] || null })),
  });
});

app.get("/api/item/:id", async (req, res) => {
  const it = byId.get(req.params.id);
  if (!it) return res.status(404).json({ error: "not found" });
  const dec = await getAll();
  res.json({ ...it, review: dec[it.id] || null });
});

// same record as above, indented — for reading in a tab or piping to a file
app.get("/api/item/:id/raw", async (req, res) => {
  const it = byId.get(req.params.id);
  if (!it) return res.status(404).json({ error: "not found" });
  const dec = await getAll();
  pretty(res, { ...it, review: dec[it.id] || null });
});

app.post("/api/item/:id", async (req, res) => {
  if (!byId.has(req.params.id)) return res.status(404).json({ error: "not found" });
  const { decision, comment, reviewer } = req.body || {};
  const rec = {
    decision: String(decision || "").slice(0, 40),
    comment: String(comment || "").slice(0, 8000),
    reviewer: String(reviewer || "").slice(0, 80),
    updated_at: new Date().toISOString(),
  };
  await save(req.params.id, rec);
  res.json({ ok: true, review: rec });
});

// everything decided so far, as one file to hand back to the pipeline
app.get("/export", async (_req, res) => {
  const dec = await getAll();
  const rows = Object.entries(dec).map(([id, r]) => {
    const it = byId.get(id) || {};
    return { id, song_id: it.songId || null, title: it.title || null,
             source: it.source || null, ...r };
  });
  res.set("content-disposition", 'attachment; filename="review-decisions.json"');
  pretty(res, { exported_at: new Date().toISOString(), count: rows.length, decisions: rows });
});

// ---------- reviewNeeded analysis ----------
const analyze = require("./analyze");
const ANALYSIS = path.join(DATA, "analysis.json");

// last completed run, so the page has something to show before you re-run it
app.get("/api/analysis", (_req, res) => {
  if (!fs.existsSync(ANALYSIS)) return pretty(res, { total: 0, results: [] });
  pretty(res, JSON.parse(fs.readFileSync(ANALYSIS, "utf8")));
});

// live run — one server-sent event per song, as it is diagnosed
app.get("/api/analysis/stream", async (req, res) => {
  res.set({ "content-type": "text/event-stream", "cache-control": "no-cache",
            connection: "keep-alive", "x-accel-buffering": "no" });
  res.flushHeaders();
  let alive = true;
  req.on("close", () => { alive = false; });
  const send = (ev, data) => { if (alive) res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); };
  try {
    // Diagnosing a song is synchronous CPU work (every title is compared against
    // all 4,450 library titles). Without yielding, the whole run finishes before
    // Node flushes a single write and the "live" stream arrives in one lump —
    // so hand control back to the event loop between songs.
    const results = await analyze.run(async (r, i, n) => {
      send("song", { i, n, r });
      if (!alive) throw new Error("client disconnected");
      await new Promise((resolve) => setImmediate(resolve));
    });
    fs.writeFileSync(ANALYSIS, JSON.stringify(
      { generated: new Date().toISOString(), total: results.length, results }), "utf8");
    send("done", { total: results.length });
  } catch (e) {
    if (alive) send("error", { message: String(e.message).slice(0, 200) });
  }
  if (alive) res.end();
});

app.get("/healthz", (_req, res) => res.json({ ok: true, items: queue.total,
  store: db ? "libsql" : "file",
  analysis: fs.existsSync(ANALYSIS) ? JSON.parse(fs.readFileSync(ANALYSIS, "utf8")).total : 0 }));

app.get("/analysis", (_req, res) =>
  res.type("html").send(fs.readFileSync(path.join(__dirname, "analysis.html"), "utf8")));

app.get(["/", "/item/:id"], (_req, res) =>
  res.type("html").send(fs.readFileSync(path.join(__dirname, "ui.html"), "utf8")));

initStore().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`song review server  ->  http://localhost:${PORT}`);
    console.log(`  queue   ${queue.total} songs`);
    console.log(`  store   ${db ? "libSQL (persistent)" : "data/decisions.json (local file)"}`);
    if (!TOKEN) console.log("  auth    OFF — set REVIEW_TOKEN before hosting publicly");
  });
});
