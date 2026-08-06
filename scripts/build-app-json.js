#!/usr/bin/env node
// Convert harvested waytochurch records into YOUR app's exact song schema.
//
//   node scripts/build-app-json.js
//
// Input   songData/songs.json          (from harvest-waytochurch.js)
// Output  songData/app-songs.json      array of exact POST /songs payloads
//         songData/app-songs.meta.json provenance + parse warnings, same order
//         songData/app-songs.report.csv one line per song for eyeballing
//
// app-songs.json contains ONLY the fields your API accepts, nothing else:
//
//   {
//     "song_name":   "Aahaa Mahaathma",
//     "author":      { "Authored by": "", "రచన": "పంతగాని పరదేశి" },
//     "main_stanza": { "telugu": [...], "english": [...] },
//     "stanzas":     [ { "stanza_number": 1, "telugu": [...], "english": [...] } ]
//   }
//
// Provenance (waytochurch id, album, category, ragam) is kept in the SEPARATE
// meta file rather than inlined, so app-songs.json can be POSTed verbatim
// without stripping anything first.
//
// The split is deterministic, not AI: waytochurch numbers its charanams "1." /
// "2." in both language panes, so the pallavi is simply everything before the
// first marker. That costs nothing and is reproducible, unlike sending 1,000
// songs through the lyrics parser.

const fs = require("fs");
const path = require("path");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData")));

// Charanam markers are "1." / "2." — but they are NOT reliably at the start of a
// line. Many older waytochurch pages carry the whole song as one unbroken run of
// text ("...పల్లవి: ... 1. సిలువకు ... 2. ప్రక్కలో ..."), so an anchored
// line-start match finds nothing and the entire song collapses into main_stanza
// with zero stanzas. The marker is therefore matched anywhere, but only when
// preceded by whitespace/start and followed by whitespace, so the "(2)" repeat
// markers that pepper these lyrics are not mistaken for stanza numbers.
// NOTE the trailing \s* rather than \s+: pages frequently write "1.నీ" with no
// space after the period, and requiring one silently left whole songs unsplit
// with every verse dumped into main_stanza. The lookahead keeps decimals and
// "(2)" repeat markers from matching.
const SPLIT_RE = /(?:^|\s)(\d{1,2})\.\s*(?=[^\s\d])/g;
// Section labels that are not lyrics.
const LABEL_RE = /^\s*(పల్లవి|చరణం|pallavi|charanam|anupallavi|అనుపల్లవి)\s*[:\-]?\s*/i;

function splitSections(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return [];

  const cuts = [];
  let m;
  SPLIT_RE.lastIndex = 0;
  while ((m = SPLIT_RE.exec(raw))) {
    cuts.push({ at: m.index + m[0].indexOf(m[1]), end: SPLIT_RE.lastIndex, number: parseInt(m[1], 10) });
  }

  const sections = [];
  const head = (cuts.length ? raw.slice(0, cuts[0].at) : raw).trim();
  if (head) sections.push({ number: 0, lines: splitLines(head) });
  for (let i = 0; i < cuts.length; i++) {
    const body = raw.slice(cuts[i].end, i + 1 < cuts.length ? cuts[i + 1].at : raw.length).trim();
    if (body) sections.push({ number: cuts[i].number || i + 1, lines: splitLines(body) });
  }
  return sections;
}

// Within a section, break into display lines.
// NOT on " - ": the library's own convention keeps the dash INSIDE a line as a
// phrase separator ("వీరలను క్షమించు తండ్రి – నేరమేమియున్"). Splitting on it
// shattered stanzas into one-word fragments that look nothing like the existing
// rows. Only real line breaks and the "..refrain.." returns end a line.
function splitLines(chunk) {
  return chunk
    .replace(LABEL_RE, "")
    .replace(/\s*(పల్లవి|అనుపల్లవి|చరణం)\s*:\s*/g, " ")   // label can sit mid-run
    .split(/\s*\.\.[^.]{0,40}\.\.\s*|\n+/)   // ..పల్లవి.. style refrain returns
    .map((l) => l.trim())
    .filter(Boolean);
}

// The app stores author as a per-language map (server.js authorFromColumn /
// authorToColumn), NOT a bare string:
//     { "Authored by": "<english>", "రచన": "<telugu>" }
// Passing a bare string still works, but authorToColumn files it under the
// ENGLISH label — and waytochurch credits are usually written in Telugu script
// ("పంతగాని పరదేశి"), so a bare string would put a Telugu name in the English
// slot. The script therefore routes by script.
const AUTHOR_EN = "Authored by";
const AUTHOR_TE = "రచన";

// Some pages carry a placeholder in the author field ("-", "--", "n/a") which is
// not a name and must not be written into the library as one.
const AUTHOR_JUNK = /^(-+|n\/?a|na|unknown|traditional|none|\.|\?)$/i;

function authorMap(raw) {
  const s = String(raw || "").trim();
  const out = { [AUTHOR_EN]: "", [AUTHOR_TE]: "" };
  if (!s || AUTHOR_JUNK.test(s)) return out;
  if (/[ఀ-౿]/.test(s)) out[AUTHOR_TE] = s;
  else out[AUTHOR_EN] = s;
  return out;
}

// Existing rows are stored Title Cased. Telugu text is returned untouched.
function titleCase(s) {
  if (!s || /[ఀ-౿]/.test(s)) return s;
  return s.replace(/\S+/g, (w) =>
    w.length <= 1 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)
  );
}

// The source page had no <br> tags, so a whole stanza arrives as one long run.
const stanzasTeluguPreview = (body) => body.map((s) => s.lines);

function build(rec) {
  const te = splitSections(rec.telugu);
  const en = splitSections(rec.english);
  const warnings = [];

  // Section 0 is the pallavi only when it precedes a numbered charanam; a song
  // with no numbering at all is treated as a single main_stanza.
  const teHasMarkers = te.some((s) => s.number > 0);
  const enHasMarkers = en.some((s) => s.number > 0);

  const teMain = te.length && !te[0].number ? te[0].lines : (teHasMarkers ? [] : te.flatMap((s) => s.lines));
  const enMain = en.length && !en[0].number ? en[0].lines : (enHasMarkers ? [] : en.flatMap((s) => s.lines));

  const teBody = te.filter((s) => s.number > 0);
  const enBody = en.filter((s) => s.number > 0);

  if (!teMain.length && !teBody.length) warnings.push("no-telugu-lyrics");
  if (!enMain.length && !enBody.length) warnings.push("no-english-lyrics");
  // Any over-long line is a projection problem, not just a single-line stanza —
  // the earlier check missed songs whose two "lines" were 300 characters each.
  const longRun = [teMain, ...stanzasTeluguPreview(teBody)]
    .some((lines) => lines.some((l) => l && l.length > 120));
  if (longRun) warnings.push("unbroken-lines");
  if (teBody.length !== enBody.length) {
    warnings.push(`stanza-count-mismatch te=${teBody.length} en=${enBody.length}`);
  }

  const stanzas = [];
  const n = Math.max(teBody.length, enBody.length);
  for (let i = 0; i < n; i++) {
    stanzas.push({
      stanza_number: (teBody[i] && teBody[i].number) || (enBody[i] && enBody[i].number) || i + 1,
      telugu: (teBody[i] && teBody[i].lines) || [],
      english: (enBody[i] && enBody[i].lines) || [],
    });
  }

  // song_name: prefer the transliterated title, since that is how every existing
  // row in your library is stored. waytochurch gives it lowercased, so it is
  // title-cased to match the existing convention ("Aahaa Mahaathma", not
  // "aahaa mahaathma").
  // Every existing row is stored transliterated, so a Telugu-script song_name
  // would be inconsistent with the library. When the page gives no transliterated
  // title, fall back to the opening words of the English pane.
  let name = (rec.titleEn || "").trim();
  if (!name && enMain.length) {
    // The opening line often repeats a word for emphasis; a song_name that reads
    // "Parishudhdha Parishudhdha Prabhuvaa Parishudhdha Parishudhdha" is useless
    // for searching, so collapse consecutive repeats before taking the first words.
    const words = enMain[0].split(/\s+/).filter(Boolean);
    const dedup = words.filter((w, i) => i === 0 || w.toLowerCase() !== words[i - 1].toLowerCase());
    name = dedup.slice(0, 5).join(" ");
  }
  if (!name) { name = (rec.titleTe || rec.listTitle || "").trim(); warnings.push("title-telugu-only"); }
  const song_name = titleCase(name);
  if (!song_name) warnings.push("no-title");

  return {
    payload: {
      song_name,
      author: authorMap(rec.author),
      main_stanza: { telugu: teMain, english: enMain },
      stanzas,
    },
    meta: {
      source: "waytochurch",
      source_id: rec.id,
      source_url: rec.url,
      title_te: rec.titleTe || "",
      album: rec.album || "",
      category: rec.category || "",
      ragam: rec.ragam || "",
      posted: rec.posted || "",
      warnings,
    },
  };
}

// Importable so other scripts reuse this exact conversion rather than
// reimplementing the stanza/author/title handling (which has taken several
// rounds of fixes to get right).
module.exports = { build, splitSections, authorMap, titleCase };
if (require.main !== module) return;

// ---------- main ----------
const inPath = path.join(OUT, "songs.json");
if (!fs.existsSync(inPath)) {
  console.error(`missing ${inPath} — run scripts/harvest-waytochurch.js first`);
  process.exit(1);
}
const records = JSON.parse(fs.readFileSync(inPath, "utf8"));

const payloads = [], metas = [];
for (const rec of records) {
  const { payload, meta } = build(rec);
  payloads.push(payload);
  metas.push(meta);
}

fs.writeFileSync(path.join(OUT, "app-songs.json"), JSON.stringify(payloads, null, 2), "utf8");
fs.writeFileSync(path.join(OUT, "app-songs.meta.json"), JSON.stringify(metas, null, 2), "utf8");

const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = ["source_id,song_name,author,stanzas,main_te_lines,main_en_lines,warnings"]
  .concat(payloads.map((p, i) => [
    metas[i].source_id, p.song_name, p.author["Authored by"] || p.author["రచన"], p.stanzas.length,
    p.main_stanza.telugu.length, p.main_stanza.english.length,
    metas[i].warnings.join("; "),
  ].map(cell).join(",")))
  .join("\n");
fs.writeFileSync(path.join(OUT, "app-songs.report.csv"), csv + "\n", "utf8");

const withAuthor = payloads.filter((p) => p.author["Authored by"] || p.author["రచన"]).length;
const clean = metas.filter((m) => !m.warnings.length).length;
const noEnglish = metas.filter((m) => m.warnings.some((w) => w.startsWith("no-english"))).length;
const mismatch = metas.filter((m) => m.warnings.some((w) => w.startsWith("stanza-count"))).length;

console.log(`converted ${payloads.length} songs`);
console.log(`  clean (no warnings)   : ${clean}`);
console.log(`  with author           : ${withAuthor}`);
console.log(`  missing transliteration: ${noEnglish}`);
console.log(`  stanza count mismatch : ${mismatch}`);
console.log(`\nwrote ${OUT}/app-songs.json (+ .meta.json, .report.csv)`);
