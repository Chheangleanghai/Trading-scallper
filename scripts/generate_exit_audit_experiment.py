from hashlib import sha256
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "pine/strategy.pine"
OUTPUT = ROOT / "pine/experiments/strategy_exit_audit.pine"
EXPECTED_BASELINE_SHA256 = "42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0"

ROW_ANCHOR = "            string reason = strategy.closedtrades.exit_comment(trade)\n"
GROUP_ANCHOR = "    float net = strategy.netprofit - previousClosedNet\n"
STATE_ANCHOR = "var float signalPrice = na\n"
SIZING_ANCHOR = "    float qty = syminfo.mincontract > 0 ? math.floor(rawQty / syminfo.mincontract) * syminfo.mincontract : na\n"
TITLE_OLD = 'strategy("XAUUSD SMART SCALPER PRO Backtest",'
TITLE_NEW = 'strategy("XAUUSD SMART SCALPER PRO Backtest · Exit audit experiment",'

ROW_AUDIT = r'''            // EXIT_AUDIT_ROW_BEGIN — logging only; this block does not place or modify orders.
            if auditLog
                if na(auditGroupEntryTime)
                    auditGroupPlanTimestamp := signalTime
                    auditGroupSetupTimestamp := signalSetupTime
                    auditGroupDirection := dir
                    auditGroupModule := strategy.closedtrades.entry_id(trade)
                    auditGroupEntryTime := strategy.closedtrades.entry_time(trade)
                    auditGroupPlannedEntry := entry
                    auditGroupActualEntry := strategy.closedtrades.entry_price(trade)
                    auditGroupInitialStop := stop
                    auditGroupInitialQty := initialQty
                float auditEntryPrice = strategy.closedtrades.entry_price(trade)
                float auditExitPrice = strategy.closedtrades.exit_price(trade)
                float auditRiskDistance = math.abs(auditEntryPrice - stop)
                float auditPriceR = auditRiskDistance > 0 ? dir * (auditExitPrice - auditEntryPrice) / auditRiskDistance : na
                string auditPriceRJson = na(auditPriceR) ? 'null' : str.tostring(auditPriceR, '#.########')
                log.info('TRADE_EXIT_AUDIT ' + '{"scriptVersion":"' + SCRIPT_VERSION + '","symbol":"' + jsonEscape(syminfo.tickerid) + '","timeframe":"' + timeframe.period + '","planTimestamp":' + str.tostring(signalTime) + ',"setupTimestamp":' + str.tostring(signalSetupTime) + ',"direction":' + str.tostring(dir) + ',"module":"' + jsonEscape(selectedStrategy) + '","closedTradeIndex":' + str.tostring(trade) + ',"entryId":"' + jsonEscape(strategy.closedtrades.entry_id(trade)) + '","entryTime":' + str.tostring(strategy.closedtrades.entry_time(trade)) + ',"entryBar":' + str.tostring(strategy.closedtrades.entry_bar_index(trade)) + ',"actualEntry":' + str.tostring(auditEntryPrice, format.mintick) + ',"exitId":"' + jsonEscape(strategy.closedtrades.exit_id(trade)) + '","exitComment":"' + jsonEscape(strategy.closedtrades.exit_comment(trade)) + '","exitTime":' + str.tostring(strategy.closedtrades.exit_time(trade)) + ',"exitBar":' + str.tostring(strategy.closedtrades.exit_bar_index(trade)) + ',"actualExit":' + str.tostring(auditExitPrice, format.mintick) + ',"size":' + str.tostring(strategy.closedtrades.size(trade)) + ',"profit":' + str.tostring(strategy.closedtrades.profit(trade)) + ',"commission":' + str.tostring(strategy.closedtrades.commission(trade)) + ',"profitPercent":' + str.tostring(strategy.closedtrades.profit_percent(trade)) + ',"maxRunup":' + str.tostring(strategy.closedtrades.max_runup(trade)) + ',"maxDrawdown":' + str.tostring(strategy.closedtrades.max_drawdown(trade)) + ',"plannedEntry":' + str.tostring(entry, format.mintick) + ',"initialStop":' + str.tostring(stop, format.mintick) + ',"managedStopAtObservation":' + str.tostring(managedStop, format.mintick) + ',"tp1":' + str.tostring(tp1, format.mintick) + ',"tp2":' + str.tostring(tp2, format.mintick) + ',"tp3":' + str.tostring(tp3, format.mintick) + ',"initialQty":' + str.tostring(initialQty) + ',"accountCurrency":"' + jsonEscape(strategy.account_currency) + '","priceRMultiple":' + auditPriceRJson + '}')
            // EXIT_AUDIT_ROW_END
'''

GROUP_AUDIT = r'''    // EXIT_AUDIT_GROUP_BEGIN — realized group delta is the Strategy's netprofit change for this flat position.
    if auditLog
        log.info('TRADE_GROUP_AUDIT ' + '{"scriptVersion":"' + SCRIPT_VERSION + '","symbol":"' + jsonEscape(syminfo.tickerid) + '","timeframe":"' + timeframe.period + '","planTimestamp":' + str.tostring(auditGroupPlanTimestamp) + ',"setupTimestamp":' + str.tostring(auditGroupSetupTimestamp) + ',"module":"' + jsonEscape(auditGroupModule) + '","direction":' + str.tostring(auditGroupDirection) + ',"entryTime":' + str.tostring(auditGroupEntryTime) + ',"exitTime":' + str.tostring(groupedLastExit) + ',"holdMinutes":' + str.tostring((groupedLastExit - auditGroupEntryTime) / 60000.0) + ',"plannedEntry":' + str.tostring(auditGroupPlannedEntry, format.mintick) + ',"actualEntry":' + str.tostring(auditGroupActualEntry, format.mintick) + ',"initialStop":' + str.tostring(auditGroupInitialStop, format.mintick) + ',"initialQty":' + str.tostring(auditGroupInitialQty) + ',"sizingEquity":' + str.tostring(auditSizingEquity) + ',"accountRiskPerUnit":' + str.tostring(auditAccountRiskPerUnit) + ',"unitNotional":' + str.tostring(auditUnitNotional) + ',"riskQty":' + str.tostring(auditRiskQty) + ',"exposureQty":' + str.tostring(auditExposureQty) + ',"rawQty":' + str.tostring(auditRawQty) + ',"sizedQty":' + str.tostring(auditSizedQty) + ',"riskPctInput":' + str.tostring(riskPct) + ',"maxExposurePctInput":' + str.tostring(maxExposurePct) + ',"partialInput":' + (partial ? 'true' : 'false') + ',"minContract":' + str.tostring(syminfo.mincontract) + ',"minTick":' + str.tostring(syminfo.mintick, format.mintick) + ',"pointValue":' + str.tostring(syminfo.pointvalue) + ',"netProfitDelta":' + str.tostring(net) + ',"accountCurrency":"' + jsonEscape(strategy.account_currency) + '"}')
    auditGroupPlanTimestamp := na
    auditGroupSetupTimestamp := na
    auditGroupDirection := 0
    auditGroupModule := ''
    auditGroupEntryTime := na
    auditGroupPlannedEntry := na
    auditGroupActualEntry := na
    auditGroupInitialStop := na
    auditGroupInitialQty := na
    auditSizingEquity := na
    auditAccountRiskPerUnit := na
    auditUnitNotional := na
    auditRiskQty := na
    auditExposureQty := na
    auditRawQty := na
    auditSizedQty := na
    // EXIT_AUDIT_GROUP_END
'''


def replace_once(source: str, old: str, new: str, description: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {description}; found {count}")
    return source.replace(old, new, 1)


def generate() -> str:
    source_bytes = BASELINE.read_bytes()
    actual_hash = sha256(source_bytes).hexdigest()
    if actual_hash != EXPECTED_BASELINE_SHA256:
        raise SystemExit(
            "Frozen v0.8.0 Strategy hash changed; refusing to regenerate the isolated experiment. "
            f"Expected {EXPECTED_BASELINE_SHA256}, found {actual_hash}."
        )
    source = source_bytes.decode("utf-8")
    source = replace_once(source, TITLE_OLD, TITLE_NEW, "strategy title")
    state = r'''var float signalPrice = na
// EXIT_AUDIT_STATE_BEGIN — pins the plan identity before any later same-bar plan can replace globals.
var int auditGroupPlanTimestamp = na
var int auditGroupSetupTimestamp = na
var int auditGroupDirection = 0
var string auditGroupModule = ''
var int auditGroupEntryTime = na
var float auditGroupPlannedEntry = na
var float auditGroupActualEntry = na
var float auditGroupInitialStop = na
var float auditGroupInitialQty = na
var float auditSizingEquity = na
var float auditAccountRiskPerUnit = na
var float auditUnitNotional = na
var float auditRiskQty = na
var float auditExposureQty = na
var float auditRawQty = na
var float auditSizedQty = na
// EXIT_AUDIT_STATE_END
'''
    source = replace_once(source, STATE_ANCHOR, state, "audit group state anchor")
    source = replace_once(source, ROW_ANCHOR, ROW_ANCHOR + ROW_AUDIT, "closed-trade row anchor")
    source = replace_once(source, GROUP_ANCHOR, GROUP_ANCHOR + GROUP_AUDIT, "closed-position aggregate anchor")
    sizing_audit = r'''    // EXIT_AUDIT_SIZING_BEGIN — records the inputs and intermediate quantities without changing orders.
    if auditLog
        auditSizingEquity := strategy.equity
        auditAccountRiskPerUnit := accountRisk
        auditUnitNotional := unitNotional
        auditRiskQty := riskQty
        auditExposureQty := exposureQty
        auditRawQty := rawQty
        auditSizedQty := qty
    // EXIT_AUDIT_SIZING_END
'''
    source = replace_once(source, SIZING_ANCHOR, SIZING_ANCHOR + sizing_audit, "sizing audit anchor")
    return source


content = generate()
if "--check" in sys.argv:
    if not OUTPUT.exists() or OUTPUT.read_text() != content:
        raise SystemExit("Exit-audit experiment differs; run python3 scripts/generate_exit_audit_experiment.py")
else:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(content)
print(f"baseline sha256: {EXPECTED_BASELINE_SHA256}")
print(f"experiment: {OUTPUT.relative_to(ROOT)} sha256: {sha256(content.encode()).hexdigest()}")
