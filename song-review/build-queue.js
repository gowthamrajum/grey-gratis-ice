#!/usr/bin/env node
// Build the human-review queue: every song from clz / wtc / cst that is NOT in
// the live library, plus the songs that ARE in it but need a human decision.
//
//   node song-review/build-queue.js            # use cached library if present
//   node song-review/build-queue.js --refresh  # re-fetch the live library first
//
// Writes song-review/data/review-queue.json — the server reads only that, so the
// server is deployable without the local source tree.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(__dirname, "data");
const API = process.env.SONGS_API || "https://grey-gratis-ice.onrender.com";
const REFRESH = process.argv.includes("--refresh");

fs.mkdirSync(DATA, { recursive: true });

// ---- Telugu skeleton, same folding as scripts/import-songs.js ----
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

const teLines = (s) => {
  const o = [];
  for (const l of (s.main_stanza || {}).telugu || []) o.push(String(l));
  for (const st of s.stanzas || []) for (const l of st.telugu || []) o.push(String(l));
  return o;
};
const allLines = (s) => {
  const o = [];
  const p = (b) => { if (!b) return;
    for (const l of b.telugu || []) o.push(String(l));
    for (const l of b.english || []) o.push(String(l)); };
  p(s.main_stanza);
  for (const st of s.stanzas || []) p(st);
  return o;
};

// ---- diagnosis: what a human should be told is wrong ----
const TE = /[ఀ-౿]/;
const LAT = /[A-Za-z]/;
const REF = /^\s*(reference|ref)\s*[:\-]/i;
const JUNK = /(adsbygoogle|sponsored|related\s+posts|share\s+this|click\s+here|subscribe|https?:\/\/|www\.|distrokid|🎵|scale-|tempo-)/i;

function diagnose(song) {
  const out = [];
  const ms = song.main_stanza || {};
  const stz = song.stanzas || [];
  const mte = ms.telugu || [], men = ms.english || [];
  const lines = allLines(song);

  if (!teLines(song).length) out.push({ k: "no-telugu", s: "critical",
    t: "No Telugu lyrics at all — this may not be a song." });
  if (!stz.length && mte.length >= 5) out.push({ k: "one-block", s: "critical",
    t: `The whole song sits in one block of ${mte.length} lines with no verses separated out.` });
  if (mte.length >= 9) out.push({ k: "long-chorus", s: "warning",
    t: `The chorus is ${mte.length} lines. That can be a legitimate pallavi + anupallavi, or the verses may have been swallowed into it.` });
  if (!mte.length && stz.length) out.push({ k: "no-chorus", s: "warning",
    t: "No chorus recorded — everything is in the verses." });
  for (const b of [ms, ...stz]) {
    const te = b.telugu || [], en = b.english || [];
    if (te.length && en.length && te.length !== en.length) {
      out.push({ k: "misaligned", s: "warning",
        t: `A block has ${te.length} Telugu lines but ${en.length} romanised ones, so the app pairs the wrong lines together.` });
      break;
    }
  }
  if (lines.some((l) => REF.test(l))) out.push({ k: "citation", s: "warning",
    t: "A scripture citation was scraped in and is being shown as a lyric line." });
  if (lines.some((l) => JUNK.test(l))) out.push({ k: "junk", s: "warning",
    t: "Non-lyric text (page furniture, credits, a URL or an emoji blurb) is mixed into the lyrics." });
  const teAll = (ms.telugu || []).concat(...stz.map((s) => s.telugu || []));
  if (teAll.length && !teAll.some((l) => TE.test(l))) out.push({ k: "wrong-script",
    s: "critical", t: "The Telugu field does not contain Telugu — the fields may be swapped." });
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() && lines[i].trim() === lines[i - 1].trim()) {
      out.push({ k: "repeat", s: "info",
        t: "A line is written twice in a row. Usually that means a sung repeat and is correct — confirm it is not a scraping slip." });
      break;
    }
  }
  return out;
}

(async () => {
  // ---------- live library ----------
  const cache = path.join(DATA, "library-cache.json");
  let lib;
  if (!REFRESH && fs.existsSync(cache)) {
    lib = JSON.parse(fs.readFileSync(cache, "utf8"));
    console.log(`library: ${lib.length} (cached — pass --refresh to re-fetch)`);
  } else {
    console.log("fetching live library...");
    const r = await fetch(`${API}/songs`, { signal: AbortSignal.timeout(300000) });
    if (!r.ok) throw new Error(`GET /songs -> ${r.status}`);
    lib = await r.json();
    fs.writeFileSync(cache, JSON.stringify(lib), "utf8");
    console.log(`library: ${lib.length} (fetched)`);
  }
  const libBlobs = lib.map((s) => skel(teLines(s).join("")));
  const inLibrary = (song) => {
    const k = skel(teLines(song).join("")).slice(0, 40);
    if (k.length < 8) return null;
    const i = libBlobs.findIndex((b) => b.includes(k));
    return i === -1 ? null : lib[i];
  };

  // ---------- source corpora ----------
  const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
  const items = [];

  // cst — christianstack: has real source URLs and locally scraped pages
  const cstSongs = read(path.join(ROOT, "songData-christianstack", "app-songs.json"));
  const cstList = read(path.join(ROOT, "songData-christianstack", "source-list.json"));
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  // Page titles read "SongName – Artist Telugu Christian Lyrics", so the song
  // name is a PREFIX of the page title, not equal to it. Match on that.
  const cstIndex = cstList.map((x) => ({ n: norm(x.title), url: x.url }));
  const findCstUrl = (name) => {
    const k = norm(name);
    if (k.length < 6) return null;
    const hit = cstIndex.find((x) => x.n.startsWith(k))
             || cstIndex.find((x) => x.n.includes(k));
    return hit ? hit.url : null;
  };
  const auditDir = path.join(ROOT, "songData-christianstack", "audit");
  const reasonBy = new Map();
  const tag = (file, why) => {
    const p = path.join(auditDir, file);
    if (!fs.existsSync(p)) return;
    for (const x of read(p)) reasonBy.set(x.app_index, why(x));
  };
  tag("duplicates-to-drop.json", (x) =>
    `Looks like a duplicate of library song #${x.duplicate_of_song_id} “${x.duplicate_of_name}” (lyric similarity ${x.c3}).`);
  tag("needs-review.json", (x) =>
    `Borderline against library song #${x.closest_song_id} “${x.closest_name}” — similar but not clearly the same song.`);
  tag("blocked-but-new.json", (x) =>
    `A new song, but the server refuses it: its title is ${Math.round(x.title_score * 100)}% similar to “${x.blocked_by_name}” (#${x.blocked_by_song_id}), which is a different song.`);

  // the locally scraped page, so the source is still visible when the site
  // refuses to be framed
  const pagesDir = path.join(ROOT, "songData-christianstack", "pages");
  const pages = [];
  if (fs.existsSync(pagesDir)) {
    for (const f of fs.readdirSync(pagesDir).filter((x) => x.endsWith(".json"))) {
      try {
        const p = read(path.join(pagesDir, f));
        pages.push({ n: norm(p.title), p });
      } catch { /* skip unreadable page */ }
    }
  }
  const findPage = (name) => {
    const k = norm(name);
    if (k.length < 6) return null;
    const hit = pages.find((x) => x.n.startsWith(k)) || pages.find((x) => x.n.includes(k));
    return hit ? hit.p : null;
  };

  cstSongs.forEach((s, i) => {
    if (inLibrary(s)) return;
    const pg = findPage(s.song_name);
    items.push({
      id: `cst-${i}`, source: "cst", sourceName: "christianstack",
      title: s.song_name, author: (s.author || {})["Authored by"] || "",
      reason: reasonBy.get(i) || "Harvested but never imported.",
      sourceUrl: findCstUrl(s.song_name) || (pg && pg.url) || null,
      song: { main_stanza: s.main_stanza, stanzas: s.stanzas },
      scraped: pg ? { title: pg.title, telugu: pg.telugu, english: pg.english,
                      credits: pg.credits, intro: pg.intro } : null,
      issues: diagnose(s),
    });
  });

  // wtc — waytochurch
  const wtcPath = path.join(ROOT, "scripts", "songData", "app-songs.json");
  const wtcMetaPath = path.join(ROOT, "scripts", "songData", "app-songs.meta.json");
  if (fs.existsSync(wtcPath)) {
    const songs = read(wtcPath);
    const meta = fs.existsSync(wtcMetaPath) ? read(wtcMetaPath) : [];
    songs.forEach((s, i) => {
      if (inLibrary(s)) return;
      items.push({
        id: `wtc-${i}`, source: "wtc", sourceName: "waytochurch",
        title: s.song_name, author: "",
        reason: "Harvested but never imported.",
        sourceUrl: (meta[i] || {}).source_url || null,
        song: { main_stanza: s.main_stanza, stanzas: s.stanzas },
        issues: diagnose(s),
      });
    });
  }

  // clz — visualParsed: local files only, no upstream URL
  const clzDir = path.join(ROOT, "visualParsed");
  if (fs.existsSync(clzDir)) {
    for (const f of fs.readdirSync(clzDir).filter((x) => x.endsWith(".json"))) {
      let s;
      try { s = read(path.join(clzDir, f)); } catch { continue; }
      if (!s || !s.song_name) continue;
      if (inLibrary(s)) continue;
      items.push({
        id: `clz-${f.replace(/\.json$/, "")}`, source: "clz", sourceName: "visualParsed",
        title: s.song_name, author: "",
        reason: "Parsed from the slide deck but never imported.",
        sourceUrl: null, sourceFile: `visualParsed/${f}`,
        song: { main_stanza: s.main_stanza, stanzas: s.stanzas },
        issues: diagnose(s),
      });
    }
  }

  // ---- in-library songs the repair passes could not finish on their own ----
  // These already project to a congregation, so they matter more than the
  // never-imported ones. Each carries the source page where one exists, since
  // finishing them means comparing against the original.
  const KIND = {
    "held-proposal":  "A fix was worked out but held back",
    "needs-source":   "Lyrics incomplete — needs the published song",
    "not-a-song":     "No lyrics in this record",
    "duplicate-pair": "Duplicate of another library song",
    "title-conflict": "Filed under another song's title",
  };
  const attachSource = (name) => {
    const pg = findPage(name);
    return { sourceUrl: findCstUrl(name) || (pg && pg.url) || null,
             scraped: pg ? { title: pg.title, telugu: pg.telugu, english: pg.english,
                             credits: pg.credits, intro: pg.intro } : null };
  };

  for (const [file, idPrefix] of [["needs-human.json", "lib"],
                                  ["duplicate-pairs-review.json", "dup"]]) {
    const p = path.join(auditDir, file);
    if (!fs.existsSync(p)) continue;
    for (const x of read(p)) {
      items.push({
        id: `${idPrefix}-${x.song_id}`, source: x.kind,
        sourceName: KIND[x.kind] || x.kind,
        songId: x.song_id, title: x.song_name, author: "",
        reason: x.reason,
        proposal: x.proposed ? "A proposed structure is recorded — compare it below." : undefined,
        proposed: x.proposed || undefined,
        twin: x.twin || undefined,
        citedSources: x.sources || [],
        ...attachSource(x.song_name),
        song: { main_stanza: x.main_stanza, stanzas: x.stanzas },
        issues: diagnose(x),
      });
    }
  }

  // songs the earlier structural pass could not decide
  const heldPath = path.join(auditDir, "held-for-review.json");
  const alreadyQueued = new Set(items.map((x) => x.songId).filter(Boolean));
  if (fs.existsSync(heldPath)) {
    for (const h of read(heldPath)) {
      if (alreadyQueued.has(h.song_id)) continue;
      const cur = lib.find((x) => x.song_id === h.song_id);
      items.push({
        id: `held-${h.song_id}`, source: "held", sourceName: "in library",
        songId: h.song_id, title: h.song_name, author: "",
        reason: "Already in the library. The sanitiser proposed a fix but was not confident enough to apply it.",
        proposal: h.note,
        sourceUrl: null,
        song: cur ? { main_stanza: cur.main_stanza, stanzas: cur.stanzas }
                  : { main_stanza: h.main_stanza, stanzas: h.stanzas },
        proposed: { main_stanza: h.main_stanza, stanzas: h.stanzas },
        issues: cur ? diagnose(cur) : [],
      });
    }
  }

  const bySource = items.reduce((a, x) => (a[x.source] = (a[x.source] || 0) + 1, a), {});
  fs.writeFileSync(path.join(DATA, "review-queue.json"),
    JSON.stringify({ builtFrom: API, library: lib.length, total: items.length, items }), "utf8");

  console.log(`\nqueue: ${items.length} songs needing a human decision`);
  for (const [k, v] of Object.entries(bySource)) console.log(`  ${k.padEnd(6)} ${v}`);
  console.log(`  with a source URL to embed: ${items.filter((x) => x.sourceUrl).length}`);
  console.log(`\nwrote ${path.join(DATA, "review-queue.json")}`);
})();
