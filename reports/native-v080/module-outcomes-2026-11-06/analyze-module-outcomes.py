#!/usr/bin/env python3
"""Independent, partial-aware descriptive audit of one preserved native capture.

This does not alter Pine, select parameters, create orders, or claim an OOS edge.
Decimal arithmetic preserves the precision actually serialized in the raw JSON.
The existing JavaScript analyzer is run separately as a consistency cross-check.
"""
import collections
import csv
import hashlib
import json
import statistics
import subprocess
from datetime import datetime, timezone
from decimal import Decimal as D
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
CAPTURE = ROOT / "reports/native-v080/live-reload-2026-11-06"
RAW = CAPTURE / "stable-strategy-raw.csv"
SOURCE = ROOT / "pine/experiments/strategy_stable_display.pine"
COPY = CAPTURE / "stable-strategy-editor-copy.pine"
SETTINGS = CAPTURE / "strategy-stable-runtime-inputs.json"
EXPECTED_SOURCE = "ce6c1256bd9d29387f194be4ac715e479bf98f14bdcc0e9c697e5f4110f2aae9"
EXPECTED_RAW = "82f145f6d6617ded2052ac2c71fc3ff1bf5bcbacf07e0c3d0360d84f535ee29b"
ZERO = D(0)
TOL = D("0.0000001")  # serialized cash values are rounded; never a price tolerance


def sha(blob):
    return hashlib.sha256(blob).hexdigest()


def artifact(path):
    return {"path": str(path.relative_to(ROOT)), "sha256": sha(path.read_bytes())}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sumd(values):
    return sum(values, ZERO)


def utc(epoch):
    return datetime.fromtimestamp(epoch / 1000, timezone.utc).isoformat()


def identity(row, group=False):
    # entryId + actual entry time identify an emulator position; plan/module scope
    # guards against accidental joins between contexts with reused entry IDs.
    return (row["symbol"], row["timeframe"], row["module"],
            row["module"] if group else row["entryId"], row["entryTime"],
            row["planTimestamp"])


def plan_identity(row, plan=False):
    return (row["symbol"], row["timeframe"], row["strategy"] if plan else row["module"],
            row["timestamp"] if plan else row["planTimestamp"])


def summary(positions):
    wins = [p["net"] for p in positions if p["net"] > 0]
    losses = [p["net"] for p in positions if p["net"] < 0]
    hold = [p["holdMinutes"] for p in positions]
    positive = sumd(wins)
    negative = -sumd(losses)
    return {
        "completedPositions": len(positions),
        "closedTradeRows": sum(p["closedTradeRows"] for p in positions),
        "wins": len(wins), "losses": len(losses),
        "flat": len(positions) - len(wins) - len(losses),
        "winRate": D(len(wins)) / len(positions) if positions else None,
        "positiveGrossPositions": sum(p["grossPricePnl"] > 0 for p in positions),
        "positiveGrossButNegativeNetPositions": sum(p["grossPricePnl"] > 0 and p["net"] < 0 for p in positions),
        "grossPricePnl": sumd(p["grossPricePnl"] for p in positions),
        "commission": sumd(p["commission"] for p in positions),
        "net": sumd(p["net"] for p in positions),
        "positiveGroupNetSum": positive, "negativeGroupNetMagnitude": negative,
        "groupNetProfitFactor": positive / negative if negative else None,
        "profitFactorStatus": "FINITE" if negative else "NO_LOSSES_IN_SAMPLE" if positions else "NO_POSITIONS",
        "meanNet": sumd(p["net"] for p in positions) / len(positions) if positions else None,
        "holdingMinutes": {
            "mean": sumd(hold) / len(hold) if hold else None,
            "median": statistics.median(hold) if hold else None,
            "min": min(hold) if hold else None, "max": max(hold) if hold else None,
            "histogram": dict(sorted(collections.Counter(str(h) for h in hold).items(), key=lambda item: D(item[0]))),
        },
        "finalExitReasons": dict(sorted(collections.Counter(p["finalExitReason"] for p in positions).items())),
        "positionsWithMultipleClosedRows": sum(p["closedTradeRows"] > 1 for p in positions),
        "positionsWithExitsAtMultipleTimes": sum(len(p["actualExitTimes"]) > 1 for p in positions),
        "positionsWithAnyTpPartial": sum(p["anyTpPartial"] for p in positions),
        "anyExitCommentsOverlapping": dict(sorted(collections.Counter(c for p in positions for c in p["uniqueExitComments"]).items())),
        "sampleStatus": "NO_SELECTED_COMPLETED_POSITIONS" if not positions else "DESCRIPTIVE_ONLY_NOT_OOS",
    }


def serial(value):
    if isinstance(value, D):
        return str(value)
    raise TypeError(type(value).__name__)


source_bytes = SOURCE.read_bytes()
require(sha(source_bytes) == EXPECTED_SOURCE, "Source changed: reattribute this capture before analysis")
require(sha(RAW.read_bytes()) == EXPECTED_RAW, "Raw capture changed: preserve and reattribute before analysis")
copy_normalized = COPY.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
require(copy_normalized == source_bytes, "Normalized native copy-back differs")
source = source_bytes.decode()
require(source.count("strategy.close(") == 1 and "strategy.close_all(" not in source,
        "Time-exit inference requires a new review: close calls changed")
time_close_rule = "if strategy.position_size != 0 and timeExit > 0 and time_close - strategy.opentrades.entry_time(0) >= timeExit * 60000\n    strategy.close(selectedStrategy, comment='TRADE_CLOSED', immediately=false)"
require(time_close_rule in source, "Reviewed sole timed close rule changed")
native = json.loads(SETTINGS.read_text())
inputs = native["inputSettings"]
require(native["inputCount"] == len(inputs) == 117, "Incomplete native input capture")
require(all(inputs["enable" + m] is True for m in "ABCDEFGH"), "Modules not all enabled")
require(inputs["timeExit"] == 15 and inputs["partial"] is True, "Exit settings differ")

records = collections.defaultdict(list)
messages = []
with RAW.open(newline="") as handle:
    reader = csv.DictReader(handle)
    require(reader.fieldnames == ["Date", "Message"], "Unexpected CSV schema")
    for line, record in enumerate(reader, 2):
        messages.append(record["Message"])
        for marker in ("PLAN_AUDIT", "TRADE_EXIT_AUDIT", "TRADE_GROUP_AUDIT"):
            if record["Message"].startswith(marker + " "):
                payload = json.loads(record["Message"][len(marker) + 1:], parse_float=D)
                records[marker].append((line, payload))
                break

plans = {}
for line, plan in records["PLAN_AUDIT"]:
    key = plan_identity(plan, True)
    require(key not in plans, "Duplicate plan")
    require(plan["executionAccepted"] is True and plan["executionModel"] == "STRATEGY_EMULATOR", "Plan not accepted emulator result")
    plans[key] = (line, plan)

rows_by_entry = collections.defaultdict(list)
indexes = set()
for line, row in records["TRADE_EXIT_AUDIT"]:
    require(row["closedTradeIndex"] not in indexes, "Duplicate closed-trade index")
    indexes.add(row["closedTradeIndex"])
    require(row["entryId"] == row["module"], "Entry ID/module mismatch")
    require(row["size"] * row["direction"] > 0 and row["exitTime"] >= row["entryTime"], "Invalid direction/quantity/time")
    rows_by_entry[identity(row)].append((line, row))
require(indexes == set(range(len(indexes))), "Missing closed-trade indexes")

groups = {}
for line, group in records["TRADE_GROUP_AUDIT"]:
    key = identity(group, True)
    require(key not in groups, "Duplicate group")
    groups[key] = (line, group)
require(set(groups) == set(rows_by_entry), "Missing/unmatched group or closed rows")

positions = []
max_row_net_residual = ZERO
max_price_residual = ZERO
max_fee_residual = ZERO
for key in sorted(groups, key=lambda item: item[4]):
    group_line, g = groups[key]
    raw_rows = sorted(rows_by_entry[key], key=lambda item: (item[1]["exitTime"], item[1]["closedTradeIndex"]))
    rows = [row for _, row in raw_rows]
    require(plan_identity(g) in plans, "Group lacks matching accepted plan")
    plan_line, plan = plans[plan_identity(g)]
    require(plan["timestamp"] == g["entryTime"], "Close mode expected next-bar opening timestamp to equal prior-bar close")
    for row in rows:
        for field in ("symbol", "timeframe", "scriptVersion", "module", "planTimestamp", "setupTimestamp", "direction", "entryTime", "actualEntry", "initialStop", "initialQty", "accountCurrency"):
            require(row[field] == g[field], "Row/group mismatch: " + field)
        for row_field, plan_field in (("plannedEntry", "entry"), ("initialStop", "sl"), ("tp1", "tp1"), ("tp2", "tp2"), ("tp3", "tp3"), ("setupTimestamp", "setupTimestamp"), ("direction", "direction")):
            require(row[row_field] == plan[plan_field], "Row/plan mismatch: " + row_field)
    require(g["pointValue"] == 1 and g["minTick"] == D("0.01") and g["accountCurrency"] == "USD", "Different symbol/currency properties")
    require(sumd(abs(row["size"]) for row in rows) == g["initialQty"], "Closed size differs from initial size")
    require(g["exitTime"] == max(row["exitTime"] for row in rows), "Group exit is not last actual exit")
    require(g["holdMinutes"] == D(g["exitTime"] - g["entryTime"]) / 60000, "Holding mismatch")
    net = sumd(row["profit"] for row in rows)
    fee = sumd(row["commission"] for row in rows)
    gross = sumd(row["direction"] * (row["actualExit"] - row["actualEntry"]) * abs(row["size"]) * g["pointValue"] for row in rows)
    fee_calculated = sumd((row["actualEntry"] + row["actualExit"]) * abs(row["size"]) * g["pointValue"] * D("0.0001") for row in rows)
    row_residual = abs(net - g["netProfitDelta"])
    price_residual = abs(gross - fee - net)
    fee_residual = abs(fee - fee_calculated)
    require(max(row_residual, price_residual, fee_residual) <= TOL, "Cash arithmetic mismatch")
    max_row_net_residual = max(max_row_net_residual, row_residual)
    max_price_residual = max(max_price_residual, price_residual)
    max_fee_residual = max(max_fee_residual, fee_residual)
    final_rows = [row for row in rows if row["exitTime"] == g["exitTime"]]
    final_comments = sorted(set(row["exitComment"] for row in final_rows))
    final_ids = sorted(set(row["exitId"] for row in final_rows))
    timed = all(row["exitComment"] == "TRADE_CLOSED" and row["exitId"] == "Close entry(s) order " + row["entryId"] for row in final_rows) and g["holdMinutes"] >= inputs["timeExit"]
    reason = "TIME_EXIT_SOURCE_AND_ID_CONFIRMED" if timed else "STOP_LOSS_HIT" if final_comments == ["STOP_LOSS_HIT"] else "MIXED_OR_OTHER_FINAL_EXIT"
    positions.append({
        "identity": list(key), "module": g["module"], "direction": g["direction"],
        "planTimestamp": g["planTimestamp"], "entryTime": g["entryTime"], "exitTime": g["exitTime"],
        "actualEntry": g["actualEntry"], "initialQty": g["initialQty"], "holdMinutes": D(g["holdMinutes"]),
        "closedTradeRows": len(rows), "grossPricePnl": gross, "commission": fee, "net": g["netProfitDelta"],
        "rowProfitSum": net, "commissionFromActualPricesAt001PctPerSide": fee_calculated,
        "finalExitReason": reason, "finalExitComments": final_comments, "finalExitIds": final_ids,
        "uniqueExitComments": sorted(set(row["exitComment"] for row in rows)),
        "actualExitTimes": sorted(set(row["exitTime"] for row in rows)),
        "anyTpPartial": any(row["exitComment"] in ("TP1_HIT", "TP2_HIT", "TP3_HIT") for row in rows),
        "rawCsvRecords": {"plan": plan_line, "group": group_line, "closedRows": [line for line, _ in raw_rows]},
        "exitRows": [{"closedTradeIndex": row["closedTradeIndex"], "exitTime": row["exitTime"], "actualExit": row["actualExit"], "size": row["size"], "exitId": row["exitId"], "exitComment": row["exitComment"], "profit": row["profit"], "commission": row["commission"]} for row in rows],
    })
require(len(positions) == len(plans), "Accepted plans without complete actual-entry group")

by_module = {m: summary([p for p in positions if p["module"].startswith(m + "_")]) for m in "ABCDEFGH"}
by_subtype = {m: summary([p for p in positions if p["module"] == m]) for m in sorted(set(p["module"] for p in positions))}
overall = summary(positions)

# Cross-check independently against the unchanged repository analyzer. CSV escapes
# are decoded by csv.DictReader; the normalized message stream exists only in RAM.
js = "import {analyzePlanOutcomes} from './scripts/analyze-plan-outcomes.mjs'; let t=''; for await (const c of process.stdin) t+=c; process.stdout.write(JSON.stringify(analyzePlanOutcomes(t,'decoded native CSV messages')));"
check = subprocess.run(["node", "--input-type=module", "-e", js], cwd=ROOT, input="\n".join(messages), capture_output=True, text=True, check=True)
existing = json.loads(check.stdout, parse_float=D)
require(existing["overall"]["completePositions"] == len(positions), "Existing analyzer count disagreement")
require(abs(existing["overall"]["net"] - overall["net"]) <= TOL, "Existing analyzer total disagreement")
for subtype, stats in by_subtype.items():
    other = existing["byModule"][subtype]
    for field, alternate in (("completedPositions", "completePositions"), ("wins", "wins"), ("losses", "losses")):
        require(stats[field] == other[alternate], "Existing analyzer per-module count disagreement")
    require(abs(stats["net"] - other["net"]) <= TOL, "Existing analyzer module net disagreement")

result = {
    "schema": "selected-module-partial-aware-outcomes/v1",
    "status": "DESCRIPTIVE_NATIVE_HISTORICAL_SAMPLE_NOT_OOS",
    "artifacts": {"raw": artifact(RAW), "source": artifact(SOURCE), "nativeCopyBack": artifact(COPY), "actualInputs": artifact(SETTINGS),
                  "nativeCompile": artifact(CAPTURE / "stable-strategy-compiled.ax.txt"),
                  "actualStrategyProperties": artifact(CAPTURE / "stable-strategy-properties.ax.txt")},
    "attribution": {"normalizedNativeCopyBackSha256": sha(copy_normalized), "normalizedCopyMatchesSource": True,
                    "compileAndRuntimeEvidence": "../live-reload-2026-11-06/README.md; stable-strategy-compiled.ax.txt and PNG; all117 native controls",
                    "rawLogContainsSourceHash": False},
    "context": {"symbol": "FOREXCOM:XAUUSD", "timeframe": "5", "accountCurrency": "USD", "pointValue": 1, "minTick": "0.01",
                "firstCompletedEntryUTC": utc(min(p["entryTime"] for p in positions)), "lastCompletedEntryUTC": utc(max(p["entryTime"] for p in positions)),
                "researchWindowRestrictionEnabled": inputs["useResearchWindow"], "timeExitMinutes": 15,
                "commissionPctPerSide": "0.01", "slippageTicks": 2, "spreadModel": "NOT_CONFIGURED",
                "allActualInputs": inputs},
    "integrity": {"acceptedPlanCount": len(plans), "uniqueClosedTradeIndexes": len(indexes), "actualEntryGroups": len(groups), "incompleteGroups": 0,
                  "missingExitQuantity": 0, "duplicateRecords": 0, "cashSerializationTolerance": TOL,
                  "maxRowNetVsGroupNetResidual": max_row_net_residual, "maxPriceMinusCommissionVsNetResidual": max_price_residual,
                  "maxActualPriceCommissionVsLoggedCommissionResidual": max_fee_residual,
                  "existingAnalyzerCrossCheck": "PASS counts, wins/losses and cash net overall and by selected subtype"},
    "overall": overall, "byModuleAtoH": by_module, "bySelectedSubtype": by_subtype,
    "timeExitClassification": "Actual final exit comment TRADE_CLOSED plus exact Close entry(s) order <entryId>, observed15-minute hold, captured timeExit15 input, and reviewed source's sole strategy.close call under elapsed-holding condition. Not inferred from duration alone.",
    "limitations": [
        "A and G have zero selected completed positions; zero is not proof of faulty detection or no opportunity.",
        "All modules share one position slot. Highest safe quality wins; ties retain candidate array order; opposing qualified directions suppress entry. Session, H1, quota and cooldown filters also select the sample.",
        "These are outcomes conditional on selection in the all-modules run, not independent per-module backtests or effectiveness estimates for all candidates.",
        "Partial closes are combined by actual entry identity. TP1_HIT or a TP2/TP3 exit ID alone does not mean a complete winning trade or a target fill: TP IDs also hold stop legs.",
        "Net is the sum of already-fee-inclusive group results; commissions are shown once and not deducted twice. Gross price P&L is recomputed from actual emulator prices and quantities at pointValue1.",
        "Gross price P&L already uses emulator fills with configured two-tick slippage. It is before commission, not frictionless or before all costs; no explicit spread model is configured.",
        "66 timed positions held15minutes. Two stop positions have0 logged minutes because the emulator entered and stopped within the same M5 timestamp; intrabar exposure and path are unresolved at this granularity.",
        "The current capture overlaps earlier historical evidence. The previously documented Nov4 recalculation changed one F result by minus0.2640264USD; captures must not be pooled as independent samples.",
        "Sparse and correlated observations, one symbol/timeframe, observed transaction-cost assumptions and no explicit spread model do not establish OOS performance, profitability or future signal accuracy.",
    ],
    "positions": positions,
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "module-outcomes.json").write_text(json.dumps(result, default=serial, indent=2) + "\n")
print(json.dumps({"overall": overall, "byModuleAtoH": by_module, "integrity": result["integrity"]}, default=serial, indent=2))
