#!/usr/bin/env node
// Report which waytochurch songs have no English transliteration.
//
//   node scripts/report-english.js
//
// Input   songData/raw/*.html        cached song pages
//         songData/match-report.csv  optional — adds the in-library / missing split
// Output  songData/english-coverage.csv   every song, with its verdict
//         songData/no-english.csv         only the songs lacking transliteration
//
// READ-ONLY. Re-runnable at any point during the crawl; it reports on whatever
// is cached so far and says how much of the catalogue that represents.
//
// Each song page has a TELUGU pane and an English pane. Three outcomes matter:
//   none     — the English pane is empty or a stub. Nothing to project in English.
//   partial  — English exists but covers fewer stanzas than the Telugu does, so
//              later verses would fall back to Telugu mid-song.
//   full     — English present and stanza counts line up.
// "partial" is worth separating: a song that looks fine in the pallavi and then
// runs out of transliteration at verse 3 is worse in a service than one that
// never had it, because nobody notices until it is on the screen.

const fs = require("fs");
const path = require("path");
const { parseSong } = require("./harvest-waytochurch.js");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData")));
const RAW = path.join(OUT, "raw");
const MIN_CHARS = 20; // below this the pane is a stub, not a transliteration

const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Count charanams the same way build-app-json does, so the numbers agree.
const countStanzas = (text) => {
  const m = String(text || "").replace(/\s+/g, " ").match(/(?:^|\s)\d{1,2}\.\s+/g);
  return m ? m.length : 0;
};

const index = JSON.parse(fs.readFileSync(path.join(OUT, "index.json"), "utf8"));

// optional: which songs are already in the library
const status = new Map();
const mrPath = path.join(OUT, "match-report.csv");
if (fs.existsSync(mrPath)) {
  const lines = fs.readFileSync(mrPath, "utf8").split("\n").slice(1);
  for (const line of lines) {
    const m = line.match(/^(\d+),/);
    if (!m) continue;
    status.set(Number(m[1]), /,(in_library[a-z_]*|missing|unusable-title),/.test(line)
      ? line.split(",").find((f) => f.startsWith("in_library") || f === "missing" || f === "unusable-title")
      : "");
  }
}

const rows = [];
const tally = { none: 0, partial: 0, full: 0 };
let parsed = 0;

for (const entry of index) {
  const f = path.join(RAW, `${entry.id}.html`);
  if (!fs.existsSync(f)) continue;
  parsed++;
  const rec = parseSong(entry.id, fs.readFileSync(f, "utf8"));

  const enChars = rec.english.trim().length;
  const teChars = rec.telugu.trim().length;
  const teSt = countStanzas(rec.telugu);
  const enSt = countStanzas(rec.english);

  let verdict;
  if (enChars < MIN_CHARS) verdict = "none";
  else if (teSt > enSt) verdict = "partial";
  else verdict = "full";
  tally[verdict]++;

  rows.push([
    entry.id,
    rec.titleEn || rec.title || entry.title,
    rec.titleTe || "",
    verdict,
    teChars, enChars, teSt, enSt,
    rec.author || "",
    status.get(entry.id) || "",
    rec.url,
  ]);
}

const head = "wtc_id,title_en,title_te,english,telugu_chars,english_chars,telugu_stanzas,english_stanzas,author,library_status,url";
fs.writeFileSync(path.join(OUT, "english-coverage.csv"),
  [head].concat(rows.map((r) => r.map(cell).join(","))).join("\n") + "\n", "utf8");
fs.writeFileSync(path.join(OUT, "no-english.csv"),
  [head].concat(rows.filter((r) => r[3] !== "full").map((r) => r.map(cell).join(","))).join("\n") + "\n", "utf8");

// two different denominators: crawl progress is against the catalogue, the
// breakdown is against what has actually been parsed so far
const pct = (n) => `${((n / (parsed || 1)) * 100).toFixed(1)}%`;
const ofCatalogue = ((parsed / (index.length || 1)) * 100).toFixed(1);
console.log(`pages cached & parsed : ${parsed} of ${index.length} (${ofCatalogue}% of the catalogue)`);
console.log(`  full transliteration : ${tally.full}  ${pct(tally.full)}`);
console.log(`  PARTIAL              : ${tally.partial}  ${pct(tally.partial)}`);
console.log(`  NONE                 : ${tally.none}  ${pct(tally.none)}`);

if (status.size) {
  const miss = rows.filter((r) => r[9] === "missing");
  const missNo = miss.filter((r) => r[3] === "none").length;
  const missPart = miss.filter((r) => r[3] === "partial").length;
  console.log(`\nof the songs NOT already in your library (${miss.length} parsed so far):`);
  console.log(`  none    : ${missNo}`);
  console.log(`  partial : ${missPart}`);
  console.log(`  full    : ${miss.length - missNo - missPart}`);
}
console.log(`\nwrote ${OUT}/english-coverage.csv and no-english.csv`);
