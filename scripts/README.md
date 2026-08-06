# scripts

Roughly in the order a song travels: harvest → build → verify → import →
sanitise. Everything that writes to the live library says so.

## Writes to the live library

| script | |
|---|---|
| `import-songs.js` | import waytochurch payloads. Telugu-skeleton dedup client-side, manifest for rollback |
| `import-christianstack.js` | import christianstack, one audited batch at a time |
| `apply-sanitization.js` | apply a repair patch via `PUT /songs/:id`. Rejects any patch that invents text unless `--provenance-checked` |
| `reorganize-corpora.js` | sort the local corpora against the library: delete what is imported, move the rest to `reviewNeeded/` |

Every one of these takes `--dry-run`. Use it.

## Harvest and build

| script | |
|---|---|
| `harvest-waytochurch.js` | scrape waytochurch |
| `harvest-christianstack.js` | scrape christianstack. Blocks ad hosts at the network layer **and** strips the injected nodes — AdSense injects a related-links block *inside* `div.telugu2` that reads like a verse. Keep both guards |
| `probe-christianstack.js` | check the site's shape before a full harvest |
| `build-app-json.js` | waytochurch scrapes → `POST /songs` payloads |
| `build-christianstack-json.js` | christianstack scrapes → payloads |
| `prep-song-files.js` | split a built payload set into one file per song |

## Check and report

| script | |
|---|---|
| `verify-christianstack.js` | must report **0 invented characters** before an import |
| `match-catalogue.js` | match a corpus against the library on Telugu skeletons |
| `report-english.js` | romanisation coverage |
| `author-lookup.js` | fill author fields |
| `fix-prepared.js` | repair prepared payloads before import |
| `import-visual-parsed.js` | the christianlyricz / slide-deck import |

## songData/

waytochurch working data, not scripts. `app-songs.json` + `.meta.json` are the
built payloads; `index.json` is the site listing; `missing*.json` are the
not-yet-harvested ids; `prepared/` is one file per song.

`raw/` (167 MB of HTML) and `prepared-original/` were dropped on 2026-08-06 —
intermediates, reproducible from the harvesters, still in git.

## Things that will bite you

- **Re-audit before every import.** The library grew 2,819 → 4,002 → 4,450 in two
  days. Fifty songs that scored unique against 2,819 were duplicates against 4,002.
- **Match on Telugu, never on titles.** Each source romanises differently.
  `POST /songs` rejects on title similarity ≥ 0.8, which both misses real
  duplicates and blocks genuinely new songs whose titles collide.
- **A repeated line is usually a real sung repeat**, not a scraping slip.
- **ZWNJ (U+200C) is meaningful in Telugu** — normalise NBSP and ZWSP, leave ZWNJ.
- **A long `main_stanza` is usually fine** — a legitimate pallavi + anupallavi.
