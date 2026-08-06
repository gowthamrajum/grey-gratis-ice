#!/usr/bin/env node
// Import audited christianstack songs into the live library, one batch at a time.
//
//   node scripts/import-christianstack.js --dry-run                      # batch 1, no writes
//   node scripts/import-christianstack.js --limit 5                      # import 5 for real
//   node scripts/import-christianstack.js                                # import all of batch 1
//   node scripts/import-christianstack.js --batch batch-3-live-title-collision.json
//
// THIS WRITES TO THE LIVE LIBRARY.
//
// Flags
//   --dry-run     do everything except POST
//   --limit N     stop after N imports
//   --delay MS    pause between posts (default 700)
//   --batch FILE  batch file under audit/batches (default batch-1-frictionless.json)
//
// SAFETY — three independent layers, because the audit that produced these
// batches and the server's own 409 check both have known blind spots:
//
// 1. The audit (audit/README.md) already removed 371 songs that duplicate the
//    live library. These batches are what survived.
// 2. Telugu skeleton dedup, client side, re-run here against a FRESHLY fetched
//    library. Same folding as import-songs.js: spelling drift between the two
//    sources (aspirated/unaspirated, the three sibilants, anusvara vs conjunct
//    nasal) must not hide a duplicate. Songs posted during this run join the
//    index immediately, so a batch cannot duplicate within itself.
// 3. The server's own 409 on song_name >= 0.8 similarity. Expected to fire on
//    batch 3 by construction — those are new songs whose titles collide.
//
// ROLLBACK: POST /songs hard-codes created_by = "System", so imports are not
// distinguishable in the database afterwards. audit/imported.json records every
// {app_index -> song_id} pair; DELETE /songs/:id over that list reverses a run.

const fs = require("fs");
const path = require("path");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const FLAG = (n) => process.argv.includes(`--${n}`);

const ROOT = path.join(__dirname, "..", "songData-christianstack");
const AUDIT = path.join(ROOT, "audit");
const API = process.env.SONGS_API || "https://grey-gratis-ice.onrender.com";
const DRY = FLAG("dry-run");
const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;
const DELAY = parseInt(arg("delay", "700"), 10);
const BATCH = path.join(AUDIT, "batches", arg("batch", "batch-1-frictionless.json"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Telugu skeleton, identical to import-songs.js ---
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

const songTelugu = (s) => {
  const out = [];
  for (const l of (s.main_stanza || {}).telugu || []) out.push(l);
  for (const st of s.stanzas || []) for (const l of st.telugu || []) out.push(l);
  return out;
};

// christianstack author is {"Authored by": "...", "రచన": "..."}; the server
// stores a plain string, so collapse it the same way the app-songs build did.
const authorString = (a) => {
  if (!a) return "";
  if (typeof a === "string") return a.trim();
  return String(a["Authored by"] || a["రచన"] || "").trim();
};

(async () => {
  const songs = JSON.parse(fs.readFileSync(path.join(ROOT, "app-songs.json"), "utf8"));
  const batch = JSON.parse(fs.readFileSync(BATCH, "utf8"));
  console.log(`batch  : ${path.basename(BATCH)} — ${batch.count} songs`);
  console.log(`         ${batch.note}`);
  console.log(`target : ${API}${DRY ? "  [DRY RUN — no writes]" : "  *** LIVE ***"}`);

  console.log("\nfetching live library...");
  const res = await fetch(`${API}/songs`, { signal: AbortSignal.timeout(180000) });
  if (!res.ok) throw new Error(`GET /songs -> ${res.status}`);
  const library = await res.json();
  console.log(`library: ${library.length} songs`);

  const blobs = library.map((s) => skel(songTelugu(s).join("")));
  const nameOf = new Map(library.map((s) => [skel(songTelugu(s).join("")), s.song_name]));
  const dupIn = (key) => {
    if (key.length < 8) return null;
    const probe = key.slice(0, 40);
    const hit = blobs.find((b) => b.includes(probe));
    return hit ? (nameOf.get(hit) || "(in-run)") : null;
  };

  const manifestPath = path.join(AUDIT, "imported.json");
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : [];
  const done = new Set(manifest.map((m) => m.app_index));
  if (done.size) console.log(`manifest: ${done.size} already imported, skipping those`);

  const stats = { posted: 0, dup: 0, conflict: 0, skipped: 0, failed: 0 };
  const conflicts = [], dups = [];
  let n = 0;

  for (const entry of batch.songs) {
    if (n >= LIMIT) break;
    const idx = entry.app_index;
    if (done.has(idx)) continue;

    const src = songs[idx];
    if (!src || src.song_name !== entry.song_name) {
      console.log(`  SKIP  #${idx} batch/app-songs mismatch — regenerate the batch`);
      stats.skipped++;
      continue;
    }

    const te = songTelugu(src);
    if (!src.song_name || !te.length) {
      stats.skipped++;
      console.log(`  skip  #${idx} no title or no Telugu lyrics`);
      continue;
    }

    const key = skel(te.join(""));
    const hit = dupIn(key);
    if (hit) {
      stats.dup++;
      dups.push({ app_index: idx, song_name: src.song_name, matched: hit });
      console.log(`  dup   #${idx} ${src.song_name.slice(0, 44)} -> ${hit.slice(0, 40)}`);
      continue;
    }

    const payload = {
      song_name: src.song_name,
      main_stanza: src.main_stanza,
      stanzas: src.stanzas,
      author: authorString(src.author),
      source: "christianstack",
    };

    n++;
    if (DRY) {
      stats.posted++;
      console.log(`  WOULD POST #${idx} ${src.song_name.slice(0, 40)} | ${src.stanzas.length} stanzas | author=${payload.author || "-"}`);
      blobs.push(key);
      continue;
    }

    try {
      const r = await fetch(`${API}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });
      if (r.status === 409) {
        stats.conflict++;
        const body = await r.json().catch(() => ({}));
        conflicts.push({ app_index: idx, song_name: src.song_name, matched_song: body.matched_song });
        console.log(`  409   #${idx} ${src.song_name.slice(0, 40)} -> ${JSON.stringify(body.matched_song || {})}`);
      } else if (!r.ok) {
        stats.failed++;
        console.log(`  FAIL  #${idx} http ${r.status} ${(await r.text()).slice(0, 90)}`);
      } else {
        const body = await r.json();
        stats.posted++;
        blobs.push(key);
        manifest.push({ app_index: idx, song_id: body.song_id, song_name: src.song_name,
                        batch: path.basename(BATCH) });
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1), "utf8");
        console.log(`  ok    #${idx} -> song_id ${body.song_id}  ${src.song_name.slice(0, 40)}`);
      }
    } catch (e) {
      stats.failed++;
      console.log(`  ERR   #${idx} ${String(e.message).slice(0, 80)}`);
    }
    await sleep(DELAY);
  }

  console.log(`\n${DRY ? "[dry run] " : ""}posted ${stats.posted} | telugu-dup ${stats.dup} | server 409 ${stats.conflict} | skipped ${stats.skipped} | failed ${stats.failed}`);
  if (conflicts.length || dups.length) {
    const leftovers = path.join(AUDIT, `leftovers-${path.basename(BATCH)}`);
    fs.writeFileSync(leftovers, JSON.stringify({ conflicts, dups }, null, 1), "utf8");
    console.log(`leftovers: ${leftovers}`);
  }
  if (!DRY && manifest.length) {
    console.log(`manifest : ${manifestPath} (${manifest.length} song_ids — rollback list)`);
  }
})();
