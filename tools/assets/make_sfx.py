#!/usr/bin/env python3
"""Regenerate the 7 short sound effects in app/src/main/assets/sfx/ (synthesized; no third-party audio).
Usage: python3 tools/assets/make_sfx.py [out_dir]"""
import math, os, struct, sys, wave
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "app/src/main/assets/sfx")
R = 22050
def tone(seq, name, vol=0.35):
    out = []
    for f0, f1, dur, shape in seq:
        n = int(R * dur); ph = 0
        for i in range(n):
            t = i / n; f = f0 + (f1 - f0) * t; ph += 2 * math.pi * f / R
            env = min(1, i / (R * 0.005)) * (1 - t) ** (2 if shape == 'pluck' else 0.6)
            out.append((math.sin(ph) + 0.25 * math.sin(2 * ph) + 0.1 * math.sin(3 * ph)) * env * vol)
    w = wave.open(os.path.join(D, name + ".wav"), "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R)
    w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, x)) * 32000)) for x in out)); w.close()
os.makedirs(D, exist_ok=True)
tone([(523,523,.09,'pluck'),(659,659,.09,'pluck'),(784,784,.09,'pluck'),(1047,1047,.25,'pluck')], "chime")
tone([(330,250,.18,'soft')], "boing", 0.25)
tone([(900,1300,.05,'pluck')], "pop", 0.2)
tone([(523,523,.12,'pluck'),(659,659,.12,'pluck'),(784,784,.12,'pluck'),(1047,1047,.12,'pluck'),(1319,1319,.12,'pluck'),(1568,1568,.4,'pluck')], "fanfare")
tone([(1568,2093,.06,'pluck'),(2093,2637,.06,'pluck'),(2637,3136,.12,'pluck')], "twinkle", 0.25)
tone([(200,150,.07,'soft')], "bump", 0.25)
tone([(2200,2600,.05,'pluck'),(2600,2200,.05,'pluck'),(2200,2700,.08,'pluck')], "chirp", 0.25)
print("wrote 7 sfx to", os.path.abspath(D))
