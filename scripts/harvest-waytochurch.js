#!/usr/bin/env node
// Harvest the waytochurch.com Telugu song index into ./songData/.
//
// READ-ONLY. This script never touches your database or the songs API - it only
// downloads and parses. Matching against your library and importing are separate
// later steps, deliberately kept apart from the crawl.
//
//   node scripts/harvest-waytochurch.js            # full run (~1000 songs)
//   node scripts/harvest-waytochurch.js --limit 5  # try it on five first
//
// Flags
//   --limit N     stop after N song pages (default: all)
//   --ids FILE    only crawl the ids in FILE (json array, or [{id}] objects)
//   --delay MS    pause between requests (default 1200)
//   --refresh     re-download pages already cached (default: use the cache)
//   --out DIR     output directory (default ./songData)
//   --language L  which catalogue: Telugu (default), English, Hindi, ...
//                 Use a separate --out per language so the datasets never mix.
//
// Output
//   songData/raw/<id>.html   cached page, downloaded exactly once
//   songData/index.json      {id, title, url} from the list page
//   songData/songs.json      parsed records
//   songData/songs.csv       flat view for eyeballing
//
// The raw cache is the point: re-parsing is free and offline, so the site gets
// one polite pass no matter how many times the parser is revised.

const fs = require("fs");
const path = require("path");

// The site publishes one catalogue per language, each with the same structure:
// a capped main list page plus ~40 per-initial pages.
const LANGUAGE = (process.argv.includes("--language")
  ? process.argv[process.argv.indexOf("--language") + 1] : "Telugu") || "Telugu";
const LIST_URL = `https://waytochurch.com/Lyrics/list/${LANGUAGE}-Christian-songs-Lyrics`;
const UA = "Mozilla/5.0 (compatible; tcc-song-library-sync/1.0; +church song library maintenance)";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const FLAG = (n) => process.argv.includes(`--${n}`);

const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;
const IDS_FILE = arg("ids", "");
const DELAY = parseInt(arg("delay", "1200"), 10);
const REFRESH = FLAG("refresh");
const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData")));
const RAW = path.join(OUT, "raw");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return null; // 404s are real answers, not failures worth retrying
      return await res.text();
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(attempt * 5000); // back off; a slow crawl is the polite one
    }
  }
}

// ---------- html helpers ----------
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#160": " " };
function decode(s) {
  return s
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39|#160);/g, (_, e) => ENTITIES[e])
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}
const stripTags = (html) =>
  decode(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t ]+/g, " ")
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n")
    .trim();

// The two lyric panes are siblings inside .tab-content, so slicing between the
// pane ids is more robust here than trying to balance nested <div>s by regex.
function between(html, startMarker, endMarkers) {
  const a = html.indexOf(startMarker);
  if (a === -1) return "";
  let b = html.length;
  for (const m of endMarkers) {
    const j = html.indexOf(m, a + startMarker.length);
    if (j !== -1 && j < b) b = j;
  }
  return html.slice(a + startMarker.length, b);
}

// Text of the tab pane with the given id. Starts AFTER the opening tag closes -
// slicing from the id itself drags `class="tab-pane fade in">` into the text,
// which silently produced an identical 30-character "transliteration" for
// every song on the first run.
function paneText(html, id) {
  const at = html.indexOf(`id="${id}"`);
  if (at === -1) return "";
  const open = html.indexOf(">", at);
  if (open === -1) return "";
  const rest = html.slice(open + 1);
  let end = rest.length;
  for (const m of ['<div id="', "id=\"translate\""]) {
    const j = rest.indexOf(m);
    if (j !== -1 && j < end) end = j;
  }
  return stripTags(rest.slice(0, end));
}

// The JSON-LD headline packs BOTH title forms around site boilerplate:
//   "aahaa mahaathma haa sharanyaa TELUGU Christian Song || ఆహా మహాత్మ హా శరణ్యా"
//   "Telugu Christian Song || Nanna Yesuve Nanna Yesuve Lyrics"   (no translit half)
// Splitting on the boilerplate yields a transliterated title and a Telugu title.
// Both are worth keeping: your library is stored transliterated, so that side
// matches directly, while the Telugu side is the reliable identity key.
const TELUGU_RE = /[ఀ-౿]/;

function splitTitle(headline) {
  const raw = String(headline || "")
    .replace(/\s*\|\s*waytochurch.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const m = raw.match(/^(.*?)\s*(?:telugu|english|hindi)?\s*christian\s+song\s*(?:lyrics)?\s*\|\|\s*(.*)$/i);
  const parts = m ? [m[1], m[2]] : [raw, ""];
  const out = { titleEn: "", titleTe: "" };
  for (let p of parts) {
    p = p.replace(/\s+lyrics\s*$/i, "").replace(/^\s*\|\|\s*/, "").trim();
    if (!p) continue;
    if (TELUGU_RE.test(p)) { if (!out.titleTe) out.titleTe = p; }
    else if (!out.titleEn) out.titleEn = p;
  }
  return out;
}

function cleanTitle(t) {
  const { titleEn, titleTe } = splitTitle(t);
  return titleEn || titleTe;
}

// datePublished looks like "2014-10-16T00:12+05:30" but months/days are not
// zero-padded ("2026-2-25T..."), so a fixed slice(0,10) cuts mid-value.
function cleanDate(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : "";
}

// ---------- parsing ----------
function parseList(html) {
  const seen = new Map(); // the list page repeats links; first occurrence wins
  const re = /<a\s+href=['"]https?:\/\/waytochurch\.com\/lyrics\/song\/(\d+)\/([^'"]*)['"]\s*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const id = Number(m[1]);
    if (seen.has(id)) continue;
    seen.set(id, {
      id,
      title: stripTags(m[3]).replace(/\s+/g, " ").trim(),
      url: `https://waytochurch.com/lyrics/song/${id}/${m[2]}`,
    });
  }
  return [...seen.values()];
}

function parseSong(id, html) {
  const rec = { id, url: `https://waytochurch.com/lyrics/song/${id}`,
                title: "", titleEn: "", titleTe: "", author: "", album: "",
                category: "", ragam: "", language: "", posted: "",
                telugu: "", english: "" };

  // 1) JSON-LD is the cleanest source for author + title.
  for (const m of html.matchAll(/<script[^>]*type=['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const ld = JSON.parse(m[1].trim());
      if (ld && ld.author && ld.author.name) rec.author = String(ld.author.name).trim();
      if (ld && ld.headline && !rec.title) {
        const t = splitTitle(decode(String(ld.headline)));
        rec.titleEn = t.titleEn; rec.titleTe = t.titleTe;
        rec.title = t.titleEn || t.titleTe;
      }
      if (ld && ld.datePublished) rec.posted = cleanDate(ld.datePublished);
    } catch (_) { /* a malformed block is not worth aborting the page for */ }
  }

  // 2) The footer carries Language | Author | Album | Category.
  const footer = stripTags(between(html, 'Class="panel-footer"', ["</div>\n</div>", "<footer"]) ||
                           between(html, 'class="panel-footer"', ["<footer"]));
  const field = (label) => {
    const m = footer.match(new RegExp(`${label}\\s*:\\s*([^|\\n]+)`, "i"));
    return m ? m[1].trim() : "";
  };
  rec.language = field("Language");
  rec.album = field("Album");
  rec.category = field("Category");
  if (!rec.author) rec.author = field("Author");

  // 3) Title fallback from <h1>/<title> when JSON-LD had none.
  if (!rec.title) {
    const h = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (h) rec.title = cleanTitle(stripTags(h[1]));
  }

  // 4) Ragam sits in a <strong> just above the lyric tabs.
  const rag = html.match(/<strong>([^<]*(?:raagam|ragam|కాపి|రాగం)[^<]*)<\/strong>/i);
  if (rag) rec.ragam = decode(rag[1]).trim();

  rec.telugu = paneText(html, "original");
  rec.english = paneText(html, "english");
  return rec;
}

// ---------- csv ----------
const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Importable so the parsers can be unit-checked against a cached page without
// touching the network.
module.exports = { parseList, parseSong, splitTitle, cleanTitle, cleanDate, stripTags };
if (require.main !== module) return;

// ---------- main ----------
(async () => {
  fs.mkdirSync(RAW, { recursive: true });

  // -- index --
  // The main list page is only a slice of the catalogue (1,000 entries). The real
  // index is spread across ~41 per-initial pages linked from it
  // (/lyrics/list/Telugu-<letter>), which together hold ~4,750 songs. Crawling
  // only the main page silently misses about three quarters of the site.
  const LISTS = path.join(OUT, "lists");
  fs.mkdirSync(LISTS, { recursive: true });

  async function listPage(url, cacheName) {
    const p = path.join(LISTS, cacheName);
    if (!REFRESH && fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    const html = await get(encodeURI(url));
    if (html) fs.writeFileSync(p, html, "utf8");
    await sleep(DELAY);
    return html;
  }

  const mainHtml = await listPage(LIST_URL, "_main.html");
  if (!mainHtml) throw new Error("could not fetch the main list page");

  const letterRe = new RegExp(`href='(\\/lyrics\\/list\\/${LANGUAGE}-[^']*)'`, "g");
  const letters = [...new Set([...mainHtml.matchAll(letterRe)].map((m) => m[1]))]
    .filter((l) => l.replace(`/lyrics/list/${LANGUAGE}-`, "").trim().length > 0);
  console.log(`language: ${LANGUAGE} | index: main page + ${letters.length} per-initial pages`);

  const byId = new Map();
  for (const entry of parseList(mainHtml)) byId.set(entry.id, entry);

  for (const [i, letter] of letters.entries()) {
    const safe = "L" + Buffer.from(letter).toString("hex").slice(-24) + ".html";
    const html = await listPage("https://waytochurch.com" + letter, safe);
    if (!html) { console.log(`  ${letter}: failed`); continue; }
    let added = 0;
    for (const entry of parseList(html)) if (!byId.has(entry.id)) { byId.set(entry.id, entry); added++; }
    console.log(`  [${i + 1}/${letters.length}] ${letter} -> +${added} (total ${byId.size})`);
  }

  const index = [...byId.values()].sort((a, b) => a.id - b.id);
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1), "utf8");
  console.log(`index: ${index.length} unique songs across the whole Telugu catalogue`);

  // -- song pages --
  // --ids narrows the crawl to a subset (e.g. only the songs missing from the
  // library) so the first import does not wait on the whole 4,748-page catalogue.
  let queue = index;
  if (IDS_FILE) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(IDS_FILE), "utf8"));
    const want = new Set(raw.map((x) => Number(typeof x === "object" ? x.id : x)));
    queue = index.filter((e) => want.has(e.id));
    console.log(`--ids: restricted to ${queue.length} of ${index.length} songs`);
  }
  const todo = queue.slice(0, LIMIT);
  const songs = [];
  let fetched = 0, cached = 0, failed = 0;

  for (const [i, entry] of todo.entries()) {
    const file = path.join(RAW, `${entry.id}.html`);
    let html = null;

    if (!REFRESH && fs.existsSync(file)) {
      html = fs.readFileSync(file, "utf8");
      cached++;
    } else {
      try {
        html = await get(entry.url);
        if (html) { fs.writeFileSync(file, html, "utf8"); fetched++; }
        else { failed++; console.log(`  [${entry.id}] not found (404)`); }
      } catch (e) {
        failed++;
        console.log(`  [${entry.id}] failed: ${e.message}`);
      }
      await sleep(DELAY); // only ever sleep after a real network call
    }

    if (!html) continue;
    const rec = parseSong(entry.id, html);
    if (!rec.title) rec.title = entry.title;
    rec.listTitle = entry.title;
    songs.push(rec);

    if ((i + 1) % 25 === 0 || i + 1 === todo.length) {
      const withAuthor = songs.filter((s) => s.author).length;
      console.log(`${i + 1}/${todo.length} | fetched ${fetched} cached ${cached} failed ${failed} | with author: ${withAuthor}`);
    }
  }

  // -- write outputs --
  fs.writeFileSync(path.join(OUT, "songs.json"), JSON.stringify(songs, null, 1), "utf8");

  const cols = ["id", "titleEn", "titleTe", "author", "album", "category", "ragam", "language", "posted", "url", "teluguChars", "englishChars"];
  const csv = [cols.join(",")].concat(
    songs.map((s) => cols.map((c) =>
      cell(c === "teluguChars" ? s.telugu.length : c === "englishChars" ? s.english.length : s[c])
    ).join(","))
  ).join("\n");
  fs.writeFileSync(path.join(OUT, "songs.csv"), csv + "\n", "utf8");

  const withAuthor = songs.filter((s) => s.author).length;
  const withTelugu = songs.filter((s) => s.telugu.length > 20).length;
  console.log(`\nparsed ${songs.length} songs`);
  console.log(`  with author : ${withAuthor} (${((withAuthor / (songs.length || 1)) * 100).toFixed(0)}%)`);
  console.log(`  with telugu : ${withTelugu}`);
  console.log(`  failed      : ${failed}`);
  console.log(`\nwrote ${OUT}/songs.json, songs.csv, index.json (+ raw/ cache)`);
})();
