# v0.8.0 — plan audit and version validation

## Changes

- Corrected Pine alert payloads to identify the current source as `0.8.0`; older captured payload fixtures remain labeled with their historical versions.
- Added `scripts/compare-plan-audit.mjs` and synthetic tests. The tool reads TradingView `PLAN_AUDIT` log lines and compares records by symbol, timeframe, and signal-bar timestamp. It checks setup timestamp, direction, strategy/module, entry mode, quality, and Entry/SL/TP1–TP3 within an explicit price tolerance. It reports broker-emulator acceptance/model differences separately.

## Tests performed

- Node 22 `npm run verify`: **96 tests in eight files passed**. TypeScript, generated Pine consistency, and the independent Pine parser passed.
- `npm audit`: **0 vulnerabilities**.
- Comparator CLI smoke tests used synthetic matching and deliberately mismatching log rows; it reported parity for matching rows and a nonzero mismatch exit for drift. These are tool tests, not trading evidence.
- Exact generated v0.8.0 indicator and strategy sources compiled without a visible compiler error in TradingView. The indicator was added to the current chart. TradingView Basic blocked adding the strategy because its study limit was reached. The existing v0.6.0 strategy was restored and preserved.
- The TradingView Save action remains blocked by the account's one-saved-script limit. The chart currently shows both v0.8.0 indicator and v0.6.0 strategy, so their context drawings can overlap.

## Pattern and historical coverage

The current Pine harness has 107 synthetic assertions over A–H pure predicates and shared safety/state rules. They are not complete OHLC lifecycle replays. Repository event fixtures contain six legacy A_SWEEP_MSS_FVG records and 67 B_CRT indicator-estimate records; C, D, E demand/supply, F, G and H have no captured native events. The shared analysis/confirmation code equality test passes after removing the execution adapters, but no matched historical event-by-event comparison was possible because current v0.8 strategy logs are unavailable.

To collect real paired logs, use the same chart feed, timeframe, date range, and identical signal inputs in the indicator and strategy. Enable `Log qualified plans and lifecycle events (research only)` in each, export their Pine Logs separately, then run:

```sh
npm run audit:compare -- indicator.log strategy.log --tolerance 0.005
```

Use a tolerance based on that feed's actual `syminfo.mintick`. A passing comparison proves only the captured plans matched; it does not establish non-repainting across reloads or profitability. Use Bar Replay and rerun after reload to investigate repainting separately.

## Still unverified

No complete A–H historical lifecycle fixtures, matched current-version historical parity run, Bar Replay repaint audit, M1/M3/M5/M15 cost-aware backtest matrix, out-of-sample period, walk-forward evaluation, or native TradingView→Vercel→Telegram delivery was completed. No win rate or profitability claim is supported. The Pine source is locally generated and compiled but could not be saved as another TradingView script under the current account limit.
