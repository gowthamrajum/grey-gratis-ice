#!/usr/bin/env node
// Compare the waytochurch catalogue against YOUR song library.
//
//   node scripts/match-catalogue.js
//
// Input   songData/index.json                (waytochurch, ~4,748 songs)
//         GET /songs                         (your library, with lyrics)
// Output  songData/match-report.csv          every waytochurch song + verdict
//         songData/missing.json              the ones you do NOT have
//         songData/library-cache.json        library snapshot used for the run
//
// READ-ONLY. Nothing is written to your database.
//
// WHY IT MATCHES ON TELUGU AND NOT ON TITLES
// Your library stores titles transliterated ("Ooruko Naa Praanamaa") while
// waytochurch stores them in Telugu script. Even between two transliterations of
// the same song the spelling drifts ("Praanamaa" / "Praanama",
// "Gaadaandhakaaramulo" / "Gadhandhakaramulo"), so a title comparison both misses
// real duplicates and merges distinct songs. Telugu script is the stable identity.
//
// TWO LEVELS OF TELUGU NORMALISATION
//   norm()  keeps only Telugu codepoints - drops spaces, punctuation, ||...||
//           refrain markers, latin text and digits.
//   skel()  additionally drops dependent vowel signs, virama and anusvara,
//           leaving a consonant/vowel skeleton.
// The skeleton is what absorbs the real-world drift. The same song appears as
// "శరణ్య" in your library and "శరణ్యా" on waytochurch; those differ under norm()
// but are identical under skel(). Verified on library song 1571 vs waytochurch
// 2987, which are the same song.

const fs = require("fs");
const path = require("path");
const similarity = require("string-similarity");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData")));
const API = process.env.SONGS_API || "https://grey-gratis-ice.onrender.com";
const FUZZY = parseFloat(arg("fuzzy", "0.88"));
// An EXACT skeleton match is strong evidence even for a short title, so it gets a
// low floor. The prefix and fuzzy paths are the ones that go wrong on generic
// openings, so they demand a longer key plus real coverage.
const MIN_EXACT = 6;
const MIN_KEY = 12;
const PREFIX_COVER = 0.7;
// Containment (the title appears verbatim inside a song you already have) is much
// stronger evidence than a shared prefix, so it takes a lower floor. Nearly every
// remaining false "missing" was a short title like "ప్రభు హస్తం నాపై" being
// rejected by the 12-char floor.
const MIN_CONTAIN = 8;

const norm = (s) =>
  [...String(s || "")].filter((c) => {
    const p = c.codePointAt(0);
    return p >= 0x0c00 && p <= 0x0c7f;
  }).join("");

// Telugu spelling varies freely between aspirated and unaspirated consonants, and
// between the three sibilants - waytochurch song 4 writes BOTH "అరుదెన్ఛె" and
// "అరుదెంచె" in the same line. Without folding these together the skeleton treats
// them as different words, which is how library song 138 "Andaala Thaara" was
// wrongly reported missing and nearly re-imported as a duplicate.
const FOLD = { "ఖ":"క","ఘ":"గ","ఛ":"చ","ఝ":"జ","ఠ":"ట","ఢ":"డ","థ":"త","ధ":"ద",
               "ఫ":"ప","భ":"బ","శ":"స","ష":"స","ణ":"న","ఱ":"ర" };

// A nasal before a consonant is written either as an explicit conjunct ("న్ఛ")
// or as the anusvara ("ంచ") - the same sound, freely interchanged. The anusvara
// is dropped below, so the conjunct form must be dropped too or the two spellings
// never line up (waytochurch song 4 vs library song 138 "Andaala Thaara").
const dropNasalConjunct = (s) => String(s || "").replace(/[ఙఞణనమ]్(?=[క-హ])/g, "");

const skel = (s) =>
  [...norm(dropNasalConjunct(s))].filter((c) => {
    const p = c.codePointAt(0);
    if (p >= 0x0c01 && p <= 0x0c03) return false; // anusvara / visarga / candrabindu
    if (p >= 0x0c3e && p <= 0x0c56) return false; // vowel signs, virama, length marks
    return true;
  }).map((c) => FOLD[c] || c).join("");

const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

(async () => {
  // ---- library ----
  const cachePath = path.join(OUT, "library-cache.json");
  let library;
  if (process.argv.includes("--cached") && fs.existsSync(cachePath)) {
    library = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    console.log(`library: ${library.length} songs (cached)`);
  } else {
    console.log("library: fetching...");
    const res = await fetch(`${API}/songs`, { signal: AbortSignal.timeout(180000) });
    if (!res.ok) throw new Error(`GET /songs -> ${res.status}`);
    library = await res.json();
    fs.writeFileSync(cachePath, JSON.stringify(library), "utf8");
    console.log(`library: ${library.length} songs`);
  }

  // ---- library keys ----
  // A waytochurch title is usually the opening line of the pallavi, but sometimes
  // runs into the second line, so both are indexed.
  const exact = new Map();     // skeleton -> library song  (pallavi opening)
  const anyLine = new Map();   // skeleton -> library song  (ANY lyric line)
  const prefixes = [];         // { key, song } for containment / fuzzy passes

  // Indexing only the opening line misses a lot: a waytochurch "title" is often a
  // line from deeper in the song. Validation found 2 of 12 sampled "missing" songs
  // were actually present that way (wtc 6085 is a line inside library song 1307
  // "Sundarudaa"). So every Telugu line is indexed as a weaker secondary key.
  for (const s of library) {
    const all = [];
    const ms = s.main_stanza || {};
    for (const l of ms.telugu || []) all.push(l);
    for (const st of s.stanzas || []) for (const l of st.telugu || []) all.push(l);
    for (const l of all) {
      const k = skel(l);
      if (k.length >= MIN_KEY && !anyLine.has(k)) anyLine.set(k, s);
    }
    // Whole-song skeleton, so a title can be found as a SUBSTRING anywhere in the
    // song. Matching whole lines only recovered 16 songs; the real cases are
    // partial - the title is a fragment of a longer stored line.
    // Joined with NO separator: waytochurch titles frequently run across two of
    // your stored display lines ("గగనము చీల్చుకొని యేసు ఘనులను త" spans lines of
    // library song 321), and a separator makes such a phrase non-contiguous, so
    // containment silently fails. The skeleton has already dropped spaces.
    s._blob = all.map(skel).join("");

    const te = ms.telugu || [];
    const cands = [te[0] || "", [te[0], te[1]].filter(Boolean).join(" ")];
    for (const c of cands) {
      const k = skel(c);
      if (k.length < MIN_EXACT) continue;
      if (!exact.has(k)) exact.set(k, s);
      if (k.length >= MIN_KEY) prefixes.push({ key: k, song: s });
    }
  }
  console.log(`library keys: ${exact.size} distinct skeletons`);

  // Window index: every WINDOW-char substring of every song points at that song, so
  // a title can be located by its opening window instead of scanning 1,739 songs
  // (4,748 x 1,739 full substring scans would be far too slow).
  const WINDOW = 10;
  const windows = new Map();
  for (const s of library) {
    const b = s._blob || "";
    for (let i = 0; i + WINDOW <= b.length; i++) {
      const w = b.slice(i, i + WINDOW);
      let arr = windows.get(w);
      if (!arr) { arr = []; windows.set(w, arr); }
      if (arr.length < 40 && !arr.includes(s)) arr.push(s);
    }
  }
  console.log(`window index: ${windows.size} distinct ${WINDOW}-char windows`);

  function containedIn(key) {
    if (key.length < MIN_CONTAIN) return null;
    for (const cand of windows.get(key.slice(0, WINDOW)) || []) {
      if ((cand._blob || "").includes(key)) return cand;
    }
    return null;
  }

  // Bucketed by leading characters so the fuzzy pass stays tractable
  // (4,748 x 1,739 pairwise would be 8M comparisons).
  const buckets = new Map();
  for (const p of prefixes) {
    const b = p.key.slice(0, 4);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b).push(p);
  }

  // ---- compare ----
  const index = JSON.parse(fs.readFileSync(path.join(OUT, "index.json"), "utf8"));
  const rows = [], missing = [];
  const tally = { exact: 0, line: 0, contained: 0, prefix: 0, fuzzy: 0, missing: 0, unusable: 0 };

  for (const entry of index) {
    const key = skel(entry.title);
    let verdict = "missing", match = null, score = "";

    if (key.length < MIN_EXACT) {
      verdict = "unusable-title"; // ascii-only title, nothing Telugu to key on
    } else if (exact.has(key)) {
      verdict = "in_library_exact";
      match = exact.get(key);
    } else if (anyLine.has(key)) {
      verdict = "in_library_lyric_line"; // title equals a whole line of a song you have
      match = anyLine.get(key);
    } else if ((match = containedIn(key))) {
      verdict = "in_library_contained"; // title appears inside a song you have
    } else if (key.length < MIN_KEY) {
      verdict = "missing"; // too short for a safe fuzzy match; treat as new
    } else {
      // Containment: your stored line may carry more or less text than the title.
      // A bare startsWith() is far too loose here - Telugu worship songs share
      // stock opening words ("దేవా" = God, "ఆశ్చర్యకరుడ" = Wonderful), so a short
      // title prefixes dozens of unrelated longer lines. Validation caught library
      // song 736 being claimed by three different songs this way. A containment
      // match therefore also has to cover most of the LONGER string.
      for (const p of prefixes) {
        if (p.key.length < MIN_KEY) continue;
        if (!(p.key.startsWith(key) || key.startsWith(p.key))) continue;
        const ratio = Math.min(p.key.length, key.length) / Math.max(p.key.length, key.length);
        if (ratio < PREFIX_COVER) continue;
        verdict = "in_library_prefix"; match = p.song; score = ratio.toFixed(3); break;
      }
      if (!match) {
        const cand = buckets.get(key.slice(0, 4)) || [];
        let best = 0, bestSong = null;
        for (const p of cand) {
          const sc = similarity.compareTwoStrings(key, p.key);
          if (sc > best) { best = sc; bestSong = p.song; }
        }
        if (best >= FUZZY) {
          verdict = "in_library_fuzzy"; match = bestSong; score = best.toFixed(3);
        }
      }
    }

    if (verdict === "in_library_exact") tally.exact++;
    else if (verdict === "in_library_lyric_line") tally.line++;
    else if (verdict === "in_library_contained") tally.contained++;
    else if (verdict === "in_library_prefix") tally.prefix++;
    else if (verdict === "in_library_fuzzy") tally.fuzzy++;
    else if (verdict === "unusable-title") tally.unusable++;
    else { tally.missing++; missing.push(entry); }

    rows.push([
      entry.id, entry.title, verdict,
      match ? match.song_id : "", match ? match.song_name : "", score, entry.url,
    ]);
  }

  fs.writeFileSync(path.join(OUT, "match-report.csv"),
    ["wtc_id,wtc_title,verdict,library_song_id,library_song_name,fuzzy_score,url"]
      .concat(rows.map((r) => r.map(cell).join(","))).join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(OUT, "missing.json"), JSON.stringify(missing, null, 1), "utf8");

  const inLib = tally.exact + tally.line + tally.contained + tally.prefix + tally.fuzzy;
  console.log(`\nwaytochurch catalogue : ${index.length}`);
  console.log(`  already in library  : ${inLib}  (exact ${tally.exact}, lyric-line ${tally.line}, contained ${tally.contained}, prefix ${tally.prefix}, fuzzy ${tally.fuzzy})`);
  console.log(`  NOT in library      : ${tally.missing}`);
  console.log(`  unusable title      : ${tally.unusable}`);
  console.log(`\nwrote ${OUT}/match-report.csv and missing.json`);
})();
