#!/usr/bin/env python3
"""Validates app/src/main/assets/games.json and catalogue_games.json. Exit 1 on any error."""
import json, os, sys, unicodedata
from collections import deque

PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "app/src/main/assets/games.json")
errors, warns = [], []

# Code points first added in Unicode 12.0 or later (emoji that will not render on Android 10 here).
NEWER = [(0x1F6D5, 0x1F6DF), (0x1F6FA, 0x1F6FF), (0x1F7E0, 0x1F7FF), (0x1F90C, 0x1F90F),
         (0x1F93F, 0x1F93F), (0x1F971, 0x1F972), (0x1F977, 0x1F979), (0x1F97B, 0x1F97B),
         (0x1F9A3, 0x1F9AF), (0x1F9BA, 0x1F9BF), (0x1F9C3, 0x1F9CF), (0x1FA70, 0x1FAFF),
         (0x1FB00, 0x1FBFF)]
# BMP emoji that show as emoji without FE0F (Emoji_Presentation=Yes).
EP_BMP = set()
for a, b in [(0x231A, 0x231B), (0x23E9, 0x23EC), (0x23F0, 0x23F0), (0x23F3, 0x23F3), (0x25FD, 0x25FE),
             (0x2614, 0x2615), (0x2648, 0x2653), (0x267F, 0x267F), (0x2693, 0x2693), (0x26A1, 0x26A1),
             (0x26AA, 0x26AB), (0x26BD, 0x26BE), (0x26C4, 0x26C5), (0x26CE, 0x26CE), (0x26D4, 0x26D4),
             (0x26EA, 0x26EA), (0x26F2, 0x26F3), (0x26F5, 0x26F5), (0x26FA, 0x26FA), (0x26FD, 0x26FD),
             (0x2705, 0x2705), (0x270A, 0x270B), (0x2728, 0x2728), (0x274C, 0x274C), (0x274E, 0x274E),
             (0x2753, 0x2755), (0x2757, 0x2757), (0x2795, 0x2797), (0x27B0, 0x27B0), (0x27BF, 0x27BF),
             (0x2B1B, 0x2B1C), (0x2B50, 0x2B50), (0x2B55, 0x2B55)]:
    EP_BMP.update(range(a, b + 1))
# Supplementary-plane emoji that default to text style and need FE0F.
TEXT_DEFAULT_SMP = {0x1F321, 0x1F324, 0x1F325, 0x1F326, 0x1F327, 0x1F328, 0x1F329, 0x1F32A, 0x1F32B,
                    0x1F32C, 0x1F336, 0x1F37D, 0x1F396, 0x1F397, 0x1F399, 0x1F39A, 0x1F39B, 0x1F39E,
                    0x1F39F, 0x1F3CB, 0x1F3CC, 0x1F3CD, 0x1F3CE, 0x1F3D4, 0x1F3D5, 0x1F3D6, 0x1F3D7,
                    0x1F3D8, 0x1F3D9, 0x1F3DA, 0x1F3DB, 0x1F3DC, 0x1F3DD, 0x1F3DE, 0x1F3DF, 0x1F3F3,
                    0x1F3F5, 0x1F3F7, 0x1F43F, 0x1F441, 0x1F4FD, 0x1F549, 0x1F54A, 0x1F56F, 0x1F570,
                    0x1F573, 0x1F574, 0x1F575, 0x1F576, 0x1F577, 0x1F578, 0x1F579, 0x1F587, 0x1F58A,
                    0x1F58B, 0x1F58C, 0x1F58D, 0x1F590, 0x1F5A5, 0x1F5A8, 0x1F5B1, 0x1F5B2, 0x1F5BC,
                    0x1F5C2, 0x1F5C3, 0x1F5C4, 0x1F5D1, 0x1F5D2, 0x1F5D3, 0x1F5DC, 0x1F5DD, 0x1F5DE,
                    0x1F5E1, 0x1F5E3, 0x1F5E8, 0x1F5EF, 0x1F5F3, 0x1F5FA, 0x1F6CB, 0x1F6CD, 0x1F6CE,
                    0x1F6CF, 0x1F6E0, 0x1F6E1, 0x1F6E2, 0x1F6E3, 0x1F6E4, 0x1F6E5, 0x1F6E9, 0x1F6F0,
                    0x1F6F3}


def check_text(where, s):
    cps = [ord(c) for c in s]
    for i, cp in enumerate(cps):
        nxt = cps[i + 1] if i + 1 < len(cps) else None
        if cp == 0x200D:
            errors.append(f"{where}: ZWJ sequence in {s!r}")
        if 0x1F3FB <= cp <= 0x1F3FF:
            errors.append(f"{where}: skin-tone modifier in {s!r}")
        if 0x1F1E6 <= cp <= 0x1F1FF:
            errors.append(f"{where}: flag in {s!r}")
        if any(a <= cp <= b for a, b in NEWER):
            errors.append(f"{where}: emoji newer than Unicode 11: {chr(cp)} U+{cp:X}")
        if cp >= 0x1F000:
            try:
                unicodedata.name(chr(cp))
            except ValueError:
                errors.append(f"{where}: unassigned code point U+{cp:X}")
            if cp in TEXT_DEFAULT_SMP and nxt != 0xFE0F:
                errors.append(f"{where}: {chr(cp)} needs U+FE0F")
        elif 0x2190 <= cp <= 0x2BFF and cp not in EP_BMP and nxt != 0xFE0F:
            errors.append(f"{where}: {chr(cp)} U+{cp:X} needs U+FE0F to show as emoji")


def walk_strings(where, obj):
    if isinstance(obj, str):
        check_text(where, obj)
    elif isinstance(obj, list):
        for x in obj:
            walk_strings(where, x)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            walk_strings(f"{where}.{k}", v)


def words(s):
    return len(s.split())


import re
SINGLE = re.compile(r"(?<![\w'’])([A-Za-z])(?![\w'’])")
BAD_SOUNDS = re.compile(r"\b(fff+|lll+|hhh+|nnn+|vvv+|rrr+|zzz+)\b", re.I)
LOCAL_WORDS = re.compile(r"\b(Ajji|Thatha|Amma|Appa|Bangalore|Lalbagh|sambar|payasa|mosaru|Dasara|chutney|palya|"
                         r"filter coffee|coffee|jasmine|Bannerghatta|Mysuru|tiffin|auto|autos|metro|pooja|coconut|mango|brinjal|chilli|chillies|ice gola|scooter|bakery|peacock|cricket|rupee|rupees|Kannada|Karnataka|Bengaluru|idli|ghee|moong|chappals|Coorg|kosambari|dosa|Bannerghatta)\b", re.I)
LOCAL_EMOJI = set("🚕🚇🛵🥥🥭🍆🥜🍲🥣☕🌺🦚🎆🎇🏏🍧👵👴📿")


def check_spoken(where, s):
    """TTS rules for lines recorded with macOS say (Rishi)."""
    if "{" in s:
        errors.append(f"{where}: spoken line contains a placeholder: {s!r}")
    for m in SINGLE.finditer(s):
        ch = m.group(1)
        after = s[m.end():m.end() + 2]
        if ch == "I":
            continue
        if ch in "aA" and re.match(r" [A-Za-z]", after):
            continue  # the article "a"
        errors.append(f"{where}: isolated letter {ch!r} in spoken line: {s!r}")
    if BAD_SOUNDS.search(s):
        errors.append(f"{where}: hard-to-speak sound {BAD_SOUNDS.search(s).group(0)!r}")


def solve(grid, need_star):
    H, W = len(grid), len(grid[0])
    stars = [(r, c) for r in range(H) for c in range(W) if grid[r][c] == "*"]
    full = (1 << len(stars)) - 1
    start = [(r, c) for r in range(H) for c in range(W) if grid[r][c] == "S"][0]
    q, seen = deque([(start, 0, 0)]), {(start, 0)}
    while q:
        (r, c), m, d = q.popleft()
        if grid[r][c] == "*":
            m |= 1 << stars.index((r, c))
        if grid[r][c] == "G" and (not need_star or m == full):
            return d
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < H and 0 <= nc < W and grid[nr][nc] != "#":
                if grid[nr][nc] == "G" and need_star and m != full and grid[r][c] != "*":
                    pass  # goal is closed: walking onto it is allowed but does not finish
                key = ((nr, nc), m)
                if key not in seen:
                    seen.add(key)
                    q.append(((nr, nc), m, d + 1))
    return None


import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CATALOGUE = os.path.join(ROOT, "app/src/main/assets/catalogue_games.json")
CORE_IDS = {"pattern", "sort", "number", "nav", "word", "lab", "aboutme"}


def _check_round_common(w, r):
    walk_strings(w, r)
    if words(r.get("prompt", "")) > 8:
        errors.append(f"{w}: prompt > 8 words: {r.get('prompt')!r}")
    for k in ("say", "hint", "why"):
        if not r.get(k):
            errors.append(f"{w}: missing {k}")
        else:
            check_spoken(f"{w}.{k}", r[k])


def _check_pick(w, r):
    b, ch, a = r.get("board", []), r["choices"], r["answer"]
    maxc = 6 if r.get("layout") == "grid2x3" else 4
    if not 2 <= len(ch) <= maxc:
        errors.append(f"{w}: needs 2-{maxc} choices")
    if len(set(ch)) != len(ch):
        errors.append(f"{w}: duplicate choices")
    if not (isinstance(a, int) and 0 <= a < len(ch)):
        errors.append(f"{w}: bad answer index")
    for i in r.get("also_ok", []):
        if not 0 <= i < len(ch) or i == a:
            errors.append(f"{w}: also_ok must be other valid indexes")
    if "fade" in r and (r["fade"] == a or r["fade"] in r.get("also_ok", []) or not 0 <= r["fade"] < len(ch)):
        errors.append(f"{w}: fade must be a wrong choice")
    if len(b) > 8:
        errors.append(f"{w}: board > 8")
    if "labels" in r and len(r["labels"]) != len(ch):
        errors.append(f"{w}: labels must match choices")
    for c in ch:
        if len(c) == 1 and c.isalpha() and c.isascii() and not c.isupper() and r.get("case") != "lower":
            errors.append(f"{w}: lowercase letter needs case='lower'")
    if "peek_board" in r:
        pb = r["peek_board"]
        if len(pb) != len(b) or len(pb) > 8 or not 1000 <= r.get("peek_ms", 0) <= 8000:
            errors.append(f"{w}: peek_board must match board length, peek_ms 1000-8000")
        diff = [i for i in range(min(len(pb), len(b))) if pb[i] != b[i]]
        if len(diff) != 1:
            errors.append(f"{w}: peek must change exactly one position (got {diff})")
        else:
            i = diff[0]
            want = pb[i] if b[i] == "❓" else b[i]
            if ch[a] != want:
                errors.append(f"{w}: peek answer should be {want}")
    if "choice_rotate" in r and len(r["choice_rotate"]) != len(ch):
        errors.append(f"{w}: choice_rotate must match choices")
    if r.get("silhouette") is not None and not isinstance(r["silhouette"], bool):
        errors.append(f"{w}: silhouette must be true/false")


def _check_variant(w, r, gv):
    v = r.get("variant", gv)
    if v in ("pick", "sort"):
        _check_pick(w, r)
    elif v == "echo":
        p, sq = r.get("pool", []), r.get("sequence", [])
        if not 3 <= len(p) <= 6 or not 2 <= len(sq) <= 5 or any(not 0 <= i < len(p) for i in sq):
            errors.append(f"{w}: echo pool 3-6, sequence 2-5 valid indexes")
        if len(set(p)) != len(p):
            errors.append(f"{w}: echo pool must be distinct")
        if not 500 <= r.get("show_ms", 0) <= 2000:
            errors.append(f"{w}: echo show_ms 500-2000")
    elif v == "order":
        it = r.get("items", [])
        if not 3 <= len(it) <= 5:
            errors.append(f"{w}: order needs 3-5 items")
        if "scales" in r:
            sc = r["scales"]
            mono = all(x < y for x, y in zip(sc, sc[1:])) or all(x > y for x, y in zip(sc, sc[1:]))
            if len(sc) != len(it) or not mono or min(sc) < 0.3 or max(sc) > 1.0:
                errors.append(f"{w}: scales must match items, be strictly monotonic, 0.3-1.0")
        elif len(set(it)) != len(it):
            errors.append(f"{w}: order items must be distinct (or use scales)")
        if all(x.isdigit() for x in it) and [int(x) for x in it] != sorted(int(x) for x in it):
            errors.append(f"{w}: number order must be ascending")
        if "labels" in r and len(r["labels"]) != len(it):
            errors.append(f"{w}: labels must match items")
    elif v == "place":
        bins, it, ans = r.get("bins", []), r.get("items", []), r.get("answers", [])
        if not 2 <= len(bins) <= 4 or not 4 <= len(it) <= 8 or len(ans) != len(it):
            errors.append(f"{w}: place needs 2-4 bins, 4-8 items, one answer per item")
        if any(not 0 <= x < len(bins) for x in ans) or set(ans) != set(range(len(bins))):
            errors.append(f"{w}: place answers must be valid and use every bin")
        if any(not b.get("face") or not b.get("label") for b in bins):
            errors.append(f"{w}: bins need face + label")
    elif v == "mirror":
        left, pal = r.get("left", []), r.get("palette", [])
        rows, cols = r.get("rows"), r.get("cols")
        if not (1 <= rows <= 4 and 1 <= cols <= 3) or len(left) != rows or any(len(x) != cols for x in left):
            errors.append(f"{w}: mirror rows 1-4, cols 1-3, left must be rows x cols")
        used = {x for row in left for x in row}
        if not used <= set(pal) or not 2 <= len(pal) <= 6:
            errors.append(f"{w}: palette must contain every left shape (2-6 entries)")
    elif v in ("compose", "scene_canvas"):
        mode = r.get("mode", "canvas" if "backdrop" in r else "build")
        if mode == "slots":
            if not all(isinstance(r.get(k), list) and 2 <= len(r[k]) <= 5 for k in ("who", "where", "what") if k in r):
                errors.append(f"{w}: slots need 2-5 options per row")
        else:
            parts = r.get("palette") or r.get("parts") or []
            if not 2 <= len(parts) <= 10 or len(set(parts)) != len(parts):
                errors.append(f"{w}: compose parts/palette 2-10 distinct")
            t = r.get("target")
            if t is not None and any(c is not None and c not in parts for row in t for c in row):
                errors.append(f"{w}: target uses a part not in the tray")
            if any(m not in parts for m in r.get("must_include", [])):
                errors.append(f"{w}: must_include not in parts")
    elif v == "pairs":
        c = r.get("cards", [])
        if not 3 <= len(c) <= 8 or len(set(c)) != len(c) or not 3 <= r.get("cols", 4) <= 5:
            errors.append(f"{w}: pairs needs 3-8 distinct cards, cols 3-5")
    elif v == "grid_path":
        grid = r.get("grid", [])
        flat = "".join(grid)
        if not grid or flat.count("S") != 1 or flat.count("G") != 1 or len({len(x) for x in grid}) != 1:
            errors.append(f"{w}: grid_path needs equal-width rows with one S and one G")
    elif v in ("keypad", "recite"):
        pass
    else:
        errors.append(f"{w}: unknown variant {v}")


def validate_catalogue(path, summary):
    if not os.path.exists(path):
        return
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        errors.append(f"catalogue parse error {e}")
        return
    seen = set()
    for g in data.get("games", []):
        gid = g["id"]
        for k in ("id", "catalogue_id", "name", "icon", "color", "tagline", "category", "section", "story", "say_intro",
                  "cheers", "end_lines", "levels_info", "levels", "variant"):
            if k not in g:
                errors.append(f"cat {gid}: missing {k}")
        if gid in seen or gid in CORE_IDS:
            errors.append(f"cat {gid}: duplicate id")
        seen.add(gid)
        if g.get("section") != "play" or words(g.get("tagline", "")) > 6:
            errors.append(f"cat {gid}: section play, tagline <= 6 words")
        walk_strings(f"cat {gid}", {k: g.get(k) for k in ("icon", "name", "tagline", "story", "say_intro", "cheers", "end_lines")})
        check_spoken(f"cat {gid}.say_intro", g["say_intro"])
        for k, n in (("cheers", 6), ("end_lines", 4)):
            ls = g.get(k, [])
            if len(ls) != n or len(set(ls)) != n:
                errors.append(f"cat {gid}: {k} needs {n} distinct lines")
            for ln in ls:
                check_spoken(f"cat {gid}.{k}", ln)
                if words(ln) > 10:
                    errors.append(f"cat {gid}.{k}: > 10 words")
        lvls = [lv["level"] for lv in g["levels"]]
        if lvls != list(range(1, len(lvls) + 1)) or len(lvls) < 3:
            errors.append(f"cat {gid}: levels must be 1..n, n >= 3")
        if [x["level"] for x in g.get("levels_info", [])] != lvls:
            errors.append(f"cat {gid}: levels_info must match levels")
        per = []
        for lv in g["levels"]:
            rs = lv["rounds"]
            per.append(len(rs))
            if len(rs) < 10:
                errors.append(f"cat {gid} L{lv['level']}: needs >= 10 rounds")
            for r in rs:
                w = f"cat {gid}/{r['id']}"
                if r["id"] in seen:
                    errors.append(f"{w}: duplicate round id")
                seen.add(r["id"])
                _check_round_common(w, r)
                _check_variant(w, r, g["variant"])
        summary.append(f"[cat] {g['catalogue_id']} {g['name']:<20} {g['variant']:<7} levels {per}")
    for m in data.get("merged_modes", []):
        if m.get("alias_of") not in CORE_IDS:
            errors.append(f"cat mode {m.get('mode_id')}: alias_of must be a core game")
        for lv in m["levels"]:
            if len(lv["rounds"]) < 10:
                errors.append(f"cat mode {m['mode_id']} L{lv['level']}: needs >= 10 rounds")
            for r in lv["rounds"]:
                w = f"cat mode {m['mode_id']}/{r['id']}"
                if r["id"] in seen:
                    errors.append(f"{w}: duplicate round id")
                seen.add(r["id"])
                _check_round_common(w, r)
                _check_variant(w, r, m["variant"])
        summary.append(f"[cat] {m['catalogue_id']} mode {m['mode_id']} -> {m['alias_of']} levels {[len(l['rounds']) for l in m['levels']]}")
    for cid, a in data.get("aliases", {}).items():
        if a.get("merged_into") not in CORE_IDS and a.get("merged_into") not in {g["id"] for g in data.get("games", [])}:
            errors.append(f"cat alias {cid}: merged_into must be a core or catalogue game id")


def main():
    try:
        data = json.load(open(PATH, encoding="utf-8"))
    except Exception as e:
        print("PARSE ERROR", e)
        sys.exit(1)
    ids, summary = set(), []
    for g in data["games"]:
        gid = g["id"]
        for k in ("id", "name", "icon", "color", "tagline", "say_intro", "section", "variant", "levels"):
            if k not in g:
                errors.append(f"{gid}: missing {k}")
        if gid in ids:
            errors.append(f"duplicate id {gid}")
        ids.add(gid)
        if g["section"] != "play":
            errors.append(f"{gid}: section must be play")
        if words(g["tagline"]) > 6:
            errors.append(f"{gid}: tagline > 6 words")
        if not (g["color"].startswith("#") and len(g["color"]) == 7):
            errors.append(f"{gid}: bad colour")
        walk_strings(gid, {k: g.get(k) for k in ("icon", "tagline", "name", "say_intro", "story", "scene", "cheers", "end_lines")})
        for k in ("story", "scene", "cheers", "end_lines"):
            if k not in g:
                errors.append(f"{gid}: missing {k}")
        check_spoken(f"{gid}.say_intro", g["say_intro"])
        for k, n in (("cheers", 6), ("end_lines", 4)):
            lines = g.get(k, [])
            if len(lines) != n or len(set(lines)) != n:
                errors.append(f"{gid}: {k} needs {n} distinct lines")
            for ln in lines:
                check_spoken(f"{gid}.{k}", ln)
                if words(ln) > 10:
                    errors.append(f"{gid}.{k}: > 10 words: {ln!r}")
                if "great thinking" in ln.lower():
                    errors.append(f"{gid}.{k}: no 'Great thinking'")
        local, nrounds, level_sets = 0, 0, []
        want_levels = [1, 2, 3] if gid == "aboutme" else [1, 2, 3, 4, 5]
        if [lv["level"] for lv in g["levels"]] != want_levels:
            errors.append(f"{gid}: levels must be {want_levels}")
        li = [x.get("level") for x in g.get("levels_info", [])]
        if li != want_levels or any(not x.get("title") or not x.get("emoji") for x in g.get("levels_info", [])):
            errors.append(f"{gid}: levels_info must give title + emoji for {want_levels}")
        total, per = 0, []
        for lv in g["levels"]:
            rs = lv["rounds"]
            per.append(len(rs))
            total += len(rs)
            # aboutme: the public build dropped the address/phone/recite rounds (issue #1, point 5), leaving 10-12 per level.
            minimum = 6 if g["variant"] == "grid_path" else (10 if gid == "aboutme" else 12)
            if len(rs) < minimum:
                errors.append(f"{gid} L{lv['level']}: only {len(rs)} rounds")
            sizes = []
            for r in rs:
                w = f"{gid}/{r.get('id')}"
                if r["id"] in ids:
                    errors.append(f"duplicate id {r['id']}")
                ids.add(r["id"])
                walk_strings(w, r)
                if words(r["prompt"]) > 8:
                    errors.append(f"{w}: prompt > 8 words: {r['prompt']!r}")
                for k in ("say", "hint", "why", "practise_say", "on_miss_say"):
                    if k in ("say", "hint", "why") and not r.get(k):
                        errors.append(f"{w}: missing {k}")
                    elif r.get(k):
                        check_spoken(f"{w}.{k}", r[k])
                nrounds += 1
                blob = " ".join([r["say"], r["why"], " ".join(r.get("board", [])), " ".join(r.get("choices", [])),
                                 " ".join(r.get("legend", {}).values())])
                if LOCAL_WORDS.search(blob) or any(e in blob for e in LOCAL_EMOJI):
                    local += 1
                if "{buddy}" in r["prompt"] and not r.get("silly"):
                    errors.append(f"{w}: only silly rounds use {{buddy}} in the prompt")
                if r["why"].count(".") + r["why"].count("!") > 2:
                    warns.append(f"{w}: why is long")
                if g["variant"] == "grid_path":
                    grid = r["grid"]
                    H, W = len(grid), len(grid[0])
                    sizes.append(f"{H}x{W}")
                    if H > 7 or W > 7 or any(len(row) != W for row in grid):
                        errors.append(f"{w}: grid must be rectangular, max 7x7")
                    want = {1: 3, 2: 4, 3: 5, 4: 6, 5: 7}[lv["level"]]
                    if H != want or W != want:
                        errors.append(f"{w}: level {lv['level']} mazes should be {want}x{want}")
                    flat = "".join(grid)
                    if flat.count("S") != 1 or flat.count("G") != 1 or set(flat) - set("SG#.*"):
                        errors.append(f"{w}: grid needs one S, one G, only S G # . *")
                    if r["need_star"] and "*" not in flat:
                        errors.append(f"{w}: need_star but no star")
                    d = solve(grid, r["need_star"])
                    if d is None:
                        errors.append(f"{w}: maze not solvable")
                    else:
                        r["_steps"] = d
                    continue
                rv = r.get("variant", g["variant"])
                if rv == "recite":
                    # Address / phone chants are excluded from public content (issue #1, point 5).
                    errors.append(f"{w}: recite rounds are not allowed in public content")
                    continue
                if rv == "keypad":
                    # Only public numbers (e.g. 112) may be typed; any personal-number check is forbidden.
                    if r.get("check") != "literal":
                        errors.append(f"{w}: keypad check must be 'literal' (no personal or phone_hash rounds)")
                    if not str(r.get("target", "")).isdigit():
                        errors.append(f"{w}: literal keypad needs a digit target")
                    continue
                b, ch, a = r["board"], r["choices"], r["answer"]
                dynamic = "dynamic" in r
                if any("{" in x for x in b + ch) and not dynamic and not all(x.startswith("{name") for x in b if "{" in x):
                    errors.append(f"{w}: placeholders only in dynamic rounds")
                if not r.get("scene"):
                    errors.append(f"{w}: missing scene")
                if r.get("silly"):
                    if r.get("oops") in (None, ch[a] if 0 <= a < len(ch) else None):
                        errors.append(f"{w}: silly round needs oops different from the answer")
                    if "{buddy}" not in r["prompt"]:
                        errors.append(f"{w}: silly prompt should frame {{buddy}}'s mistake")
                for i in r.get("board_fade", []):
                    if not 0 <= i < len(b):
                        errors.append(f"{w}: board_fade index out of range")
                level_sets.append((lv["level"], set(x for x in b + ch if x not in "❓➕➡️🆚")))
                if len(b) > 8:
                    errors.append(f"{w}: board > 8 items")
                if not 2 <= len(ch) <= 4:
                    errors.append(f"{w}: needs 2-4 choices")
                if len(set(ch)) != len(ch) and not dynamic:
                    errors.append(f"{w}: duplicate choices {ch}")
                if r.get("any_ok"):
                    if not r.get("save_as"):
                        errors.append(f"{w}: any_ok round needs save_as")
                elif not (isinstance(a, int) and 0 <= a < len(ch)):
                    errors.append(f"{w}: bad answer index {a}")
                if "fade" in r and (r["fade"] == a or not 0 <= r["fade"] < len(ch)):
                    errors.append(f"{w}: fade must be a wrong choice")
                if g["variant"] == "sort":
                    if len(b) != 1 or not 2 <= len(ch) <= 3:
                        errors.append(f"{w}: sort needs one item and 2-3 bins")
                    if len(r.get("labels", [])) != len(ch):
                        errors.append(f"{w}: labels must match bins")
                if b.count("❓") > 1:
                    errors.append(f"{w}: more than one blank")
                for c in ch:
                    if len(c) == 1 and c.isalpha() and c.isascii() and not c.isupper():
                        errors.append(f"{w}: letters must be uppercase")
            if g["variant"] != "grid_path" and not any(r.get("silly") for r in rs):
                errors.append(f"{gid} L{lv['level']}: needs one silly round")
            if g["variant"] == "grid_path":
                for r in rs:
                    if not r.get("hint"):
                        errors.append(f"{r['id']}: maze needs a hint")
                steps = [r["_steps"] for r in rs if "_steps" in r]
                summary.append(f"   L{lv['level']} mazes {sizes} shortest steps {steps}")
                for r in rs:
                    r.pop("_steps", None)
        overlap = ""
        if level_sets:
            pools = {L: set().union(set(), *[x for l2, x in level_sets if l2 == L]) for L in (1, 2, 3, 4, 5)}
            old = pools[1] | pools[2] | pools[3]
            new45 = pools[4] | pools[5]
            overlap = f" overlap L1-L3 {len(pools[1] & pools[3])}"
            if new45:
                overlap += f", L4-5 new pics {len(new45 - old)}/{len(new45)}"
        summary.append(f"{g['name']:<18} {g['variant']:<9} rounds per level {per} total {total} "
                       f"local {local}/{nrounds} ({100 * local // max(nrounds, 1)}%){overlap} "
                       f"silly {sum(1 for lv in g['levels'] for r in lv['rounds'] if r.get('silly'))}")
        # aboutme has 3 levels and no address/phone rounds in public content, so its floor is 30 (others 36/62).
        if total < (18 if g["variant"] == "grid_path" else (30 if gid == "aboutme" else 36)) or (gid != "aboutme" and total < (30 if g["variant"] == "grid_path" else 62)):
            errors.append(f"{gid}: total {total} too few")
    validate_catalogue(CATALOGUE, summary)
    for s in summary:
        print(s)
    for w in warns:
        print("WARN", w)
    for e in errors:
        print("ERROR", e)
    print("OK" if not errors else f"{len(errors)} errors")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
