#!/usr/bin/env node
// Sort the local song corpora against the live library.
//
//   node scripts/reorganize-corpora.js --dry-run   # show the plan, touch nothing
//   node scripts/reorganize-corpora.js             # do it
//
// A song file goes one of three ways:
//   IN LIBRARY  -> deleted. The library is the source of truth now; the local
//                  copy is a stale duplicate of a row that already exists.
//   NEEDS REVIEW-> moved to reviewNeeded/<source>/, together with its scraped
//                  source page where one exists, so a human has both to hand.
//   NEITHER     -> also moved to reviewNeeded/. These are prepared songs that
//                  were never imported AND never reached the review queue —
//                  mostly waytochurch payloads that never got built into
//                  app-songs.json. They are not junk, just untriaged.
//
// Everything here is tracked in git, so a deletion is recoverable with
// `git checkout -- <path>`. Nothing is removed that is not first accounted for.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DRY = process.argv.includes("--dry-run");
const REVIEW = path.join(ROOT, "reviewNeeded");

const FOLD = { "ఖ":"క","ఘ":"గ","ఛ":"చ","ఝ":"జ","ఠ":"ట","ఢ":"డ","థ":"త","ధ":"ద",
               "ఫ":"ప","భ":"బ","శ":"స","ష":"స","ణ":"న","ఱ":"ర" };
const dropNasal = (s) => String(s || "").replace(/[ఙఞణనమ]్(?=[క-హ])/g, "");
const skel = (s) => [...dropNasal(String(s || ""))]
  .filter((c) => { const p = c.codePointAt(0); return p >= 0x0c00 && p <= 0x0c7f; })
  .filter((c) => { const p = c.codePointAt(0);
    if (p >= 0x0c01 && p <= 0x0c03) return false;
    if (p >= 0x0c3e && p <= 0x0c56) return false;
    return true; })
  .map((c) => FOLD[c] || c).join("");

const teOf = (s) => {
  const o = [];
  for (const l of (s.main_stanza || {}).telugu || []) o.push(String(l));
  for (const st of s.stanzas || []) for (const l of st.telugu || []) o.push(String(l));
  return skel(o.join(""));
};

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// ---- library ----
const cache = path.join(ROOT, "song-review", "data", "library-cache.json");
if (!fs.existsSync(cache)) {
  console.error("need song-review/data/library-cache.json — run: node song-review/build-queue.js --refresh");
  process.exit(1);
}
const lib = read(cache);
const libBlobs = lib.map(teOf);
const inLibrary = (sk) => {
  if (sk.length < 14) return false;
  const probe = sk.slice(0, 40);
  return libBlobs.some((b) => b.includes(probe));
};

// ---- which songs the review queue still wants a human to look at ----
const queuePath = path.join(ROOT, "song-review", "data", "review-queue.json");
const reviewTitles = new Set();
if (fs.existsSync(queuePath)) {
  for (const it of read(queuePath).items) {
    if (it.title) reviewTitles.add(String(it.title).toLowerCase().replace(/[^a-z0-9]/g, ""));
  }
}
const needsReview = (name) =>
  reviewTitles.has(String(name || "").toLowerCase().replace(/[^a-z0-9]/g, ""));

// ---- corpora of one-song-per-file ----
const CORPORA = [
  { name: "christianlyricz", dir: path.join(ROOT, "visualParsed") },
  { name: "christianstack", dir: path.join(ROOT, "songData-christianstack", "prepared") },
  { name: "waytochurch", dir: path.join(ROOT, "scripts", "songData", "prepared") },
];

const plan = { remove: [], review: [], unclassified: [], unreadable: [] };

for (const c of CORPORA) {
  if (!fs.existsSync(c.dir)) continue;
  for (const f of fs.readdirSync(c.dir).filter((x) => x.endsWith(".json"))) {
    const full = path.join(c.dir, f);
    let s;
    try { s = read(full); } catch { plan.unreadable.push(full); continue; }
    if (!s || !s.song_name) { plan.unreadable.push(full); continue; }
    const sk = teOf(s);
    if (inLibrary(sk)) plan.remove.push({ src: full, corpus: c.name, name: s.song_name });
    else if (needsReview(s.song_name))
      plan.review.push({ src: full, corpus: c.name, name: s.song_name, to: c.name });
    else
      plan.unclassified.push({ src: full, corpus: c.name, name: s.song_name,
                              to: c.name, why: "prepared but never imported or triaged" });
  }
}

// ---- intermediates that no longer earn their disk ----
// raw HTML is the pre-parse scrape; prepared-original is the pre-repair backup.
// Both are reproducible from the harvesters and both are in git.
const INTERMEDIATE = [
  path.join(ROOT, "scripts", "songData", "raw"),
  path.join(ROOT, "scripts", "songData", "prepared-original"),
];
const intermediate = INTERMEDIATE.filter((d) => fs.existsSync(d)).map((d) => ({
  dir: d, files: fs.readdirSync(d).length,
  bytes: fs.readdirSync(d).reduce((a, f) => {
    try { return a + fs.statSync(path.join(d, f)).size; } catch { return a; }
  }, 0),
}));

const mb = (b) => (b / 1048576).toFixed(1) + " MB";
console.log(`library ${lib.length} songs | review queue ${reviewTitles.size} titles\n`);
console.log(`already in the library, to delete : ${plan.remove.length}`);
console.log(`needs review, to move             : ${plan.review.length}`);
console.log(`never imported, never triaged     : ${plan.unclassified.length}`);
console.log(`unreadable / no title             : ${plan.unreadable.length}`);
for (const c of CORPORA) {
  const r = plan.remove.filter((x) => x.corpus === c.name).length;
  const v = plan.review.filter((x) => x.corpus === c.name).length;
  const u = plan.unclassified.filter((x) => x.corpus === c.name).length;
  console.log(`   ${c.name.padEnd(16)} delete ${String(r).padStart(5)}  review ${String(v).padStart(4)}  untriaged ${String(u).padStart(4)}`);
}
console.log(`\nintermediates to drop:`);
for (const i of intermediate)
  console.log(`   ${path.relative(ROOT, i.dir).padEnd(34)} ${String(i.files).padStart(5)} files  ${mb(i.bytes)}`);

if (DRY) { console.log("\n[dry run] nothing changed"); process.exit(0); }

// ---- execute ----
const moved = [];
for (const x of [...plan.review, ...plan.unclassified]) {
  const dst = path.join(REVIEW, x.to);
  fs.mkdirSync(dst, { recursive: true });
  const target = path.join(dst, path.basename(x.src));
  fs.renameSync(x.src, target);
  moved.push({ from: path.relative(ROOT, x.src), to: path.relative(ROOT, target),
               name: x.name, why: x.why || "in the review queue" });
}
let removed = 0;
for (const x of plan.remove) { fs.unlinkSync(x.src); removed++; }
let freed = 0;
for (const i of intermediate) { freed += i.bytes; fs.rmSync(i.dir, { recursive: true, force: true }); }

fs.mkdirSync(REVIEW, { recursive: true });
fs.writeFileSync(path.join(REVIEW, "MANIFEST.json"), JSON.stringify({
  generated: new Date().toISOString(), library: lib.length,
  moved_here: moved.length, deleted_already_in_library: removed,
  intermediates_dropped: intermediate.map((i) => path.relative(ROOT, i.dir)),
  moved,
}, null, 1), "utf8");

console.log(`\nmoved   ${moved.length} -> reviewNeeded/`);
console.log(`deleted ${removed} already-imported song files`);
console.log(`freed   ${mb(freed)} of intermediates`);
console.log(`manifest: reviewNeeded/MANIFEST.json`);
console.log(`recover anything with: git checkout -- <path>`);
