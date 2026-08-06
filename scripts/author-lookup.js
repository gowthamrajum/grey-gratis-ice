#!/usr/bin/env node
// Batch author lookup for the song library — runs on your Claude MAX SUBSCRIPTION.
//
// This shells out to the Claude Code CLI (`claude -p`) rather than calling the
// Anthropic API with a key. That distinction is the whole point: an API key bills
// pay-as-you-go from a Console account on top of your subscription, whereas
// Claude Code usage draws from the Max plan you already pay for.
//
//   node scripts/author-lookup.js --limit 40
//
// !! DO NOT SET ANTHROPIC_API_KEY !!
// If that variable is set in your shell, Claude Code ignores the subscription and
// bills at API rates instead. The script refuses to start if it finds one.
//
// Flags
//   --limit N        stop after N songs (default: every unresearched song)
//   --batch N        songs per claude invocation (default 8, max 15)
//   --csv PATH       output file (default ./song-authors.csv)
//   --sleep MS       pause between invocations (default 2000)
//   --dry-run        print the plan and the first prompt, call nothing
//
// WHY BATCHING MATTERS
// Every `claude -p` invocation reloads the Claude Code system prompt — measured at
// ~26k tokens, about $0.08 of subscription usage BEFORE any actual work. Paying
// that once per song across 1,582 songs would burn ~$126 of your monthly
// allowance on overhead alone. Batching 8 songs per invocation cuts that ~8x.
//
// WHY THE LYRICS ARE SENT, NOT JUST THE TITLE
// A title does not identify a song here. "Devaadhi Devudu" and "Cheyi Pattuko"
// each name at least three DIFFERENT songs with different writers. Attributing
// from a title alone produces confident, wrong answers.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const API_BASE = process.env.SONGS_API || "https://grey-gratis-ice.onrender.com";
const CSV_HEADER = "song_id,song_name,author,confidence,status,basis,sources,researched_on";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const FLAG = (n) => process.argv.includes(`--${n}`);

// Measured on this library: ~$0.64/song of subscription usage on the default
// (Opus). Most of that is reading web-search results, not the prompt. Dropping to
// sonnet or haiku cuts it substantially at some cost in judgement — the job that
// matters here is "did the lyrics match and does the page state a writing credit",
// which a smaller model handles reasonably.
const MODEL = arg("model", "");
const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;
const BATCH = Math.min(15, Math.max(1, parseInt(arg("batch", "8"), 10)));
const SLEEP_MS = parseInt(arg("sleep", "2000"), 10);
const CSV_PATH = path.resolve(arg("csv", path.join(__dirname, "..", "song-authors.csv")));
const DRY_RUN = FLAG("dry-run");

// ---------- CSV (RFC4180 enough: fields may hold commas, quotes, newlines) ----------
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}
const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// The CSV is the single row-per-song record, so it is loaded into a Map keyed by
// song_id and rewritten wholesale after each batch. Appending instead would leave
// the original not_researched row sitting next to its researched replacement.
function loadRows(p) {
  const byId = new Map();
  if (!fs.existsSync(p)) return byId;
  const rows = parseCsv(fs.readFileSync(p, "utf8"));
  const head = rows.shift() || [];
  const ix = Object.fromEntries(head.map((h, i) => [h, i]));
  for (const r of rows) {
    const id = Number(r[ix.song_id]);
    if (!id) continue;
    const prev = byId.get(id);
    // A later researched row supersedes an earlier placeholder for the same song.
    if (prev && prev[4] !== "not_researched" && r[ix.status] === "not_researched") continue;
    byId.set(id, [r[ix.song_id], r[ix.song_name], r[ix.author], r[ix.confidence],
                  r[ix.status], r[ix.basis], r[ix.sources], r[ix.researched_on]]);
  }
  return byId;
}

function writeAll(p, byId) {
  const ordered = [...byId.values()].sort((a, b) => Number(a[0]) - Number(b[0]));
  const body = ordered.map((r) => r.map(cell).join(",")).join("\n");
  fs.writeFileSync(p, CSV_HEADER + "\n" + body + "\n", "utf8");
}

const isDone = (row) => row && row[4] && row[4] !== "not_researched" && row[4] !== "error";

// ---------- library ----------
async function fetchLibrary() {
  const out = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`${API_BASE}/songs/list?page=${page}&limit=100`);
    if (!r.ok) throw new Error(`GET /songs/list -> ${r.status}`);
    const d = await r.json();
    out.push(...d.songs);
    if (page >= d.totalPages) break;
  }
  return out;
}

async function lyricSample(songId) {
  try {
    const r = await fetch(`${API_BASE}/songs/${songId}`);
    if (!r.ok) return "";
    const s = await r.json();
    const lines = [];
    const take = (sec) => {
      if (!sec) return;
      for (const k of ["telugu", "english"]) {
        if (Array.isArray(sec[k])) lines.push(...sec[k].slice(0, 3));
      }
    };
    take(s.main_stanza);
    return lines.filter(Boolean).slice(0, 5).join(" / ").slice(0, 400);
  } catch (_) { return ""; }
}

// ---------- prompt ----------
function buildPrompt(batch) {
  const list = batch.map((s, i) =>
    `${i + 1}. song_id=${s.song_id} | TITLE: ${s.song_name}` +
    (s.lyrics ? `\n   OPENING LINES: ${s.lyrics}` : "\n   OPENING LINES: (none on file)")
  ).join("\n");

  return `You are researching authorship of Telugu Christian worship songs. Use web search.

For EACH of the ${batch.length} songs below, find who WROTE it (the lyricist / writer of the words).

${list}

RULES - these matter more than producing an answer:
1. VERIFY THE SONG. Many of these titles are shared by completely different songs
   with different writers. Confirm the lyrics on the page you find match the opening
   lines given. If you cannot confirm the match, status is "conflicting".
2. A WRITER IS NOT A PERFORMER. Never report a singer, YouTube channel, uploader,
   album, music director, worship team or church as the author. Only an explicit
   writing credit ("lyrics by", "written by", "penned by", "రచన") counts.
3. SOURCES DISAGREE -> status "conflicting", author "", list the rival candidates
   in "basis". A conflict is not a finding.
4. NOTHING CREDITS A WRITER -> status "not_found", author "". Many of these songs
   are traditional or unattributed; that is a correct and expected answer.
5. NEVER GUESS. A wrong attribution written into a church song library is worse
   than a blank. When in doubt: "not_found".

Output ONLY a JSON array, one object per song, no markdown fences, no commentary:
[{"song_id": 123, "author": "", "confidence": 0.0, "status": "confirmed|conflicting|not_found", "basis": "what the source said and whether lyrics matched", "sources": ["url"]}]

confidence: 0.8-1.0 only when independent sources agree AND lyrics matched;
0.5-0.8 for one clear writing credit with a lyric match; 0.0 for conflicting/not_found.`;
}

// ---------- claude code invocation ----------
const HEDGES = /^(unknown|traditional|n\/?a|none|not\s+found|unattributed|anonymous)\.?$/i;

function runClaude(prompt) {
  const args = ["-p", prompt, "--output-format", "json",
                "--allowedTools", "WebSearch", "WebFetch"];
  if (MODEL) args.push("--model", MODEL);
  const out = execFileSync("claude", args,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000 }
  );
  const env = JSON.parse(out);
  if (env.is_error) throw new Error(env.result || env.api_error_status || "claude reported an error");
  return env;
}

function extractArray(text) {
  let t = String(text || "").trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a === -1 || b <= a) throw new Error("no JSON array in model output");
  return JSON.parse(t.slice(a, b + 1));
}

function normalize(rec) {
  const status = ["confirmed", "conflicting", "not_found"].includes(rec.status) ? rec.status : "not_found";
  let author = typeof rec.author === "string" ? rec.author.trim() : "";
  if (HEDGES.test(author)) author = "";
  // Last line of defence: an author only survives on a confirmed row.
  if (status !== "confirmed") author = "";
  return {
    author,
    confidence: status === "confirmed" ? Math.min(1, Math.max(0, Number(rec.confidence) || 0)) : 0,
    status,
    basis: typeof rec.basis === "string" ? rec.basis.slice(0, 500) : "",
    sources: Array.isArray(rec.sources) ? rec.sources.slice(0, 4) : [],
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- main ----------
(async () => {
  if (process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is set. Claude Code would bill at API rates and");
    console.error("ignore your Max subscription. Unset it and re-run:  unset ANTHROPIC_API_KEY");
    process.exit(1);
  }

  const library = await fetchLibrary();
  const byId = loadRows(CSV_PATH);
  // Every song in the library gets a row, so the file always covers the whole set.
  for (const s of library) {
    if (!byId.has(s.song_id)) {
      byId.set(s.song_id, [s.song_id, s.song_name, "", "0.00", "not_researched",
                           "Not yet researched - no lookup was performed for this song.", "", ""]);
    }
  }
  const doneCount = [...byId.values()].filter(isDone).length;
  const todo = library.filter((s) => !isDone(byId.get(s.song_id))).slice(0, LIMIT);

  console.log(`library ${library.length} | already researched ${doneCount} | to do now ${todo.length}`);
  console.log(`batch size ${BATCH} -> ~${Math.ceil(todo.length / BATCH)} claude invocations`);
  if (!todo.length) { writeAll(CSV_PATH, byId); return console.log("nothing to do."); }

  const today = new Date().toISOString().slice(0, 10);
  const tally = { confirmed: 0, conflicting: 0, not_found: 0, error: 0 };
  let spent = 0, batchNo = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const slice = todo.slice(i, i + BATCH);
    for (const s of slice) s.lyrics = await lyricSample(s.song_id);
    const prompt = buildPrompt(slice);
    batchNo++;

    if (DRY_RUN) {
      console.log(`\n--- batch ${batchNo} (${slice.length} songs) ---`);
      console.log(prompt.slice(0, 1500));
      if (i + BATCH < todo.length) console.log(`\n(+${Math.ceil((todo.length - i - BATCH) / BATCH)} more batches)`);
      break;
    }

    let records = null;
    for (let attempt = 1; attempt <= 3 && !records; attempt++) {
      try {
        const env = runClaude(prompt);
        spent += env.total_cost_usd || 0;
        records = extractArray(env.result);
      } catch (e) {
        const msg = String(e.message || e);
        const limited = /rate limit|usage limit|too many requests|429/i.test(msg);
        console.log(`  batch ${batchNo} attempt ${attempt} failed: ${msg.slice(0, 160)}`);
        if (attempt === 3) break;
        // A usage-limit hit is not a bug — wait for the window to move.
        await sleep(limited ? 15 * 60 * 1000 : 30 * 1000);
      }
    }

    const returned = new Map();
    for (const rec of records || []) if (rec && rec.song_id) returned.set(Number(rec.song_id), rec);

    for (const s of slice) {
      const rec = returned.get(s.song_id);
      if (!rec) {
        tally.error++;
        byId.set(s.song_id, [s.song_id, s.song_name, "", "0.00", "error",
                             "No result returned for this song in its batch.", "", today]);
        continue;
      }
      const r = normalize(rec);
      tally[r.status]++;
      byId.set(s.song_id, [s.song_id, s.song_name, r.author, r.confidence.toFixed(2),
                           r.status, r.basis, r.sources.join("; "), today]);
    }
    // Rewritten after every batch, so a Ctrl-C or crash never loses finished work.
    writeAll(CSV_PATH, byId);

    const seen = Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(" ");
    console.log(`batch ${batchNo}/${Math.ceil(todo.length / BATCH)} done | ${seen} | subscription usage so far ~$${spent.toFixed(2)}`);
    if (i + BATCH < todo.length) await sleep(SLEEP_MS);
  }

  if (!DRY_RUN) {
    console.log(`\nfinished: ${JSON.stringify(tally)}`);
    console.log(`subscription usage this run: ~$${spent.toFixed(2)} (drawn from Max, not billed separately)`);
    console.log(`csv: ${CSV_PATH}`);
    console.log("Rows with status=error are retried automatically on the next run.");
  }
})();
