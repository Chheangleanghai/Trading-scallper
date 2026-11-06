"""Extract preserved Nov4 plan/market observations without changing original evidence."""
from pathlib import Path
import csv
import hashlib
import json

OUT = Path(__file__).resolve().parent
EVIDENCE = OUT.parent
TARGET = 1793786100000
NEAR_START = 1793785200000
NEAR_END = 1793786700000


def parse_csv(path):
    for number, row in enumerate(csv.DictReader(path.open()), 2):
        message = row.get("Message", "")
        brace = message.find("{")
        if brace < 0:
            continue
        try:
            payload = json.loads(message[brace:])
        except json.JSONDecodeError:
            continue
        kind = message[:brace].strip() or payload.get("eventType", "JSON")
        yield {"csvRecord": number, "historicalBarOpenPrefix": row.get("Date"), "kind": kind, "payload": payload}


inventory = []
selected_records = {}
groups = {}
for path in sorted(EVIDENCE.rglob("*.csv")):
    if OUT in path.parents:
        continue
    content = path.read_bytes()
    if str(TARGET).encode() not in content:
        continue
    rows = list(parse_csv(path))
    plans = [r for r in rows if r["kind"] == "PLAN_AUDIT" and r["payload"].get("timestamp") == TARGET]
    if not plans:
        continue
    relative = str(path.relative_to(EVIDENCE))
    digest = hashlib.sha256(content).hexdigest()
    observations = [r for r in rows if r["payload"].get("timestamp") == TARGET or r["payload"].get("planTimestamp") == TARGET]
    snapshots = [r for r in rows if r["kind"] in ["ENGINE_TRACE", "CANDIDATE_TRACE", "DATA_SNAPSHOT_AUDIT"] and NEAR_START <= r["payload"].get("barClose", r["payload"].get("timeClose", 0)) <= NEAR_END]
    fields = sorted({k for r in snapshots for k in r["payload"] if k in ["open", "high", "low", "close", "ema9", "ema21", "ema50", "atr", "h1CompletedClose", "h1CompletedEMA50", "firstLoadedBarTime", "barIndex"]})
    inventory.append({"artifact": relative, "sha256": digest, "targetPlanRecords": [r["csvRecord"] for r in plans], "plannedEntries": [r["payload"]["entry"] for r in plans], "nearbySnapshotFieldsActuallyPresent": fields})
    groups.setdefault(digest, []).append(relative)
    selected_records[relative] = {"targetRecords": observations, "nearbySnapshots": [r for r in snapshots if r["kind"] != "CANDIDATE_TRACE" or r["payload"].get("id") == "F_TREND_PULLBACK"]}

old_path = "confirmation-review-2026-11-05/strategy-native-raw.csv"
new_path = "recalculation-review-2026-11-05/strategy-nov5-raw.csv"
old_group = next(r for r in selected_records[old_path]["targetRecords"] if r["kind"] == "TRADE_GROUP_AUDIT")["payload"]
new_group = next(r for r in selected_records[new_path]["targetRecords"] if r["kind"] == "TRADE_GROUP_AUDIT")["payload"]
group_fields = ["plannedEntry", "actualEntry", "initialStop", "initialQty", "sizingEquity", "accountRiskPerUnit", "riskQty", "exposureQty", "sizedQty", "netProfitDelta", "entryTime", "exitTime", "minTick", "pointValue"]
comparison = {k: {"old": old_group[k], "new": new_group[k], "equal": old_group[k] == new_group[k]} for k in group_fields}
ax_files = list(EVIDENCE.rglob("*.ax.txt"))
ax_hits = []
for path in ax_files:
    text = path.read_text()
    for number, line in enumerate(text.splitlines(), 1):
        if "4044.77" in line or "4044.89" in line or str(TARGET) in line:
            ax_hits.append({"artifact": str(path.relative_to(EVIDENCE)), "line": number, "text": line})
assert any(4044.77 in x["plannedEntries"] for x in inventory)
assert any(4044.89 in x["plannedEntries"] for x in inventory)
assert comparison["sizingEquity"]["equal"] and comparison["initialQty"]["equal"]

result = {
    "schema": "historical-close-drift-forensic-extraction/v1",
    "planTimestamp": TARGET,
    "planUtc": "2026-11-04T09:55:00Z",
    "historicalBarOpenUtc": "2026-11-04T09:50:00Z",
    "scope": "Existing genuine CSVs and saved AX text only; no new native run. No filesystem times used as capture times. Historical Date prefixes are bar times, not capture times.",
    "csvInventory": inventory,
    "identicalByteGroups": [v for v in groups.values() if len(v) > 1],
    "targetAndNearbyEvidence": selected_records,
    "strategyOldVersusCurrentGroup": comparison,
    "axRecovery": {"filesSearched": len(ax_files), "targetPriceOrTimestampHits": ax_hits},
    "limitations": [
        "Old 4044.77 captures preserve tick-formatted signalPrice, planned prices, rounded F candidate anchors and some bar indices. They do not preserve full raw OHLC, exact EMA/ATR, requested H1 values or firstLoadedBarTime for the disputed old calculation.",
        "New snapshot runs preserve full requested context at close4044.89; they cannot retroactively fill the missing old snapshot.",
        "Matching source code explains how close feeds the price, but does not authenticate which feed/cache/calculation dataset produced a historical log.",
        "No confirmed feed revision, code defect, stale-log misselection or dataset-start cause follows from these retained artifacts alone."
    ]
}
(OUT / "drift-evidence.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"csvFiles": len(inventory), "identicalByteGroups": result["identicalByteGroups"], "axFilesSearched": len(ax_files), "axTargetHits": len(ax_hits), "strategyGroup": comparison}, indent=2))
