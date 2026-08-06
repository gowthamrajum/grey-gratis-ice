#!/usr/bin/env node
// Import harvested waytochurch songs into the live library.
//
//   node scripts/import-songs.js --dry-run --limit 20    # see what would happen
//   node scripts/import-songs.js --limit 20              # actually import 20
//   node scripts/import-songs.js                         # import everything eligible
//
// THIS WRITES TO THE LIVE LIBRARY. Everything else in songData/ is read-only;
// this is the one script that changes your data.
//
// Flags
//   --dry-run     do everything except POST (default is to write)
//   --limit N     stop after N imports
//   --delay MS    pause between posts (default 700)
//   --ids FILE    restrict to these waytochurch ids (default songData/missing-ids.json)
//
// SAFETY
// 1. Telugu dedup, client side. The server's own 409 check compares song_name at
//    0.8 similarity, which cannot catch the same song stored under a different
//    transliteration - and transliteration is exactly what differs between the two
//    sources. So every candidate is checked against the Telugu text of the whole
//    library first, using the same skeleton normalisation as match-catalogue.js.
//    Songs imported during this run are added to that index immediately, so a
//    batch cannot duplicate within itself either.
// 2. A manifest. POST /songs hard-codes created_by = "System", so an import is NOT
//    distinguishable in the database afterwards. songData/imported.json records
//    every {wtc_id -> song_id} pair so the whole run can be reversed with
//    DELETE /songs/:id if it goes wrong.
// 3. Quality gate. Songs with no Telugu lyrics or no title are skipped rather
//    than posted as empty shells.

const fs = require("fs");
const path = require("path");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const FLAG = (n) => process.argv.includes(`--${n}`);

const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData")));
const API = process.env.SONGS_API || "https://grey-gratis-ice.onrender.com";
const DRY = FLAG("dry-run");
const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;
const DELAY = parseInt(arg("delay", "700"), 10);
const IDS_FILE = arg("ids", path.join(OUT, "missing-ids.json"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Same normalisation as match-catalogue.js: keep Telugu codepoints, then drop
// dependent vowel signs / virama / anusvara so spelling drift does not hide a
// duplicate.
// Telugu spelling varies freely between aspirated and unaspirated consonants, and
// between the three sibilants - waytochurch song 4 writes BOTH "అరుదెన్ఛె" and
// "అరుదెంచె" in the same line. Without folding these together the skeleton treats
// them as different words, which is how library song 138 "Andaala Thaara" was
// wrongly reported missing and nearly re-imported as a duplicate.
const FOLD = { "ఖ":"క","ఘ":"గ","ఛ":"చ","ఝ":"జ","ఠ":"ట","ఢ":"డ","థ":"త","ధ":"ద",
               "ఫ":"ప","భ":"బ","శ":"స","ష":"స","ణ":"న","ఱ":"ర" };

// A nasal before a consonant is written either as an explicit conjunct ("న్ఛ")
// or as the anusvara ("ంచ") - the same sound, freely interchanged. The anusvara
// is already dropped below, so the conjunct form must be dropped too or the two
// spellings never line up (waytochurch song 4 vs library song 138).
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
  const ms = s.main_stanza || {};
  for (const l of ms.telugu || []) out.push(l);
  for (const st of s.stanzas || []) for (const l of st.telugu || []) out.push(l);
  return out;
};

(async () => {
  const payloads = JSON.parse(fs.readFileSync(path.join(OUT, "app-songs.json"), "utf8"));
  const metas = JSON.parse(fs.readFileSync(path.join(OUT, "app-songs.meta.json"), "utf8"));

  let want = null;
  if (fs.existsSync(IDS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(IDS_FILE, "utf8"));
    want = new Set(raw.map((x) => Number(typeof x === "object" ? x.id : x)));
    console.log(`restricted to ${want.size} candidate ids from ${path.basename(IDS_FILE)}`);
  }

  // ---- live library, for the Telugu dedup index ----
  console.log("fetching live library...");
  const res = await fetch(`${API}/songs`, { signal: AbortSignal.timeout(180000) });
  if (!res.ok) throw new Error(`GET /songs -> ${res.status}`);
  const library = await res.json();
  console.log(`library: ${library.length} songs`);

  const blobs = library.map((s) => skel(songTelugu(s).join("")));
  const addBlob = (b) => { if (b) blobs.push(b); };
  const seenInLibrary = (key) => key.length >= 8 && blobs.some((b) => b.includes(key));

  // ---- manifest (resumable across runs) ----
  const manifestPath = path.join(OUT, "imported.json");
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : [];
  const alreadyImported = new Set(manifest.map((m) => m.wtc_id));

  // ---- go ----
  const stats = { posted: 0, dup: 0, conflict: 0, skipped: 0, failed: 0 };
  let n = 0;

  for (let i = 0; i < payloads.length; i++) {
    if (n >= LIMIT) break;
    const p = payloads[i], m = metas[i];
    if (want && !want.has(m.source_id)) continue;
    if (alreadyImported.has(m.source_id)) continue;

    // quality gate
    const te = songTelugu(p);
    if (!p.song_name || !te.length) {
      stats.skipped++;
      continue;
    }

    // client-side Telugu dedup
    const key = skel(te.join(""));
    if (seenInLibrary(key.slice(0, 40) || key)) {
      stats.dup++;
      console.log(`  dup   wtc ${m.source_id} ${p.song_name.slice(0, 44)}`);
      continue;
    }

    n++;
    if (DRY) {
      stats.posted++;
      console.log(`  WOULD POST wtc ${m.source_id} ${p.song_name.slice(0, 40)} | ${p.stanzas.length} stanzas | author=${JSON.stringify(p.author)}`);
      addBlob(key);
      continue;
    }

    try {
      const r = await fetch(`${API}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
        signal: AbortSignal.timeout(60000),
      });
      if (r.status === 409) {
        stats.conflict++;
        const body = await r.json().catch(() => ({}));
        console.log(`  409   wtc ${m.source_id} ${p.song_name.slice(0, 40)} -> matches ${JSON.stringify(body.matched_song || {})}`);
      } else if (!r.ok) {
        stats.failed++;
        console.log(`  FAIL  wtc ${m.source_id} http ${r.status} ${(await r.text()).slice(0, 90)}`);
      } else {
        const body = await r.json();
        stats.posted++;
        addBlob(key);
        manifest.push({ wtc_id: m.source_id, song_id: body.song_id, song_name: p.song_name, url: m.source_url });
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1), "utf8");
        console.log(`  ok    wtc ${m.source_id} -> song_id ${body.song_id}  ${p.song_name.slice(0, 40)}`);
      }
    } catch (e) {
      stats.failed++;
      console.log(`  ERR   wtc ${m.source_id} ${String(e.message).slice(0, 80)}`);
    }
    await sleep(DELAY);
  }

  console.log(`\n${DRY ? "[dry run] " : ""}posted ${stats.posted} | telugu-dup skipped ${stats.dup} | server 409 ${stats.conflict} | quality-skipped ${stats.skipped} | failed ${stats.failed}`);
  if (!DRY && manifest.length) {
    console.log(`manifest: ${manifestPath} (${manifest.length} imported song_ids — this is your rollback list)`);
  }
})();
