# TradingView evidence and remaining captures — v0.8.0

The current Indicator and baseline Strategy native compile gates are accepted as passed from the existing exact-source copy-backs and compile evidence. Preserve those artifacts; no repeat compile or source hash check is needed while the drafts remain unchanged.

## Evidence already captured

- **New Free-account capture, Nov 4:** [Raw exports and review](free-research-2026-11-04T06-46-31-570Z/README.md) contain 84 Indicator plans and 87 Exit audit experiment plans with matching observed input views. At tolerance zero: 79 common timestamps, 76 exact common matches, 3 shared-plan differences, 5 Indicator-only plans and 8 experiment-only plans. Result: `MULTI_PLAN_MISMATCH_EXPERIMENT`. This is a real broader comparison, with the experiment source/attribution limitations recorded; it does not pass baseline parity. Both complete exports were byte-for-byte stable across a normal browser reload. Candle-by-candle Replay remains unverified. The experiment's 150 exit rows reconcile to 87 positions and −$87.4216762 net; 14 groups retain 0.1 after all bracket exits, now flagged by the research analyzer.

- Fresh A-only Pine Logs for Indicator and Strategy are preserved as `tradingview-indicator-m5-a-only-2026-11-03.log` and `tradingview-strategy-m5-a-only-2026-11-03.log`. Their SHA-256 values are `fc9f6ae28559b8572c56ee51d0a565fe93efc15ef34c56951daafe8a9fa172e4` and `03b02e1df79f19643aab82a2133ad9f4b7c5c8688d3b96e792350aec10daae2e`. The tolerance-zero comparator reports one plan in each file, zero planned-field mismatches, and the expected Indicator-estimate / Strategy-emulator distinction. This is `SINGLE_PLAN_MATCH`, not multi-plan parity. The logs do not contain a complete settings/date-window manifest tied to current source hashes.
- The corresponding `.csv` files are CSV-formatted Pine Logs exports, not Strategy Tester report or trade-list exports. They each contain the same one-plan evidence and do not close the tester-export gate.
- The isolated exit-audit experiment has an exact normalized editor copy-back and a reported native TradingView compile. Its selected raw rows are in `strategy-exit-audit-captured-rows-2026-11-03.log`; they identify one full-size `TRADE_CLOSED` exit after 15 minutes. This evidence diagnoses the isolated experiment run, not the frozen baseline Strategy generally. The experiment source hash is `a8267588770637b4a75e50367267dac11a8ba6783cdd9084e7d9620ff3961623`.

## Remaining captures

1. **Multi-plan parity:** On `FOREXCOM:XAUUSD` M5, use the same inputs and historical date range in the source-matched Indicator and Strategy. Enable the research audit input in both and export complete raw Pine Logs. Record actual inputs, date range/timezone, Strategy Properties, and source hashes in a run manifest. Compare at tolerance zero. At least two common plans are required; record the true count if history provides fewer.
2. **Bar Replay and reload:** Start before a setup, advance one bar at a time, and record the first setup and plan bars, all planned levels, and later Strategy fill/exit observations. Save logs and a screenshot or notes before reload and after reloading/replaying the identical interval. Compare timestamps and levels; this remains a human-observed gate.
3. **Baseline Strategy Tester research:** Export the verified baseline Strategy report and trade list separately for M1, M3, M5, and M15 if the account permits it. Record date window, every input, initial capital/currency, sizing, commission, slippage, and spread method. Keep timeframe runs separate. Do not substitute the isolated exit-audit experiment or Pine Logs CSVs for baseline Strategy Tester exports.
4. **Optional exit follow-up:** The exit-audit experiment already has one selected-row capture and was natively compiled. Do not repeat that run solely to reconfirm the 15-minute exit. A separate baseline attribution still requires trade-level details tied to the baseline source; keep it isolated from other chart runs/settings.

Put new raw files in this directory without overwriting earlier evidence. For formal evidence ingestion, copy `evidence-manifest.example.json` to `evidence-manifest.json`, add artifact entries with source hashes and complete asserted run context, then run:

```bash
node scripts/ingest-tradingview-evidence.mjs reports/native-v080/evidence-manifest.json \
  --output reports/native-v080/evidence-receipt.json
```

Manifest context is submitter-asserted. It does not authenticate TradingView provenance or replace native compile and human replay review.

## Latest UI research attempt — 2026-11-03

Chrome accessibility currently reaches the logged-in `FOREX.com:XAUUSD` M5 chart. Strategy Tester displays Oct 5–Nov 3, 2026, one trade, 0/1 winners, net −$13.66, max drawdown $13.66, and profit factor 0. The full report/trade-list download is gated behind TradingView's Basic-plan upgrade prompt. Do not treat this one trade as a profitability result.

The Strategy Inputs dialog was inspected without applying changes: A enabled, B–H disabled, audit logging enabled, and research date-window restriction disabled. The complete input/property manifest is still missing.

The active Pine Editor `Untitled script` showed `Compiled.` and `Added to chart.` at 8:07:25 AM. Its visible source reaches about line 1470, but the copy-back attempt returned an empty clipboard. This latest compile is **OBSERVED SUCCESS, NOT NEWLY HASH-ATTRIBUTED**. The existing exact-hash compile/copy-back artifacts remain preserved and unchanged.

Selecting Bar Replay produced a TradingView notice that intraday replay requires a higher subscription. Replay was exited without advancing bars; no reload comparison was performed. **Bar Replay/reload remains NOT VERIFIED and is plan-gated.** No subscription change was made. An M1 interval-switch attempt did not commit, so no M1/M3/M15 result was obtained in this continuation. A temporary visibility toggle for the isolated exit-audit experiment was attempted on another open chart; no layout save was made and no source was edited.
