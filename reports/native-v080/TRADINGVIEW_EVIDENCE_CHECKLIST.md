# Remaining TradingView verification evidence

TradingView browser/computer UI control is unavailable in this Codex session. The existing compile images show messages, but do not bind both compile events to the current copy-back hashes. No Apple Events access was retried. Capture evidence in the authorized TradingView UI; preserve the existing files.

## Capture only the remaining evidence

1. **Indicator and Strategy compile, separately:** open each unchanged source-matched draft on `FOREXCOM:XAUUSD` M5 and compile it. Capture a separate Pine Editor screenshot per draft with its title, `Compiled.`, `Added to chart` or `Updated on chart`, and a distinct compile timestamp visible. Record the copy-back source hash and confirm the editor draft was not changed after copy-back. Avoid replacing saved studies.
2. **Matched plan logs:** export raw `PLAN_AUDIT` text from the same Indicator and Strategy instances, with matching date range, settings, symbol and timeframe. Include at least two common plans for a multi-plan sample; keep source attribution and raw files. The comparator reports the actual number; do not loosen filters to increase it.
3. **Replay/reload:** capture pre-reload and post-reload raw audit logs for a controlled replay run, plus a short note of the replay start bar and settings. The ingester can compare exported plan sets, but a person still has to confirm candle-by-candle replay timing and chart behavior.
4. **Strategy Tester:** export current Strategy results separately for M1/M3/M5/M15. Record the date range, symbol, strategy source hash and commission, slippage and spread assumptions alongside each CSV.

Put files under this directory and copy `evidence-manifest.example.json` to `evidence-manifest.json`. Fill `artifacts` using the supported kinds `compile-screenshot`, `plan-audit-log`, `replay-pair`, and `backtest-export`, then run:

```bash
node scripts/ingest-tradingview-evidence.mjs reports/native-v080/evidence-manifest.json \
  --output reports/native-v080/evidence-receipt.json
```

The ingester checks artifact paths, hashes, source hashes, chart metadata, audit parity and export fields. It does not OCR screenshots or authenticate TradingView drafts; screenshot compile and source continuity remain human-review gates. The receipt intentionally marks these as review required and does not claim profitability.
