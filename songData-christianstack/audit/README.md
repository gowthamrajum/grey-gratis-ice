# christianstack duplicate audit

`app-songs.json` (1,096 prepared payloads) vs the live DB at
`https://grey-gratis-ice.onrender.com/songs`.

**Audited against a 4,002-song library (2026-08-05, after the visualParsed import).**
An earlier pass ran against 2,819 songs and is superseded — re-audit before
importing if the library has grown again, because 50 songs that pass as unique
at 2,819 are duplicates at 4,002.

## Result

| Tier | Count | Meaning |
|---|---:|---|
| **A — certain duplicate** | **337** | Lyrics match a live song almost verbatim |
| **B — likely duplicate** | **84** | Same song, transcription/line-split differs |
| **C — title collision** | **95** | Distinct new song that shares a live song's title |
| **C — needs review** | **111** | Borderline; a human has to decide |
| **D — unique** | **469** | Genuinely new |

**421 of 1,096 (38.4%) are duplicates.** 564 are new, 111 need a decision.

## Import batches

`batches/` splits the 564 new songs by how much friction they hit going in:

| batch | count | status |
|---|---:|---|
| `batch-1-frictionless.json` | 456 | **IMPORTED** — 448 posted, 8 caught as dupes by the skeleton check |
| `batch-2-internal-title-collision.json` | 13 | held — collides with another batch song |
| `batch-3-live-title-collision.json` | 95 | held — collides with a live title, 409s as-is |

Batch 1 ran 2026-08-05: **448 posted, 0 failures, 0 conflicts**, song_ids
4013–4460, all verified live with intact Telugu and tagged `source:
christianstack`. Library went 4,002 → 4,450.

Run with [`scripts/import-christianstack.js`](../../scripts/import-christianstack.js):

```
node scripts/import-christianstack.js --dry-run    # batch 1, no writes
node scripts/import-christianstack.js              # import batch 1
node scripts/import-christianstack.js --batch batch-3-live-title-collision.json
```

The importer re-runs a Telugu **skeleton** dedup against a freshly fetched
library on every run, independent of this audit. On batch 1 it caught 8 more
duplicates the audit's Dice metric missed — songs whose opening lines are
identical but whose lengths differ enough to drag the score down
(`Krupa Kaligina Vaada`, `Shalemu Raja`, `Adviteeyuda`, …). Treat that check as
the real gate; treat this audit as what makes the run small enough to review.
Actual batch-1 yield: **448**.

`imported.json` records every `{app_index → song_id}` pair — `POST /songs`
hard-codes `created_by: "System"`, so that manifest is the only rollback list.

## Two problems with the server's dedup rule

`POST /songs` rejects a song when
`stringSimilarity.compareTwoStrings(new_name, existing_name) >= 0.8`
([server.js:662-671](../../server.js#L662-L671)) — a **title-only** check. Against this data it is
wrong in both directions:

**273 duplicates slip through** (`missed-by-409-rule.json`) — same song, title
too different to trip 0.8:

| app song | title score | lyric sim | duplicates |
|---|---:|---:|---|
| Ninu Matrame Ne Nammanaya | 0.61 | 1.00 | #2025 Ninu maathrame ne nammaanayaa |
| Needu Premaku | 0.72 | 0.97 | #162 Needu Premaku Haddu Ledayaa |
| Nuvvivakuntey Na Yesayya | 0.64 | 0.94 | #2125 Nuvivvakunte edhi ledhayya |
| Nee Vaakyame Nannu | 0.68 | 0.91 | #1039 Nee Vaakyame Nannu Brathikinchenu |

**95 genuinely new songs get blocked** (`blocked-but-new.json`) — different song,
title too similar:

| app song | title score | lyric sim | blocked by |
|---|---:|---:|---|
| Siluvalo Nee Prema | 1.00 | 0.19 | #492 Siluvalo Nee Prema |
| Ninne Preminthunu | 1.00 | 0.23 | #164 Ninne Preminthunu |
| Nee Chethi Kaaryamu | 0.94 | 0.21 | #395 Nee Chethi Kaaryamulu |
| Parisuddhudu Parisuddhudu | 0.88 | 0.21 | #142 Parishuddhudu Parishuddhudu |

Romanized Telugu titles are the worst possible key here: `Nyayaadipathi` /
`Nyaayaadhipathi` and `Jalari` / `Jaalari` are the same word, while two unrelated
songs both legitimately open `Siluvalo Nee Prema`. Gating on the Telugu
`main_stanza` — as `import-christianstack.js` and `import-songs.js` both already
do client-side — fixes both directions.

**The 108 blocked songs were deliberately NOT imported** — they keep their
original titles. `proposed-renames.json` holds verified disambiguated titles if
that changes, but it is **not applied**, and nothing in batches 2 or 3 has been
pushed.

Note that the library's own `Varamu` / `Varamu 2` convention cannot be used here:
a numeric suffix scores 0.91–0.97 against the base title, so the check still
rejects it. Those existing pairs predate the rule or were written another way.
Only a longer qualifier (a lyric phrase or an author, as in the 25 existing
`Title (phrase)` entries) gets under 0.8.

The real fix is [server.js:662-671](../../server.js#L662-L671) — gate on the
Telugu `main_stanza` instead of `song_name`. That admits all 108 under their real
titles *and* closes the 273 duplicates the current rule lets through.

## Also found

- **95 internal collisions inside `app-songs.json`** (`internal-duplicates.json`)
  — 12 are the same song scraped twice (`Ninu Matrame Ne Nammanaya` appears 3×);
  the other 83 are different songs whose titles collide.
- **Live DB bug:** song **#1654** *"Manovichaaramu Koodadu Neeku - Mahima
  Thalampule Kaavalenu"* has **68 stanzas** and is 5,327 chars — 13× the median.
  Two songs got merged into one row.

## Files

| file | contents |
|---|---|
| `duplicate-audit.csv` | all 1,096 songs scored, with closest live match |
| `batches/` | the three import batches |
| `duplicates-to-drop.json` | 421 tier A+B duplicates |
| `import-clean.json` | 564 songs that are new |
| `needs-review.json` | 111 borderline cases |
| `blocked-but-new.json` | 95 new songs the 409 rule rejects |
| `proposed-renames.json` | verified disambiguated titles for those |
| `missed-by-409-rule.json` | 273 duplicates the 409 rule lets through |
| `internal-duplicates.json` | 95 collisions inside `app-songs.json` |
| `imported.json` | `{app_index → song_id}` manifest / rollback list |
| `audit.py` | rerunnable scorer |

## Method

Telugu script only (romanized English as fallback), three signals:

- `title_score` — exact port of the server's `compareTwoStrings` (whitespace-stripped,
  case-sensitive bigram Dice), so it predicts 409s precisely.
- `c3` — character-3gram Dice over the whole lyric blob. Survives the sandhi and
  line-splitting differences between the two sources
  (`పరిశుద్ధుల కందులో` vs `పరిశుద్ధులకందులో`).
- `wd` — word-multiset Dice. Stricter; guards against coincidental 3-gram overlap
  in short repetitive songs.

Tier A requires `c3 >= 0.75` **and** `wd >= 0.65` — both signals must agree, so
either one failing alone drops the song to review rather than into a verdict.
Containment is only counted when the live song is ≤ 2.5× longer, otherwise
oversized merged rows like #1654 match everything.

Candidates come from a Telugu-word inverted index over the live DB, not just
title neighbours, so a duplicate under a completely different title is still found
(`Enni Kastalaina` → #767 `Devaa Ee Jeevitham` shares no title words at all).

Sampled and hand-checked against both sources: tier A 5/5 correct, tier B 5/5, the
8 highest-scoring tier D songs all genuinely distinct. Tier C is mixed by design —
roughly a third of the review bucket turned out to be real duplicates, mostly app
entries that captured only part of a song.

**Known gap:** the Dice metrics miss duplicates where one side is much shorter
than the other. The importer's skeleton-containment check covers that case, which
is why it runs as a second gate rather than as a cross-check.
