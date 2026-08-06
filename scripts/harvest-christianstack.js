#!/usr/bin/env node
// Harvest christianstack.com Telugu lyrics with a real browser (Playwright).
//
// READ-ONLY. Downloads and parses only; never touches the database or the songs
// API. Matching and importing stay separate, later, reviewed steps.
//
//   node scripts/harvest-christianstack.js --limit 5      # try five first
//   node scripts/harvest-christianstack.js                # all of songs list
//
// Flags
//   --list FILE      song list to crawl (default ../../christianstack-telugu-songs.json)
//   --limit N        stop after N songs (default: all)
//   --concurrency N  parallel browser pages (default 5)
//   --shots N        screenshot the first N songs, all three tabs (default 12)
//   --shot-all       screenshot every song (slow, large)
//   --refresh        re-visit songs already cached
//   --out DIR        output directory (default ./songData-christianstack)
//
// Output
//   <out>/pages/<slug>.json   one record per song, written as it lands (resumable)
//   <out>/songs.json          all records merged
//   <out>/shots/<slug>-*.png  visual confirmation of what the browser actually saw
//
// Why a browser rather than parsing HTML: the lyric panes are tab-switched, and
// only the visible pane yields innerText — which is what preserves the <br> line
// breaks and blank-line stanza splits that the projection format is built from.
// Reading the hidden markup instead gives you text with no reliable line breaks.
//
// The load-bearing detail: Google AdSense auto-injects a "మరిన్ని కనుగొనండి"
// related-links block INSIDE div.telugu2, between stanzas. Left in, it lands in
// the middle of the lyrics and looks like a verse. It is blocked at the network
// layer and stripped from the DOM before any text is read.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const FLAG = (n) => process.argv.includes(`--${n}`);

const LIST = path.resolve(arg("list", path.join(__dirname, "..", "..", "christianstack-telugu-songs.json")));
const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData-christianstack")));
const PAGES = path.join(OUT, "pages");
const SHOTS = path.join(OUT, "shots");
const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;
const CONCURRENCY = parseInt(arg("concurrency", "5"), 10);
const SHOTS_N = FLAG("shot-all") ? Infinity : parseInt(arg("shots", "12"), 10);
const REFRESH = FLAG("refresh");

// Ad and analytics hosts. Blocking them is not cosmetic: it is what stops the
// AdSense block from being injected into the lyrics in the first place.
const BLOCKED = [
  "googlesyndication.com", "doubleclick.net", "googletagservices.com",
  "google-analytics.com", "googletagmanager.com", "adservice.google.",
  "amazon-adsystem.com", "facebook.net", "connect.facebook",
  "taboola.com", "outbrain.com", "criteo.", "pubmatic.com", "rubiconproject.com",
];

const slugOf = (url) =>
  url.replace(/\/+$/, "").split("/").pop().slice(0, 80) || "song";

// ---------- in-page extraction ----------
// Runs inside the browser. Returns stanzas as arrays of lines: a stanza per <p>,
// a line per <br>. Ad containers are dropped before anything is read.
function extractPane() {
  const pane = document.querySelector(".legacy-tab-pane.active") ||
               document.querySelector(".legacy-tab-pane");
  if (!pane) return { stanzas: [], raw: "" };

  const AD = ".google-auto-placed, ins.adsbygoogle, [id^=aswift], .ap_container, iframe, script, style, .code-block, .penci-ad";
  pane.querySelectorAll(AD).forEach((e) => e.remove());

  // Prefer the inner lyric div when present; some panes have the <p>s directly.
  const box = pane.querySelector(".telugu2, .english1, .translation1, .english2") || pane;

  const blocks = [...box.querySelectorAll("p")].filter((p) => !p.closest(AD));
  const source = blocks.length ? blocks : [box];

  const stanzas = [];
  for (const b of source) {
    const lines = (b.innerText || "")
      .split("\n")
      .map((l) => l.replace(/ /g, " ").trim())
      .filter(Boolean);
    if (lines.length) stanzas.push(lines);
  }
  return { stanzas, raw: (box.innerText || "").trim() };
}

// A pane with no <p> structure comes back as one giant stanza; blank lines in the
// rendered text are the only stanza signal left, so split on them.
function resplit(stanzas, raw) {
  if (stanzas.length > 1) return stanzas;
  const byBlank = raw.split(/\n\s*\n/).map((s) =>
    s.split("\n").map((l) => l.trim()).filter(Boolean)
  ).filter((s) => s.length);
  return byBlank.length > 1 ? byBlank : stanzas;
}

const TELUGU_RE = /[ఀ-౿]/;
const teCount = (s) => (String(s).match(/[ఀ-౿]/g) || []).length;

async function harvest(page, entry, wantShot) {
  const slug = slugOf(entry.url);
  const rec = {
    slug, url: entry.url, title: entry.title, date: entry.date,
    telugu: [], english: [], translation: [],
    tabs: [], credits: {}, tags: [], warnings: [], shot: false,
  };

  await page.goto(entry.url, { waitUntil: "domcontentloaded", timeout: 60000 });

  const hasTabs = await page.$(".legacy-tabs-nav");
  if (!hasTabs) {
    rec.warnings.push("no tab nav");
    const got = await page.evaluate(extractPane).catch(() => ({ stanzas: [], raw: "" }));
    rec.telugu = resplit(got.stanzas, got.raw);
  } else {
    const tabs = await page.$$eval(".legacy-tabs-nav li", (els) =>
      els.map((e) => e.textContent.trim())
    );
    rec.tabs = tabs;

    for (let i = 0; i < tabs.length; i++) {
      await page.click(`.legacy-tabs-nav li:nth-child(${i + 1})`);
      await page.waitForTimeout(220); // the pane swap is a class toggle, not a fetch

      const got = await page.evaluate(extractPane).catch(() => ({ stanzas: [], raw: "" }));
      const stanzas = resplit(got.stanzas, got.raw);

      // Trust the rendered script, not the tab label — a few pages mislabel.
      const label = tabs[i].toLowerCase();
      const isTe = teCount(got.raw) > 20;
      if (isTe) rec.telugu = stanzas;
      else if (label.startsWith("translit")) rec.english = stanzas;
      else if (label.startsWith("transl")) rec.translation = stanzas;
      else if (!rec.english.length) rec.english = stanzas;

      if (wantShot) {
        const box = await page.$(".legacy-tabs-wrapper");
        if (box) {
          await box.screenshot({
            path: path.join(SHOTS, `${slug}-${i}-${tabs[i].replace(/\W/g, "")}.png`),
          }).catch(() => {});
          rec.shot = true;
        }
      }
    }
  }

  const meta = await page.evaluate(() => {
    const txt = (s) => document.querySelector(s)?.innerText.trim() || "";
    const inner = document.querySelector("#penci-post-entry-inner");
    const paras = inner ? [...inner.querySelectorAll(":scope > p")].map((p) => p.innerText.trim()) : [];
    return {
      h1: txt("h1.entry-title") || txt("h1"),
      date: document.querySelector("time.entry-date")?.getAttribute("datetime") || "",
      paras: paras.filter(Boolean).slice(0, 6),
      tags: [...new Set([...document.querySelectorAll('a[href*="/tag/"]')].map((a) => a.innerText.trim()))].filter(Boolean),
    };
  }).catch(() => ({ h1: "", date: "", paras: [], tags: [] }));

  if (meta.h1) rec.title = meta.h1;
  if (meta.date) rec.date = meta.date.slice(0, 10);
  rec.tags = meta.tags;

  // The credit block is a single <p> of "Label: Value" lines.
  const creditPara = meta.paras.find((p) => /^\s*Song\s*:/im.test(p)) || "";
  for (const line of creditPara.split("\n")) {
    const m = line.match(/^\s*([^:]{2,60}?)\s*:\s*(.+?)\s*$/);
    if (m) rec.credits[m[1].trim()] = m[2].trim();
  }
  rec.intro = meta.paras[0] || "";

  if (!rec.telugu.length) rec.warnings.push("no telugu");
  if (!rec.english.length) rec.warnings.push("no transliteration");
  return rec;
}

// ---------- main ----------
(async () => {
  fs.mkdirSync(PAGES, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });

  const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
  const queue = list.slice(0, LIMIT);

  const todo = queue.filter((e) =>
    REFRESH || !fs.existsSync(path.join(PAGES, `${slugOf(e.url)}.json`)));
  console.log(`songs: ${queue.length} | already cached: ${queue.length - todo.length} | to visit: ${todo.length}`);
  console.log(`concurrency ${CONCURRENCY} | screenshots for first ${SHOTS_N === Infinity ? "ALL" : SHOTS_N}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1400 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
               "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  await ctx.route("**/*", (route) => {
    const u = route.request().url();
    if (BLOCKED.some((h) => u.includes(h))) return route.abort();
    return route.continue();
  });

  let next = 0, done = 0, failed = 0;
  const started = Date.now();

  async function worker(w) {
    const page = await ctx.newPage();
    while (true) {
      const i = next++;
      if (i >= todo.length) break;
      const entry = todo[i];
      try {
        const rec = await harvest(page, entry, i < SHOTS_N);
        fs.writeFileSync(path.join(PAGES, `${rec.slug}.json`),
          JSON.stringify(rec, null, 2) + "\n", "utf8");
      } catch (e) {
        failed++;
        console.log(`  ! ${slugOf(entry.url)}: ${e.message.split("\n")[0]}`);
      }
      done++;
      if (done % 25 === 0) {
        const rate = (Date.now() - started) / done / 1000;
        const eta = Math.round((todo.length - done) * rate / 60);
        console.log(`  ${done}/${todo.length} | ${rate.toFixed(1)}s/song | failed ${failed} | eta ${eta}m`);
      }
    }
    await page.close();
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, w) => worker(w)));
  await browser.close();

  // -- merge --
  const bySlug = new Map();
  for (const e of queue) {
    const f = path.join(PAGES, `${slugOf(e.url)}.json`);
    if (fs.existsSync(f)) bySlug.set(slugOf(e.url), JSON.parse(fs.readFileSync(f, "utf8")));
  }
  const songs = [...bySlug.values()];
  fs.writeFileSync(path.join(OUT, "songs.json"), JSON.stringify(songs, null, 1), "utf8");

  const withTe = songs.filter((s) => s.telugu.length).length;
  const withEn = songs.filter((s) => s.english.length).length;
  const withTr = songs.filter((s) => s.translation.length).length;
  const multi = songs.filter((s) => s.telugu.length > 1).length;
  console.log(`\nharvested ${songs.length} songs -> ${path.join(OUT, "songs.json")}`);
  console.log(`  with telugu          : ${withTe}`);
  console.log(`  with transliteration : ${withEn}`);
  console.log(`  with translation     : ${withTr}`);
  console.log(`  with >1 stanza       : ${multi}`);
  console.log(`  failed               : ${failed}`);
  console.log(`  screenshots          : ${SHOTS}`);
})();
