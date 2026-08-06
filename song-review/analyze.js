#!/usr/bin/env node
// Diagnose every song sitting in reviewNeeded/ and say what is wrong with it.
//
//   node song-review/analyze.js            # run once, write data/analysis.json
//   node song-review/analyze.js --quiet
//
// The server also calls run() directly and streams each result as it lands.
//
// Each song gets a VERDICT — the one thing a person needs in order to act:
//
//   ready         nothing wrong; import it
//   title-blocked nothing wrong with the song, but POST /songs will 409 because
//                 its title is >=0.8 similar to a different song already in the
//                 library. Rename, then import.
//   duplicate     the same song is already in the library, or appears twice
//                 inside reviewNeeded itself
//   fixable       has defects that can be repaired from the record alone
//   needs-source  incomplete — repairing it needs the published lyrics
//   not-a-song    no Telugu lyrics at all; page furniture or a stray fragment

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const REVIEW = path.join(ROOT, "reviewNeeded");
const DATA = path.join(__dirname, "data");

const TE = /[ఀ-౿]/;
const LAT = /[A-Za-z]/;
const REF = /^\s*(reference|ref)\s*[:\-]/i;
const JUNK = /(adsbygoogle|sponsored|related\s+posts|share\s+this|click\s+here|subscribe|https?:\/\/|www\.|distrokid|🎵|scale-\s*[a-g]|tempo-|sig-|^\s*lyrics\s*[:\-]|^\s*(bridge|outro|intro|pre-?chorus|chorus|verse)\s*[:\-])/i;
const HEADING = /(పల్లవి|చరణం|చరణము|అనుపల్లవి|కోరస్|ఛొరుస్)\s*[:\-]/;
const SARGAM = /\b(sa|ri|ga|ma|pa|da|ni)\b(\s+\b(sa|ri|ga|ma|pa|da|ni)\b){3,}/i;

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

// exact port of the server's conflict rule, so "would this 409" is not a guess
const WS = /\s+/g;
function dice(a, b) {
  a = String(a).replace(WS, ""); b = String(b).replace(WS, "");
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const m = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const g = a.substr(i, 2); m.set(g, (m.get(g) || 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const g = b.substr(i, 2), c = m.get(g) || 0;
    if (c > 0) { m.set(g, c - 1); hits++; }
  }
  return (2 * hits) / (a.length + b.length - 2);
}

const blocks = (s) => [s.main_stanza || {}, ...(s.stanzas || []).filter(Boolean)];
const teLines = (s) => blocks(s).flatMap((b) => (b.telugu || []).map(String));
const enLines = (s) => blocks(s).flatMap((b) => (b.english || []).map(String));
const allLines = (s) => [...teLines(s), ...enLines(s)];

function diagnose(s) {
  const out = [];
  const ms = s.main_stanza || {};
  const stz = (s.stanzas || []).filter(Boolean);
  const mte = ms.telugu || [];
  const te = teLines(s), en = enLines(s), all = allLines(s);
  const add = (k, sev, t) => out.push({ k, s: sev, t });

  const teReal = te.filter((l) => TE.test(l));
  if (!teReal.length) add("no-telugu", "critical", "No Telugu lyrics at all — this may be page furniture rather than a song.");
  if (teReal.length && teReal.join("").replace(/\s/g, "").length < 40)
    add("too-short", "critical", `Only ${teReal.length} line(s) of Telugu — the body looks truncated.`);
  if (!stz.length && mte.length >= 5)
    add("one-block", "critical", `All ${mte.length} lines sit in one block with no verses separated out.`);
  if (!mte.length && stz.length) add("no-chorus", "warning", "No chorus recorded — everything is in the verses.");
  if (mte.length >= 9) add("long-chorus", "info", `The chorus is ${mte.length} lines — often a legitimate pallavi + anupallavi, occasionally swallowed verses.`);

  for (const b of blocks(s)) {
    const t = b.telugu || [], e = b.english || [];
    if (t.length && e.length && t.length !== e.length) {
      add("misaligned", "warning", `A block pairs ${t.length} Telugu lines against ${e.length} romanised ones, so the wrong lines line up on screen.`);
      break;
    }
  }
  const enReal = en.filter((l) => LAT.test(l));
  if (teReal.length >= 3 && !enReal.length) add("no-romanisation", "warning", "No romanisation at all.");
  else if (teReal.length >= 3 && enReal.length < teReal.length * 0.6)
    add("part-romanisation", "warning", `Romanisation covers only ${enReal.length} of ${teReal.length} Telugu lines.`);

  if (all.some((l) => REF.test(l))) add("citation", "warning", "A scripture citation was scraped in as a lyric line.");
  if (all.some((l) => JUNK.test(l))) add("junk", "warning", "Non-lyric text — page furniture, a section label, credits or a URL — is mixed into the lyrics.");
  if (te.some((l) => HEADING.test(l))) add("inline-heading", "info", "A పల్లవి / చరణం heading is stored as a lyric line.");
  if (en.some((l) => SARGAM.test(l))) add("sargam", "info", "A run of sargam solfège is stored as lyrics.");
  if (teReal.length && te.some((l) => l && !TE.test(l) && LAT.test(l)))
    add("mixed-script", "info", "A Latin-script line sits in the Telugu field — genuine in bilingual songs, a swap otherwise.");
  for (let i = 1; i < te.length; i++)
    if (te[i].trim() && te[i].trim() === te[i - 1].trim()) {
      add("repeat", "info", "A line is written twice in a row — usually a real sung repeat, worth confirming.");
      break;
    }
  return out;
}

function loadLibrary() {
  const p = path.join(DATA, "library-cache.json");
  if (!fs.existsSync(p)) throw new Error("data/library-cache.json missing — run build-queue.js --refresh");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listFiles() {
  const out = [];
  if (!fs.existsSync(REVIEW)) return out;
  for (const d of fs.readdirSync(REVIEW)) {
    const dir = path.join(REVIEW, d);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")))
      out.push({ corpus: d, file: f, full: path.join(dir, f) });
  }
  return out;
}

// onItem is called per song so a caller can stream progress
// Character-3gram Dice over the folded skeleton. Skeleton *containment* only
// finds a duplicate when the candidate's opening survives verbatim inside the
// library copy; this finds it wherever the two diverge, and is what the importer
// gates on. The two must agree or the dashboard promises imports that bounce.
const G = 3;
const gramsOf = (sk) => {
  const m = new Map();
  for (let i = 0; i + G <= sk.length; i++) {
    const g = sk.substr(i, G); m.set(g, (m.get(g) || 0) + 1);
  }
  return m;
};
const diceGrams = (ga, na, gb, nb) => {
  if (!na || !nb) return 0;
  let inter = 0;
  for (const [k, v] of ga) inter += Math.min(v, gb.get(k) || 0);
  return (2 * inter) / (na + nb);
};

async function run(onItem) {
  const lib = loadLibrary();
  const libSk = lib.map((s) => ({ id: s.song_id, name: s.song_name, sk: skel(teLines(s).join("")) }));
  const libGrams = libSk.filter((x) => x.sk.length >= 60)
    .map((x) => ({ ...x, g: gramsOf(x.sk), n: x.sk.length - G + 1 }));
  const similarTo = (sk) => {
    if (sk.length < 60) return null;
    const g = gramsOf(sk), n = sk.length - G + 1;
    let best = 0, who = null;
    for (const L of libGrams) {
      const r = L.sk.length / sk.length;
      if (r < 0.45 || r > 2.4) continue;
      const d = diceGrams(g, n, L.g, L.n);
      if (d > best) { best = d; who = L; }
    }
    return best >= 0.75 ? { song_id: who.id, name: who.name, score: +best.toFixed(3) } : null;
  };
  const files = listFiles();
  const seen = new Map();          // skeleton head -> first file that used it
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let s;
    try { s = JSON.parse(fs.readFileSync(f.full, "utf8")); }
    catch {
      const r = { id: `${f.corpus}/${f.file}`, corpus: f.corpus, file: f.file,
                  title: f.file, verdict: "not-a-song", issues: [
                    { k: "unreadable", s: "critical", t: "File is not valid JSON." }] };
      results.push(r); if (onItem) await onItem(r, i + 1, files.length); continue;
    }

    const issues = diagnose(s);
    const sk = skel(teLines(s).join(""));
    const head = sk.slice(0, 40);

    // already in the library?
    let dupOf = null;
    if (head.length >= 14) {
      const hit = libSk.find((x) => x.sk.includes(head));
      if (hit) dupOf = { where: "library", song_id: hit.id, name: hit.name, how: "skeleton match" };
    }
    if (!dupOf) {
      const sim = similarTo(sk);
      if (sim) dupOf = { where: "library", song_id: sim.song_id, name: sim.name,
                         how: `${Math.round(sim.score * 100)}% lyric overlap` };
    }
    // or a second copy inside reviewNeeded itself?
    let twin = null;
    if (!dupOf && head.length >= 14) {
      if (seen.has(head)) twin = seen.get(head);
      else seen.set(head, `${f.corpus}/${f.file}`);
    }

    // would POST /songs reject the title?
    let blocker = null;
    if (s.song_name) {
      let best = 0, who = null;
      for (const x of libSk) {
        const d = dice(s.song_name, x.name);
        if (d > best) { best = d; who = x; }
        if (best === 1) break;
      }
      if (best >= 0.8) blocker = { song_id: who.id, name: who.name, score: +best.toFixed(3) };
    }

    const sev = (k) => issues.some((x) => x.k === k);
    let verdict;
    if (dupOf || twin) verdict = "duplicate";
    else if (sev("no-telugu") || sev("unreadable")) verdict = "not-a-song";
    else if (sev("too-short") || sev("no-romanisation") || sev("part-romanisation")) verdict = "needs-source";
    else if (issues.some((x) => x.s === "critical" || x.s === "warning")) verdict = "fixable";
    else if (blocker) verdict = "title-blocked";
    else verdict = "ready";
    if (verdict === "fixable" && blocker) verdict = "fixable";   // fix first, then rename

    const r = {
      id: `${f.corpus}/${f.file}`, corpus: f.corpus, file: f.file,
      title: s.song_name || "(untitled)",
      author: typeof s.author === "object" ? (s.author["Authored by"] || "") : (s.author || ""),
      verdict, issues,
      telugu_lines: teLines(s).filter((l) => TE.test(l)).length,
      stanzas: (s.stanzas || []).length,
      duplicate_of: dupOf, twin_in_review: twin, title_blocked_by: blocker,
    };
    results.push(r);
    if (onItem) await onItem(r, i + 1, files.length);
  }
  return results;
}

module.exports = { run, listFiles, diagnose };

if (require.main === module) {
  const quiet = process.argv.includes("--quiet");
  run((r, i, n) => { if (!quiet && i % 100 === 0) process.stdout.write(`  ${i}/${n}\r`); })
    .then((res) => {
      fs.mkdirSync(DATA, { recursive: true });
      fs.writeFileSync(path.join(DATA, "analysis.json"),
        JSON.stringify({ generated: new Date().toISOString(), total: res.length, results: res }), "utf8");
      const c = {};
      for (const r of res) c[r.verdict] = (c[r.verdict] || 0) + 1;
      console.log(`\nanalysed ${res.length} songs`);
      for (const [k, v] of Object.entries(c).sort((a, b) => b[1] - a[1]))
        console.log(`  ${k.padEnd(14)} ${v}`);
      console.log(`wrote data/analysis.json`);
    })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
