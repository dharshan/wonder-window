import importlib.util
import pathlib

import pytest

spec = importlib.util.spec_from_file_location("check_public_apk", pathlib.Path(__file__).resolve().parents[1] / "check_public_apk.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

CLEAN = [("child_name", ""), ("child_birth", "")] + list(mod.PUBLIC_DEFAULTS.items())


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


def test_family_controlled_values_must_equal_public_defaults():
    vals = dict(CLEAN)
    for k, bad in (("buddy_name", "Cherry"), ("app_name", "Our Tube"), ("warmup_title", "X"), ("daily_limit_min", "180")):
        changed = dict(vals); changed[k] = bad
        assert mod.check(list(changed.items())), k


def test_sentinel_values_fail():
    assert mod.check(CLEAN + [("anything", "SentinelBuddy")])


def test_missing_default_fails_closed():
    assert mod.check([v for v in CLEAN if v[0] != "buddy_name"])


def test_child_reachability_booleans_must_equal_public_defaults():
    # #10: these four change what the child can reach, so a family value must never pass as public.
    vals = dict(CLEAN)
    for k, bad in (("aboutme_unlock_all", "true"), ("try_v3", "false"), ("try_enabled", "false"),
                   ("try_allow_supervised", "false")):
        changed = dict(vals); changed[k] = bad
        assert mod.check(list(changed.items())), k
        assert mod.check([v for v in CLEAN if v[0] != k]), k + " missing must fail closed"


def _non_default(v):
    return {"": "x", "true": "false", "false": "true"}.get(v, v + "1")


@pytest.mark.parametrize("key", sorted(mod.PUBLIC_DEFAULTS))
def test_every_public_default_is_enforced(key):
    # Any family-controlled value that differs from the public default, or is missing, must fail (#10).
    changed = dict(CLEAN); changed[key] = _non_default(mod.PUBLIC_DEFAULTS[key])
    assert mod.check(list(changed.items())), key + " changed must fail"
    assert mod.check([v for v in CLEAN if v[0] != key]), key + " missing must fail closed"
