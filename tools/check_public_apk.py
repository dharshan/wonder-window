#!/usr/bin/env python3
"""Fail-closed check that a PUBLIC build carries no family-specific values.

Scans Android resource values for the keys a family build injects (child_name, child_birth,
phone_hash, phone_salt, parent_phone ...). Exit 0 only if every scanned source defines
child_name and child_birth with EMPTY values and defines no phone value at all.

Usage:
  python3 tools/check_public_apk.py app/build/generated/res/resValues/publicDebug   # generated resValues XML
  python3 tools/check_public_apk.py --apk app/build/outputs/apk/public/debug/app-public-debug.apk
Any directory is scanned recursively for *.xml; --apk uses `aapt2 dump resources` (found via PATH or
$ANDROID_HOME/build-tools/*). It also fails when it finds nothing to check, so a moved output path
cannot make the check pass silently.
"""
import glob
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

MUST_BE_EMPTY = ("child_name", "child_birth")
# Every family-controlled value must equal the public default in a public build.
PUBLIC_DEFAULTS = {"app_name": "Wonder Window", "buddy_name": "Pip", "warmup_title": "Pip's Warm-up",
                   "daily_limit_min": "120", "watch_session_min": "20", "try_families": "", "try_age_band": "5-6"}
SENTINEL = re.compile(r"SENTINEL", re.I)
FORBIDDEN = re.compile(r"phone|salt|passcode", re.I)


def values_from_xml(path):
    """Yield (name, text) for every <string>/<integer>/<bool> resource in a values XML file."""
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return
    for el in root:
        name = el.get("name")
        if name and el.tag in ("string", "integer", "bool", "item"):
            yield name, (el.text or "")


def values_from_apk(apk):
    tool = None
    for cand in ["aapt2"] + sorted(glob.glob(os.path.join(os.environ.get("ANDROID_HOME", os.environ.get("ANDROID_SDK_ROOT", "")), "build-tools", "*", "aapt2")), reverse=True):
        try:
            subprocess.run([cand, "version"], capture_output=True, check=True)
            tool = cand
            break
        except (OSError, subprocess.CalledProcessError):
            continue
    if not tool:
        raise SystemExit("FAIL: aapt2 not found; cannot inspect the APK")
    out = subprocess.run([tool, "dump", "resources", apk], capture_output=True, text=True, check=True).stdout
    # Lines look like:  resource 0x7f0f0001 string/child_name   then   () "value"
    cur = None
    for line in out.splitlines():
        m = re.search(r"resource 0x[0-9a-f]+ (?:string|integer|bool)/(\w+)", line)
        if m:
            cur = m.group(1)
            continue
        if cur and line.strip().startswith("("):
            m = re.search(r'\)\s*(?:"(.*)"|(\S+))?\s*$', line)
            yield cur, (m.group(1) or m.group(2) or "") if m else ""
            cur = None


def check(values):
    """values: iterable of (name, text). Returns a list of problems."""
    problems, seen = [], set()
    for name, text in values:
        seen.add(name)
        if name in MUST_BE_EMPTY and text.strip():
            problems.append(f"{name} is not empty in a public build")
        if name in PUBLIC_DEFAULTS and text.strip().strip('"').replace("\\'", "'") != PUBLIC_DEFAULTS[name]:
            problems.append(f"{name}={text!r} differs from the public default {PUBLIC_DEFAULTS[name]!r}")
        if SENTINEL.search(text):
            problems.append(f"{name} carries a test sentinel value {text!r}")
        if FORBIDDEN.search(name):
            problems.append(f"phone/salt-like resource {name!r} must not exist in a public build")
    for k in list(MUST_BE_EMPTY) + list(PUBLIC_DEFAULTS):
        if k not in seen:
            problems.append(f"{k} not found: cannot prove the public build is clean (wrong path?)")
    return problems


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    values = []
    if argv[0] == "--apk":
        for apk in argv[1:]:
            values.extend(values_from_apk(apk))
    else:
        for d in argv:
            files = [d] if os.path.isfile(d) else glob.glob(os.path.join(d, "**", "*.xml"), recursive=True)
            for f in files:
                values.extend(values_from_xml(f))
    problems = check(values)
    for p in problems:
        print("FAIL", p)
    if problems:
        return 1
    print(f"OK public build check: {len(values)} resource values scanned, no family values found")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
