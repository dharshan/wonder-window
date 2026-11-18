#!/usr/bin/env python3
"""Summarise catalogue/status.json by stage."""
import json, os, collections
s = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'status.json')))
c = collections.Counter(v.get('stage') for v in s.values())
print(dict(c)); print(len(s), 'of 500 touched')
