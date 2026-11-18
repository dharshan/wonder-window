#!/usr/bin/env python3
import json, re, sys
d=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'try_activities.json'))
fams={f['id'] for f in d['families']}; E=[]
REQ=["schema_version","activity_id","title","short_description","category","recommended_age_bands","duration_minutes","screen_intro_seconds",
     "materials","child_steps","adult_support","safety_notes","adaptations_by_age","accessibility_adaptations","video_topic_tags","safety_review","safety_status","content_status"]
NEW=re.compile('[\U0001FA70-\U0001FAFF\U0001F7E0-\U0001F7EB\U0001F971\U0001F97B\U0001F9A5-\U0001F9AA\U0001F9AE-\U0001F9AF\U0001F9BA-\U0001F9BF\U0001F9C3-\U0001F9CA\U0001F9CD-\U0001F9CF\U0001F6D5-\U0001F6D7\U0001F6FA-\U0001F6FC\U0001F90C-\U0001F90F\U0001F93F\U0001F978\U0001F9A3\U0001F9A4\U0001F9AB-\U0001F9AD\U0001F9CB\U0001F9CC\U0001F972\U0001F977\U0001F979\U0001F97A]')
ids=set()
for a in d['activities']:
    w=a.get('activity_id','?')
    for k in REQ:
        if k not in a: E.append(f"{w}: missing {k}")
    if w in ids: E.append(f"{w}: duplicate id")
    ids.add(w)
    if a['category'] not in fams: E.append(f"{w}: unknown category")
    if not 3<=len(a['child_steps'])<=5: E.append(f"{w}: 3-5 steps")
    for s in a['child_steps']:
        if len(s['text'].split())>6: E.append(f"{w}: step text > 6 words: {s['text']}")
    if a['adult_support'] not in ("none","optional","recommended","required"): E.append(f"{w}: adult_support")
    if a['safety_status'] not in ("approved","parent_supervision_required","needs_review","rejected"): E.append(f"{w}: safety_status")
    if any(v=="present" for v in a['safety_review'].values()): E.append(f"{w}: hazard present")
    if any(v=="mitigated" for v in a['safety_review'].values()) and not a['safety_notes']: E.append(f"{w}: mitigated needs notes")
    texts=[a['say'],a['title']]+[s['say'] for s in a['child_steps']]+[s['pic'] for s in a['child_steps']]+[a['pic']]+[m['pic'] for m in a['materials']]
    for t in texts:
        if NEW.search(t): E.append(f"{w}: emoji newer than Unicode 11 in {t}")
        if '‍' in t: E.append(f"{w}: ZWJ in {t}")
    for s in [a['say']]+[s['say'] for s in a['child_steps']]:
        if re.search(r"(^|\s)[B-HJ-Zb-hj-z]([\s,.!?]|$)", s): E.append(f"{w}: isolated letter in voice: {s}")
print("\n".join(E) if E else f"OK {len(d['activities'])} activities"); sys.exit(1 if E else 0)
