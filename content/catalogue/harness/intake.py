#!/usr/bin/env python3
"""Usage: intake.py WW-021 WW-040  -> prints batch brief lines (id, family, dedup cluster, age, objective)."""
import json, os, sys
d = json.load(open(os.environ.get('WW_MASTER_CATALOGUE', 'master.json')))
fam = {f['id']: f['family'] for f in json.load(open(os.path.join(os.path.dirname(__file__), '..', 'families.json')))}
lo, hi = sys.argv[1], sys.argv[2]
for x in d['detailed_catalogue_games']:
    if lo <= x['id'] <= hi:
        print(f"{x['id']} | {fam.get(x['id'])} | dup={x['audit']['dedup_cluster_id']} | age={x['primary_age']} | {x['name']} | {x['learning_objective']}")
