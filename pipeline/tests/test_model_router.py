import json, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from model_router import (ResultCache, truncate_payload, MAX_TRANSCRIPT_CHARS, Router, Budget, RouteLog, Reply, Item, HAIKU, SONNET, OPUS, cost_usd,
                          OPUS_WEEKLY_MAX_CALLS, weekly_reject_sample)


class FakeBackend:
    """Scripted replies per (model) or per (model, task); records calls; optional batch method."""
    def __init__(self, by_model, batch=False):
        self.by_model, self.calls, self.batches = by_model, [], 0
        if batch:
            self.complete_many = self._many

    def complete(self, model, task, payload):
        self.calls.append((model, task.name))
        d = self.by_model.get((model, task.name), self.by_model.get(model))
        if d is None:
            return Reply({}, 100, 10, valid=False)
        return Reply(d, 3000, 700)

    def _many(self, model, task, payloads):
        self.batches += 1
        return [self.complete(model, task, p) for p in payloads]


def good(total=34, fear=1, conf=0.9, **kw):
    # sub-scores consistent with the total: 5*s + 3..15 must contain it
    sub = 4 if not isinstance(total, (int, float)) else max(1, min(5, int((total - 3) // 5)))
    return {"total": total, "learning": sub, "ageFit": sub, "pacing": sub, "fearTone": fear,
            "confidence": conf, "safety": "ok", **kw}


TRUSTED = dict(tier=1, first10=False)


def run(by_model, lang="en", flags=None, cap=2.0, tier=1, first10=False):
    b = FakeBackend(by_model)
    r = Router(b, Budget(weekly_cap_usd=cap), RouteLog())
    return r.score_video("vid1", {"t": "x"}, lang, flags, tier, first10), b


def models(b):
    return [m for m, _ in b.calls]


# --- cheap models may only reject ------------------------------------------------------------
def test_haiku_can_reject_alone_for_tier2_english():
    v, b = run({HAIKU: good(total=18)}, tier=2)
    assert v.decision == "reject" and models(b) == [HAIKU] and v.model_only_reject


def test_haiku_rejects_high_fear_alone_for_tier2():
    v, b = run({HAIKU: good(total=35, fear=4)}, tier=2)
    assert v.decision == "reject" and models(b) == [HAIKU]


def test_tier1_haiku_reject_is_confirmed_by_sonnet():
    v, b = run({HAIKU: good(total=18), SONNET: good(total=33), OPUS: good(total=32)})
    assert models(b)[:2] == [HAIKU, SONNET] and "reject_needs_confirmation" in v.reasons
    assert v.decision == "human"            # big disagreement -> Opus -> person


def test_tier1_reject_stands_when_sonnet_agrees():
    v, _ = run({HAIKU: good(total=18), SONNET: good(total=20)})
    assert v.decision == "reject" and not v.model_only_reject


def test_non_english_haiku_reject_is_never_model_only():
    v, b = run({HAIKU: good(total=18), SONNET: good(total=20)}, lang="kn", tier=2)
    assert (SONNET, "lang_review") in b.calls and not v.model_only_reject


def test_haiku_never_accepts_alone():
    v, b = run({HAIKU: good(total=38), SONNET: good(total=36)})
    assert v.decision == "accept" and models(b) == [HAIKU, SONNET, SONNET]
    assert (SONNET, "safety_check") in b.calls


# --- safety check before accept --------------------------------------------------------------
def test_safety_check_unsafe_blocks_accept():
    v, _ = run({HAIKU: good(total=36), SONNET: good(total=36),
                (SONNET, "safety_check"): {"safety": "unsafe"}})
    assert v.decision != "accept"


def test_safety_check_missing_goes_human():
    v, _ = run({HAIKU: good(total=36), SONNET: good(total=36), (SONNET, "safety_check"): None})
    assert v.decision == "human" and "safety_check_missing" in v.reasons


def test_unsure_safety_goes_to_opus_then_human():
    v, b = run({HAIKU: good(), SONNET: good(), (SONNET, "safety_check"): {"safety": "unsure"},
                OPUS: good()})
    assert OPUS in models(b) and v.decision == "human"


# --- fail closed -----------------------------------------------------------------------------
def test_missing_fear_or_safety_keys_fail_closed():
    s = good(total=36); del s["fearTone"]; del s["safety"]
    v, _ = run({HAIKU: good(total=36), SONNET: s})
    assert v.decision == "human" and "sonnet_unavailable_or_malformed" in v.reasons


def test_non_numeric_score_fails_closed():
    v, _ = run({HAIKU: good(total=36), SONNET: good(total="high")})
    assert v.decision == "human"


def test_malformed_haiku_still_needs_sonnet_and_safety():
    v, b = run({HAIKU: None, SONNET: good(total=35)})
    assert "haiku_malformed" in v.reasons and v.decision == "accept" and (SONNET, "safety_check") in b.calls


def test_defaults_are_fail_safe():
    b = FakeBackend({HAIKU: good(total=36), SONNET: good(total=36)})
    v = Router(b, Budget(), RouteLog()).score_video("x", {})      # no tier/first10 given
    assert v.decision == "human"


# --- routing to people -----------------------------------------------------------------------
def test_borderline_goes_human():
    v, _ = run({HAIKU: good(total=28), SONNET: good(total=28)})
    assert v.decision == "human"


def test_disagreement_goes_to_opus_then_human():
    v, b = run({HAIKU: good(total=33), SONNET: good(total=26), OPUS: good(total=31)})
    assert models(b) == [HAIKU, SONNET, OPUS] and v.decision == "human"


def test_non_english_always_human():
    v, b = run({HAIKU: good(total=36), SONNET: good(total=36)}, lang="kn")
    assert v.decision == "human" and (SONNET, "lang_review") in b.calls


def test_rule_flags_force_human():
    v, _ = run({HAIKU: good(total=36), SONNET: good(total=36)}, flags=["R7:volcano"])
    assert v.decision == "human"


def test_fear_3_is_human():
    v, _ = run({HAIKU: good(total=36, fear=3), SONNET: good(total=36, fear=3)})
    assert v.decision == "human"


def test_tier2_high_score_goes_human():
    v, _ = run({HAIKU: good(total=36), SONNET: good(total=36)}, tier=2)
    assert v.decision == "human"


def test_first10_of_channel_goes_human():
    v, _ = run({HAIKU: good(total=36), SONNET: good(total=36)}, first10=True)
    assert v.decision == "human"


# --- budget ----------------------------------------------------------------------------------
def test_budget_exhaustion_goes_human_never_accept():
    v, b = run({HAIKU: good(total=36), SONNET: good(total=36)}, cap=0.0001)
    assert v.decision == "human" and b.calls == []


def test_opus_weekly_cap():
    b = FakeBackend({HAIKU: good(total=33), SONNET: good(total=26), OPUS: good(total=31)})
    budget = Budget(weekly_cap_usd=100)
    r = Router(b, budget, RouteLog())
    for i in range(OPUS_WEEKLY_MAX_CALLS + 3):
        v = r.score_video(f"v{i}", {}, "en", None, 1, False)
    assert budget.opus_calls == OPUS_WEEKLY_MAX_CALLS
    assert "opus_capped_or_malformed" in v.reasons and v.decision == "human"


def test_budget_persists_across_runs_via_route_log():
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "route_log.jsonl")
        week = time.time() - 60
        b1 = Budget.load(path, week)
        Router(FakeBackend({HAIKU: good(total=36), SONNET: good(total=36)}), b1,
               RouteLog(path)).score_video("a", {}, "en", None, 1, False)
        b2 = Budget.load(path, week)
        assert abs(b2.spent_usd - b1.spent_usd) < 1e-9 and b2.spent_usd > 0


# --- batching --------------------------------------------------------------------------------
def test_stages_run_as_batches():
    b = FakeBackend({HAIKU: good(total=36), SONNET: good(total=36)}, batch=True)
    r = Router(b, Budget(weekly_cap_usd=100), RouteLog())
    items = [Item(f"v{i}", {}, "en", [], 1, False) for i in range(20)]
    out = r.score_many(items)
    assert all(v.decision == "accept" for v in out.values())
    assert b.batches == 3          # triage, final_text, safety_check — one batch each, not 60 calls


def test_weekly_cost_estimate_is_small_with_batch():
    c = 300 * cost_usd(HAIKU, 2700, 700, True) + 120 * 2 * cost_usd(SONNET, 2700, 700, True)
    assert c < 2.0


# --- reject sample ---------------------------------------------------------------------------
def test_weekly_reject_sample_includes_model_only_rejects():
    b = FakeBackend({HAIKU: good(total=10), SONNET: good(total=10)}, batch=True)
    r = Router(b, Budget(weekly_cap_usd=100), RouteLog())
    items = [Item(f"m{i}", {}, "en", [], 2, True) for i in range(8)] + \
            [Item(f"t{i}", {}, "en", [], 1, False) for i in range(8)]
    out = r.score_many(items)
    sample = weekly_reject_sample(out, {}, n=10)
    assert len(sample) == 10 and sum(1 for v in sample if out[v].model_only_reject) >= 5


# --- v0.4: ranges, consistency, robustness ----------------------------------------------------
def test_out_of_range_total_fails_closed():
    v, _ = run({HAIKU: good(total=36), SONNET: {**good(total=36), "total": 300}})
    assert v.decision == "human"


def test_negative_fear_fails_closed():
    v, _ = run({HAIKU: good(total=36), SONNET: good(total=36, fear=-5)})
    assert v.decision == "human"


def test_total_inconsistent_with_subscores_fails_closed():
    v, _ = run({HAIKU: good(total=36), SONNET: {**good(total=36), "learning": 3, "ageFit": 3, "pacing": 3, "total": 40}})
    assert v.decision == "human"


def test_duplicate_ids_rejected():
    import pytest
    r = Router(FakeBackend({HAIKU: good()}), Budget(), RouteLog())
    with pytest.raises(ValueError):
        r.score_many([Item("a", {}), Item("a", {})])


def test_short_batch_goes_to_sonnet_or_human_and_releases_budget():
    class Short(FakeBackend):
        def _many(self, model, task, payloads):
            return [self.complete(model, task, p) for p in payloads[:1]]
    b = Short({HAIKU: good(total=36), SONNET: good(total=36)}, batch=True)
    budget = Budget(weekly_cap_usd=100)
    out = Router(b, budget, RouteLog()).score_many([Item("a", {}, "en", [], 1, False), Item("b", {}, "en", [], 1, False)])
    assert out["b"].decision != "accept"
    assert budget.spent_usd < 1.0          # reservations released, not leaked


def test_cache_avoids_repaying_on_rerun():
    with tempfile.TemporaryDirectory() as d:
        cpath = os.path.join(d, "cache.jsonl")
        b = FakeBackend({HAIKU: good(total=36), SONNET: good(total=36)})
        Router(b, Budget(), RouteLog(), cache=ResultCache(cpath)).score_many([Item("a", {}, "en", [], 1, False, "h1")])
        n = len(b.calls)
        v = Router(b, Budget(), RouteLog(), cache=ResultCache(cpath)).score_many([Item("a", {}, "en", [], 1, False, "h1")])["a"]
        assert len(b.calls) == n and v.decision == "accept" and "cached" in v.reasons
        Router(b, Budget(), RouteLog(), cache=ResultCache(cpath)).score_many([Item("a", {}, "en", [], 1, False, "h2")])
        assert len(b.calls) > n                      # changed inputs -> re-scored


def test_long_transcripts_are_truncated():
    p = truncate_payload({"transcript": "x" * 50_000})
    assert len(p["transcript"]) <= MAX_TRANSCRIPT_CHARS + 20


def test_first10_zero_or_none_counts_as_new():
    for val in (0, None, "no"):
        v, _ = run({HAIKU: good(total=36), SONNET: good(total=36)}, first10=val)
        assert v.decision == "human"
