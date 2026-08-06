#!/usr/bin/env node
// Prove the christianstack conversion neither dropped nor invented lyric text.
//
//   node scripts/verify-christianstack.js
//   node scripts/verify-christianstack.js --show 20
//
// Compares, per song, the character multiset of what the BROWSER rendered
// (songData-christianstack/songs.json) against what ended up in the payload
// (app-songs.json). The conversion is purely mechanical — strip stanza labels,
// strip "1." markers, regroup — so the two should agree almost exactly.
//
// This mirrors the guard in fix-prepared.js, and for the same reason: these are
// worship lyrics, and a silently mangled verse is far worse than a badly
// formatted one. Any invented character at all is an error here (unlike the AI
// path, which needs a tolerance); missing characters are allowed only up to what
// the known labels can account for.

const fs = require("fs");
const path = require("path");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData-christianstack")));
const SHOW = parseInt(arg("show", "10"), 10);

const songs = JSON.parse(fs.readFileSync(path.join(OUT, "songs.json"), "utf8"));
const payloads = JSON.parse(fs.readFileSync(path.join(OUT, "app-songs.json"), "utf8"));
const metas = JSON.parse(fs.readFileSync(path.join(OUT, "app-songs.meta.json"), "utf8"));

const byUrl = new Map(songs.map((s) => [s.url, s]));

// Only letters matter: whitespace and punctuation are regrouped by design.
const TE = /[ఀ-౿]/;
const letters = (s) => (String(s).match(/[\p{L}\p{N}]/gu) || []);
const teLetters = (s) => (String(s).match(/[ఀ-౿]/g) || []);

function bag(arr) {
  const m = new Map();
  for (const c of arr) m.set(c, (m.get(c) || 0) + 1);
  return m;
}
function diff(a, b) { // counts in a that b cannot cover
  let n = 0;
  const bb = bag(b);
  for (const [c, k] of bag(a)) n += Math.max(0, k - (bb.get(c) || 0));
  return n;
}

const flatPane = (pane) => (pane || []).flat().join(" ");
const flatPayload = (p, key) =>
  [p.main_stanza[key], ...p.stanzas.map((s) => s[key])].flat().join(" ");

const rows = [];
for (let i = 0; i < payloads.length; i++) {
  const p = payloads[i], m = metas[i];
  const src = byUrl.get(m.source_url);
  if (!src) { rows.push({ name: p.song_name, url: m.source_url, err: "no source record" }); continue; }

  const r = { name: p.song_name, url: m.source_url, warnings: m.warnings };

  for (const [key, pane] of [["telugu", src.telugu], ["english", src.english]]) {
    const from = key === "telugu" ? teLetters(flatPane(pane)) : letters(flatPane(pane));
    const to = key === "telugu" ? teLetters(flatPayload(p, key)) : letters(flatPayload(p, key));
    r[`${key}_src`] = from.length;
    r[`${key}_out`] = to.length;
    r[`${key}_invented`] = diff(to, from);  // in output, not in source  -> must be 0
    r[`${key}_lost`] = diff(from, to);      // in source, not in output
  }
  rows.push(r);
}

const invented = rows.filter((r) => (r.telugu_invented || 0) + (r.english_invented || 0) > 0);
// The only text the conversion is allowed to drop is a label word or a "1."
// marker — a handful of characters per stanza. A larger loss means a whole line
// or verse went missing, which is a real defect and gets listed for review.
const lost = rows.filter((r) => (r.telugu_lost || 0) > 0);
const bigLoss = rows.filter((r) => (r.telugu_lost || 0) > 40);
const errs = rows.filter((r) => r.err);

const sum = (k) => rows.reduce((n, r) => n + (r[k] || 0), 0);

console.log(`verified ${rows.length} songs against the rendered source\n`);
console.log(`telugu letters     source ${sum("telugu_src")}  ->  output ${sum("telugu_out")}`);
console.log(`english letters    source ${sum("english_src")}  ->  output ${sum("english_out")}`);
console.log("");
console.log(`songs with INVENTED characters : ${invented.length}   <- must be 0`);
console.log(`songs with any telugu dropped  : ${lost.length}`);
console.log(`songs dropping >40 telugu chars: ${bigLoss.length}   <- review these`);
console.log(`source records missing         : ${errs.length}`);

const show = (title, list) => {
  if (!list.length) return;
  console.log(`\n${title}`);
  for (const r of list.slice(0, SHOW)) {
    console.log(`  ${String(r.telugu_lost ?? 0).padStart(4)} te lost, ` +
      `${String(r.telugu_invented ?? 0).padStart(3)} te invented  ${r.name}`);
    console.log(`       ${r.url}`);
  }
  if (list.length > SHOW) console.log(`  ... and ${list.length - SHOW} more`);
};
show("INVENTED (payload has characters the page never showed):", invented);
show("LARGEST DROPS:", bigLoss.sort((a, b) => b.telugu_lost - a.telugu_lost));

fs.writeFileSync(path.join(OUT, "verify-report.json"), JSON.stringify(rows, null, 1), "utf8");
console.log(`\nwrote ${path.join(OUT, "verify-report.json")}`);

process.exitCode = invented.length ? 1 : 0;
