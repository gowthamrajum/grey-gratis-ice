#!/usr/bin/env node
// Delete the reviewNeeded/ files that are confirmed duplicates of songs already
// in the library. They cannot be imported and there is nothing to decide.
//
//   node scripts/remove-confirmed-duplicates.js --dry-run
//   node scripts/remove-confirmed-duplicates.js
//   node scripts/remove-confirmed-duplicates.js --threshold 0.75   # widen it
//
// CONFIRMED means one of:
//   - skeleton containment: the candidate's opening appears verbatim inside a
//     library song, after folding the spelling the three sources disagree on
//   - >= 85% character-3gram overlap on the folded skeleton (tune with
//     --threshold)
//   - a second copy of another file in reviewNeeded/ (the first is kept)
//
// Anything BELOW the threshold is deliberately left in place. At 75-84% the
// match is usually still real — a library copy carrying extra verses — but
// "usually" is not a reason to delete somebody's hymn, so those stay for a human.
//
// Every deletion is a git-tracked file: `git checkout -- reviewNeeded/` restores.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const REVIEW = path.join(ROOT, "reviewNeeded");
const ANALYSIS = path.join(ROOT, "song-review", "data", "analysis.json");

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DRY = process.argv.includes("--dry-run");
const THRESHOLD = parseFloat(arg("threshold", "0.85"));

if (!fs.existsSync(ANALYSIS)) {
  console.error("no analysis — run: node song-review/analyze.js");
  process.exit(1);
}
const results = JSON.parse(fs.readFileSync(ANALYSIS, "utf8")).results;

const pct = (how) => {
  const m = /(\d+)%/.exec(how || "");
  return m ? +m[1] / 100 : null;
};

const remove = [], keep = [];
for (const r of results) {
  if (r.verdict !== "duplicate") continue;
  const d = r.duplicate_of;
  if (!d && r.twin_in_review) {
    remove.push({ ...r, why: `second copy of ${r.twin_in_review}`, band: "twin" });
    continue;
  }
  if (!d) continue;
  if (d.how === "skeleton match") {
    remove.push({ ...r, why: `skeleton match with #${d.song_id} ${d.name}`, band: "skeleton" });
    continue;
  }
  const p = pct(d.how);
  if (p !== null && p >= THRESHOLD)
    remove.push({ ...r, why: `${Math.round(p * 100)}% overlap with #${d.song_id} ${d.name}`,
                  band: `${Math.round(p * 100)}%` });
  else
    keep.push({ ...r, why: d.how });
}

const byBand = {};
for (const x of remove) {
  const k = x.band === "skeleton" || x.band === "twin" ? x.band
          : parseInt(x.band) >= 95 ? "95-100%" : parseInt(x.band) >= 90 ? "90-94%" : "85-89%";
  byBand[k] = (byBand[k] || 0) + 1;
}

console.log(`threshold          : ${Math.round(THRESHOLD * 100)}% overlap`);
console.log(`confirmed, deleting: ${remove.length}`);
for (const [k, v] of Object.entries(byBand)) console.log(`    ${k.padEnd(10)} ${v}`);
console.log(`below threshold, kept for review: ${keep.length}`);

if (DRY) {
  console.log("\nsample of what stays behind:");
  for (const x of keep.slice(0, 8))
    console.log(`    ${x.title.slice(0, 40).padEnd(40)} ${x.why}`);
  console.log("\n[dry run] nothing changed");
  process.exit(0);
}

let gone = 0, missing = 0;
const log = [];
for (const x of remove) {
  const full = path.join(REVIEW, x.corpus, x.file);
  if (!fs.existsSync(full)) { missing++; continue; }
  fs.unlinkSync(full);
  gone++;
  log.push({ file: x.id, title: x.title, corpus: x.corpus, why: x.why });
}
fs.writeFileSync(path.join(REVIEW, "removed-duplicates.json"), JSON.stringify({
  removed_at: new Date().toISOString(), threshold: THRESHOLD,
  removed: gone, kept_below_threshold: keep.length,
  kept: keep.map((k) => ({ file: k.id, title: k.title, why: k.why })),
  files: log,
}, null, 1), "utf8");

console.log(`\ndeleted ${gone} duplicate files${missing ? ` (${missing} already gone)` : ""}`);
console.log(`kept    ${keep.length} below ${Math.round(THRESHOLD * 100)}% — listed in reviewNeeded/removed-duplicates.json`);
console.log(`restore with: git checkout -- reviewNeeded/`);
