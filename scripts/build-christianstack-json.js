#!/usr/bin/env node
// Convert harvested christianstack records into YOUR app's exact song schema.
//
//   node scripts/build-christianstack-json.js
//   node scripts/build-christianstack-json.js --dir prepared-christianstack
//
// Input   songData-christianstack/songs.json   (from harvest-christianstack.js)
// Output  <out>/app-songs.json                 array of exact POST /songs payloads
//         <out>/app-songs.meta.json            provenance + warnings, same order
//         <out>/app-songs.report.csv           one row per song for eyeballing
//         <out>/<dir>/<NNNNN>-<slug>.json      one reviewable file per song
//
// Unlike the waytochurch path, no AI repair step is needed here: christianstack
// marks up each stanza as its own <p> with <br> between lines, and labels them
// (పల్లవి / చరణం-1 / Pallavi / Charanam-1), so the pallavi-vs-charanam split and
// the projection line breaks come straight from the source. That is why the
// harvester reads rendered innerText — the structure IS the line breaks.
//
// Author handling, title casing and the author-map shape are reused from
// build-app-json.js rather than reimplemented; those took several rounds to
// get right and must stay identical across both sources.
//
// The English translation the site also publishes is NOT part of the POST /songs
// schema, so it is kept in the meta file rather than inlined into the payload.

const fs = require("fs");
const path = require("path");
const { authorMap, titleCase } = require("./build-app-json.js");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData-christianstack")));
const DIR = path.join(OUT, arg("dir", "prepared"));

// Stanza labels the site uses, in both scripts. The number carried by a charanam
// label is authoritative — it is what the source itself calls that verse.
const PALLAVI_RE = /^\s*(?:పల్లవి|అనుపల్లవి|pallavi|anupallavi|chorus|refrain)\s*[-–:.]*\s*(\d*)\s*[:.]?\s*$/i;
const CHARANAM_RE = /^\s*(?:చరణం|చరణము|charanam|charanamu|verse|stanza)\s*[-–:.]*\s*(\d*)\s*[:.]?\s*$/i;
// Same labels but glued to the front of a lyric line ("పల్లవి: గొప్ప దేవుడు").
const INLINE_LABEL_RE = /^\s*(?:పల్లవి|అనుపల్లవి|చరణం|చరణము|pallavi|anupallavi|charanam|charanamu|chorus|refrain|verse|stanza)\s*[-–]?\s*\d*\s*[:.]\s*/i;
// A bare "1." / "2)" verse marker on the first line. The two panes do not agree
// about this — the transliteration commonly numbers its verses while the Telugu
// does not (or vice versa) — so left in, the digits show up on the projector in
// one language only. The marker is stripped and kept as the stanza number, which
// is strictly better than positional numbering when a verse is missing.
const NUM_PREFIX_RE = /^\s*(\d{1,2})\s*[.)]\s*(?=\S)/;

// Classify a stanza (array of lines) and strip its label line.
function classify(lines) {
  const out = { kind: "", number: 0, lines: [...lines] };
  if (!out.lines.length) return out;

  const first = out.lines[0];
  let m = first.match(PALLAVI_RE);
  if (m) { out.kind = "pallavi"; out.lines.shift(); return out; }
  m = first.match(CHARANAM_RE);
  if (m) { out.kind = "charanam"; out.number = parseInt(m[1], 10) || 0; out.lines.shift(); return out; }

  // Label glued onto the first lyric line rather than sitting on its own.
  if (INLINE_LABEL_RE.test(first)) {
    const isCharanam = /^\s*(?:చరణం|చరణము|charanam|charanamu|verse|stanza)/i.test(first);
    const num = (first.match(/\d+/) || [])[0];
    out.kind = isCharanam ? "charanam" : "pallavi";
    out.number = isCharanam ? parseInt(num, 10) || 0 : 0;
    out.lines[0] = first.replace(INLINE_LABEL_RE, "").trim();
    if (!out.lines[0]) out.lines.shift();
    return out;
  }

  // Bare "1." verse marker.
  const nm = first.match(NUM_PREFIX_RE);
  if (nm) {
    out.kind = "charanam";
    out.number = parseInt(nm[1], 10) || 0;
    out.lines[0] = first.replace(NUM_PREFIX_RE, "").trim();
    if (!out.lines[0]) out.lines.shift();
  }
  return out;
}

// Split a harvested pane (array of stanzas) into a main stanza plus body verses.
// Preference order: an explicit pallavi label; otherwise the first stanza.
function sections(pane) {
  const parts = (pane || []).map(classify).filter((p) => p.lines.length);
  if (!parts.length) return { main: [], body: [], labelled: false };

  const labelled = parts.some((p) => p.kind);
  let mainIdx = parts.findIndex((p) => p.kind === "pallavi");
  if (mainIdx === -1) mainIdx = parts.findIndex((p) => p.kind !== "charanam");
  if (mainIdx === -1) mainIdx = labelled ? -1 : 0;

  const main = mainIdx >= 0 ? parts[mainIdx].lines : [];
  const body = parts.filter((_, i) => i !== mainIdx);
  return { main, body, labelled };
}

// "Goppa Devudu Rajula Raaju – Jessy Paul Telugu Christian Lyrics" -> the song
// only. The artist and the boilerplate suffix are both dropped; the artist is
// already captured separately from the credits block.
const SUFFIX_RE = /\s*(?:\|\s*)?(?:latest\s+)?telugu\s+christian\s+(?:song\s+)?lyrics?\s*$|\s*telugu\s+(?:song\s+)?lyrics?\s*$|\s*christian\s+(?:song\s+)?lyrics?\s*$|\s+lyrics?\s*$/i;

function songName(rec) {
  let t = String(rec.title || "").replace(/\s+/g, " ").trim();
  const dash = t.search(/\s[–—|]\s/);
  if (dash > 0) t = t.slice(0, dash);
  t = t.replace(SUFFIX_RE, "").replace(/[\s|,–—-]+$/, "").trim();
  if (!t) t = String(rec.title || "").replace(SUFFIX_RE, "").trim();
  return titleCase(t);
}

// The credit block is free-form "Label: Value". Lyric authorship is what the
// library's author field means — not the vocalist, not the music director.
const LYRIC_KEY = /(lyric|written|writer|రచన|penned|composed\s*&?\s*written)/i;
const CREDIT_FALLBACK = ["Lyrics", "Lyrics & Tune", "Lyricist", "Song Writer", "Written By"];

function authorOf(rec) {
  const c = rec.credits || {};
  let v = "";
  for (const k of Object.keys(c)) {
    if (LYRIC_KEY.test(k)) { v = c[k]; break; }
  }
  if (!v) for (const k of CREDIT_FALLBACK) if (c[k]) { v = c[k]; break; }
  // "Paul Alexander & Suresh Punuru" is fine; strip trailing notes in brackets.
  return String(v).replace(/\s*[\(\[].*?[\)\]]\s*$/, "").trim();
}

function build(rec) {
  const warnings = [];
  const te = sections(rec.telugu);
  const en = sections(rec.english);

  // stanza_number is always the position, 1..N — never the number the source
  // declared. Mixing the two produced sequences like [1,2,2,4,3,6]: the panes
  // disagree about which verses carry a marker (an unlabelled anupallavi in one
  // pane shifts everything after it), so a source number and a positional
  // fallback would collide. Two stanzas numbered "2" is a defect you would only
  // notice mid-service, on the projector. Where the source numbering was
  // self-consistent this changes nothing; where it disagrees, it is flagged.
  const stanzas = [];
  const n = Math.max(te.body.length, en.body.length);
  let renumbered = 0;
  for (let i = 0; i < n; i++) {
    const declared = (te.body[i] && te.body[i].number) || (en.body[i] && en.body[i].number) || 0;
    if (declared && declared !== i + 1) renumbered++;
    stanzas.push({
      stanza_number: i + 1,
      telugu: (te.body[i] && te.body[i].lines) || [],
      english: (en.body[i] && en.body[i].lines) || [],
    });
  }

  if (!te.main.length && !te.body.length) warnings.push("no-telugu-lyrics");
  if (!en.main.length && !en.body.length) warnings.push("no-english-lyrics");
  if (te.body.length !== en.body.length && en.body.length) {
    warnings.push(`stanza-count-mismatch te=${te.body.length} en=${en.body.length}`);
  }
  const allTe = [te.main, ...stanzas.map((s) => s.telugu)];
  if (allTe.some((lines) => lines.some((l) => l.length > 120))) warnings.push("unbroken-lines");
  if (!te.labelled) warnings.push("unlabelled-stanzas");
  if (renumbered) warnings.push(`renumbered-${renumbered}`);
  if (!te.main.length && stanzas.length) warnings.push("no-main-stanza");

  const song_name = songName(rec);
  if (!song_name) warnings.push("no-title");

  return {
    payload: {
      song_name,
      author: authorMap(authorOf(rec)),
      main_stanza: { telugu: te.main, english: en.main },
      stanzas,
    },
    meta: {
      source: "christianstack",
      source_url: rec.url,
      slug: rec.slug,
      posted: rec.date || "",
      credits: rec.credits || {},
      tags: rec.tags || [],
      translation: rec.translation || [],
      harvest_warnings: rec.warnings || [],
      warnings,
    },
  };
}

module.exports = { build, sections, classify, songName, authorOf };
if (require.main !== module) return;

// ---------- main ----------
const inPath = path.join(OUT, "songs.json");
if (!fs.existsSync(inPath)) {
  console.error(`missing ${inPath} — run scripts/harvest-christianstack.js first`);
  process.exit(1);
}
const records = JSON.parse(fs.readFileSync(inPath, "utf8"));

const slug = (s) => String(s || "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "song";

fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });

const payloads = [], metas = [], rows = [];
let skippedEmpty = 0;

records.forEach((rec, i) => {
  const { payload, meta } = build(rec);

  const teLines = payload.main_stanza.telugu.length +
    payload.stanzas.reduce((n, s) => n + s.telugu.length, 0);
  if (!payload.song_name || !teLines) { skippedEmpty++; return; }

  payloads.push(payload);
  metas.push(meta);

  const file = `${String(payloads.length).padStart(5, "0")}-${slug(payload.song_name)}.json`;
  fs.writeFileSync(path.join(DIR, file), JSON.stringify(payload, null, 2) + "\n", "utf8");

  rows.push([
    file, payload.song_name,
    payload.author["Authored by"] || payload.author["రచన"] || "",
    payload.stanzas.length,
    payload.main_stanza.telugu.length, payload.main_stanza.english.length,
    meta.translation.length ? "yes" : "",
    meta.posted, meta.warnings.join("; "), meta.source_url,
  ]);
});

const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
fs.writeFileSync(path.join(OUT, "app-songs.json"), JSON.stringify(payloads, null, 2), "utf8");
fs.writeFileSync(path.join(OUT, "app-songs.meta.json"), JSON.stringify(metas, null, 2), "utf8");
const header = "file,song_name,author,stanzas,main_te_lines,main_en_lines,translation,posted,warnings,url";
const csv = [header].concat(rows.map((r) => r.map(cell).join(","))).join("\n") + "\n";
fs.writeFileSync(path.join(OUT, "app-songs.report.csv"), csv, "utf8");
fs.writeFileSync(path.join(DIR, "_index.csv"), csv, "utf8");

const has = (w) => metas.filter((m) => m.warnings.some((x) => x.startsWith(w))).length;
console.log(`converted ${payloads.length} songs -> ${DIR}`);
console.log(`  skipped, no title/lyrics : ${skippedEmpty}`);
console.log(`  clean (no warnings)      : ${metas.filter((m) => !m.warnings.length).length}`);
console.log(`  with author              : ${payloads.filter((p) => p.author["Authored by"] || p.author["రచన"]).length}`);
console.log(`  with transliteration     : ${payloads.filter((p) => p.main_stanza.english.length || p.stanzas.some((s) => s.english.length)).length}`);
console.log(`  missing transliteration  : ${has("no-english")}`);
console.log(`  stanza count mismatch    : ${has("stanza-count")}`);
console.log(`  unlabelled stanzas       : ${has("unlabelled")}`);
console.log(`  unbroken lines           : ${has("unbroken")}`);
console.log(`\nwrote ${OUT}/app-songs.json (+ .meta.json, .report.csv)`);
