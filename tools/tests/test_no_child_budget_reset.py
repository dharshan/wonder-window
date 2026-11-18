"""Issue #6: no code path may clear the shared screen-time budget except the midnight roll-over.
A parent-authenticated reset, when it exists, must live in a method named parentReset* and be listed here."""
import pathlib, re

SRC = pathlib.Path(__file__).resolve().parents[2] / "app/src/main/java/org/wonderwindow/tv/MainActivity.java"
ALLOWED_METHODS = {"rollDay"}


def method_of(text, pos):
    head = text[:pos]
    m = list(re.finditer(r"\n    (?:private|public|protected)[^\n(]*\s(\w+)\s*\(", head))
    return m[-1].group(1) if m else "?"


def test_budget_only_cleared_by_midnight_rollover():
    text = SRC.read_text(encoding="utf-8")
    offenders = []
    for m in re.finditer(r'putLong\("usedMs",\s*0L?\)|putLong\("cooldownUntil",\s*0L?\)|remove\("usedMs"\)|remove\("cooldownUntil"\)', text):
        name = method_of(text, m.start())
        if name not in ALLOWED_METHODS and not name.startswith("parentReset"):
            offenders.append(f"{name}: {m.group(0)}")
    assert not offenders, "budget cleared outside rollDay/parentReset*: " + ", ".join(offenders)


def test_no_long_press_reset():
    text = SRC.read_text(encoding="utf-8")
    assert "okDownAt > 0 && SystemClock.elapsedRealtime() - okDownAt > 5000" not in text
