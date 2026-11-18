"""Pre-render every spoken line into app assets (the TV has no text-to-speech engine).

LOCAL macOS HELPER (uses `say` + `afconvert`); optional, not used by CI. The app runs without voice clips.

macOS only. Reads the warm-up bank, the catalog titles and the fixed UI lines,
writes app/src/main/assets/voice/<sha1>.m4a and voice/index.json {text: file}. Re-runs only render new lines.
Usage: python3 tools/make_voice.py   (voice from family.properties `voice=`, default Rishi)
"""
import hashlib, json, os, re, subprocess, sys, tempfile

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(R, "app/src/main/assets/voice")


def props():
    p = {}
    for name in ("family.properties", "family.properties.example"):
        f = os.path.join(R, name)
        if os.path.exists(f):
            for line in open(f, encoding="utf-8"):
                if "=" in line and not line.lstrip().startswith("#"):
                    k, v = line.split("=", 1)
                    p.setdefault(k.strip(), v.strip())
    return p


def lines(p):
    buddy = p.get("buddy_name", "Gubbi")
    warm = p.get("warmup_title", buddy + "'s Warm-up")
    app = p.get("app_title", "Wonder Window")
    out = [warm + "!", "Five quick questions, then videos.", "Let's go!", "Try again!", "Now you know!",
           "Amazing! You choose your adventure.", "Great trying!", "Pick a video!", "Two more minutes!",
           "Try it! Tell Amma or Appa one thing you learned.", "Let's go do it!", "Keep watching", "Not this one",
           "Stop for now", "I like this!", "Taking a little break", "TV is resting for a bit. Let's play!",
           "TV is resting now. Let's play!", "See you next time!", app + " wakes up soon.", "Yay!", "Well done!",
           "Super!", "You got it!", "Stop for now?", "Pick another video",
           "Which letter comes next?", "How many dots?", "Which number is missing?", "Count by tens!",
           "Which number is bigger?"]
    for m in (5, 10, 15, 20, 30):
        out.append(f"{m} minutes")
        out.append(f"{buddy} picked a {m}-minute adventure for you.")
    bank = os.path.join(R, "app/src/main/assets/warmup_bank.json")
    if os.path.exists(bank):
        for it in json.load(open(bank, encoding="utf-8")):
            out += [it.get("say") or it.get("prompt", ""), it.get("why", "")]
    name = p.get("child_name", "")
    ab = os.path.join(R, "app/src/main/assets/aboutme_bank.json")
    if os.path.exists(ab):
        for it in json.load(open(ab, encoding="utf-8")):
            for key in ("say", "say_ok"):
                t = it.get(key) or ""
                if isinstance(t, str) and t and ("{name}" not in t or name):
                    out.append(t.replace("{name}", name))
    out += ["Stamp! A new page in your Explorer Passport!", "Can't choose!", "That's OK! You can choose another day.",
            "Your name train is ready! Stamp!", "Try another one!", "Yes! That's you! Stamp!", "Hmm, try again!",
            "Let's learn it together. Ask Amma or Appa!"]
    for gm in [os.path.join(R, "app/src/main/assets/" + f) for f in ("games.json", "catalogue_games.json")]:
        if not os.path.exists(gm): continue
        for g in json.load(open(gm, encoding="utf-8"))["games"]:
            out.append(g.get("say_intro", ""))
            out += g.get("cheers", []) + g.get("end_lines", [])
            for lv in g.get("levels", []):
                for r in lv.get("rounds", []):
                    out += [r.get("say", ""), r.get("hint", ""), r.get("why", ""), r.get("practise_say", ""), r.get("on_miss_say", "")]
    tj = os.path.join(R, "app/src/main/assets/try.json")
    if os.path.exists(tj):
        t = json.load(open(tj, encoding="utf-8"))
        out += [c.get("say", "") for c in t.get("categories", [])]
        for a in t.get("activities", []):
            out += [st.get("say", "") for st in a.get("steps", [])] + [a.get("show", ""), a.get("done", ""), a.get("guess_back", "")]
            if isinstance(a.get("twist"), dict): out.append(a["twist"].get("say", ""))
            for g in a.get("guess_choices", []) or []:
                if isinstance(g, dict): out.append(g.get("say", ""))
        out += [c.get("wait", "") for c in t.get("categories", [])]
        out += [c.get("page", {}).get("say", "") for c in t.get("categories", []) if isinstance(c.get("page"), dict)]
        out += [v for v in (t.get("lines") or {}).values()] + [g.get("say", "") for g in t.get("stuck_generic", []) or []]
        for a in t.get("activities", []):
            for k in ("hook", "challenge"):
                if isinstance(a.get(k), dict): out.append(a[k].get("say", ""))
            out.append(a.get("gather_say", ""))
            for st in a.get("steps", []):
                for h in st.get("stuck", []) or []: out.append(h.get("say", ""))
    t3 = os.path.join(R, "app/src/main/assets/try_activities.json")
    if os.path.exists(t3):
        d3 = json.load(open(t3, encoding="utf-8"))
        out += list((d3.get("lines") or {}).values())
        for a in d3.get("activities", []):
            out += [a.get("say", "")] + [s.get("say", "") for s in a.get("child_steps", [])]
    out += ["Look again!", "Get the star first!", "Here it is!", "That's it!", "Show Amma or Appa!"]
    cat = os.path.join(R, "catalog/catalog.json")
    if os.path.exists(cat):
        for row in json.load(open(cat, encoding="utf-8"))["rows"]:
            out.append(row["name"])
            out += [v["title"] for v in row["videos"]]
    return [x for x in dict.fromkeys(t.strip().replace("{buddy}", buddy) for t in out) if x]


def speakable(t):
    t = re.sub(r"[\U0001F000-\U0001FFFF☀-➿⬀-⯿️]", " ", t)   # drop emoji
    t = re.sub(r"#\w+", " ", t)
    t = t.replace("|", ",").replace("&", " and ")
    return re.sub(r"\s+", " ", t).strip()


def main():
    p = props()
    voice, rate = p.get("voice", "Rishi"), p.get("voice_rate", "155")
    os.makedirs(OUT, exist_ok=True)
    idx_path = os.path.join(OUT, "index.json")
    index = json.load(open(idx_path, encoding="utf-8")) if os.path.exists(idx_path) else {}
    want = lines(p)
    made = 0
    for t in want:
        spoken = speakable(t)
        if not spoken:
            continue
        name = hashlib.sha1(f"{voice}|{rate}|{spoken}".encode()).hexdigest()[:16] + ".m4a"
        dst = os.path.join(OUT, name)
        if not os.path.exists(dst):
            with tempfile.TemporaryDirectory() as d:
                aiff = os.path.join(d, "a.aiff")
                subprocess.run(["say", "-v", voice, "-r", rate, "-o", aiff, spoken], check=True)
                subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", aiff, dst], check=True)
            made += 1
        index[t] = name
    index = {t: index[t] for t in want if t in index}
    keep = set(index.values())
    for f in os.listdir(OUT):
        if f.endswith(".m4a") and f not in keep:
            try:
                os.remove(os.path.join(OUT, f))      # stale clip (needs delete permission on the Mac; harmless if it fails)
            except OSError:
                pass
    json.dump(index, open(idx_path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f"voice={voice}: {len(index)} lines, {made} new, {size // 1024} KB")


if __name__ == "__main__":
    main()
