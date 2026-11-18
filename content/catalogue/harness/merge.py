#!/usr/bin/env python3
"""Merge catalogue/batches/*.json → catalogue_games.json and status_*.json → status.json."""
import json, os, glob, os, re
num = lambda f: int(re.search(r'b(\d+)\.json$', f).group(1))
C = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = {"version": 1, "games": [], "merged_modes": [], "aliases": {}}
for f in sorted(glob.glob(C + '/batches/b*.json'), key=num):
    b = json.load(open(f))
    out["games"] += b.get("games", []); out["merged_modes"] += b.get("merged_modes", []); out["aliases"].update(b.get("aliases", {}))
ids = [g["id"] for g in out["games"]]
assert len(ids) == len(set(ids)), "duplicate game ids"
json.dump(out, open(C + '/catalogue_games.json', 'w'), ensure_ascii=False, indent=1)
st = json.load(open(C + '/status.json')) if os.path.exists(C + '/status.json') else {}
for f in sorted(glob.glob(C + '/batches/status_b*.json'), key=num): st.update(json.load(open(f)))
json.dump(st, open(C + '/status.json', 'w'), ensure_ascii=False, indent=1)
print(len(out["games"]), "games,", len(out["merged_modes"]), "modes,", len(st), "statuses")
