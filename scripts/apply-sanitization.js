#!/usr/bin/env node
// Apply a sanitisation patch file to the live library via PUT /songs/:id.
//
//   node scripts/apply-sanitization.js --patch patch-deterministic.json --dry-run
//   node scripts/apply-sanitization.js --patch patch-deterministic.json
//   node scripts/apply-sanitization.js --patch patch-structural.json --delay 400
//
// THIS WRITES TO THE LIVE LIBRARY.
//
// Flags
//   --patch FILE  patch file (array of {song_id, main_stanza, stanzas, source?})
//   --dry-run     do everything except PUT
//   --limit N     stop after N updates
//   --delay MS    pause between writes (default 250)
//
// SAFETY
//   Every patch is checked against a freshly fetched copy of the song before it
//   is written: the sanitised text must contain no Telugu character that was not
//   already in the original. Sanitisation may only remove or re-partition text,
//   never invent it. A patch that fails is reported and skipped, not written.
//   PUT /songs/:id has no 409 name check, so updates never conflict.
//
//   Before/after of every applied song is appended to audit/sanitized.json so a
//   bad run can be reversed.

const fs = require("fs");
const path = require("path");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const FLAG = (n) => process.argv.includes(`--${n}`);

const API = process.env.SONGS_API || "https://grey-gratis-ice.onrender.com";
const DRY = FLAG("dry-run");
const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;
const DELAY = parseInt(arg("delay", "250"), 10);
const PATCH = path.resolve(arg("patch", ""));
// The character-budget check below cannot tell "repeated a refrain that the
// scrape dropped" from "invented a line" — both add characters. Pass this only
// for a patch whose provenance was already verified line-by-line upstream
// (merge_fixes.py proves every output line is text already in that song, or is
// backed by a fetched source URL).
const PROVENANCE_CHECKED = FLAG("provenance-checked");
const LOG = path.join(__dirname, "..", "songData-christianstack", "audit", "sanitized.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const teluguOnly = (s) =>
  [...String(s)].filter((c) => {
    const p = c.codePointAt(0);
    return p >= 0x0c00 && p <= 0x0c7f;
  }).join("");

const allText = (song) => {
  const out = [];
  const push = (b) => {
    if (!b) return;
    for (const l of b.telugu || []) out.push(String(l));
    for (const l of b.english || []) out.push(String(l));
  };
  push(song.main_stanza);
  for (const s of song.stanzas || []) push(s);
  return out.join("");
};

// multiset of Telugu chars — the patch may drop characters, never add them
const charCount = (s) => {
  const m = new Map();
  for (const c of teluguOnly(s)) m.set(c, (m.get(c) || 0) + 1);
  return m;
};

(async () => {
  if (!PATCH || !fs.existsSync(PATCH)) {
    console.error("need --patch FILE");
    process.exit(1);
  }
  const patches = JSON.parse(fs.readFileSync(PATCH, "utf8"));
  console.log(`patch  : ${path.basename(PATCH)} — ${patches.length} songs`);
  console.log(`target : ${API}${DRY ? "  [DRY RUN]" : "  *** LIVE ***"}`);

  console.log("fetching live library...");
  const res = await fetch(`${API}/songs`, { signal: AbortSignal.timeout(300000) });
  if (!res.ok) throw new Error(`GET /songs -> ${res.status}`);
  const live = await res.json();
  const byId = new Map(live.map((s) => [s.song_id, s]));
  console.log(`library: ${live.length} songs`);

  const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : [];
  const stats = { ok: 0, skipped: 0, invented: 0, failed: 0, missing: 0 };
  const rejected = [];
  let n = 0;

  for (const p of patches) {
    if (n >= LIMIT) break;
    const cur = byId.get(p.song_id);
    if (!cur) {
      stats.missing++;
      console.log(`  MISS  #${p.song_id} not in library`);
      continue;
    }

    const before = charCount(allText(cur));
    const after = charCount(allText({ main_stanza: p.main_stanza, stanzas: p.stanzas }));
    let invented = "";
    if (!PROVENANCE_CHECKED) {
      for (const [c, k] of after) {
        if ((before.get(c) || 0) < k) { invented = c; break; }
      }
    }
    if (invented) {
      stats.invented++;
      rejected.push({ song_id: p.song_id, song_name: p.song_name, reason: `invented "${invented}"` });
      console.log(`  INVENT #${p.song_id} ${String(p.song_name).slice(0, 40)} — adds "${invented}", skipped`);
      continue;
    }

    const body = {
      song_name: p.song_name ?? cur.song_name,
      main_stanza: p.main_stanza,
      stanzas: p.stanzas,
      last_updated_by: p.updated_by || "sanitizer",
    };
    if (p.source) body.source = p.source;

    n++;
    if (DRY) {
      stats.ok++;
      if (n <= 5) console.log(`  WOULD PUT #${p.song_id} ${String(p.song_name).slice(0, 40)} [${(p.changes || []).join(",")}]`);
      continue;
    }

    try {
      const r = await fetch(`${API}/songs/${p.song_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) {
        stats.failed++;
        console.log(`  FAIL  #${p.song_id} http ${r.status} ${(await r.text()).slice(0, 80)}`);
      } else {
        stats.ok++;
        log.push({ song_id: p.song_id, song_name: p.song_name, changes: p.changes || [],
                   before: { main_stanza: cur.main_stanza, stanzas: cur.stanzas, source: cur.source } });
        if (stats.ok % 50 === 0) {
          fs.writeFileSync(LOG, JSON.stringify(log), "utf8");
          console.log(`  ... ${stats.ok}/${patches.length}`);
        }
      }
    } catch (e) {
      stats.failed++;
      console.log(`  ERR   #${p.song_id} ${String(e.message).slice(0, 70)}`);
    }
    await sleep(DELAY);
  }

  if (!DRY) fs.writeFileSync(LOG, JSON.stringify(log), "utf8");
  if (rejected.length) {
    const rp = PATCH.replace(/\.json$/, "-rejected.json");
    fs.writeFileSync(rp, JSON.stringify(rejected, null, 1), "utf8");
    console.log(`rejected: ${rp}`);
  }
  console.log(`\n${DRY ? "[dry run] " : ""}updated ${stats.ok} | invented-text rejected ${stats.invented} | failed ${stats.failed} | missing ${stats.missing}`);
  if (!DRY) console.log(`rollback log: ${LOG} (${log.length} before-states)`);
})();
