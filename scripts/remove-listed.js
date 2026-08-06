/**
 * Delete the songs a review list names, from the live library.
 *
 * Reads reviewNeeded/untransliterated.json — the full rows, saved before
 * anything was removed — and deletes those ids. The list is what makes this
 * safe: every row in it carries the whole song, so any of them can be posted
 * back exactly as it was.
 *
 * Refuses to run against a list it cannot read, and stops on the first refusal
 * from the library rather than carrying on through a hundred of them.
 *
 *   node scripts/remove-listed.js           show what would go
 *   node scripts/remove-listed.js --apply   delete them
 */
const fs = require("fs");
const path = require("path");

const BASE = process.env.RELAY_BASE || "https://grey-gratis-ice.onrender.com";
const LIST = path.join(__dirname, "..", "reviewNeeded", "untransliterated.json");
const APPLY = process.argv.includes("--apply");

(async () => {
  const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
  const songs = list.songs || [];
  if (!songs.length) throw new Error("the list is empty — nothing to do");

  const before = (await fetch(`${BASE}/songs/count`).then((r) => r.json())).total;
  console.log(`library holds ${before} songs; the list names ${songs.length}`);
  console.log(`saved in full at reviewNeeded/${path.basename(LIST)} — restorable\n`);

  if (!APPLY) {
    songs.slice(0, 6).forEach((s) => console.log(`   would delete ${s.song_id}  ${String(s.song_name).slice(0, 48)}`));
    if (songs.length > 6) console.log(`   … and ${songs.length - 6} more`);
    console.log("\n(dry run — pass --apply to delete them)");
    return;
  }

  let gone = 0;
  const failed = [];
  for (const s of songs) {
    const r = await fetch(`${BASE}/songs/${s.song_id}`, { method: "DELETE", signal: AbortSignal.timeout(30000) });
    if (r.ok) {
      gone++;
    } else if (r.status === 404) {
      // Already removed by hand — not a failure, just nothing left to do.
      console.log(`   ${s.song_id} was already gone`);
    } else {
      failed.push({ id: s.song_id, status: r.status });
      console.error(`   REFUSED ${s.song_id}: HTTP ${r.status}`);
      break;
    }
  }

  const after = (await fetch(`${BASE}/songs/count`).then((r) => r.json())).total;
  console.log(`\ndeleted ${gone}; library ${before} -> ${after}`);
  if (failed.length) {
    console.error(`stopped early: ${failed.length} refused. The list is untouched — rerun to continue.`);
    process.exit(1);
  }
})();
