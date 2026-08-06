#!/usr/bin/env node
// Import the visualParsed songs into the live library.
//
//   node scripts/import-visual-parsed.js                 # report only, writes nothing
//   node scripts/import-visual-parsed.js --limit 20 --apply
//   node scripts/import-visual-parsed.js --apply         # import everything eligible
//
// Dry run is the DEFAULT here, unlike import-songs.js. That script handles a few
// hundred hand-checked songs; this one faces two thousand, and the previous pass
// turned away 887 of them — so seeing the decision before it is made is worth the
// extra flag.
//
// WHAT CHANGED, AND WHY
// The earlier gate rejected a song when its opening line matched an existing one
// at 0.88, with no further test. That rejected 703 songs of which 8 were real
// duplicates. The evidence was in its own report: 692 of the 703 had a body
// overlap under 0.45 — the threshold its OWN "opening line inside another song"
// test already required. A shared opening line means very little here, because
// Telugu worship songs open on stock phrases, and because the library holds
// medleys: "Christmas Mashup 5.0" carries dozens of songs' first lines and by
// itself rejected 53 unrelated songs.
//
// So a first line never rejects on its own any more. It has to be backed by the
// body, and a match against a song several times longer is treated as the medley
// it almost certainly is.
//
// Flags
//   --apply       actually POST (default is to report only)
//   --limit N     stop after N imports
//   --delay MS    pause between posts (default 0)
//   --concurrency N  parallel posts (default 8)
//   --require-transliteration   skip songs that have Telugu but no English
//   --dir PATH    source folder (default ../visualParsed)
//   --report PATH where to write the rejection report

const fs = require("fs");
const path = require("path");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const FLAG = (n) => process.argv.includes(`--${n}`);

const ROOT = path.join(__dirname, "..");
const DIR = path.resolve(arg("dir", path.join(ROOT, "visualParsed")));
const OUT = path.join(ROOT, "songData");
const API = process.env.SONGS_API || "https://grey-gratis-ice.onrender.com";
const APPLY = FLAG("apply");
const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;
const DELAY = parseInt(arg("delay", "0"), 10);
// Parallel posts. The gate runs first and settles every order-dependent
// question, so this only affects how fast the writing goes.
const CONCURRENCY = parseInt(arg("concurrency", "8"), 10);
// Hold back songs that carry Telugu but no transliteration. They are real songs
// and import perfectly well, but they cannot be found by anyone typing in Latin
// and they render as Telugu alone — so whether they belong in a batch is a
// decision, not a default.
const NEED_TRANSLIT = FLAG("require-transliteration");
const REPORT = path.resolve(arg("report", path.join(ROOT, "visualParsed-rejections.md")));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- thresholds
//
// Every number here is set from the previous run's own scores, not by feel.
const T = {
  // The whole song, near enough identical. Six rejections last time, all sound.
  BODY_DUPLICATE: 0.9,
  // An opening line alone proves nothing; it must be backed by this much body.
  // 0.45 is the bar the old "opening line inside" test already used, and it
  // recovers 692 of 703 while keeping all 8 genuine duplicates.
  FIRST_LINE: 0.88,
  FIRST_LINE_BODY: 0.45,
  // A match several times longer than the candidate is a medley. Its first line
  // matching ours says only that it swallowed our song's opening somewhere.
  MEDLEY_RATIO: 2,
  // Two files in this folder being the same song — measured on the body, which
  // is what the old in-folder test failed to do: of the 138 pairs it flagged,
  // 126 shared under a fifth of their lyrics.
  IN_FOLDER: 0.9
};

// --------------------------------------------------- Telugu skeleton (shared)
// Identical to import-songs.js and match-catalogue.js, deliberately: two
// importers disagreeing about what "the same song" means is how a duplicate
// slips in.
const FOLD = { "ఖ":"క","ఘ":"గ","ఛ":"చ","ఝ":"జ","ఠ":"ట","ఢ":"డ","థ":"త","ధ":"ద",
               "ఫ":"ప","భ":"బ","శ":"స","ష":"స","ణ":"న","ఱ":"ర" };
const dropNasalConjunct = (s) => String(s || "").replace(/[ఙఞణనమ]్(?=[క-హ])/g, "");
const skel = (s) =>
  [...dropNasalConjunct(String(s || ""))].filter((c) => {
    const p = c.codePointAt(0);
    return p >= 0x0c00 && p <= 0x0c7f;
  }).filter((c) => {
    const p = c.codePointAt(0);
    if (p >= 0x0c01 && p <= 0x0c03) return false;
    if (p >= 0x0c3e && p <= 0x0c56) return false;
    return true;
  }).map((c) => FOLD[c] || c).join("");

const teluguLines = (s) => {
  const out = [];
  const ms = s.main_stanza || {};
  for (const l of ms.telugu || []) if (String(l).trim()) out.push(String(l));
  for (const st of s.stanzas || []) for (const l of st.telugu || []) if (String(l).trim()) out.push(String(l));
  return out;
};

// ------------------------------------------------------------------ overlap
// Overlapping windows rather than whole strings: the two sources break their
// lines differently, so anything anchored to a line boundary misses songs that
// are plainly the same.
const W = 12;
const shingles = (text) => {
  const set = new Set();
  for (let i = 0; i + W <= text.length; i += 3) set.add(text.slice(i, i + W));
  return set;
};
/** How much of the SHORTER song appears in the longer. 1 = fully contained. */
const containment = (a, b) => {
  if (!a.size || !b.size) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const s of small) if (large.has(s)) shared++;
  return shared / small.size;
};
/** Dice on character bigrams — for comparing one line with another. */
const bigrams = (s) => {
  const m = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    m.set(g, (m.get(g) || 0) + 1);
  }
  return m;
};
const dice = (a, b) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a), B = bigrams(b);
  let shared = 0, total = 0;
  for (const [g, n] of A) {
    total += n;
    const m = B.get(g);
    if (m) shared += Math.min(n, m);
  }
  for (const [, n] of B) total += n;
  return (2 * shared) / total;
};

// ---------------------------------------------------------------------- main
(async () => {
  if (!fs.existsSync(DIR)) throw new Error(`no such folder: ${DIR}`);
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  console.log(`${files.length} files in ${path.relative(ROOT, DIR)}`);

  console.log("fetching live library...");
  const res = await fetch(`${API}/songs`, { signal: AbortSignal.timeout(300000) });
  if (!res.ok) throw new Error(`GET /songs -> ${res.status}`);
  const library = await res.json();
  console.log(`library: ${library.length} songs`);

  // Index the library once.
  const index = library.map((s) => {
    const lines = teluguLines(s);
    return {
      name: s.song_name,
      lineCount: lines.length,
      first: skel(lines[0] || ""),
      shingles: shingles(skel(lines.join("")))
    };
  });

  const rejects = [];
  const manifest = [];
  const accepted = [];
  const stats = { posted: 0, body: 0, firstLine: 0, inFolder: 0, quality: 0, conflict: 0, failed: 0 };
  let n = 0;

  for (const file of files) {
    if (n >= LIMIT) break;
    let song;
    try {
      song = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
    } catch (e) {
      stats.quality++;
      rejects.push({ file, name: file, why: "quality", detail: "unreadable JSON" });
      continue;
    }

    // ---- quality gate ----
    const lines = teluguLines(song);
    const body = skel(lines.join(""));
    if (!song.song_name || !lines.length || body.length < 20) {
      stats.quality++;
      rejects.push({ file, name: song.song_name || file, why: "quality",
        detail: !song.song_name ? "no title" : !lines.length ? "no Telugu" : "barely any Telugu" });
      continue;
    }
    if (NEED_TRANSLIT) {
      let en = 0;
      for (const b of [song.main_stanza, ...(song.stanzas || [])]) {
        if (b) en += (b.english || []).filter((l) => String(l).trim()).length;
      }
      if (!en) {
        stats.quality++;
        rejects.push({ file, name: song.song_name, why: "quality",
          detail: "Telugu only — no transliteration", lines: lines.length });
        continue;
      }
    }

    const mine = shingles(body);
    const myFirst = skel(lines[0]);

    // ---- against the library ----
    let best = { score: 0, entry: null };
    let firstHit = null;
    for (const e of index) {
      const score = containment(mine, e.shingles);
      if (score > best.score) best = { score, entry: e };
      if (!firstHit && myFirst.length >= 8 && dice(myFirst, e.first) >= T.FIRST_LINE) firstHit = e;
    }

    if (best.score >= T.BODY_DUPLICATE) {
      stats.body++;
      rejects.push({ file, name: song.song_name, why: "in the library",
        detail: `${best.score.toFixed(2)} body vs "${best.entry.name}"`, lines: lines.length });
      continue;
    }

    if (firstHit) {
      const bodyWithIt = containment(mine, firstHit.shingles);
      const medley = firstHit.lineCount >= T.MEDLEY_RATIO * lines.length;
      // The change that matters: a shared opening line only rejects when the
      // body agrees, and never when the match is long enough to be a medley.
      if (bodyWithIt >= T.FIRST_LINE_BODY && !medley) {
        stats.firstLine++;
        rejects.push({ file, name: song.song_name, why: "in the library",
          detail: `same opening line as "${firstHit.name}", ${bodyWithIt.toFixed(2)} body`,
          lines: lines.length });
        continue;
      }
    }

    // ---- against songs accepted earlier in this run ----
    let selfDupe = null;
    for (const m of manifest) {
      if (containment(mine, m.shingles) >= T.IN_FOLDER) { selfDupe = m; break; }
    }
    if (selfDupe) {
      stats.inFolder++;
      rejects.push({ file, name: song.song_name, why: "duplicated in this folder",
        detail: `same song as ${selfDupe.file}`, lines: lines.length });
      continue;
    }

    // ---- accepted ----
    // Held rather than posted here, so the decisions are all made before
    // anything is written, and the writing can then run in parallel.
    n++;
    manifest.push({ file, name: song.song_name, shingles: mine, song: song, song_id: null });
    accepted.push(manifest[manifest.length - 1]);
  }

  // ---- post ----
  // Concurrent, because the gate has already settled every question that
  // depended on order: nothing left in `accepted` duplicates anything else in
  // it, so no post can be invalidated by another landing first.
  if (APPLY && accepted.length) {
    let done = 0;
    const post = async (m) => {
      try {
        const r = await fetch(`${API}/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            song_name: m.song.song_name,
            main_stanza: m.song.main_stanza,
            stanzas: m.song.stanzas,
            author: m.song.author,
            source: m.song.source || "wtc"
          }),
          signal: AbortSignal.timeout(60000)
        });
        if (r.status === 409) {
          const j = await r.json().catch(() => ({}));
          stats.conflict++;
          rejects.push({ file: m.file, name: m.name, why: "server refused",
            detail: `name too close to "${j.matched_song ? j.matched_song.song_name : "?"}"` });
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text().catch(() => "")}`);
        const j = await r.json();
        m.song_id = j.song_id;
        stats.posted++;
      } catch (e) {
        stats.failed++;
        rejects.push({ file: m.file, name: m.name, why: "failed", detail: String(e.message || e) });
      } finally {
        if (++done % 25 === 0 || done === accepted.length) {
          process.stdout.write(`\r  posted ${stats.posted}/${accepted.length}  (${stats.failed} failed, ${stats.conflict} refused)`);
        }
      }
    };
    const queue = accepted.slice();
    await Promise.all(
      Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
        while (queue.length) {
          await post(queue.shift());
          if (DELAY) await sleep(DELAY);
        }
      })
    );
    process.stdout.write("\n");
  } else if (!APPLY) {
    stats.posted = accepted.length;
  }

  // ---- manifest, so the run can be undone ----
  if (APPLY) {
    const p = path.join(OUT, "imported-visual-parsed.json");
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(manifest.filter((m) => m.song_id)
      .map((m) => ({ file: m.file, song_name: m.name, song_id: m.song_id })), null, 1));
    console.log(`manifest: ${path.relative(ROOT, p)} — DELETE /songs/:id to reverse`);
  }

  // ---- report ----
  const byReason = {};
  for (const r of rejects) (byReason[r.why] = byReason[r.why] || []).push(r);
  const md = [];
  md.push(`# visualParsed import — ${APPLY ? "run" : "dry run"}`, "");
  md.push(`**${files.length}** files · **${stats.posted}** ${APPLY ? "imported" : "would import"} · **${rejects.length}** rejected`, "");
  md.push("## Thresholds", "", "| Test | Threshold |", "|---|---:|");
  md.push(`| Body overlap — the whole song | ${T.BODY_DUPLICATE} |`);
  md.push(`| Opening line | ${T.FIRST_LINE} **and** ${T.FIRST_LINE_BODY} body |`);
  md.push(`| Ignore a match this many times longer | ${T.MEDLEY_RATIO}× |`);
  md.push(`| Duplicate within the folder | ${T.IN_FOLDER} body |`, "");
  for (const [why, list] of Object.entries(byReason)) {
    md.push(`## ${why} — ${list.length}`, "", "| Song | Lines | Why |", "|---|---:|---|");
    for (const r of list) md.push(`| ${r.name} | ${r.lines || ""} | ${r.detail} |`);
    md.push("");
  }
  fs.writeFileSync(REPORT, md.join("\n"));

  console.log(`\n${APPLY ? "imported" : "would import"}: ${stats.posted}`);
  console.log(`rejected: ${rejects.length}`);
  console.log(`   ${String(stats.body).padStart(4)}  already in the library (body ≥${T.BODY_DUPLICATE})`);
  console.log(`   ${String(stats.firstLine).padStart(4)}  same opening line AND body ≥${T.FIRST_LINE_BODY}`);
  console.log(`   ${String(stats.inFolder).padStart(4)}  duplicated within the folder`);
  console.log(`   ${String(stats.quality).padStart(4)}  no usable Telugu or title`);
  if (stats.conflict) console.log(`   ${String(stats.conflict).padStart(4)}  server refused on the name`);
  if (stats.failed) console.log(`   ${String(stats.failed).padStart(4)}  failed`);
  console.log(`report: ${path.relative(ROOT, REPORT)}`);
  if (!APPLY) console.log("\n(nothing was written — pass --apply to import)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
