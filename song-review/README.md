# Song review server

Every song from **visualParsed**, **waytochurch** and **christianstack** that is
*not* in the live library, plus the songs already in it that the sanitiser could
not decide on its own. Open one, see what looks wrong, compare it against its
original source page, and record how it should be fixed.

**591 songs** in the queue as built, in two halves.

Never imported — these do not affect anything until you decide:

| group | count | why |
|---|---:|---|
| christianstack | 236 | duplicates, title collisions, or borderline |
| waytochurch | 220 | harvested but never imported |
| visualParsed | 48 | parsed from the slide decks but never imported |

**Already in the library** — these project to a congregation today, so they
matter more. Filter to them with the *Already in the library* button:

| group | count | why |
|---|---:|---|
| Duplicate of another library song | 43 | same lyrics as another row; pick which copy to keep |
| Lyrics incomplete — needs the published song | 25 | damaged or truncated, unfixable from the record |
| A fix was worked out but held back | 10 | a repair exists but confidence was too low to apply |
| Filed under another song's title | 4 | proven: identical lyrics, unrelated titles |
| in library — undecided | 4 | the structural pass could not settle them |
| No lyrics in this record | 1 | #1901 is a YouTube description, not a song |

471 of the 591 resolve to their original source page. Duplicate rows show **both
copies side by side**, so the call can be made without leaving the page.

## Run it

```bash
cd song-review
npm install
npm run build          # writes data/review-queue.json
npm start              # http://localhost:4000
```

`npm run build:refresh` re-fetches the live library first. **Do that before any
review session** — the library grows, and a song that is missing today may have
been imported since. The build matches on normalised Telugu text, not titles, so
transliteration drift does not produce phantom "missing" songs.

The server reads only `data/review-queue.json`, so it deploys without the rest of
the repo.

## Hosting

| variable | effect |
|---|---|
| `PORT` | listen port (default 4000; binds `0.0.0.0`) |
| `TURSO_DATABASE_URL` | persist decisions to libSQL instead of a local file |
| `TURSO_AUTH_TOKEN` | token for the above |
| `REVIEW_TOKEN` | require `?k=<token>` on every request |
| `SONGS_API` | library to build against (default the live one) |

Two things to get right before this is reachable from the internet:

- **Set `REVIEW_TOKEN`.** There is no login. Without a token, anyone who can
  reach the URL can read and overwrite decisions.
- **Set the Turso variables.** Without them decisions go to
  `data/decisions.json`, and most hosts wipe the filesystem on redeploy. The
  table (`song_reviews`) is created on boot. If you do run file-backed, pull
  `/export` before you redeploy.

Deploying alongside the main app on Render: same repo, root directory
`song-review`, build `npm install && npm run build`, start `npm start`, and reuse
the existing `TURSO_*` values.

## Using it

The list filters by source, severity and undecided-only, and remembers your
filters. Each row shows why the song is in the queue and what was detected.

A song page shows five things: **what looks wrong** (each issue in plain
language), the **proposed fix** where the sanitiser had one but held it back,
what is **stored now**, the raw **JSON** record behind the page (collapsed, with
a copy button), and the **source** — the live page in a frame plus the
scraped text beside it, because christianstack and waytochurch may refuse to be
embedded and the frame will sit blank.

Decisions: import as-is · import after the fix I describe · apply the proposed
fix · rename then import · duplicate, leave out · keep THIS copy · keep the
OTHER copy · wrong title, retitle · source is broken, re-harvest · not a song,
discard · undecided. The comment box is where the actual instruction
goes — the decision is just the bucket.

## What's wrong with each song

`/analysis` diagnoses every song in `reviewNeeded/` and streams the results in
live over server-sent events — one event per song, so the page fills as the run
proceeds rather than after it. The last completed run is shown immediately on
load; **Re-run analysis** starts a fresh one.

Each song gets one verdict, which is the thing you act on:

| verdict | | count |
|---|---|---:|
| **ready** | nothing wrong — import it | 376 |
| **fixable** | defects repairable from the record alone | 510 |
| **title-blocked** | good song; `POST /songs` refuses it because the title is ≥0.8 similar to a *different* song | 197 |
| **duplicate** | already in the library, or a second copy inside `reviewNeeded/` | 112 |
| **needs-source** | truncated or missing romanisation — needs the published lyrics | 18 |
| **not-a-song** | no Telugu at all | 3 |

Click a tile to filter. `GET /api/analysis` returns the last run as JSON.

Run it headless with `node song-review/analyze.js`, which writes
`data/analysis.json`.

## Getting the decisions back out

`GET /export` returns every decision as JSON, keyed by item id with the song id
where one exists. That is the file to drive the follow-up import or repair pass.

## Endpoints

| route | |
|---|---|
| `GET /` | the UI |
| `GET /api/queue` | list, with decision status |
| `GET /api/item/:id` | one song: lyrics, issues, source, any saved review |
| `POST /api/item/:id` | save `{decision, comment, reviewer}` |
| `GET /api/item/:id/raw` | the same record, indented 2 spaces, Telugu unescaped |
| `GET /api/queue/raw` | the whole queue, untrimmed and indented |
| `GET /analysis` | live diagnosis of everything in reviewNeeded/ |
| `GET /api/analysis` | last completed analysis run |
| `GET /api/analysis/stream` | SSE: one event per song, live |
| `GET /export` | all decisions |
| `GET /healthz` | item count and which store is active |

## What the issue labels mean

| label | |
|---|---|
| `no-telugu` | no Telugu lyrics at all — may not be a song |
| `one-block` | whole song in one block, no verses separated |
| `long-chorus` | 9+ line chorus; often a legitimate pallavi + anupallavi, sometimes swallowed verses |
| `no-chorus` | everything is in the verses |
| `misaligned` | Telugu and roman line counts differ, so the app pairs the wrong lines |
| `citation` | a scripture reference scraped in as a lyric |
| `junk` | page furniture, credits, a URL or an emoji blurb in the lyrics |
| `wrong-script` | the Telugu field holds no Telugu — fields may be swapped |
| `repeat` | a line written twice; **usually a genuine sung repeat**, confirm before removing |
