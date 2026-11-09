#!/usr/bin/env python3
"""Audit fixed OOS provenance and coverage; never tune or simulate missing bars."""
import csv
import hashlib
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
PROTOCOL = ROOT / "reports/native-v080/continuation-2026-11-05/prospective-oos-protocol.json"
RAW = ROOT / "reports/native-v090/tradingview-strategy-diagnostics-2026-11-08-repeat.csv"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def iso(value):
    return datetime.fromtimestamp(value / 1000, timezone.utc).isoformat()


def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + "\n")


def summary(positions):
    gross = sum(p["grossBeforeCommission"] for p in positions)
    commission = sum(p["commission"] for p in positions)
    net = sum(p["net"] for p in positions)
    assert abs(gross - commission - net) < 1e-7
    wins = [p for p in positions if p["net"] > 0]
    losses = [p for p in positions if p["net"] < 0]
    cumulative = peak = drawdown = 0
    for p in sorted(positions, key=lambda p: (p["exitTime"], p["entryTime"])):
        cumulative += p["net"]
        peak = max(peak, cumulative)
        drawdown = max(drawdown, peak - cumulative)
    return {
        "completePositions": len(positions),
        "actualExitRows": sum(p["actualExitRows"] for p in positions),
        "wins": len(wins),
        "losses": len(losses),
        "breakevens": len(positions) - len(wins) - len(losses),
        "grossBeforeCommission": gross,
        "commission": commission,
        "net": net,
        "meanNet": net / len(positions) if positions else None,
        "netPositionProfitFactor": sum(p["net"] for p in wins) / -sum(p["net"] for p in losses) if losses else None,
        "closedPositionDrawdownFromZero": drawdown,
        "intratradeDrawdown": None,
        "intratradeDrawdownStatus": "UNAVAILABLE_FROM_POSITION_SUMMARY",
        "sparseSample": len(positions) < 30,
        "positionsByModule": dict(Counter(p["module"] for p in positions)),
        "costTreatment": "Net already includes commission. Slippage is embedded in native fills; no second deduction. No spread assumed.",
    }


protocol = json.loads(PROTOCOL.read_text())
source = ROOT / protocol["strategySource"]
references = [*protocol["configurationDefinition"]["actualReferenceCaptures"], protocol["configurationDefinition"]["propertiesReference"]]
checks = [{"path": p["path"], "expectedSha256": p["sha256"], "actualSha256": sha(ROOT / p["path"]), "match": p["sha256"] == sha(ROOT / p["path"])} for p in references]
assert sha(source) == protocol["strategySourceSha256"]
assert all(p["match"] for p in checks)

rows = list(csv.DictReader(RAW.open()))
messages = [r["Message"] for r in rows]
node_code = """import { analyzePlanOutcomes } from './scripts/analyze-plan-outcomes.mjs';
let s=''; for await (const c of process.stdin) s+=c;
process.stdout.write(JSON.stringify(analyzePlanOutcomes(s,process.argv[1])));
"""
proc = subprocess.run(["node", "--input-type=module", "-e", node_code, str(RAW.relative_to(ROOT))], input="\n".join(messages), text=True, cwd=ROOT, check=True, capture_output=True)
analysis = json.loads(proc.stdout)
write("existing-strategy-outcomes.json", analysis)

start = protocol["researchWindowUTC"]["startMs"]
end = protocol["researchWindowUTC"]["endMs"]
positions = analysis["positions"]
overlap = [p for p in positions if start <= p["entryTime"] < end]
markers = {m: [json.loads(s.split(m + " ", 1)[1]) for s in messages if m + " " in s] for m in ["PLAN_AUDIT", "TRADE_EXIT_AUDIT", "TRADE_GROUP_AUDIT", "SIGNAL_DIAG"]}
plans = markers["PLAN_AUDIT"]
diag = markers["SIGNAL_DIAG"]
now = datetime.now(timezone.utc)
capture_first = min(p["entryTime"] for p in positions)
capture_last = max(p["exitTime"] for p in positions)
early_plans = [p for p in plans if p["timestamp"] < start]
exploratory = {
    "status": "EXPLORATORY_ALREADY_INSPECTED_SUBSET_NOT_OOS",
    "rawPath": str(RAW.relative_to(ROOT)),
    "rawSha256": sha(RAW),
    "selection": "Actual entryTime >= original protocol start and < original protocol end; this is a slice of an all-history run, not a new window-restricted run.",
    "summary": summary(overlap),
    "byModule": {m: summary([p for p in overlap if p["module"] == m]) for m in sorted(set(p["module"] for p in overlap))},
    "positions": overlap,
    "incompletePositionsInFullCapture": analysis["incompletePositions"],
    "plansWithoutExitRowsInFullCapture": analysis["plansWithoutExitRows"],
    "limitations": [
        "These Nov6 observations were already examined in Tester/diagnostic work. They are not a newly untouched holdout.",
        "Pre-Nov6 admitted plans demonstrate that this run did not apply the protocol admission window. Carry-in equity, session quota and active/pending state can change later sizing and selections.",
        "Exact frozen protocol source is strategy_quantity_units.pine; latest native CSV was the diagnostics wrapper. Static similarity does not supply missing native source/settings provenance.",
        "The 4 positions do not establish module efficacy, statistical power, or future profitability; no parameters are selected from their outcomes.",
    ],
}
write("exploratory-protocol-overlap.json", exploratory)

audit = {
    "schema": "prospective-oos-coverage-audit/v1",
    "auditedAtUTC": now.isoformat(),
    "status": "INCOMPLETE_FUTURE_WINDOW_AND_NATIVE_PROTOCOL_RUN_MISSING",
    "protocolPath": str(PROTOCOL.relative_to(ROOT)),
    "protocolSha256": sha(PROTOCOL),
    "protocolPreparedAtUTC": protocol["preparedAtUTC"],
    "protocolRuntimeAppliedClaim": protocol["runtimeApplied"],
    "independentlyRegistered": protocol["independentlyRegistered"],
    "frozenSource": {"path": protocol["strategySource"], "sha256": sha(source), "matchesProtocol": True},
    "referenceHashChecks": checks,
    "plannedWindowUTC": protocol["researchWindowUTC"],
    "windowEndIsFutureAtAudit": now.timestamp() * 1000 < end,
    "latestNativeStrategyCoverage": {
        "path": str(RAW.relative_to(ROOT)), "sha256": sha(RAW),
        "actualSourcePath": "pine/experiments/strategy_signal_diagnostics.pine",
        "actualSourceSha256OnDisk": sha(ROOT / "pine/experiments/strategy_signal_diagnostics.pine"),
        "firstEntryUTC": iso(capture_first), "lastExitUTC": iso(capture_last),
        "firstPlanUTC": iso(min(p["timestamp"] for p in plans)), "lastPlanUTC": iso(max(p["timestamp"] for p in plans)),
        "completePositions": len(positions), "actualExitRows": sum(p["actualExitRows"] for p in positions),
        "preProtocolPlans": len(early_plans),
        "protocolAdmissionWindowApplied": False,
        "admissionWindowEvidence": "Native PLAN_AUDIT records before Nov6 start; not inferred merely from source defaults.",
        "newUntouchedOosPositionsEstablished": 0,
        "newUntouchedOosPositionsStatus": "NOT_ESTABLISHED; zero is not a claim that no future trades occur.",
        "boundedDiagnosticBars": sum(p["kind"] == "BAR" for p in diag),
        "firstLoadedBarTimeUTC": iso(diag[0]["firstDataTime"]),
        "completePreWindowWarmupBarCount": None,
        "warmupStatus": "FIRST_DATA_TIME_BEFORE_START_BUT_1000_ACTUAL_PRE_WINDOW_BARS_NOT_EXPORTED_OR_COUNTED",
    },
    "prospectiveAvailability": {
        "originalProtocol": "Can only be completed after Nov20 UTC and after any carried position closes; full runtime settings and every admitted/missing/open plan remain required.",
        "untouchedFutureTailCandidate": {"startInclusiveUTC": "2026-11-10T00:00:00+00:00", "endExclusiveUTC": "2026-11-20T00:00:00+00:00", "status": "FUTURE_AT_AUDIT_NOT_EXECUTED_NOT_A_REPLACEMENT_PROTOCOL", "conditions": "Keep the existing frozen source/inputs/properties; disclose this as a new continuation if used. Do not substitute it silently for Nov6-Nov20 or claim an outcome before bars exist."},
    },
    "missingEvidence": [
        "Native run of exact protocol source bf6dd641... with Nov6-Nov20 research admission restriction actually applied and full source copy-back, all Inputs and Strategy Properties captured.",
        "At least 1000 preceding actual M5 calculation bars, verified by a counted history/bar export or bounded diagnostic trace; firstDataTime alone is insufficient.",
        "Remaining future market bars through Nov20 and all plan/order/fill/exit records, including open or unmatched positions and cross-end closure follow-up.",
        "Adequate independent chronological sample. Protocol labels fewer than 30 complete positions inconclusive; 30 is not a power guarantee.",
        "Separate intratrade and closed-position drawdown evidence; existing position summaries only reconstruct the latter.",
    ],
    "safety": {"sourcesChanged": False, "parametersRetuned": False, "syntheticBarsCreated": False, "alternateFeedFetched": False, "automationCreated": False},
}
assert audit["windowEndIsFutureAtAudit"]
write("protocol-and-coverage-audit.json", audit)
print(json.dumps({"frozenSourceMatches": True, "referenceHashesMatch": len(checks), "fullExistingCapture": analysis["counts"], "exploratoryOverlap": exploratory["summary"], "futureEnd": protocol["researchWindowUTC"]["endExclusive"], "status": audit["status"]}, indent=2))
