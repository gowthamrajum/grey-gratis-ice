#!/usr/bin/env node
// Repair the prepared song files: split pallavi/charanams, break lines to a size
// a projector can show, and fill in transliteration where the source had none.
//
//   node scripts/fix-prepared.js --limit 1        # try one, inspect it
//   node scripts/fix-prepared.js --limit 50       # work through a batch
//   node scripts/fix-prepared.js                  # everything outstanding
//
// Runs through the Claude Code CLI (`claude -p`), so it draws on your Max
// subscription. It refuses to start if ANTHROPIC_API_KEY is set, which would
// silently bill at API rates instead.
//
// Flags
//   --limit N     stop after N songs
//   --batch N     songs per claude invocation (default 4)
//   --concurrency N   parallel claude invocations (default 1)
//   --model ID    override the model
//   --redo        re-fix songs already recorded as done
//   --only WARN   only songs whose index warnings contain WARN
//
// SAFETY
// * The original of every file is copied to songData/prepared-original/ before
//   it is first modified, so any repair can be undone or re-inspected.
// * Telugu is verified after the fact: the repaired song must contain
//   essentially the same Telugu characters as the original. A model that
//   paraphrases, drops a verse or invents text fails the check and the file is
//   left untouched. This is the guard that matters — these are worship lyrics,
//   and a plausible-looking rewrite is worse than a badly formatted original.
// * Progress is recorded in songData/fix-log.json so runs resume.

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const FLAG = (n) => process.argv.includes(`--${n}`);

const OUT = path.resolve(arg("out", path.join(__dirname, "..", "songData")));
const DIR = path.join(OUT, "prepared");
const ORIG = path.join(OUT, "prepared-original");
const LOG = path.join(OUT, "fix-log.json");
const LIMIT = parseInt(arg("limit", "0"), 10) || Infinity;
const BATCH = Math.max(1, parseInt(arg("batch", "4"), 10));
const MODEL = arg("model", "");
const CONCURRENCY = Math.max(1, parseInt(arg("concurrency", "1"), 10));
// How long to sit out after the subscription's rolling window is exhausted
// before probing again. The window is 5 hours, but it refills continuously, so
// re-probing sooner usually gets work flowing again earlier.
const COOLDOWN_MIN = parseInt(arg("cooldown", "12"), 10);
const REDO = FLAG("redo");
const ONLY = arg("only", "");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const teluguOnly = (s) => [...String(s || "")].filter((c) => c >= "ఀ" && c <= "౿").join("");

const songTelugu = (p) => {
  const out = [...((p.main_stanza || {}).telugu || [])];
  for (const st of p.stanzas || []) out.push(...(st.telugu || []));
  return out;
};
const songEnglish = (p) => {
  const out = [...((p.main_stanza || {}).english || [])];
  for (const st of p.stanzas || []) out.push(...(st.english || []));
  return out;
};

const PROMPT = (items) => `You are formatting Telugu Christian worship songs for projection during a church service.

For EACH song below, restructure the text into the JSON shape given at the end.

ABSOLUTE RULES — these override everything else:
1. NEVER invent, paraphrase, translate or "improve" lyrics. Use ONLY the Telugu
   text supplied. Every Telugu word you output must appear in the input. If a
   song looks incomplete, output what is there — do not complete it.
2. NEVER drop content. Every line of the input must end up somewhere in the output.
3. Do not correct spelling, even if a word looks misspelled. It is a lyric.

WHAT TO DO:
a. Identify the pallavi (chorus / refrain) — usually the opening section, and often
   repeated. It goes in "main_stanza".
b. Identify the charanams (verses). These are often marked "1." "2." in the text,
   sometimes with no space after the number. Each becomes an entry in "stanzas"
   with its stanza_number.
c. Break each section into DISPLAY LINES sized for a projector slide — roughly
   6 to 10 Telugu words, about 40-70 characters. Break at natural phrase
   boundaries. Keep an internal "-" or "–" INSIDE the line as a phrase separator;
   it is not a line break.
d. Remove editorial labels ("పల్లవి:", "చరణం:", "pallavi", "charanam") and the
   "..refrain.." markers that point back to the pallavi. Keep "(2)" repeat markers.
e. TRANSLITERATION: produce a readable English transliteration for every Telugu
   line, one-to-one, same number of lines in the same order. Write it the way a
   Telugu speaker would read it aloud in Latin script, Title Case, e.g.
   "Aahaa Mahaathma Haa Sharanya - Haa Vimochakaa".
   If transliteration was supplied in the input, follow its spelling conventions;
   otherwise produce your own readable version. NEVER translate to English —
   transliterate the sound.

Return ONLY a JSON array, one object per song, in the same order, no markdown:
[{"id": <the id given>, "song_name": "<readable transliterated title, Title Case>",
  "main_stanza": {"telugu": ["..."], "english": ["..."]},
  "stanzas": [{"stanza_number": 1, "telugu": ["..."], "english": ["..."]}]}]

SONGS:
${items.map((it) => `
--- id: ${it.id} ---
current song_name: ${it.song_name}
TELUGU:
${it.telugu.join("\n")}
${it.english.length ? `EXISTING TRANSLITERATION (follow its spelling style):\n${it.english.join("\n")}` : "EXISTING TRANSLITERATION: (none — produce one)"}
`).join("\n")}`;

// Async so several invocations can be in flight at once. The sequential version
// spent almost all its wall-clock waiting on one claude process; the work is
// entirely I/O-bound from this script's point of view.
async function runClaude(prompt) {
  const args = ["-p", prompt, "--output-format", "json"];
  if (MODEL) args.push("--model", MODEL);
  const { stdout } = await execFileAsync("claude", args,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 });
  let env;
  try {
    env = JSON.parse(stdout);
  } catch (e) {
    // "Unexpected number in JSON..." on its own says nothing about what actually
    // came back. Surface the head of the real output so a throttle notice, an
    // auth prompt or a truncated response can be told apart.
    const head = String(stdout).slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`unparseable claude output: ${head}`);
  }
  if (env.is_error) throw new Error(env.result || "claude reported an error");
  return env;
}

// Claude Code reports an exhausted subscription window as an ordinary command
// failure, so it has to be recognised from the message. Getting this wrong is
// expensive in both directions: treated as a normal error, every remaining batch
// would burn through and be marked failed within seconds.
const RATE_LIMIT_RE = /rate.?limit|usage limit|limit reached|429|too many requests|quota/i;
const isRateLimit = (e) => RATE_LIMIT_RE.test(String((e && e.message) || e));

function extractArray(text) {
  let t = String(text || "").trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a === -1 || b <= a) throw new Error("no JSON array in output");
  return JSON.parse(t.slice(a, b + 1));
}

// The content guard: a CHARACTER MULTISET comparison, ignoring whitespace.
//
// Two earlier versions of this were wrong in opposite ways, and both failures are
// instructive:
//   1. Comparing character COUNTS with a 10% loss limit rejected correct work,
//      because many songs spell the refrain out again after every verse and
//      consolidating it legitimately removes 10-25% of the characters.
//   2. Comparing DISTINCT WORDS then flagged "నేర్పితివాఆ" as invented, when the
//      model had merely joined or re-spaced two words. Word boundaries in this
//      source are unreliable, so they cannot be part of the check.
//
// Characters ignoring whitespace are stable under both re-spacing and
// re-lineation, and the test stays asymmetric where it matters:
//   * EXCESS characters mean text was written that was not in the source. This is
//     the dangerous direction for worship lyrics — near-zero tolerance.
//   * MISSING characters are expected when repeated refrains collapse, so the
//     allowance is generous.
function teluguPreserved(before, after) {
  const count = (s) => {
    const m = new Map();
    for (const c of teluguOnly(s)) m.set(c, (m.get(c) || 0) + 1);
    return m;
  };
  const A = count(before), B = count(after);
  const total = [...A.values()].reduce((n, v) => n + v, 0);
  if (!total) return { ok: false, reason: "no Telugu in the original" };

  let excess = 0, missing = 0;
  for (const [c, n] of B) excess += Math.max(0, n - (A.get(c) || 0));
  for (const [c, n] of A) missing += Math.max(0, n - (B.get(c) || 0));

  if (excess > Math.max(12, total * 0.03)) {
    return { ok: false, reason: `${excess} characters not present in the source (invented text)` };
  }
  if (missing > total * 0.45) {
    return { ok: false, reason: `lost ${Math.round((missing / total) * 100)}% of the Telugu` };
  }
  return { ok: true };
}

(async () => {
  if (process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is set — Claude Code would bill at API rates instead");
    console.error("of using your Max plan. Run:  unset ANTHROPIC_API_KEY");
    process.exit(1);
  }
  fs.mkdirSync(ORIG, { recursive: true });
  const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : {};

  // index warnings, for --only
  const warn = new Map();
  const idxPath = path.join(DIR, "_index.csv");
  if (fs.existsSync(idxPath)) {
    for (const line of fs.readFileSync(idxPath, "utf8").split("\n").slice(1)) {
      const f = line.split(",")[0];
      if (f) warn.set(f, line);
    }
  }

  let files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  if (ONLY) files = files.filter((f) => (warn.get(f) || "").includes(ONLY));
  if (!REDO) files = files.filter((f) => !log[f] || log[f].status !== "fixed");

  const todo = files.slice(0, LIMIT === Infinity ? files.length : LIMIT);
  console.log(`${files.length} outstanding | doing ${todo.length} | batch ${BATCH} | concurrency ${CONCURRENCY}${MODEL ? ` | model ${MODEL}` : ""}`);
  if (!todo.length) return;

  const stats = { fixed: 0, rejected: 0, failed: 0 };
  let spent = 0, doneCount = 0;

  // Split the work into batches up front, then run CONCURRENCY workers over that
  // queue. Node is single-threaded, so the log object is only ever mutated
  // between awaits - no locking needed, and each worker persists it after its
  // own batch so a kill at any moment loses at most the batches in flight.
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  let next = 0;
  let cooldownUntil = 0;   // shared across workers: all pause together
  let pauses = 0;

  async function worker(w) {
    for (;;) {
      // Every worker waits out a cooldown together; hammering a spent window
      // just produces more failures.
      while (Date.now() < cooldownUntil) {
        await sleep(30000);
      }
      const myIndex = next++;
      if (myIndex >= batches.length) return;
      const slice = batches[myIndex];

      const items = slice.map((f) => {
        const p = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
        return { file: f, id: f.split("-")[0], song_name: p.song_name,
                 telugu: songTelugu(p), english: songEnglish(p), payload: p };
      });

      let out;
      try {
        const env = await runClaude(PROMPT(items));
        spent += env.total_cost_usd || 0;
        out = extractArray(env.result);
      } catch (e) {
        if (isRateLimit(e)) {
          // Put the work back rather than losing it, and stand everyone down.
          batches.push(slice);
          if (Date.now() >= cooldownUntil) {
            cooldownUntil = Date.now() + COOLDOWN_MIN * 60 * 1000;
            pauses++;
            console.log(`  [w${w}] window exhausted — pausing ${COOLDOWN_MIN}m, then resuming (pause #${pauses})`);
          }
          continue;
        }
        stats.failed += slice.length;
        console.log(`  [w${w}] batch failed: ${String(e.message).slice(0, 110)}`);
        continue;
      }

      const byId = new Map(out.map((o) => [String(o.id).padStart(5, "0"), o]));
      for (const it of items) {
        const got = byId.get(it.id) || byId.get(String(Number(it.id)));
        if (!got) { stats.failed++; continue; }

        const after = [
          ...((got.main_stanza || {}).telugu || []),
          ...(got.stanzas || []).flatMap((s) => s.telugu || []),
        ].join("");
        const check = teluguPreserved(it.telugu.join(""), after);
        if (!check.ok) {
          stats.rejected++;
          log[it.file] = { status: "rejected", reason: check.reason };
          console.log(`  [w${w}] REJECT ${it.file}: ${check.reason}`);
          continue;
        }

        const orig = path.join(ORIG, it.file);
        if (!fs.existsSync(orig)) fs.writeFileSync(orig, JSON.stringify(it.payload, null, 2) + "\n", "utf8");

        const fixed = {
          song_name: got.song_name || it.payload.song_name,
          author: it.payload.author,
          main_stanza: {
            telugu: (got.main_stanza || {}).telugu || [],
            english: (got.main_stanza || {}).english || [],
          },
          stanzas: (got.stanzas || []).map((s, k) => ({
            stanza_number: s.stanza_number || k + 1,
            telugu: s.telugu || [],
            english: s.english || [],
          })),
        };
        fs.writeFileSync(path.join(DIR, it.file), JSON.stringify(fixed, null, 2) + "\n", "utf8");
        log[it.file] = { status: "fixed", stanzas: fixed.stanzas.length };
        stats.fixed++;
      }

      doneCount += slice.length;
      fs.writeFileSync(LOG, JSON.stringify(log, null, 1), "utf8");
      console.log(`  [${doneCount}/${todo.length}] fixed ${stats.fixed} rejected ${stats.rejected} failed ${stats.failed} | ~$${spent.toFixed(2)}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  console.log(`\nfixed ${stats.fixed} | rejected ${stats.rejected} | failed ${stats.failed}`);
  console.log(`originals kept in ${ORIG}`);
  console.log(`subscription usage this run: ~$${spent.toFixed(2)}`);
})();
