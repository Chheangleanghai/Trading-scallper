# v0.6.0 — Clean chart and explainable decisions

The final indicator and strategy compiled and ran in TradingView on 31 October 2026. The strategy was applied to the saved FOREX.com XAUUSD M5 chart. Earlier server errors were transient; the earlier `v060-compiler-pending.json` and `v060-chart-restoration.json` record intermediate states, superseded by current compile and reload evidence.

## Changes

- Small text and light backgrounds; latest-only structure/sweep labels by default, CRT context labels off, aged/distant zones removed from display and consumed swing levels hidden. These visual controls do not relax trading filters.
- WAIT, pending BUY/SELL READY, confirmed entry and simulated active trade are distinct. Context is not an entry. Chart structure opposing H1 is explicitly marked.
- First-failure reasons explain session, volatility, alignment, stop/target validity, entry distance, cooldown, quota and score gates. Progress displays sweep, atomic MSS+FVG, later retest and risk checks.
- Unaccepted candidates do not display prices as a current trade. Execution-quantity rejection reaches the dashboard before rendering.
- Optional explanation/version metadata is bounded, validated and HTML-escaped by the backend. Deploy the updated backend to display these fields in Telegram; the existing production backend was not changed here.
- Optional research logs distinguish qualified plans from entry/lifecycle events. Logging is disabled on the saved chart and never sends PLAN_AUDIT to Telegram.

## Verification

- `npm run verify` on Node22: **86 tests in seven files passed**, strict TypeScript, generated-file checks and independent Pine parsing. The previous 85-test suite also passed on Node24; the added native-payload test was verified on Node22.
- Native shared-predicate harness: **107 assertions passed**, exact hash and rendered success caption in `v060-native-assertions.json`.
- Final source compilation and active runtime: `v060-native-indicator.json` and `v060-native-strategy.json`.
- **32 native Strategy Tester cases**, eight isolated modules × M1/M3/M5/M15, in `v060-matrix.jsonl`. Every displayed PnL, profit factor, profitable-exit fraction and no-trade flag matches its v0.5.0 counterpart. See `v060-historical-regression.json`. Default settings except isolated strategy selection, unrestricted research window and Both directions; source hash records the exact tested declarations. Simulation uses USD10,000, 0.01% commission per execution and two ticks slippage, not a measured historical spread feed.
- Native default A Close plan sample: indicator and strategy match strategy/time/setup-time/direction/mode, planned Entry/SL/TP1–3 and quality. `v060-native-plan-sample.json` records the actual logs. This is **one plan**, not complete native signal parity. Actual indicator close estimates and strategy fills differ as documented.
- Six actual v0.6 lifecycle payloads from that sample are backend regression fixtures. Their planned versus filled prices and explanation fields pass validation/formatting tests. Prior 67 native payload fixtures continue to cover all nine event types and both directions. No additional real messages were sent.
- Saved chart: all original named inputs were preserved except intentional clean-display overrides; original commission/capital/strategy properties and both unrelated studies' complete settings remain intact. The new source shares the candle axis without a separate overlay. Three native price coordinates agree before and after save/reload. See `v060-chart-update.json`, `v060-chart-reload.json` and `v060-clean-chart.png`. The study was brought to the front for readable context overlays; the saved default right offset was reduced from 147 to 28 bars to keep candles in view.
- Exactly one authorized manual authenticated TEST POST returned HTTP200; the user confirmed Telegram receipt. Evidence: `v060-live-relay-test.json`. This was a private destination and a manual POST, not native alert origination or broker execution.

## Historical outcomes and remaining limits

Of 32 cases, **24 lost, 7 gained and one had no trade**. Case outcomes are not a trade win rate. Strategy Tester profitable-trade figures can count partial exits separately; the strategy panel also groups completed positions. Small profitable samples are not evidence of a robust edge. No parameters or session gates were relaxed to improve these results.

The history has already been inspected during development; it cannot honestly be called untouched OOS. Genuine OOS, walk-forward evaluation, cost stress using broker-specific assumptions and demo forward trading remain required. There is no validated profitability or live-ready claim.

Native TradingView alert → deployed upgraded backend → Telegram still needs verification. Existing TradingView alerts retain snapshots and must be recreated after upgrading. No running alerts were modified, no backend deployment occurred and no broker orders were placed. Indicator management events are confirmed-bar OHLC estimates, not proof of broker fills.

## Native matrix

| Module | TF | Native PnL | Profit factor | Profitable exits (native) |
|---|---|---|---|---|
| A_SWEEP_MSS_FVG | 5m | −13.66USD−0.14% | 0 | 0.00%0/1 |
| B_CRT | 5m | −105.88USD−1.06% | 0.558 | 34.88%30/86 |
| C_TURTLE_SOUP | 5m | +1.47USD+0.01% | 1.015 | 42.31%22/52 |
| D_SNR | 5m | −15.47USD−0.15% | 0.544 | 25.00%3/12 |
| E_SUPPLY_DEMAND | 5m | −34.32USD−0.34% | 0.189 | 12.50%2/16 |
| F_TREND_PULLBACK | 5m | +13.27USD+0.13% | 1.399 | 50.00%4/8 |
| G_AMD | 5m | −12.66USD−0.13% | 0 | 0.00%0/1 |
| H_QUASIMODO | 5m | −0.14USD0.00% | 0.993 | 33.33%2/6 |
| A_SWEEP_MSS_FVG | 1m | −7.74USD−0.08% | 0 | 0.00%0/4 |
| B_CRT | 1m | −57.91USD−0.58% | 0.513 | 26.98%17/63 |
| C_TURTLE_SOUP | 1m | −47.87USD−0.48% | 0.593 | 30.00%21/70 |
| D_SNR | 1m | −17.08USD−0.17% | 0.305 | 30.00%6/20 |
| E_SUPPLY_DEMAND | 1m | −22.49USD−0.22% | 0.394 | 23.08%3/13 |
| F_TREND_PULLBACK | 1m | −67.55USD−0.68% | 0.125 | 13.33%4/30 |
| G_AMD | 1m | +1.28USD+0.01% | — | 100.00%1/1 |
| H_QUASIMODO | 1m | +9.12USD+0.09% | — | 100.00%3/3 |
| A_SWEEP_MSS_FVG | 3m | −0.30USD0.00% | 0 | 0.00%0/1 |
| B_CRT | 3m | −117.30USD−1.17% | 0.524 | 29.47%28/95 |
| C_TURTLE_SOUP | 3m | −76.99USD−0.77% | 0.396 | 25.00%13/52 |
| D_SNR | 3m | −1.43USD−0.01% | 0.926 | 27.27%3/11 |
| E_SUPPLY_DEMAND | 3m | −33.11USD−0.33% | 0.336 | 4.76%1/21 |
| F_TREND_PULLBACK | 3m | −45.86USD−0.46% | 0.264 | 11.11%2/18 |
| G_AMD | 3m | −23.67USD−0.24% | 0 | 0.00%0/5 |
| H_QUASIMODO | 3m | +10.14USD+0.10% | — | 100.00%3/3 |
| A_SWEEP_MSS_FVG | 15m | −6.86USD−0.07% | 0 | 0.00%0/1 |
| B_CRT | 15m | −216.67USD−2.17% | 0.507 | 43.18%38/88 |
| C_TURTLE_SOUP | 15m | −62.87USD−0.63% | 0.488 | 34.78%8/23 |
| D_SNR | 15m | −13.25USD−0.13% | 0.22 | 50.00%2/4 |
| E_SUPPLY_DEMAND | 15m | +36.46USD+0.36% | 6.554 | 85.71%6/7 |
| F_TREND_PULLBACK | 15m | −74.96USD−0.75% | 0.216 | 28.57%4/14 |
| G_AMD | 15m | No trades | — | — |
| H_QUASIMODO | 15m | +6.21USD+0.06% | — | 100.00%1/1 |
