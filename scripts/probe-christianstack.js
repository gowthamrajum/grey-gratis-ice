#!/usr/bin/env node
// Probe a christianstack song page in a real browser: dump the tab structure,
// the rendered text of each pane, and a screenshot for visual confirmation.
//
//   node scripts/probe-christianstack.js <url> <outPrefix>

const { chromium } = require("playwright");

const [, , URL_ARG, PREFIX = "probe"] = process.argv;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

  await page.goto(URL_ARG, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".legacy-tabs-nav", { timeout: 30000 });

  const tabs = await page.$$eval(".legacy-tabs-nav li", (els) =>
    els.map((e, i) => ({ i, label: e.textContent.trim(), index: e.dataset.index }))
  );
  console.log("TABS:", JSON.stringify(tabs));

  for (const t of tabs) {
    await page.click(`.legacy-tabs-nav li:nth-child(${t.i + 1})`);
    await page.waitForTimeout(350);

    const text = await page.$eval(".legacy-tab-pane.active", (e) => e.innerText.trim());
    console.log(`\n===== TAB ${t.i} "${t.label}" (${text.length} chars) =====`);
    console.log(text);

    const box = await page.$(".legacy-tabs-wrapper");
    await box.screenshot({ path: `${PREFIX}-tab${t.i}-${t.label.replace(/\W/g, "")}.png` });
  }

  // page-level metadata we will want alongside the lyrics
  const meta = await page.evaluate(() => ({
    h1: document.querySelector("h1.entry-title, h1")?.innerText.trim() || "",
    date: document.querySelector("time.entry-date")?.getAttribute("datetime") || "",
    intro: [...document.querySelectorAll("#penci-post-entry-inner > p")]
      .map((p) => p.innerText.trim()).filter(Boolean).slice(0, 4),
    tags: [...document.querySelectorAll('a[href*="/tag/"]')].map((a) => a.innerText.trim()),
  }));
  console.log("\nMETA:", JSON.stringify(meta, null, 2));

  await browser.close();
})();
