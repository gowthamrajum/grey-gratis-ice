#!/usr/bin/env python3
"""FINAL duplicate audit.

  app  : grey-gratis-ice/songData-christianstack/app-songs.json      (1096 songs)
  live : https://grey-gratis-ice.onrender.com/songs                  (2819 songs)

Signals (Telugu script only; english romanization used as fallback):
  title  - EXACT port of server.js POST /songs conflict rule
           string-similarity compareTwoStrings >= 0.8  =>  HTTP 409
  c3     - char-3gram Dice over the full lyric blob   (spacing/sandhi robust)
  wd     - word-multiset Dice over the full lyric blob (stricter, catches
           coincidental 3gram overlap in short repetitive songs)
  cov    - char-3gram containment |A n B| / |A|, ONLY counted when the live song
           is <= 2.5x the app song, so oversized merged live entries
           (e.g. #1654, 68 stanzas, 13x median) cannot swallow everything.

Tiers: c3 and wd must agree for a high-confidence call; disagreement -> review.
"""
import csv, json, re, sys
from collections import Counter, defaultdict

SCR = "/private/tmp/claude-501/-Users-gowthamrajumurududdi-tcc-presentations/24ab84f8-eadf-4821-8ead-7a478ae314a8/scratchpad"
LIVE = f"{SCR}/live-songs.json"
APP = "/Users/gowthamrajumurududdi/tcc-presentations/grey-gratis-ice/songData-christianstack/app-songs.json"
WS, NOT_TE, NOT_EN = re.compile(r"\s+"), re.compile(r"[^ఀ-౿]+"), re.compile(r"[^a-z]+")


def tbg(s):
    s = WS.sub("", s)
    return len(s), Counter(s[i:i + 2] for i in range(len(s) - 1))


def tdice(la, ba, lb, bb):
    return 2.0 * sum((ba & bb).values()) / (la + lb - 2) if la >= 2 and lb >= 2 else 0.0


def feats(song):
    te, en = [], []
    for b in [song.get("main_stanza") or {}] + list(song.get("stanzas") or []):
        if isinstance(b, dict):
            te.extend(str(x) for x in (b.get("telugu") or []))
            en.extend(str(x) for x in (b.get("english") or []))
    t = NOT_TE.sub(" ", " ".join(te))
    mode = "te" if len(t.replace(" ", "")) >= 40 else "en"
    if mode == "en":
        t = NOT_EN.sub(" ", " ".join(en).lower())
    wl = [w for w in t.split() if len(w) >= 3]
    f = t.replace(" ", "")
    g = Counter(f[i:i + 3] for i in range(len(f) - 2))
    return {"g": g, "gn": max(len(f) - 2, 0), "w": Counter(wl), "wn": len(wl),
            "ws": set(wl), "mode": mode, "chars": len(f)}


def cmp(a, b):
    gi = sum((a["g"] & b["g"]).values())
    c3 = 2.0 * gi / (a["gn"] + b["gn"]) if a["gn"] and b["gn"] else 0.0
    cov = gi / a["gn"] if (a["gn"] and b["gn"] <= 2.5 * a["gn"]) else 0.0
    wi = sum((a["w"] & b["w"]).values())
    wd = 2.0 * wi / (a["wn"] + b["wn"]) if a["wn"] and b["wn"] else 0.0
    return c3, wd, cov


live, app = json.load(open(LIVE)), json.load(open(APP))
live_t = [tbg(s.get("song_name") or "") for s in live]
live_f = [feats(s) for s in live]
widx = defaultdict(list)
for i, f in enumerate(live_f):
    for w in f["ws"]:
        widx[w].append(i)
common = {w for w, v in widx.items() if len(v) > 250}

out = []
for ai, a in enumerate(app):
    name = a.get("song_name") or ""
    la, ba = tbg(name)
    lo, hi = (la + 2) / 3.0, 3.0 * la - 2
    rt = sorted(((d, i) for i, (lb, bb) in enumerate(live_t)
                 if lo <= lb <= hi and (d := tdice(la, ba, lb, bb)) >= 0.5), reverse=True)

    af = feats(a)
    cnd = Counter()
    for w in af["ws"] - common:
        for i in widx.get(w, ()):
            cnd[i] += 1
    cset = {i for i, _ in cnd.most_common(120)} | {i for _, i in rt[:20]}
    rl = []
    for i in cset:
        if live_f[i]["mode"] != af["mode"]:
            continue
        c3, wd, cov = cmp(af, live_f[i])
        rl.append((max(c3, wd, cov * 0.9), c3, wd, cov, i))
    rl.sort(reverse=True)

    bt = rt[0] if rt else (0.0, -1)
    best = rl[0] if rl else (0.0, 0.0, 0.0, 0.0, -1)
    # if the title match is also a decent lyric match, judge on that pair
    if bt[1] >= 0 and live_f[bt[1]]["mode"] == af["mode"]:
        tc3, twd, tcov = cmp(af, live_f[bt[1]])
        if max(tc3, twd) >= 0.55:
            best = (max(tc3, twd), tc3, twd, tcov, bt[1])
    else:
        tc3 = twd = tcov = 0.0

    t, c3, wd, cov, mi = bt[0], best[1], best[2], best[3], best[4]
    strong = c3 >= 0.75 and wd >= 0.65
    likely = (c3 >= 0.55 and wd >= 0.45) or (cov >= 0.85 and af["chars"] >= 120)
    weak = c3 >= 0.42 or cov >= 0.7

    if strong and t >= 0.8:
        v = "A-confirmed-dup"
    elif strong:
        v = "A-lyric-dup"
    elif likely and t >= 0.8:
        v = "B-likely-dup"
    elif likely:
        v = "B-likely-lyric-dup"
    elif t >= 0.8:
        v = "C-title-collision"
    elif weak or t >= 0.7:
        v = "C-review"
    else:
        v = "D-unique"

    out.append({
        "app_index": ai, "app_song_name": name, "verdict": v,
        "app_author": (a.get("author") or {}).get("Authored by", ""),
        "app_chars": af["chars"],
        "title_score": round(t, 3),
        "title_match_id": live[bt[1]]["song_id"] if bt[1] >= 0 else "",
        "title_match_name": live[bt[1]]["song_name"] if bt[1] >= 0 else "",
        "c3": round(c3, 3), "wd": round(wd, 3), "cov": round(cov, 3),
        "match_id": live[mi]["song_id"] if mi >= 0 else "",
        "match_name": live[mi]["song_name"] if mi >= 0 else "",
        "match_chars": live_f[mi]["chars"] if mi >= 0 else "",
        "match_title_score": round(tdice(la, ba, *live_t[mi]) if mi >= 0 else 0.0, 3),
    })
    if ai % 200 == 0:
        print(f"  ...{ai}", file=sys.stderr)

# internal duplicates within app-songs.json
app_f, app_t = [feats(a) for a in app], [tbg(a.get("song_name") or "") for a in app]
internal = []
for i in range(len(app)):
    for j in range(i):
        t = tdice(*app_t[i], *app_t[j])
        c3, wd, _ = cmp(app_f[i], app_f[j])
        if t >= 0.8 or (c3 >= 0.75 and wd >= 0.65):
            internal.append({"dup_index": i, "dup_name": app[i]["song_name"],
                             "first_index": j, "first_name": app[j]["song_name"],
                             "title": round(t, 3), "c3": round(c3, 3), "wd": round(wd, 3),
                             "same_song": c3 >= 0.75})
            break

json.dump(out, open(f"{SCR}/final-scores.json", "w"), ensure_ascii=False, indent=1)
json.dump(internal, open(f"{SCR}/final-internal.json", "w"), ensure_ascii=False, indent=1)
with open(f"{SCR}/duplicate-audit.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
    w.writeheader(); w.writerows(out)

c = Counter(r["verdict"] for r in out)
ks = ["A-confirmed-dup", "A-lyric-dup", "B-likely-dup", "B-likely-lyric-dup",
      "C-title-collision", "C-review", "D-unique"]
print(f"\napp={len(app)}  live={len(live)}")
for k in ks:
    print(f"  {k:20s} {c[k]:4d}")
A = c["A-confirmed-dup"] + c["A-lyric-dup"]
B = c["B-likely-dup"] + c["B-likely-lyric-dup"]
print(f"\n  Tier A (certain dupes)  {A}")
print(f"  Tier B (likely dupes)   {B}   -> A+B = {A+B} ({(A+B)/len(app)*100:.1f}%)")
print(f"  server would 409        {sum(1 for r in out if r['title_score'] >= 0.8)}")
print(f"  A+B dupes 409 MISSES    {c['A-lyric-dup'] + c['B-likely-lyric-dup']}")
print(f"  409 blocks non-dupes    {c['C-title-collision']}")
print(f"  internal dupes in file  {len(internal)}  (same-song {sum(1 for x in internal if x['same_song'])})")
