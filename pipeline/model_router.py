"""Model router for the Wonder Window curation pipeline (v0.4).

Picks the cheapest Claude model that is good enough for each job, escalates to a stronger model only
when the result is uncertain or safety-relevant, and enforces a persistent weekly budget.

Safety principles (tested in tests/test_model_router.py):
  1. A cheap model may REJECT on its own only for English videos from Tier-2 channels. It is never the
     only model that ACCEPTS anything.
  2. Every auto-accept needs a Sonnet score AND a separately prompted Sonnet safety_check that says "ok".
  3. Missing, malformed, non-numeric, out-of-range or internally inconsistent fields fail CLOSED
     (human queue), never open.
  4. Budget pressure can only send work to the human queue.
  5. Every Opus-adjudicated case, every kn/hi video, every Tier-2 video and the first 10 of a channel go
     to a person.

Token estimates drive the budget reservation; the caller must truncate payloads to the estimate
(transcript excerpt <= 2.5k tokens) so real spend can't overshoot the cap. week_start_epoch for
Budget.load = most recent Sunday 00:00 Asia/Kolkata (the weekly launchd run computes it).

Work runs stage by stage over the whole week's batch (triage -> confirm -> safety -> adjudicate) so a
backend can use the Message Batches API (complete_many). Not implemented here yet: vision_frames and
tryit_pick calls (registered below; wired in v1 together with the batch backend).
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Protocol

# ---------------------------------------------------------------- models & prices
HAIKU, SONNET, OPUS = "claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"

# USD per million tokens (input, output), standard API; the Batch API is 50% of these.
# Read from the Claude pricing page on 16 Nov 2026 (spec/tech.md §3.4). Re-check before changing caps.
PRICES = {HAIKU: (0.10, 0.50), SONNET: (2.00, 10.00), OPUS: (4.00, 20.00)}


def cost_usd(model: str, tokens_in: int, tokens_out: int, batch: bool) -> float:
    p_in, p_out = PRICES[model]
    c = (tokens_in * p_in + tokens_out * p_out) / 1_000_000
    return c * (0.5 if batch else 1.0)


# ---------------------------------------------------------------- task registry
@dataclass(frozen=True)
class Task:
    name: str
    model: str
    escalate_to: Optional[str]
    batch: bool
    max_tokens: int
    vision: bool = False
    purpose: str = ""


TASKS: Dict[str, Task] = {t.name: t for t in [
    Task("triage", HAIKU, SONNET, True, 600, purpose="First pass on every candidate."),
    Task("final_text", SONNET, OPUS, True, 900, purpose="Scores + kid title, extractive fact card, parent question."),
    Task("lang_review", SONNET, None, True, 700, purpose="kn/hi scoring + English summary; always human too."),
    Task("safety_check", SONNET, OPUS, True, 300, purpose="Independent hazard/fear check of all child-facing text."),
    Task("adjudicate", OPUS, None, True, 900, purpose="Resolve disagreement or unsure safety; capped per week. Batched (weekly run)."),
    Task("tryit_pick", HAIKU, SONNET, True, 200, purpose="(v1) Pick a vetted Try-it template id + slot."),
    Task("vision_frames", SONNET, None, True, 300, vision=True, purpose="(v1) Calm-thumbnail frame check."),
]}

BORDERLINE = (24.0, 32.0)
DISAGREE_POINTS = 6.0
MIN_CONFIDENCE = 0.7
OPUS_WEEKLY_MAX_CALLS = 15
SCORE_KEYS = ("total", "learning", "ageFit", "pacing", "fearTone")
TRIAGE_KEYS = SCORE_KEYS + ("confidence",)
FULL_KEYS = SCORE_KEYS + ("safety",)


# ---------------------------------------------------------------- backend
@dataclass
class Reply:
    data: dict
    tokens_in: int
    tokens_out: int
    valid: bool = True


class Backend(Protocol):
    def complete(self, model: str, task: Task, payload: dict) -> Reply: ...


def complete_many(backend, model: str, task: Task, payloads: List[dict]) -> List[Reply]:
    """Use the backend's batch call if it has one (Message Batches API), else loop."""
    if hasattr(backend, "complete_many"):
        return backend.complete_many(model, task, payloads)
    return [backend.complete(model, task, p) for p in payloads]


RANGES = {"total": (0, 40), "learning": (1, 5), "ageFit": (1, 5), "pacing": (1, 5),
          "fearTone": (1, 5), "confidence": (0, 1)}


def well_formed(r: Optional[Reply], keys) -> bool:
    """Fail closed: every required key present, numeric keys finite numbers inside their range,
    safety in a known set, and the total consistent with the weighted sub-scores
    (2*learning + 1.5*ageFit + 1.5*pacing plus 3..15 from the three x1 dimensions)."""
    if r is None or not r.valid or not isinstance(r.data, dict):
        return False
    d = r.data
    for k in keys:
        v = d.get(k)
        if k == "safety":
            if v not in ("ok", "unsure", "unsafe"):
                return False
            continue
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v != v or v in (float("inf"), float("-inf")):
            return False
        lo, hi = RANGES.get(k, (float("-inf"), float("inf")))
        if not lo <= v <= hi:
            return False
    if all(k in keys for k in ("total", "learning", "ageFit", "pacing")):
        partial = 2 * d["learning"] + 1.5 * d["ageFit"] + 1.5 * d["pacing"]
        if not partial + 3 - 0.5 <= d["total"] <= partial + 15 + 0.5:
            return False
    return True


# ---------------------------------------------------------------- budget (persistent) & log
@dataclass
class RouteLog:
    path: Optional[str] = None
    entries: List[dict] = field(default_factory=list)

    def add(self, video_id: str, step: str, model: str, reason: str, **extra) -> None:
        e = {"t": round(time.time(), 1), "video": video_id, "step": step, "model": model,
             "reason": reason, **extra}
        self.entries.append(e)
        if self.path:
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps(e, ensure_ascii=False) + "\n")


@dataclass
class Budget:
    weekly_cap_usd: float = 2.00
    spent_usd: float = 0.0
    opus_calls: int = 0

    @classmethod
    def load(cls, route_log_path: str, week_start_epoch: float, weekly_cap_usd: float = 2.00) -> "Budget":
        """Rebuild this week's spend from route_log.jsonl so caps survive restarts and re-runs."""
        b = cls(weekly_cap_usd=weekly_cap_usd)
        if os.path.exists(route_log_path):
            with open(route_log_path, encoding="utf-8") as f:
                for line in f:
                    try:
                        e = json.loads(line)
                    except ValueError:
                        continue
                    if e.get("t", 0) >= week_start_epoch and "cost_usd" in e:
                        b.spent_usd += float(e["cost_usd"])
                        if e.get("model") == OPUS:
                            b.opus_calls += 1
        return b

    def can_spend(self, model: str, est_in: int, est_out: int, batch: bool) -> bool:
        if model == OPUS and self.opus_calls >= OPUS_WEEKLY_MAX_CALLS:
            return False
        return self.spent_usd + cost_usd(model, est_in, est_out, batch) <= self.weekly_cap_usd

    def charge(self, model: str, r: Reply, batch: bool) -> float:
        c = cost_usd(model, r.tokens_in, r.tokens_out, batch)
        self.spent_usd += c
        if model == OPUS:
            self.opus_calls += 1
        return c


# ---------------------------------------------------------------- payload truncation & result cache
MAX_TRANSCRIPT_CHARS = 10_000      # ~2.5k tokens; matches the default token estimate


def truncate_payload(payload: dict) -> dict:
    """Enforce the token estimate the budget relies on: start/middle/end excerpts of long transcripts."""
    t = payload.get("transcript")
    if isinstance(t, str) and len(t) > MAX_TRANSCRIPT_CHARS:
        k = MAX_TRANSCRIPT_CHARS // 3
        mid = len(t) // 2
        payload = {**payload, "transcript": t[:k] + " [...] " + t[mid - k // 2: mid + k // 2] + " [...] " + t[-k:]}
    return payload


class ResultCache:
    """Verdicts keyed by (videoId, inputsHash) so re-runs and crash-restarts don't re-pay (tech §3.2)."""
    def __init__(self, path: Optional[str] = None):
        self.path, self.data = path, {}
        if path and os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                for line in f:
                    try:
                        e = json.loads(line)
                        self.data[(e["video"], e["inputsHash"])] = e["verdict"]
                    except (ValueError, KeyError):
                        continue

    def get(self, vid: str, h: str) -> Optional[dict]:
        return self.data.get((vid, h))

    def put(self, vid: str, h: str, v: "Verdict") -> None:
        rec = {"decision": v.decision, "scores": v.scores, "models_used": v.models_used,
               "reasons": v.reasons, "model_only_reject": v.model_only_reject}
        self.data[(vid, h)] = rec
        if self.path:
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps({"video": vid, "inputsHash": h, "verdict": rec}, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------- items & verdicts
@dataclass
class Item:
    vid: str
    payload: dict
    lang: str = "en"
    flags: List[str] = field(default_factory=list)
    tier: int = 2                 # fail-safe defaults: unknown channel = Tier 2, treated as new
    first10: bool = True
    inputs_hash: Optional[str] = None   # sha256 of title|description|duration|transcript|rubric|prompt
    # filled in as stages run
    h: Optional[dict] = None
    s: Optional[dict] = None
    safety: Optional[dict] = None
    o: Optional[dict] = None
    used: List[str] = field(default_factory=list)
    reasons: List[str] = field(default_factory=list)
    final: Optional[str] = None   # set when a stage decides early


@dataclass
class Verdict:
    decision: str                 # "reject" | "accept" | "human"
    scores: dict
    models_used: List[str]
    reasons: List[str]
    model_only_reject: bool = False


# ---------------------------------------------------------------- router
class Router:
    def __init__(self, backend: Backend, budget: Budget, log: RouteLog,
                 est_tokens: Callable[[str, dict], tuple] = lambda task, p: (3000, 700),
                 cache: Optional[ResultCache] = None):
        self.backend, self.budget, self.log, self.est = backend, budget, log, est_tokens
        self.cache = cache

    # one stage over many items, with the budget checked per item before the batch is sent
    def _stage(self, task_name: str, model: str, items: List[Item], build: Callable[[Item], dict],
               why: Callable[[Item], str]) -> Dict[str, Optional[Reply]]:
        task = TASKS[task_name]
        allowed, out = [], {}
        for it in items:
            ti, to = self.est(task_name, it.payload)
            if self.budget.can_spend(model, ti, to, task.batch):
                allowed.append(it)
                self.budget.spent_usd += cost_usd(model, ti, to, task.batch)   # reserve
                if model == OPUS:
                    self.budget.opus_calls += 1
            else:
                out[it.vid] = None
                self.log.add(it.vid, task_name, model, "budget_block:" + why(it))
        replies = complete_many(self.backend, model, task, [build(it) for it in allowed]) if allowed else []
        for i, it in enumerate(allowed):
            ti, to = self.est(task_name, it.payload)
            self.budget.spent_usd -= cost_usd(model, ti, to, task.batch)        # release reservation
            if model == OPUS:
                self.budget.opus_calls -= 1
            r = replies[i] if i < len(replies) else None
            if r is None:                                                       # backend returned a short batch
                out[it.vid] = Reply({}, 0, 0, valid=False)
                self.log.add(it.vid, task_name, model, "missing_reply")
                continue
            c = self.budget.charge(model, r, task.batch)
            out[it.vid] = r
            it.used.append(model)
            self.log.add(it.vid, task_name, model, why(it), tokens_in=r.tokens_in,
                         tokens_out=r.tokens_out, valid=r.valid, cost_usd=round(c, 6))
        return out

    @staticmethod
    def _escalation_reasons(it: Item) -> List[str]:
        d, why = it.h, []
        total = float(d["total"])
        if BORDERLINE[0] <= total <= BORDERLINE[1]:
            why.append("borderline_total")
        if d["fearTone"] >= 2:
            why.append("fear_tone>=2")
        if d["confidence"] < MIN_CONFIDENCE:
            why.append("low_confidence")
        if it.lang != "en":
            why.append("non_english")
        if it.flags:
            why.append("rule_flags")
        if total > BORDERLINE[1]:
            why.append("accept_needs_confirmation")
        return why

    def score_many(self, items: List[Item]) -> Dict[str, Verdict]:
        ids = [it.vid for it in items]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate video ids in one batch")
        cached = {}
        if self.cache:
            for it in items:
                hit = it.inputs_hash and self.cache.get(it.vid, it.inputs_hash)
                if hit:
                    cached[it.vid] = Verdict(hit["decision"], hit["scores"], hit["models_used"],
                                             hit["reasons"] + ["cached"], hit["model_only_reject"])
            items = [it for it in items if it.vid not in cached]
        for it in items:
            it.payload = truncate_payload(it.payload)
            it.first10 = it.first10 is not False      # anything but an explicit False counts as "new channel"
        # Stage 1: Haiku triage on everything.
        r1 = self._stage("triage", HAIKU, items, lambda it: it.payload, lambda it: "first_pass")
        stage2 = []
        for it in items:
            r = r1.get(it.vid)
            if r is None:
                it.final, it.reasons = "human", ["no_triage_budget"]
                continue
            if not well_formed(r, TRIAGE_KEYS):
                it.reasons.append("haiku_malformed")
                stage2.append(it)
                continue
            it.h = r.data
            cheap_reject = float(it.h["total"]) < BORDERLINE[0] or it.h["fearTone"] >= 4
            if cheap_reject and it.tier != 1 and it.lang == "en":
                it.final = "reject"
                it.reasons += ["haiku_reject", "model_only_reject"]
                self.log.add(it.vid, "decide", HAIKU, "reject", model_only=True, lang=it.lang)
                continue
            if cheap_reject:
                it.reasons.append("reject_needs_confirmation")
            it.reasons += self._escalation_reasons(it)
            stage2.append(it)

        # Stage 2: Sonnet scoring (lang_review for kn/hi).
        for task_name, group in (("final_text", [i for i in stage2 if i.lang == "en"]),
                                 ("lang_review", [i for i in stage2 if i.lang != "en"])):
            r2 = self._stage(task_name, SONNET, group, lambda it: it.payload,
                             lambda it: ",".join(it.reasons) or "confirm")
            for it in group:
                r = r2.get(it.vid)
                if not well_formed(r, SCORE_KEYS):
                    it.final = "human"
                    it.reasons.append("sonnet_unavailable_or_malformed")
                else:
                    it.s = r.data

        # Stage 3: independent safety check before anything can be accepted.
        cand = [it for it in stage2 if it.final is None and self._could_accept(it, it.s)]
        r3 = self._stage("safety_check", SONNET, cand,
                         lambda it: {"childText": it.s.get("childText", {}), "video": it.payload},
                         lambda it: "pre_accept")
        for it in cand:
            r = r3.get(it.vid)
            if not well_formed(r, ("safety",)):
                it.final = "human"
                it.reasons.append("safety_check_missing")
            else:
                it.safety = r.data

        # Stage 4: Opus adjudication on disagreement or unsure safety.
        adj = []
        for it in stage2:
            if it.final is not None or it.s is None:
                continue
            disagree = it.h is not None and abs(float(it.h["total"]) - float(it.s["total"])) >= DISAGREE_POINTS
            unsure = it.s.get("safety") == "unsure" or (it.safety or {}).get("safety") == "unsure"
            if disagree or unsure:
                it.reasons.append("disagree" if disagree else "unsure_safety")
                adj.append(it)
        r4 = self._stage("adjudicate", OPUS, adj,
                         lambda it: {**it.payload, "haiku": it.h, "sonnet": it.s, "safety": it.safety},
                         lambda it: it.reasons[-1])
        for it in adj:
            r = r4.get(it.vid)
            if not well_formed(r, FULL_KEYS):
                it.final = "human"
                it.reasons.append("opus_capped_or_malformed")
            else:
                it.o = r.data

        # Decide.
        out = {}
        for it in items:
            if it.final is None:
                best = it.o or it.s
                d = self.decide(best, it)
                if d == "accept" and it.o is not None:
                    d = "human"
                    it.reasons.append("adjudicated_accept_needs_human")
                it.final = d
                self.log.add(it.vid, "decide", it.used[-1] if it.used else "-", d, lang=it.lang)
            out[it.vid] = Verdict(it.final, it.o or it.s or it.h or {}, it.used, it.reasons,
                                  "model_only_reject" in it.reasons)
            if self.cache and it.inputs_hash and "missing_reply" not in it.reasons \
                    and "no_triage_budget" not in it.reasons:
                self.cache.put(it.vid, it.inputs_hash, out[it.vid])
        out.update(cached)
        return out

    def score_video(self, vid: str, payload: dict, lang: str = "en",
                    deterministic_flags: Optional[List[str]] = None,
                    tier: int = 2, first10: bool = True) -> Verdict:
        it = Item(vid, payload, lang, list(deterministic_flags or []), tier, first10)
        return self.score_many([it])[vid]

    @staticmethod
    def _could_accept(it: Item, d: dict) -> bool:
        return (float(d["total"]) >= 30 and d["fearTone"] <= 2 and not it.flags and it.lang == "en"
                and it.tier == 1 and not it.first10 and d.get("safety") == "ok")

    def decide(self, d: dict, it: Item) -> str:
        total = float(d["total"])
        core_ok = all(d[k] >= 3 for k in ("learning", "ageFit", "pacing"))
        if total < 26 or not core_ok or d["fearTone"] >= 4 or d.get("safety") == "unsafe":
            return "reject"
        if self._could_accept(it, d) and (it.safety or {}).get("safety") == "ok":
            return "accept"
        return "human"


def weekly_reject_sample(verdicts: Dict[str, Verdict], langs: Dict[str, str], n: int = 10,
                         seed: int = 0) -> List[str]:
    """Videos a parent sees from this week's rejects: every non-English model-only reject, at least
    5 model-only rejects, the rest from rule/other rejects. (Non-English can't be model-only rejected
    by design; kept as a guard.)"""
    import random
    rng = random.Random(seed)
    rej = [v for v, x in verdicts.items() if x.decision == "reject"]
    model_only = [v for v in rej if verdicts[v].model_only_reject]
    must = [v for v in model_only if langs.get(v, "en") != "en"]
    mo_rest = [v for v in model_only if v not in must]
    rng.shuffle(mo_rest)
    pick = must + mo_rest[:max(0, 5 - len(must))]
    others = [v for v in rej if v not in pick]
    rng.shuffle(others)
    return (pick + others)[:max(n, len(must))]
