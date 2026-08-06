/**
 * Songs that were never parsed — the whole thing in one unbroken line.
 *
 * They look at first like songs missing their transliteration, and that is how
 * they were found: nothing Latin anywhere, so the search has nothing to fold and
 * they can only be reached by typing Telugu. But the reason is worse than a
 * missing translation. Each is a single "line" holding the entire song, words
 * run together and the stanza numbers still in the text —
 *
 *   "కోరితి నీ సన్నిదానం చేరితి నీ సన్నిదానంకడవరకు నాకు తోడుగ ఉండాలని 1॰నీ పాదసేవ …"
 *
 * — so there is nothing to project either: one slide, unreadable from the back
 * of a room. The harvester never split them, and no amount of transliterating
 * would make them usable.
 *
 * A song with a scruffy TITLE is a different thing and is deliberately left
 * alone: "... neevu naaku thodai" is nine Telugu lines properly paired with nine
 * English ones. That wants renaming, not deleting.
 *
 * Reports by default. --write saves the full rows to reviewNeeded/ so any of
 * them can be put back; deleting is a separate, deliberate step.
 *
 *   node scripts/find-untransliterated.js
 *   node scripts/find-untransliterated.js --write
 */
const fs = require("fs");
const path = require("path");

const BASE = process.env.RELAY_BASE || "https://grey-gratis-ice.onrender.com";
const OUT = path.join(__dirname, "..", "reviewNeeded", "untransliterated.json");
const WRITE = process.argv.includes("--write");

const TELUGU = /[ఀ-౿]/;
const LATIN = /[A-Za-z]/;

const linesOf = (s) => {
  const blocks = [s.main_stanza, ...(s.stanzas || [])].filter(Boolean);
  return {
    telugu: blocks.flatMap((b) => b.telugu || []).filter((l) => l && l.trim()),
    english: blocks.flatMap((b) => b.english || []).filter((l) => l && l.trim())
  };
};

(async () => {
  const res = await fetch(`${BASE}/songs`, { signal: AbortSignal.timeout(180000) });
  if (!res.ok) throw new Error(`library answered HTTP ${res.status}`);
  const raw = await res.json();
  const songs = Array.isArray(raw) ? raw : raw.songs;
  console.log(`library: ${songs.length} songs\n`);

  // No Latin anywhere — not in the title, not in a single line.
  const noLatin = songs.filter((s) => {
    const { english } = linesOf(s);
    return !LATIN.test(s.song_name || "") && !english.some((l) => LATIN.test(l));
  });

  // A title that opens on something that is not a letter at all: a stray "...",
  // an emoji pasted in from wherever the song was copied. Reported, never
  // removed — the song underneath is usually fine.
  const oddTitle = songs.filter((s) => {
    const first = [...String(s.song_name || "").trim()][0];
    return first && !/[ఀ-౿A-Za-z0-9]/.test(first);
  });

  // Emoji anywhere in the title, not only at the front.
  const emoji = songs.filter((s) =>
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2700}-\u{27BF}]/u.test(s.song_name || "")
  );

  const show = (label, list) => {
    console.log(`${label}: ${list.length}`);
    list.slice(0, 8).forEach((s) => {
      const { telugu, english } = linesOf(s);
      console.log(`   ${String(s.song_id).padStart(4)}  ${String(s.song_name).slice(0, 46).padEnd(46)}  te:${telugu.length} en:${english.length}  [${s.source || "?"}]`);
    });
    if (list.length > 8) console.log(`   … and ${list.length - 8} more`);
    console.log("");
  };
  show("NO TRANSLITERATION ANYWHERE (unreachable from a Latin keyboard)", noLatin);
  show("TITLE STARTS WITH A NON-LETTER", oddTitle);
  show("EMOJI IN THE TITLE", emoji);

  // Only the unparsed ones are listed for removal. A bad title is a bad title,
  // not a bad song.
  const all = [...noLatin].sort((a, b) => a.song_id - b.song_id);
  const why = (s) => {
    const { telugu } = linesOf(s);
    return `never parsed — the whole song is ${telugu.length} line${telugu.length === 1 ? "" : "s"}, no transliteration` +
      (emoji.includes(s) ? "; emoji in the title" : "");
  };
  const keep = oddTitle.filter((s) => !noLatin.includes(s));
  if (keep.length) {
    console.log(`KEPT — scruffy title but a real song, wants renaming not deleting: ${keep.length}`);
    keep.forEach((s) => {
      const { telugu, english } = linesOf(s);
      console.log(`   ${s.song_id}  ${String(s.song_name).slice(0, 44).padEnd(44)}  te:${telugu.length} en:${english.length}`);
    });
    console.log("");
  }

  console.log(`TOTAL DISTINCT: ${all.length} songs`);
  console.log(`   sources: ${JSON.stringify(all.reduce((m, s) => ((m[s.source || "?"] = (m[s.source || "?"] || 0) + 1), m), {}))}`);

  if (!WRITE) {
    console.log("\n(reporting only — pass --write to save the list)");
    return;
  }
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        listed_at: new Date().toISOString(),
        library_size: songs.length,
        counts: { no_transliteration: noLatin.length, odd_title: oddTitle.length, emoji_title: emoji.length, distinct: all.length },
        // The WHOLE row, so any of these can be put back exactly as it was.
        songs: all.map((s) => ({ why: why(s), ...s }))
      },
      null,
      1
    )
  );
  console.log(`\nwrote ${all.length} songs (in full) to reviewNeeded/untransliterated.json`);
})();
