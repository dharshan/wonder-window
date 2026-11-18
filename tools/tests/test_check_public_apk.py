import importlib.util
import pathlib

spec = importlib.util.spec_from_file_location("check_public_apk", pathlib.Path(__file__).resolve().parents[1] / "check_public_apk.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

CLEAN = [("child_name", ""), ("child_birth", ""), ("buddy_name", "Pip")]


def test_clean_public_values_pass():
    assert mod.check(CLEAN) == []


def test_child_values_fail():
    assert mod.check([("child_name", "Sam"), ("child_birth", "")])
    assert mod.check([("child_name", ""), ("child_birth", "2020-05")])


def test_phone_values_fail_even_when_empty():
    assert mod.check(CLEAN + [("phone_hash", "")])
    assert mod.check(CLEAN + [("phone_salt", "x")])


def test_nothing_scanned_fails_closed():
    assert mod.check([])
