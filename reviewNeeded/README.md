# reviewNeeded

Songs that are **not** in the live library and still need a person to decide what
happens to them. Everything that *is* in the library was deleted from the local
corpora — the library is the source of truth now, and a local copy of an imported
song is just a stale duplicate.

Sorted on 2026-08-06 against a 4,450-song library by
[`scripts/reorganize-corpora.js`](../scripts/reorganize-corpora.js).

| folder | songs | what they are |
|---|---:|---|
| `waytochurch/` | 932 | 137 in the review queue, 795 prepared but never imported or triaged |
| `christianstack/` | 236 | duplicates, title collisions, and borderline calls from the import audit |
| `christianlyricz/` | 48 | parsed from the slide decks, never imported |

`MANIFEST.json` records every file that moved, where it came from, and why.

## Matching

A song counts as "in the library" when its Telugu **skeleton** — Telugu
codepoints only, with aspirated/unaspirated pairs, the three sibilants, anusvara
vs conjunct nasal, and all dependent vowel signs folded away — appears inside a
library song's skeleton. Titles are never used: each of the three sources
romanises differently, so `Nyayaadipathi` and `Nyaayaadhipathi` are the same song
and title matching would miss it.

This is why more christianstack files were deleted (860) than were ever imported
from christianstack (448): a christianstack song whose lyrics already exist as a
waytochurch row **is** in the library, just under another source tag.

## Working through them

The review server has 591 of these plus the in-library songs that need a decision:

```bash
cd song-review && npm run build:refresh && npm start   # localhost:4000
```

Each song page shows what looks wrong, the original source page, and a comment
box. `GET /export` returns the decisions.

## Recovering something

Every deletion is a tracked file in git:

```bash
git checkout -- visualParsed/            # or any path
git status                               # see everything that was removed
```

## Also dropped

`scripts/songData/raw/` (4,743 raw HTML scrapes, 167 MB) and
`scripts/songData/prepared-original/` (1,236 pre-repair backups). Both are
intermediates, reproducible by re-running the harvesters, and both are in git.
That took `scripts/` from 222 MB to 29 MB.
