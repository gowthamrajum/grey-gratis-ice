/**
 * Delete the songs a review list names, from the live library.
 *
 * Reads a list under reviewNeeded/ — the full rows, saved before anything was
 * removed — and deletes those ids. The list is what makes this safe: every row
 * in it carries the whole song, so any of them can be posted back exactly as it
 * was.
 *
 * A list may mark only SOME of its rows for removal: audit-needed.json holds
 * songs that stay in the library and are merely worth a look, alongside the
 * ones that come out. Rows carrying `remove: false` are left alone.
 *
 * Refuses to run against a list it cannot read, and stops on the first refusal
 * from the library rather than carrying on through a hundred of them.
 *
 *   node scripts/remove-listed.js                          show what would go
 *   node scripts/remove-listed.js --apply                  delete them
 *   node scripts/remove-listed.js audit-needed.json --apply   …from another list
 */
const fs = require("fs");
const path = require("path");

const BASE = process.env.RELAY_BASE || "https://grey-gratis-ice.onrender.com";
const named = process.argv.slice(2).find((a) => !a.startsWith("--"));
const LIST = path.join(__dirname, "..", "reviewNeeded", named || "untransliterated.json");
const APPLY = process.argv.includes("--apply");

(async () => {
  const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
  // `remove` absent means the whole list is a removal list — that is how
  // untransliterated.json was written, before lists carried both kinds.
  const songs = (list.songs || []).filter((s) => s.remove !== false);
  if (!songs.length) throw new Error("the list marks nothing for removal — nothing to do");
  const kept = (list.songs || []).length - songs.length;

  const before = (await fetch(`${BASE}/songs/count`).then((r) => r.json())).total;
  console.log(`library holds ${before} songs; ${path.basename(LIST)} marks ${songs.length} for removal` +
    (kept ? ` (${kept} more are listed but stay)` : ""));
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
