#!/usr/bin/env python3
"""Reproduce display regression from untouched, downloaded TradingView CSVs."""
import collections
import csv
import datetime as dt
import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
REFERENCE = HERE.parent / "qualified-plan-2026-11-06/indicator-paired-raw.csv"
EXPECTED = {
    REFERENCE: "b7bda756ed58a028a2a599db4c78582fd29b435fea56e64ecdf7130781963273",
    HERE / "indicator-before-save-raw.csv": "6cae46557a6ff0350f5656d9d3453da9e4ed94c9f4736f56c7abcdb0131f8e55",
    HERE / "indicator-after-reload-raw.csv": "6cae46557a6ff0350f5656d9d3453da9e4ed94c9f4736f56c7abcdb0131f8e55",
}
WIB = dt.timezone(dt.timedelta(hours=7))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    assert digest(path) == EXPECTED[path], f"Preserved evidence changed: {path}"
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        assert reader.fieldnames == ["Date", "Message"]
        rows = list(reader)
    plans = {}
    for row in rows:
        if not row["Message"].startswith("PLAN_AUDIT "):
            continue
        plan = json.loads(row["Message"][len("PLAN_AUDIT "):])
        key = (plan["symbol"], plan["timeframe"], plan["timestamp"])
        assert key not in plans, f"Duplicate plan: {key}"
        plans[key] = plan
    # Validate actual audit contracts with the existing production research parser.
    text = "\n".join(r["Message"] for r in rows if r["Message"].startswith("PLAN_AUDIT "))
    validated = subprocess.run(
        ["node", "--input-type=module", "-e",
         "import{parsePlanAudit}from'./scripts/compare-plan-audit.mjs';"
         "let s='';for await(const c of process.stdin)s+=c;"
         "console.log(parsePlanAudit(s).length)"],
        cwd=ROOT, input=text, text=True, capture_output=True, check=True,
    )
    assert int(validated.stdout) == len(plans)
    return rows, plans


def compare(left, right):
    a, ap = left
    b, bp = right
    common = sorted(ap.keys() & bp.keys())
    mismatches = [{"key": key, "before": ap[key], "after": bp[key]}
                  for key in common if ap[key] != bp[key]]
    ac = collections.Counter(r["Message"] for r in a)
    bc = collections.Counter(r["Message"] for r in b)
    return {
        "tolerance": 0, "beforePlans": len(ap), "afterPlans": len(bp),
        "commonPlans": len(common), "exactCommonPlans": len(common) - len(mismatches),
        "mismatches": mismatches, "missingPlans": sorted(ap.keys() - bp.keys()),
        "additionalPlans": [bp[key] for key in sorted(bp.keys() - ap.keys())],
        "beforeMessages": len(a), "afterMessages": len(b),
        "missingMessageOccurrences": sum((ac - bc).values()),
        "additionalMessageOccurrences": sum((bc - ac).values()),
        "allDateAndMessageRowsEqual": a == b,
    }


old = load(REFERENCE)
before_path = HERE / "indicator-before-save-raw.csv"
after_path = HERE / "indicator-after-reload-raw.csv"
before, after = load(before_path), load(after_path)
regression = compare(old, before)
reload = compare(before, after)
assert not regression["mismatches"] and not regression["missingPlans"]
assert regression["missingMessageOccurrences"] == 0
assert reload["allDateAndMessageRowsEqual"] and before_path.read_bytes() == after_path.read_bytes()
inputs = json.loads((HERE / "indicator-runtime-inputs.json").read_text())
assert inputs["inputCount"] == 117
assert all(inputs["inputSettings"]["enable" + letter] for letter in "ABCDEFGH")
assert inputs["inputSettings"]["sessionZone"] == "Europe/London"
assert inputs["inputSettings"]["useResearchWindow"] is False
assert digest(ROOT / "pine/experiments/indicator_jakarta_ladder.pine") == inputs["sourceSha256"]
assert digest(HERE / "indicator-editor-copy.pine") == inputs["sourceSha256"]
dates = [dt.datetime.fromisoformat(r["Date"]) for r in after[0]]
assert all(x.utcoffset() == dt.timedelta(hours=7) for x in dates)
result = {
    "scope": "Same-model Indicator display regression and one native chart reload; not cross-model parity or candle-by-candle Replay.",
    "sourceSha256": inputs["sourceSha256"],
    "runtimeInputs": 117, "allModulesEnabled": True,
    "chartAndCardDisplayZone": "Asia/Jakarta (UTC+7 / WIB)",
    "sessionZoneUnchanged": "Europe/London", "researchWindowEnabled": False,
    "referenceComparison": regression, "reloadComparison": reload,
    "rawFileHashes": {str(p.relative_to(ROOT)): digest(p) for p in EXPECTED},
    "logPrefixRangeWIB": {"first": min(dates).isoformat(), "last": max(dates).isoformat()},
    "modulePlanCounts": dict(sorted(collections.Counter(p["strategy"] for p in after[1].values()).items())),
    "additionalPlansWIB": [dict(p, timestampWIB=dt.datetime.fromtimestamp(p["timestamp"] / 1000, WIB).isoformat())
                           for p in regression["additionalPlans"]],
    "profitabilityEstablished": False,
}
(HERE / "display-verification.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"referenceExactPlans": regression["exactCommonPlans"],
                  "reloadExactPlans": reload["exactCommonPlans"],
                  "reloadMessages": reload["afterMessages"],
                  "reloadFilesByteIdentical": True}, indent=2))
