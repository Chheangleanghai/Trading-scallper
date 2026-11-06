#!/usr/bin/env python3
"""Compare preserved native CSVs and reconcile emulator cash, without editing raw data."""
import collections
import csv
import datetime
import hashlib
import json
import subprocess
from decimal import Decimal as D
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
EXPECTED = {
    "indicator-paired-raw.csv": "b7bda756ed58a028a2a599db4c78582fd29b435fea56e64ecdf7130781963273",
    "strategy-paired-raw.csv": "31bbd84dee6d156646b28ec53a5560fe4a4fe3a6cda68fc7215048587c73ee79",
    "strategy-paired-final-raw.csv": "2541b80179fe343775957472620c2eb451755d3224a86cd24bd726c21c77048d",
}
NEW_TIMES = (1793964000000, 1793967300000)
SOURCE = ROOT / "pine/experiments/strategy_stable_display.pine"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def utc(epoch):
    return datetime.datetime.fromtimestamp(epoch / 1000, datetime.timezone.utc).isoformat()


def load(name):
    path = HERE / name
    assert digest(path) == EXPECTED[name], "Preserved capture changed: " + name
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        assert reader.fieldnames == ["Date", "Message"]
        rows = list(reader)
    decoded = []
    for line, row in enumerate(rows, 2):
        message = row["Message"]
        start = message.index("{")
        value = json.loads(message[start:], parse_float=D)
        decoded.append({"csvLine": line, "date": row["Date"],
                        "type": message[:start].strip() or value["eventType"], "value": value})
    return rows, decoded


def plans(records):
    found = {}
    for r in records:
        if r["type"] != "PLAN_AUDIT":
            continue
        p = r["value"]
        key = (p["symbol"], p["timeframe"], p["timestamp"])
        assert key not in found, "Duplicate plan"
        found[key] = p
    return found


def compare(a, b):
    differences = []
    common = sorted(a.keys() & b.keys())
    exact = []
    for key in common:
        # Every original field except the intentional execution-model distinction.
        fields = set(a[key]) | set(b[key])
        mismatch = {field: {"indicator": a[key].get(field), "strategy": b[key].get(field)}
                    for field in sorted(fields - {"executionModel"}) if a[key].get(field) != b[key].get(field)}
        if mismatch:
            differences.append({"key": key, "differences": mismatch})
        else:
            exact.append(key)
    return {"tolerance": 0, "indicatorPlans": len(a), "strategyPlans": len(b),
            "commonPlans": len(common), "exactCommonPlans": len(exact),
            "differingCommonPlans": differences,
            "indicatorOnly": sorted(a.keys() - b.keys()), "strategyOnly": sorted(b.keys() - a.keys()),
            "strictParity": not differences and a.keys() == b.keys()}


def extract_inputs():
    # Reuse the already-reviewed AX label/control parser, without running its A/G output section.
    helper = ROOT / "reports/native-v080/module-isolation-2026-11-06/extract-isolation-inputs.py"
    namespace = {"__file__": str(helper)}
    exec(helper.read_text().split("\na_files =")[0], namespace)
    namespace["D"] = HERE
    namespace["ZONE"] = datetime.timezone.utc
    files = [f"paired-runtime-page{i}.ax.txt" for i in range(9)]
    values, controls, missing = namespace["controls"](files)
    prior_path = ROOT / "reports/native-v080/live-reload-2026-11-06/indicator-restored-runtime-inputs.json"
    prior = json.loads(prior_path.read_text())["inputSettings"]
    differences = [{"input": key, "indicatorPriorCapture": prior.get(key), "strategyObserved": value}
                   for key, value in values.items() if value != prior.get(key)]
    assert len(values) == 117 and not missing and not differences
    assert values["timeExit"] == 15 and values["partial"] is True and values["useResearchWindow"] is False
    assert all(values["enable" + m] is True for m in "ABCDEFGH")
    result = {
        "attribution": "117 native Strategy inputs captured; Indicator uses prior117-control capture and saved-instance continuity, not a fresh full second recapture.",
        "source": {"path": str(SOURCE.relative_to(ROOT)), "sha256": digest(SOURCE)},
        "timeInputDisplayZone": "UTC per capture;00:00 date controls match prior UTC epochs",
        "inputCount": len(values), "inputSettings": values, "missingInputs": missing,
        "differencesFromPriorSavedIndicator": differences,
        "indicatorComparisonArtifact": str(prior_path.relative_to(ROOT)),
        "observedControls": controls,
        "evidence": [{"path": name, "sha256": digest(HERE / name)} for name in files],
    }
    (HERE / "paired-runtime-inputs.json").write_text(json.dumps(result, indent=2) + "\n")
    return values


def position_cash(records, inputs):
    exits = collections.defaultdict(list)
    groups = {}
    close_events = {}
    indexes = set()
    for record in records:
        p = record["value"]
        key = p.get("planTimestamp", p.get("timestamp"))
        if record["type"] == "TRADE_EXIT_AUDIT":
            assert p["closedTradeIndex"] not in indexes
            indexes.add(p["closedTradeIndex"])
            exits[key].append(record)
        elif record["type"] == "TRADE_GROUP_AUDIT":
            assert key not in groups
            groups[key] = p
        elif record["type"] == "TRADE_CLOSED":
            assert key not in close_events
            close_events[key] = p
    assert indexes == set(range(len(indexes))) and exits.keys() == groups.keys()
    result = []
    for timestamp, g in sorted(groups.items()):
        rows = exits[timestamp]
        gross = fee = net = D(0)
        for record in rows:
            r = record["value"]
            assert r["module"] == g["module"] == r["entryId"]
            assert r["entryTime"] == g["entryTime"] and r["actualEntry"] == g["actualEntry"]
            assert r["exitTime"] >= r["entryTime"] and r["direction"] * r["size"] > 0
            assert g["pointValue"] == 1 and g["minTick"] == D("0.01")
            pnl = r["direction"] * (r["actualExit"] - r["actualEntry"]) * abs(r["size"]) * g["pointValue"]
            cost = (r["actualEntry"] + r["actualExit"]) * abs(r["size"]) * g["pointValue"] * D("0.0001")
            assert cost == r["commission"] and pnl - cost == r["profit"]
            gross += pnl
            fee += cost
            net += r["profit"]
        assert sum(abs(r["value"]["size"]) for r in rows) == g["initialQty"]
        assert net == g["netProfitDelta"]
        assert g["holdMinutes"] == D(g["exitTime"] - g["entryTime"]) / 60000
        risk_qty = D(g["sizingEquity"]) * D(g["riskPctInput"]) / 100 / D(g["accountRiskPerUnit"])
        exposure_qty = D(g["sizingEquity"]) * D(g["maxExposurePctInput"]) / 100 / D(g["unitNotional"])
        raw_qty = min(risk_qty, exposure_qty)
        sized_qty = (raw_qty // g["minContract"]) * g["minContract"]
        assert abs(risk_qty - g["riskQty"]) < D("0.0000000001")
        assert abs(exposure_qty - g["exposureQty"]) < D("0.0000000001")
        assert abs(raw_qty - g["rawQty"]) < D("0.0000000001")
        assert sized_qty == g["sizedQty"] == g["initialQty"]
        last = max(rows, key=lambda r: (r["value"]["exitTime"], r["value"]["closedTradeIndex"]))["value"]
        close = close_events[timestamp]
        timed = (last["exitComment"] == "TRADE_CLOSED" and last["exitId"] == "Close entry(s) order " + g["module"]
                 and g["holdMinutes"] == inputs["timeExit"] == 15 and close["closeReason"] == "TIME_EXIT"
                 and close["closedAt"] == g["exitTime"])
        result.append({"planTimestamp": timestamp, "module": g["module"], "entryTimeUtc": utc(g["entryTime"]),
                       "exitTimeUtc": utc(g["exitTime"]), "holdMinutes": g["holdMinutes"],
                       "initialQty": g["initialQty"], "actualEntry": g["actualEntry"], "grossBeforeCommission": gross,
                       "commission": fee, "net": net, "closedTradeRows": len(rows),
                       "finalExit": "TIME_EXIT" if timed else last["exitComment"],
                       "sizing": {"riskQty": risk_qty, "exposureQty": exposure_qty, "sizedQty": sized_qty,
                                  "limitingCap": "EXPOSURE" if exposure_qty < risk_qty else "RISK",
                                  "plannedCashRisk": g["accountRiskPerUnit"] * sized_qty},
                       "rows": rows if timestamp in NEW_TIMES else None,
                       "group": g if timestamp in NEW_TIMES else None,
                       "closeEvent": close if timestamp in NEW_TIMES else None})
    return result


def serial(value):
    if isinstance(value, D):
        return str(value)
    raise TypeError(type(value).__name__)


assert digest(SOURCE) == "ce6c1256bd9d29387f194be4ac715e479bf98f14bdcc0e9c697e5f4110f2aae9"
source = SOURCE.read_text()
assert source.count("strategy.close(") == 1 and "strategy.close_all(" not in source
assert "if strategy.position_size != 0 and timeExit > 0 and time_close - strategy.opentrades.entry_time(0) >= timeExit * 60000\n    strategy.close(selectedStrategy, comment='TRADE_CLOSED', immediately=false)" in source
inputs = extract_inputs()
iraw, indicator = load("indicator-paired-raw.csv")
sraw, strategy = load("strategy-paired-final-raw.csv")
earlier, _ = load("strategy-paired-raw.csv")
assert [r["Message"] for r in earlier] == [r["Message"] for r in sraw]
assert all(datetime.datetime.fromisoformat(a["Date"]) == datetime.datetime.fromisoformat(b["Date"])
           for a, b in zip(earlier, sraw))
ip, sp = plans(indicator), plans(strategy)
comparison = compare(ip, sp)
new_comparison = compare({k: p for k, p in ip.items() if p["timestamp"] in NEW_TIMES},
                         {k: p for k, p in sp.items() if p["timestamp"] in NEW_TIMES})
assert new_comparison["strictParity"] and new_comparison["commonPlans"] == 2
positions = position_cash(strategy, inputs)
new_positions = [p for p in positions if p["planTimestamp"] in NEW_TIMES]
node_script = """
import {readFileSync} from 'node:fs';
import {parsePlanAudit,comparePlanAudits} from './scripts/compare-plan-audit.mjs';
import {analyzePlanOutcomes} from './scripts/analyze-plan-outcomes.mjs';
const d=JSON.parse(readFileSync(0,'utf8'));
const plans=s=>parsePlanAudit(s.split('\\n').filter(x=>x.startsWith('PLAN_AUDIT ')).join('\\n'));
process.stdout.write(JSON.stringify({comparison:comparePlanAudits(plans(d.indicator),plans(d.strategy),0),
outcomes:analyzePlanOutcomes(d.strategy,'strategy-paired-final-raw.csv decoded Message column')}));
"""
crosscheck = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", node_script],
    input=json.dumps({"indicator": "\n".join(r["Message"] for r in iraw),
                      "strategy": "\n".join(r["Message"] for r in sraw)}).encode(), cwd=ROOT))
assert crosscheck["comparison"]["parity"] == comparison["strictParity"]
assert crosscheck["outcomes"]["counts"]["completedPositions"] == len(positions)
net = sum((p["net"] for p in positions), D(0))
assert abs(D(str(crosscheck["outcomes"]["overall"]["net"])) - net) < D("0.0000001")
(HERE / "paired-strategy-outcomes.json").write_text(json.dumps(crosscheck["outcomes"], indent=2) + "\n")
report = {"scope": "Descriptive native paired research, not a release/non-repaint/OOS/profitability pass",
    "artifacts": [{"path": name, "sha256": digest(HERE / name)} for name in EXPECTED],
    "strategyRepeatedExport": {"messagesIdentical": True, "dateInstantsIdentical": True, "rows": len(sraw)},
    "settings": {"strategyControlsObserved": len(inputs), "differencesFromPriorSavedIndicator": 0,
                 "researchWindowEnabled": inputs["useResearchWindow"], "runContextLimits": "Effective history is loaded chart history, not a forced research window. Prior Indicator117-control capture plus unchanged-instance continuity; fresh Strategy117-control capture."},
    "fullStreamComparison": comparison, "newNovember6Plans": new_comparison,
    "existingComparatorCrosscheck": crosscheck["comparison"],
    "completePositionCash": {"positions": len(positions), "exitRows": sum(p["closedTradeRows"] for p in positions),
        "grossBeforeCommission": sum((p["grossBeforeCommission"] for p in positions), D(0)),
        "commission": sum((p["commission"] for p in positions), D(0)), "net": net,
        "cashArithmeticResidual": "0", "finalExitReasons": dict(collections.Counter(p["finalExit"] for p in positions)),
        "wins": sum(p["net"] > 0 for p in positions), "losses": sum(p["net"] < 0 for p in positions)},
    "newPositionDetails": new_positions,
    "attribution": {"strategy": "Previously exact-copy-backed stable-display editor remained unchanged; fresh native compile12:03:55UTC. No fresh full copy-back in this run.",
                    "indicator": "Saved confirmation-review instance retained; prior exact copy and117-control capture. CSVs do not authenticate their own source hashes."},
    "restoration": "Saved original3-study M5 chart reloaded; temporary fourth removed; Logs/Editor closed; AutosaveON visually verified in paired-autosave-restored.png and final chart saved."}
(HERE / "paired-analysis.json").write_text(json.dumps(report, indent=2, default=serial) + "\n")
print(json.dumps({"fullStream": comparison, "newNovember6Plans": new_comparison,
                  "cash": report["completePositionCash"],
                  "newPositions": [{k: v for k, v in p.items() if k not in ("rows", "group", "closeEvent")} for p in new_positions]},
                 indent=2, default=serial))
