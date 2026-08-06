#!/usr/bin/env node
// Write ONE JSON file per song, ready to review and POST individually.
//
//   node scripts/prep-song-files.js                 # songs missing from your library
//   node scripts/prep-song-files.js --all           # every song in the catalogue
//   node scripts/prep-song-files.js --english full  # only ones with full transliteration
//
// Output  songData/prepared/<id>-<slug>.json   exactly the POST /songs body
//         songData/prepared/_index.csv         one row per file, for review
//
// Each .json holds ONLY the payload your API accepts, so it can be posted
// verbatim with no editing or stripping:
//
//   { "song_name": ..., "author": { "Authored by": ..., "రచన": ... },
//     "main_stanza": { "telugu": [...], "english": [...] },
//     "stanzas": [ { "stanza_number": 1, "telugu": [...], "english": [...] } ] }
//
// Review information (provenance, warnings, transliteration status) deliberately
// lives in _index.csv rather than inside the JSON files — mixing it in would mean
// every file had to be edited before it could be sent.
//
// Filenames are zero-padded and slugged so the directory sorts sensibly and each
// song is identifiable without opening it.

const fs = require("fs");
const path = require("path");
const { build } = require("./build-app-json.js");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const FLAG = (n) => process.argv.includes(`--${n}`);

const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData")));
const DIR = path.join(OUT, arg("dir", "prepared"));
const ALL = FLAG("all");
const ENGLISH = arg("english", "");   // "", "full", "none", "partial"
const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;

const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "song";

// ---- inputs ----
const records = JSON.parse(fs.readFileSync(path.join(OUT, "songs.json"), "utf8"));

// which songs are missing from the library
const missing = new Set();
const mrPath = path.join(OUT, "match-report.csv");
if (fs.existsSync(mrPath)) {
  for (const line of fs.readFileSync(mrPath, "utf8").split("\n").slice(1)) {
    const f = line.split(",");
    if (f.length > 2 && f[f.length - 5] === "missing") missing.add(Number(f[0]));
    else if (/^\d+,.*,missing,/.test(line)) missing.add(Number(line.split(",")[0]));
  }
}

// transliteration status per song
const enStatus = new Map();
const ecPath = path.join(OUT, "english-coverage.csv");
if (fs.existsSync(ecPath)) {
  for (const line of fs.readFileSync(ecPath, "utf8").split("\n").slice(1)) {
    const m = line.match(/^(\d+),/);
    if (!m) continue;
    const v = ["full", "partial", "none"].find((x) => line.includes(`,${x},`));
    if (v) enStatus.set(Number(m[1]), v);
  }
}

// ---- write ----
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });

const rows = [];
let written = 0, skippedInLib = 0, skippedEnglish = 0, skippedEmpty = 0;

for (const rec of records) {
  if (written >= LIMIT) break;
  if (!ALL && missing.size && !missing.has(rec.id)) { skippedInLib++; continue; }

  const en = enStatus.get(rec.id) || "";
  if (ENGLISH && en !== ENGLISH) { skippedEnglish++; continue; }

  const { payload, meta } = build(rec);

  // Nothing to review in an empty shell — skip rather than write a useless file.
  const teLines = payload.main_stanza.telugu.length +
    payload.stanzas.reduce((n, s) => n + s.telugu.length, 0);
  if (!payload.song_name || !teLines) { skippedEmpty++; continue; }

  const file = `${String(rec.id).padStart(5, "0")}-${slug(payload.song_name)}.json`;
  fs.writeFileSync(path.join(DIR, file), JSON.stringify(payload, null, 2) + "\n", "utf8");
  written++;

  rows.push([
    file, rec.id, payload.song_name,
    payload.author["Authored by"] || payload.author["రచన"] || "",
    payload.stanzas.length,
    payload.main_stanza.telugu.length,
    payload.main_stanza.english.length,
    en,
    meta.album, meta.category,
    meta.warnings.join("; "),
    meta.source_url,
  ]);
}

fs.writeFileSync(path.join(DIR, "_index.csv"),
  ["file,wtc_id,song_name,author,stanzas,main_te_lines,main_en_lines,english,album,category,warnings,url"]
    .concat(rows.map((r) => r.map(cell).join(","))).join("\n") + "\n", "utf8");

console.log(`wrote ${written} song files to ${DIR}`);
console.log(`  skipped, already in library : ${skippedInLib}`);
if (ENGLISH) console.log(`  skipped, english != ${ENGLISH}   : ${skippedEnglish}`);
console.log(`  skipped, no title/lyrics    : ${skippedEmpty}`);
console.log(`index: ${path.join(DIR, "_index.csv")}`);
