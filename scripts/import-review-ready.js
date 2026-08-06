#!/usr/bin/env node
// Import the songs the analysis marked "ready" — no defects, no duplicate, no
// title collision — straight from reviewNeeded/.
//
//   node scripts/import-review-ready.js --dry-run
//   node scripts/import-review-ready.js --limit 10
//   node scripts/import-review-ready.js
//
// THIS WRITES TO THE LIVE LIBRARY.
//
//   --dry-run    everything except the POST
//   --limit N    stop after N imports
//   --delay MS   pause between posts (default 250)
//   --keep       leave imported files in reviewNeeded/ (default: delete them)
//
// The analysis ran against a cached library. This does NOT trust that: it
// re-fetches the library and re-runs the Telugu-skeleton dedup before every
// post, because the library has grown mid-session more than once and a song
// that was unique an hour ago may not be now.
//
// Imported files are deleted from reviewNeeded/ — they are in the library now,
// and a local copy of an imported song is a stale duplicate. Everything is
// tracked in git, so `git checkout -- reviewNeeded/` brings them back.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const REVIEW = path.join(ROOT, "reviewNeeded");
const ANALYSIS = path.join(ROOT, "song-review", "data", "analysis.json");
const MANIFEST = path.join(REVIEW, "imported.json");
const API = process.env.SONGS_API || "https://grey-gratis-ice.onrender.com";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const FLAG = (n) => process.argv.includes(`--${n}`);
const DRY = FLAG("dry-run"), KEEP = FLAG("keep");
const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;
const DELAY = parseInt(arg("delay", "250"), 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SRC_TAG = { christianlyricz: "clz", christianstack: "cst", waytochurch: "wtc" };

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

const authorString = (a) => {
  if (!a) return "";
  if (typeof a === "string") return a.trim();
  if (Array.isArray(a)) return a.filter(Boolean).join(", ").trim();
  const v = a["Authored by"] ?? a["రచన"] ?? "";
  return Array.isArray(v) ? v.filter(Boolean).join(", ").trim() : String(v).trim();
};

(async () => {
  if (!fs.existsSync(ANALYSIS)) {
    console.error("no analysis — open /analysis or run: node song-review/analyze.js");
    process.exit(1);
  }
  const ready = JSON.parse(fs.readFileSync(ANALYSIS, "utf8")).results
    .filter((r) => r.verdict === "ready");
  console.log(`ready in the analysis : ${ready.length}`);
  console.log(`target                : ${API}${DRY ? "  [DRY RUN]" : "  *** LIVE ***"}`);

  console.log("re-fetching the live library (the analysis used a cache)...");
  const res = await fetch(`${API}/songs`, { signal: AbortSignal.timeout(300000) });
  if (!res.ok) throw new Error(`GET /songs -> ${res.status}`);
  const lib = await res.json();
  console.log(`library               : ${lib.length} songs`);

  const blobs = lib.map(teOf);
  const nameOf = new Map(lib.map((s) => [teOf(s), s.song_name]));

  // Gate 1 — skeleton containment. Catches a song stored under any spelling.
  // Blind spot: the library copy may be a LONGER variant that opens differently,
  // so the candidate's first 40 chars appear nowhere in it.
  const containedIn = (sk) => {
    if (sk.length < 14) return null;
    const probe = sk.slice(0, 40);
    const hit = blobs.find((b) => b.includes(probe));
    return hit ? (nameOf.get(hit) || "(imported this run)") : null;
  };

  // Gate 2 — character-3gram Dice over the whole skeleton, which does not care
  // where the two copies start. This is what caught "Nee Vaakyame Nannu" as a
  // 0.9 match for "Nee Vaakyame Nannu Brathikinchenu" when gate 1 let it past.
  const G = 3;
  const gramsOf = (sk) => {
    const m = new Map();
    for (let i = 0; i + G <= sk.length; i++) {
      const g = sk.substr(i, G); m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const libGrams = lib.map((s, i) => ({ i, sk: blobs[i], g: gramsOf(blobs[i]) }));
  const diceSk = (ga, na, gb, nb) => {
    if (!na || !nb) return 0;
    let inter = 0;
    for (const [k, v] of ga) inter += Math.min(v, gb.get(k) || 0);
    return (2 * inter) / (na + nb);
  };
  const similarTo = (sk) => {
    if (sk.length < 60) return null;
    const g = gramsOf(sk), n = sk.length - G + 1;
    let best = 0, who = null;
    for (const L of libGrams) {
      if (!L.sk || L.sk.length < 60) continue;
      // cheap length gate before the expensive intersection
      const r = L.sk.length / sk.length;
      if (r < 0.45 || r > 2.4) continue;
      const d = diceSk(g, n, L.g, L.sk.length - G + 1);
      if (d > best) { best = d; who = L; }
    }
    return best >= 0.75
      ? { name: nameOf.get(who.sk) || lib[who.i].song_name, score: +best.toFixed(3) }
      : null;
  };

  const dupIn = (sk) => {
    const c = containedIn(sk);
    if (c) return { name: c, how: "skeleton match" };
    const s = similarTo(sk);
    if (s) return { name: s.name, how: `${Math.round(s.score * 100)}% lyric overlap` };
    return null;
  };

  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : [];
  const done = new Set(manifest.map((m) => m.file));
  if (done.size) console.log(`manifest              : ${done.size} already imported, skipping`);

  const stats = { posted: 0, dup: 0, conflict: 0, failed: 0, missing: 0 };
  const leftovers = [];
  let n = 0;

  for (const r of ready) {
    if (n >= LIMIT) break;
    if (done.has(r.id)) continue;
    const full = path.join(REVIEW, r.corpus, r.file);
    if (!fs.existsSync(full)) { stats.missing++; continue; }

    let s;
    try { s = JSON.parse(fs.readFileSync(full, "utf8")); }
    catch { stats.failed++; console.log(`  BAD   ${r.file} unreadable`); continue; }

    const sk = teOf(s);
    const hit = dupIn(sk);
    if (hit) {
      stats.dup++;
      leftovers.push({ id: r.id, title: s.song_name,
                       reason: `duplicate of "${hit.name.slice(0, 46)}" (${hit.how})` });
      console.log(`  dup   ${String(s.song_name).slice(0, 38).padEnd(38)} -> ${hit.name.slice(0, 30)}  [${hit.how}]`);
      continue;
    }

    const payload = {
      song_name: s.song_name,
      main_stanza: s.main_stanza,
      stanzas: s.stanzas,
      author: authorString(s.author),
      source: SRC_TAG[r.corpus] || r.corpus,
    };

    n++;
    if (DRY) {
      stats.posted++;
      blobs.push(sk); nameOf.set(sk, s.song_name);
      libGrams.push({ i: -1, sk, g: gramsOf(sk) });
      if (n <= 6) console.log(`  WOULD POST ${String(s.song_name).slice(0, 40)} [${payload.source}] ${(s.stanzas || []).length} stanzas`);
      continue;
    }

    try {
      const rr = await fetch(`${API}/songs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(60000),
      });
      if (rr.status === 409) {
        stats.conflict++;
        const b = await rr.json().catch(() => ({}));
        leftovers.push({ id: r.id, title: s.song_name,
                         reason: `409 against #${(b.matched_song || {}).song_id} ${(b.matched_song || {}).song_name}` });
        console.log(`  409   ${String(s.song_name).slice(0, 40)} -> ${JSON.stringify(b.matched_song || {})}`);
      } else if (!rr.ok) {
        stats.failed++;
        console.log(`  FAIL  ${String(s.song_name).slice(0, 40)} http ${rr.status}`);
      } else {
        const b = await rr.json();
        stats.posted++;
        blobs.push(sk);
        nameOf.set(sk, s.song_name);
        libGrams.push({ i: -1, sk, g: gramsOf(sk) });
        manifest.push({ file: r.id, song_id: b.song_id, song_name: s.song_name,
                        source: payload.source });
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1), "utf8");
        if (!KEEP) fs.unlinkSync(full);
        if (stats.posted % 25 === 0) console.log(`  ... ${stats.posted} imported`);
      }
    } catch (e) {
      stats.failed++;
      console.log(`  ERR   ${String(s.song_name).slice(0, 40)} ${String(e.message).slice(0, 60)}`);
    }
    await sleep(DELAY);
  }

  if (leftovers.length)
    fs.writeFileSync(path.join(REVIEW, "still-blocked.json"),
      JSON.stringify(leftovers, null, 1), "utf8");

  console.log(`\n${DRY ? "[dry run] " : ""}imported ${stats.posted} | telugu-dup ${stats.dup} | server 409 ${stats.conflict} | failed ${stats.failed} | file missing ${stats.missing}`);
  if (!DRY) {
    console.log(`manifest : ${path.relative(ROOT, MANIFEST)} (${manifest.length} song_ids — rollback list)`);
    if (!KEEP) console.log(`imported files removed from reviewNeeded/ — git checkout -- reviewNeeded/ to restore`);
  }
})();
