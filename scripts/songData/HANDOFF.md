# Handoff — resume the Telugu song repair job

Paste the prompt at the bottom into Claude Code on the new machine.

## What must be present first

Both of these have to be copied over — `scripts/` is **untracked in git**, so cloning
the repo will not bring it:

```
grey-gratis-ice/
  scripts/                     harvest-waytochurch.js, build-app-json.js,
                               prep-song-files.js, fix-prepared.js,
                               match-catalogue.js, report-english.js, import-songs.js
  songData/prepared/           2,880 song JSON files (the work)
  songData/prepared-original/  untouched backups of every repaired file
  songData/fix-log.json        progress ledger — this is what makes it resumable
```

`songData/raw/` (176 MB of cached HTML) is **not** needed to resume. It is only for
regenerating `prepared/` from the crawl.

Claude Code must be installed and logged into the same Anthropic account.
`ANTHROPIC_API_KEY` must be **unset** — if it is set, Claude Code bills at API rates
instead of drawing on the Max subscription, and the script refuses to start.

---

## The prompt

> I'm resuming a paused job that reformats Telugu Christian worship songs for
> projection. Everything needed is already on disk under `grey-gratis-ice/`.
>
> **State:** `songData/prepared/` holds 2,880 song JSON files, each one exactly the
> body that `POST /songs` accepts on our API. **1,240 are already repaired**
> (1,236 fixed, 4 rejected); **1,640 remain**. `songData/fix-log.json` records which
> are done — the script reads it and skips them, so nothing is redone.
>
> **What the repair does:** sends each song's Telugu to Claude via `claude -p` and
> gets back the pallavi separated from numbered charanams, lines broken to
> projector size, and an English transliteration generated for every line in
> readable Title Case (e.g. `Aahaa Mahaathma Haa Sharanya`). Author fields are
> never model-generated — they are carried through untouched.
>
> **Run this:**
> ```bash
> cd grey-gratis-ice
> unset ANTHROPIC_API_KEY
> nohup node scripts/fix-prepared.js --batch 18 --concurrency 12 > /tmp/fix.log 2>&1 < /dev/null &
> disown
> ```
> This machine has more RAM than the last one, so try raising `--concurrency`.
> Measured behaviour: 12 workers used only ~0.9 GB total, so RAM is not the binding
> constraint — plan throttling is (see below). Raise it gradually and watch
> throughput rather than assuming more workers means more speed.
>
> **Report progress to me every 50 songs completed.** Poll
> `songData/fix-log.json` (its length is the processed count) and report: fixed,
> rejected, failed, measured seconds/song, and cumulative usage from the `~$` figure
> in the log. Don't report on every batch — with 12 workers a batch lands every few
> seconds.
>
> **Five things learned the hard way — please carry them forward:**
>
> 1. **Killing the parent does not kill the workers.** `pkill -f fix-prepared`
>    leaves the `claude` children running and eating memory. At one point that left
>    44 live workers when 16 were configured, which drove swap to 9.9 GB. Always:
>    ```bash
>    pkill -f "fix-prepared"; pkill -f "claude -p You are formatting Telugu"
>    ```
>    Match on the prompt text so the interactive Claude Code session is never hit.
>
> 2. **The plan throttles rather than hard-failing.** After roughly $90–120 of usage
>    in a 5-hour window, throughput degraded ~3.5x (9 s/song to 32 s/song) with *no*
>    rate-limit errors — small requests stayed fast while large ones crawled. So
>    judge health by **measured seconds/song**, not by the script's rate-limit pause
>    counter, which only catches hard errors. This is account-wide and follows you to
>    any machine.
>
> 3. **Batches take a long time to land, and that is not a stall.** At batch 18 the
>    first results took ~23 minutes and all workers sat at an identical age until
>    then. I nearly killed a healthy run at the 17-minute mark. Give it ~25 minutes
>    before concluding anything is wrong.
>
> 4. **The content guard is load-bearing — do not loosen it.** After each repair the
>    Telugu character multiset is compared before/after. Excess characters (invented
>    lyrics) are rejected at 3% tolerance; missing characters are allowed up to 45%
>    because consolidating repeated refrains legitimately removes text. It has
>    already caught three songs where the model wrote 80–116 characters of Telugu
>    that were not in the source. These are worship lyrics — a plausible-looking
>    invention is far worse than a badly formatted original. Rejected files keep
>    their original content and are listed in `fix-log.json` with a reason.
>
> 5. **Source text has genuine corruption** (`ణీ` where `నీ` belongs, a stray Latin
>    `Y` in `Yఎసయ్య`). The prompt deliberately tells the model **not** to correct
>    spelling, so these pass through. Leave that unless the owner asks otherwise —
>    relaxing it weakens the guard in (4).
>
> **When the run finishes**, tell me and stop. Do **not** import anything into the
> live library — that is a separate, reviewed step using `scripts/import-songs.js`,
> and it writes to production.

---

## Context, if you need it

The songs come from a crawl of waytochurch.com (4,748 Telugu songs indexed, all
cached). `scripts/match-catalogue.js` compared them against the live library and
found 2,885 not already present; those became the 2,880 prepared files. Matching is
done on **Telugu script**, never on titles — transliteration varies too much between
sources — with folding for aspirated/unaspirated consonants and nasal-conjunct vs
anusvara spellings.

Roughly 60% of the source pages arrive with no stanza structure and no line breaks
at all, which is why this repair step exists. About 18% have no transliteration and
it must be generated.

Remaining after this job: review, then a staged import using `import-songs.js`,
which does its own Telugu dedup against the live library and writes a rollback
manifest (`POST /songs` hardcodes `created_by: "System"`, so the manifest is the only
way to identify an import afterwards).
