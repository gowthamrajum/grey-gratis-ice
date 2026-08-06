/**
 * Find songs the library should not be serving as they stand.
 *
 * Four faults, and they are not equally bad — which is the whole point of
 * separating them. Two make a song unusable and it comes out of the library;
 * two are worth a human look and it stays.
 *
 *   unsplit          The entire song sits in one line, section markers still
 *                    in the text. Nothing to search, and one unreadable slide
 *                    to project. Comes out.
 *
 *   marker-in-title  The title carries something the harvester left behind —
 *                    a "ch:", a leading "...", a "Reference:" label. The song
 *                    underneath is usually fine; the name is not, and the name
 *                    is what everybody searches. Comes out to be renamed.
 *
 *   no-stanzas       Real lines, never split into stanzas, so the whole song
 *                    projects as one block. Usable, badly. Stays, listed.
 *
 *   duplicate-title  Two songs answering to the same name. One may be the
 *                    better copy; that is a judgement call. Stays, listed.
 *
 * A colon in a title is NOT a fault on its own: "1 Korinthee 13:8" is a
 * scripture reference and those songs are perfectly good. Same lesson as the
 * "..." title — punctuation is evidence, not a verdict.
 *
 *   node scripts/audit-needed.js           report
 *   node scripts/audit-needed.js --write   save reviewNeeded/audit-needed.json
 */
const fs = require("fs");
const path = require("path");

const BASE = process.env.RELAY_BASE || "https://grey-gratis-ice.onrender.com";
const OUT = path.join(__dirname, "..", "reviewNeeded", "audit-needed.json");

/**
 * Section markers this songbook's harvester failed to strip. "అను" opens an
 * anupallavi and "ch:" a charanam; finding either mid-line means the split
 * never happened and the marker is now part of the lyric.
 */
const INLINE_MARKER = /అను|ch:|\d+॰/gi;
/** A leading "...", a "ch:" anywhere, or a bare label the scraper carried in. */
const TITLE_MARKER = /^[\s.·…]+|ch:|^\s*reference\s*:/i;

const telugu = (s) => (s.main_stanza?.telugu || []).filter(Boolean);
const stanzaCount = (s) => (s.stanzas || []).length;

/** Why this song needs a look, or null if it doesn't. */
function faultsOf(song, titleCounts) {
  const out = [];
  const te = telugu(song);
  const name = song.song_name || "";

  // One line holding everything. Length alone would miss the short ones and
  // libel the genuine fragments ("ప్రవహించే నీ కృపా నదిలా" is a real, tiny
  // song), so the markers decide and length is the backstop.
  if (stanzaCount(song) === 0 && te.length === 1) {
    const marks = (te[0].match(INLINE_MARKER) || []).length;
    if (marks >= 2 || te[0].length > 120) {
      out.push({ fault: "unsplit", remove: true, detail: `one line, ${te[0].length} chars, ${marks} markers left in it` });
    }
  }

  if (TITLE_MARKER.test(name)) {
    out.push({ fault: "marker-in-title", remove: true, detail: `title carries ${JSON.stringify((name.match(TITLE_MARKER) || [""])[0])}` });
  }

  // Only worth saying once the song isn't already condemned as a blob.
  if (stanzaCount(song) === 0 && te.length > 1 && !out.some((f) => f.fault === "unsplit")) {
    out.push({ fault: "no-stanzas", remove: false, detail: `${te.length} lines, never split into stanzas` });
  }

  const key = name.trim().toLowerCase();
  if (key && titleCounts.get(key) > 1) {
    out.push({ fault: "duplicate-title", remove: false, detail: `${titleCounts.get(key)} songs share this name` });
  }

  return out;
}

(async () => {
  const songs = await fetch(`${BASE}/songs`).then((r) => r.json());
  const titleCounts = new Map();
  for (const s of songs) {
    const k = (s.song_name || "").trim().toLowerCase();
    if (k) titleCounts.set(k, (titleCounts.get(k) || 0) + 1);
  }

  const flagged = [];
  for (const s of songs) {
    const faults = faultsOf(s, titleCounts);
    if (faults.length) flagged.push({ song: s, faults });
  }

  const counts = {};
  for (const f of flagged) for (const x of f.faults) counts[x.fault] = (counts[x.fault] || 0) + 1;

  const removing = flagged.filter((f) => f.faults.some((x) => x.remove));
  const staying = flagged.filter((f) => !f.faults.some((x) => x.remove));

  console.log(`library holds ${songs.length} songs; ${flagged.length} need a look\n`);
  for (const [fault, n] of Object.entries(counts)) console.log(`  ${fault.padEnd(16)} ${n}`);
  console.log(`\n  ${removing.length} come out of the library, ${staying.length} stay and are listed\n`);

  const line = (f) =>
    `   ${String(f.song.song_id).padEnd(5)} ${JSON.stringify(String(f.song.song_name).slice(0, 52))}  — ${f.faults.map((x) => x.fault).join(", ")}`;
  console.log("coming out:");
  removing.slice(0, 8).forEach((f) => console.log(line(f)));
  if (removing.length > 8) console.log(`   … and ${removing.length - 8} more`);
  console.log("\nstaying, listed for a look:");
  staying.slice(0, 8).forEach((f) => console.log(line(f)));
  if (staying.length > 8) console.log(`   … and ${staying.length - 8} more`);

  if (!process.argv.includes("--write")) {
    console.log("\n(report only — pass --write to save the list)");
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        listed_at: new Date().toISOString(),
        library_size: songs.length,
        counts,
        // Whole rows, so anything taken out can go back exactly as it was —
        // or be fixed here and posted back once it is right.
        songs: flagged.map((f) => ({
          faults: f.faults,
          remove: f.faults.some((x) => x.remove),
          ...f.song
        }))
      },
      null,
      2
    )
  );
  console.log(`\nwrote ${flagged.length} songs (in full) to reviewNeeded/${path.basename(OUT)}`);
})();
