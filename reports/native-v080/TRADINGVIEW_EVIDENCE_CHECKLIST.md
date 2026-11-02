# TradingView evidence still needed — v0.8.0

Current-source Indicator and Strategy compile gates are accepted as passed. Preserve existing compile screenshots and copy-backs; no repeat compile or source-hash check is requested. This session has no TradingView UI control. The evidence folder currently contains no fresh raw `PLAN_AUDIT` logs, replay logs, or Strategy Tester CSV exports.

## Smallest capture set

1. On `FOREXCOM:XAUUSD` M5, use the verified Indicator and Strategy instances with identical actual inputs and historical date range. Enable **Log qualified plans and lifecycle events (research only)** in both, let the chart recalculate, then open **Pine Logs** and save each raw `PLAN_AUDIT` stream as `indicator-m5.log` and `strategy-m5.log`. Do not edit or synthesize rows. Keep the true settings and timezone-qualified range in each manifest `runContext`. The comparator requires matching settings and reports the actual shared-plan count; two or more common plans are needed to call it multi-plan parity.

2. For repaint/reload evidence, choose a historical setup and record the Replay start bar. Save raw logs before reload and after reloading/replaying the same range, plus a screenshot or short note showing the same chart, timeframe, and settings. Compare event timestamps and all planned levels. A human must also observe candle-by-candle timing; matching exported logs alone does not prove non-repainting.

3. In **Strategy Tester**, select the verified current-source Strategy and export the report/trade list separately for M1, M3, M5, and M15 as CSV. For every export, record date range, all Pine input values, initial capital/currency, position sizing, commission, slippage, and how spread was estimated. Preserve the raw exports; report trade counts, profit factor, drawdown, and OOS results only when those fields and runs are actually present.

4. To diagnose the recorded M5 loss and partial exits, capture the current-hash Strategy's M5 **Trades** CSV and Properties/Data range view. Its archived `-$13.66` summary has a different recorded source hash and no trade-level exit details. For the optional diagnostic candidate, use a separate unsaved Strategy draft with `pine/experiments/strategy_exit_audit.pine`; copy the complete buffer back and require SHA-256 `ea1b065fc6a987caaf61dfed7ede9622fc11d3d4e07c2c6c3405f34d4e920123`, capture native compile success, then enable `auditLog` and save raw `TRADE_EXIT_AUDIT` / `TRADE_GROUP_AUDIT` lines. Analyze a single run's untouched export with `npm run audit:exits -- reports/native-v080/strategy-exits.log`. Do not create an alert or combine logs from different chart instances/settings.

Put these genuine files in this directory. Copy `evidence-manifest.example.json` to `evidence-manifest.json`, add artifact entries with the current source hashes, and include the complete asserted `runContext` plus cost/position settings. Then run:

```bash
node scripts/ingest-tradingview-evidence.mjs reports/native-v080/evidence-manifest.json \
  --output reports/native-v080/evidence-receipt.json
```

The ingester validates file hashes, source hashes, settings consistency, parity, and CSV structure. Manifest context is submitter-asserted; it does not authenticate TradingView provenance or replace human replay review.
