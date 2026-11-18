# Batch brief for ww-content-author
Batch: {BATCH} — catalogue ids {LO}..{HI}
Read: harness/RULES.md; `python3 harness/intake.py {LO} {HI}`; each full record in master.json (python, by id — never read the whole file);
examples of finished work: specs/WW-002.md, specs/WW-017.md, and games ww002/ww016/ww017 in batches/b1.json (copy their structure exactly).
Existing games to dedup against: the 7 core games in app/src/main/assets/games.json + every game already in batches/*.json (list ids/names/objectives with python).
For each id: spec → specs/WW-xxx.md (handover §9, concise); decision own game | merged_into <id> (content may become a mode in "merged_modes" with alias_of) | deferred (needs variant X).
Write ONLY: batches/{BATCH}.json  {"version":1,"batch":"{BATCH}","games":[...],"merged_modes":[...],"aliases":{...}}  and batches/status_{BATCH}.json {WW-id:{stage,family,notes}}.
Games: id "ww0xx", catalogue_id, name, icon, color, tagline, category (catalogue), section "play", story, say_intro, cheers(6), end_lines(4), levels_info, levels ≥3 with ≥10 rounds each.
Then run: python3 harness/merge.py && python3 -I tools/content/validate_games.py  — fix until OK (only touch your own batch file).
Report ≤150 words.
