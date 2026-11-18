"""Build catalog/catalog.json from the allow-list using YouTube's public feeds (no API key).

Curation in this build: channel allow-list (educator-verified) + deterministic title rules (subset of educator rules
R1/R2/R3/R5/R6/R9) + topic routing: a channel listed in several rows sends each video to the row whose topic words
match its title (e.g. Sesame "Brushy Brush" -> Healthy Me), unmatched videos go to the channel's first row.
Limit: the free feed returns only each channel's latest 15 videos; the YouTube Data API key (approved) lifts that.
Per-video AI scoring (pipeline/model_router.py) is added with the MVP pipeline.
Usage: python3 pipeline/fetch_catalog.py catalog/channels_v2.json catalog/catalog.json
"""
import json, re, sys, time, urllib.request
import xml.etree.ElementTree as ET

NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
REJECT = re.compile(r"(#shorts|\bshorts?\b|compilation|non[- ]?stop|\b\d+\s*(hours?|hrs?)\b|marathon|full episodes|"
                    r"\bmega\s*mix\b|unbox|toy review|\bhaul\b|surprise egg|prank|\breact|\bminecraft|\broblox|"
                    r"\bgameplay\b|scary|horror|\blive\b|\bpremiere\b|\bsponsored\b|giveaway|\btrailer\b|vampire|zombie|nightmare|virus|pok[eé]mon|disney|pre-op|surgery|dumbbell|hiit|attack|\bkill|deadly|dangerous|\beats?\b|\bhunt|venom|\bbite|predator|survival|monster|blood|\bvs\.?\b)", re.I)
TOPIC = {
    "animals": r"animal|wild|zoo|safari|lion|tiger|elephant|giraffe|zebra|monkey|panda|bear|bird|owl|penguin|whale|dolphin|"
               r"fish|octopus|turtle|frog|butterfly|bee|ant|insect|pet|dog|cat|horse|farm|ocean|sea|aquarium|jungle|forest|baby",
    "space": r"space|planet|moon|\bsun\b|star|rocket|astronaut|mars|jupiter|saturn|galaxy|solar|comet|asteroid|satellite|nasa|orbit|telescope",
    "history": r"history|long ago|ancient|dinosaur|fossil|invent|pyramid|egypt|castle|king|queen|knight|explorer|monument|"
               r"\bfort\b|famous|olden|first|wheel|stone age|viking|roman|greek|mughal|taj mahal",
    "wonder": r"science|why|how|animal|ocean|sea|space|planet|moon|sun|star|earth|weather|rain|plant|tree|seed|body|bone|"
              r"heart|water|bird|insect|bug|fish|nature|volcano|dinosaur|experiment|magnet|light|shadow",
    "numbers": r"count|number|\b\d+\b|add|subtract|plus|minus|shape|circle|square|triangle|pattern|puzzle|math|sort|"
               r"more|less|big|small|opposite|skip|times|match|memory|spot the",
    "words": r"letter|alphabet|\babc\b|phonic|sound|word|read|spell|vocab|rhyme|story|book",
    "move": r"move|dance|exercise|yoga|jump|stretch|freeze|workout|sport|ball|run|hop|skip|action|shake|walk|march|"
            r"wiggle|stomp|clap|balance|game|pe with",
    "values": r"feel|angry|mad|sad|scared|afraid|fear|happy|kind|friend|share|sharing|help|sorry|brave|calm|breathe|"
              r"together|turn|honest|truth|love|family|story",
    "healthy": r"brush|teeth|tooth|wash|hand|bath|clean|tidy|healthy|eat|food|vegetable|fruit|dress|potty|sleep|bed|"
               r"safety|safe|road|cross|manners|please|thank|germ|sick|doctor|habit",
    "india": r"festival|diwali|holi|pongal|onam|eid|india|indian|kannada|hindi|story|stories|folk|monument|helper|"
             r"tenali|birbal|panchatantra|jataka|ganesha|krishna|rama|ಕ|क",
    "make": r"draw|art|paint|colou?r|craft|paper|origami|clay|dough|make|build|diy|music|instrument",
}


PRIORITY = ["move", "healthy", "space", "history", "animals", "india", "values", "make", "wonder", "numbers", "words"]   # specific topics claim first


def clickbait(title):
    letters = re.findall(r"[A-Za-z]{4,}", title)
    caps = sum(1 for w in letters if w.isupper())
    return (letters and caps / len(letters) > 0.3) or title.count("!") >= 2 or "?!" in title


def fetch(cid):
    key = "playlist_id" if cid.startswith("PL") else "channel_id"
    url = f"https://www.youtube.com/feeds/videos.xml?{key}={cid}"
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "wonderwindow/0.1"}), timeout=20) as r:
        return ET.fromstring(r.read())


def main(src, dst, per_row=40):
    cfg = json.load(open(src, encoding="utf-8"))
    rows = cfg["rows"]
    homes = {}                                   # channel id -> list of row ids (in order)
    for row in rows:
        for ch in row["channels"]:
            homes.setdefault(ch[0], []).append(row["id"])
    buckets = {row["id"]: [] for row in rows}
    seen, report, feeds = set(), [], {}
    for cid, rids in homes.items():
        try:
            feed = fetch(cid)
        except Exception as e:
            report.append(f"!! {cid} ({rids}): {e}")
            continue
        title = feed.findtext("a:title", default="", namespaces=NS)
        kept = 0
        for e in feed.findall("a:entry", NS):
            vid = e.findtext("yt:videoId", namespaces=NS)
            t = e.findtext("a:title", default="", namespaces=NS).strip()
            link = e.find("a:link", NS).get("href", "")
            if vid in seen or "/shorts/" in link or REJECT.search(t) or clickbait(t):
                continue
            target = rids[0]
            if len(rids) > 1:
                for rid in sorted(rids, key=lambda r: PRIORITY.index(r) if r in PRIORITY else 99):
                    if rid in TOPIC and re.search(TOPIC[rid], t, re.I):
                        target = rid
                        break
            seen.add(vid)
            buckets[target].append({"id": vid, "title": t, "channel": title})
            kept += 1
        report.append(f"{title or cid}: {kept} kept -> {', '.join(rids)}")
    out = {"schemaVersion": 2, "catalogVersion": int(time.strftime("%Y%m%d%H")), "rows": []}
    for row in rows:
        vids = buckets[row["id"]][:per_row]
        if len(vids) >= 4:
            out["rows"].append({"id": row["id"], "name": row["name"], "color": row["color"],
                                "share": row.get("share", 0), "videos": vids})
            report.append(f"== {row['name']}: {len(vids)} videos")
        else:
            report.append(f"-- row '{row['name']}' hidden ({len(vids)} videos < 4)")
    json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\n".join(report))
    print(f"rows: {len(out['rows'])}, videos: {sum(len(r['videos']) for r in out['rows'])}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
