# v0.3.0 TradingView upgrade verification — 2026-10-31

**25 of 32 isolated runs lost money, 6 were positive, and 1 had no trades.** This release fixes order handling and adds research controls. It does not establish a profitable strategy or live readiness.

## Changes

- Cancelled pending plans cannot be replaced on the same bar. This keeps the old cancellation ID from cancelling a replacement order.
- Optional research date window: inclusive start, exclusive end; the whole signal bar must be inside. Pending cancellation is close-time only, and existing trades retain exits beyond the window.
- Both / BUY only / SELL only selection, default Both. The date filter defaults off.
- 58 native synthetic assertions, including 14 new research/cancellation checks.

## Observed verification

- Native TradingView compilation: canonical indicator, strategy and validation script.
- [58-assertion chart capture](validation-58-native.png); [indicator chart capture](v030-indicator-m5.png).
- 32 isolated native Strategy Tester runs: A–H on M1/M3/M5/M15; 11 additional feature profiles below.
- Inverted date window raises the expected native user-defined runtime error; see [guard record](v030-runtime-guards.json).
- Local Node22 verification: 75 tests across six files, strict TypeScript, generated consistency and independent Pine parsing. Native synthetic assertion count is separate from the Vitest test count.
- Existing captured payload fixtures cover nine event types and both directions. The serializer/backend schema is unchanged.

## Assumptions and limits

FOREXCOM:XAUUSD, standard candles; source defaults except isolated modules and listed feature settings. $10,000 USD, 0.5% planned-risk ceiling, 90% notional/equity cap, 0.01% commission per execution, two ticks slippage, bar-close calculations, next-tick market orders, fixed 1/2/3R targets, partial exits, 15-minute close-time holding check, no Bar Magnifier. Costs are examples, not broker-calibrated spread/execution. Trade/win counts below are emulator exit records; partials may count separately. Available chart history differs by timeframe; the live right edge advanced during testing. The Oct 5–19 / Oct 19–31 profiles use already inspected data and are exploratory, **not untouched out-of-sample tests**. No settings were optimized to maximize historical returns.

## Isolated module results

| Module | Chart | Loaded history | Net P&L | Drawdown | Profitable exit records | PF | Expectancy / exit |
|---|---|---|---:|---:|---:|---:|---:|
| A | 1m | Oct 26, 2026 — Oct 31, 2026 | −7.74USD−0.08% | 7.74USD0.08% | 0.00%0/4 | 0 | −1.93USD−0.11% |
| B | 1m | Oct 26, 2026 — Oct 31, 2026 | −57.91USD−0.58% | 70.87USD0.71% | 26.98%17/63 | 0.513 | −0.92USD−0.06% |
| C | 1m | Oct 26, 2026 — Oct 31, 2026 | −47.87USD−0.48% | 72.30USD0.72% | 30.00%21/70 | 0.593 | −0.68USD−0.04% |
| D | 1m | Oct 26, 2026 — Oct 31, 2026 | −17.08USD−0.17% | 17.34USD0.17% | 30.00%6/20 | 0.305 | −0.85USD−0.05% |
| E | 1m | Oct 26, 2026 — Oct 31, 2026 | −22.49USD−0.22% | 22.49USD0.22% | 23.08%3/13 | 0.394 | −1.73USD−0.09% |
| F | 1m | Oct 26, 2026 — Oct 31, 2026 | −67.55USD−0.68% | 67.88USD0.68% | 13.33%4/30 | 0.125 | −2.25USD−0.09% |
| G | 1m | Oct 26, 2026 — Oct 31, 2026 | +1.28USD+0.01% | 7.06USD0.07% | 100.00%1/1 | — | 1.28USD0.01% |
| H | 1m | Oct 26, 2026 — Oct 31, 2026 | +7.19USD+0.07% | 3.66USD0.04% | 66.67%4/6 | 3.735 | 1.20USD0.02% |
| A | 3m | Oct 12, 2026 — Oct 31, 2026 | −0.30USD0.00% | 3.33USD0.03% | 0.00%0/1 | 0 | −0.30USD0.00% |
| B | 3m | Oct 12, 2026 — Oct 31, 2026 | −117.30USD−1.17% | 156.41USD1.56% | 29.47%28/95 | 0.524 | −1.23USD−0.05% |
| C | 3m | Oct 12, 2026 — Oct 31, 2026 | −76.99USD−0.77% | 81.03USD0.81% | 25.00%13/52 | 0.396 | −1.48USD−0.05% |
| D | 3m | Oct 12, 2026 — Oct 31, 2026 | −1.43USD−0.01% | 18.92USD0.19% | 27.27%3/11 | 0.926 | −0.13USD−0.03% |
| E | 3m | Oct 12, 2026 — Oct 31, 2026 | −33.11USD−0.33% | 55.89USD0.56% | 4.76%1/21 | 0.336 | −1.58USD−0.10% |
| F | 3m | Oct 12, 2026 — Oct 31, 2026 | −45.86USD−0.46% | 56.78USD0.57% | 11.11%2/18 | 0.264 | −2.55USD−0.11% |
| G | 3m | Oct 12, 2026 — Oct 31, 2026 | −23.67USD−0.24% | 24.42USD0.24% | 0.00%0/5 | 0 | −4.73USD−0.15% |
| H | 3m | Oct 12, 2026 — Oct 31, 2026 | −5.48USD−0.05% | 14.93USD0.15% | 66.67%4/6 | 0.713 | −0.91USD0.01% |
| A | 5m | Oct 5, 2026 — Oct 31, 2026 | −13.66USD−0.14% | 13.66USD0.14% | 0.00%0/1 | 0 | −13.66USD−0.16% |
| B | 5m | Oct 5, 2026 — Oct 31, 2026 | −105.88USD−1.06% | 164.16USD1.64% | 34.88%30/86 | 0.558 | −1.23USD−0.02% |
| C | 5m | Oct 5, 2026 — Oct 31, 2026 | +1.47USD+0.01% | 53.77USD0.54% | 42.31%22/52 | 1.015 | 0.03USD0.01% |
| D | 5m | Oct 5, 2026 — Oct 31, 2026 | −15.47USD−0.15% | 23.47USD0.23% | 25.00%3/12 | 0.544 | −1.29USD−0.10% |
| E | 5m | Oct 5, 2026 — Oct 31, 2026 | −34.32USD−0.34% | 42.75USD0.43% | 12.50%2/16 | 0.189 | −2.15USD−0.09% |
| F | 5m | Oct 5, 2026 — Oct 31, 2026 | +13.27USD+0.13% | 26.59USD0.27% | 50.00%4/8 | 1.399 | 1.66USD0.05% |
| G | 5m | Oct 5, 2026 — Oct 31, 2026 | −12.66USD−0.13% | 18.02USD0.18% | 0.00%0/1 | 0 | −12.66USD−0.15% |
| H | 5m | Oct 5, 2026 — Oct 31, 2026 | −5.98USD−0.06% | 37.22USD0.37% | 37.50%3/8 | 0.782 | −0.75USD−0.06% |
| A | 15m | Aug 3, 2026 — Oct 31, 2026 | −6.86USD−0.07% | 25.74USD0.26% | 0.00%0/1 | 0 | −6.86USD−0.08% |
| B | 15m | Aug 3, 2026 — Oct 31, 2026 | −216.67USD−2.17% | 241.23USD2.41% | 43.18%38/88 | 0.507 | −2.46USD−0.04% |
| C | 15m | Aug 3, 2026 — Oct 31, 2026 | −62.87USD−0.63% | 82.30USD0.82% | 34.78%8/23 | 0.488 | −2.73USD−0.06% |
| D | 15m | Aug 3, 2026 — Oct 31, 2026 | −13.25USD−0.13% | 15.81USD0.16% | 50.00%2/4 | 0.22 | −3.31USD−0.04% |
| E | 15m | Aug 3, 2026 — Oct 31, 2026 | +36.46USD+0.36% | 16.35USD0.16% | 85.71%6/7 | 6.554 | 5.21USD0.10% |
| F | 15m | Aug 3, 2026 — Oct 31, 2026 | −74.96USD−0.75% | 102.11USD1.02% | 28.57%4/14 | 0.216 | −5.35USD−0.14% |
| G | 15m | Aug 3, 2026 — Oct 31, 2026 | — | — | — | — | — |
| H | 15m | Aug 3, 2026 — Oct 31, 2026 | +0.97USD+0.01% | 10.02USD0.10% | 50.00%2/4 | 1.126 | 0.24USD0.00% |

## Additional M5 CRT profiles

| Profile | Net P&L | Drawdown | Profitable exit records | PF |
|---|---:|---:|---:|---:|
| B_limit | −16.98USD−0.17% | 80.02USD0.80% | 37.33%28/75 | 0.884 |
| B_breakout | −186.63USD−1.87% | 241.60USD2.41% | 26.98%17/63 | 0.363 |
| B_buy_only | −27.59USD−0.28% | 46.99USD0.47% | 32.50%13/40 | 0.649 |
| B_sell_only | −64.96USD−0.65% | 132.09USD1.32% | 39.53%17/43 | 0.564 |
| B_future_window | No trades | No trades | No trades | No trades |
| B_past_window | No trades | No trades | No trades | No trades |
| B_oct5_19_exploratory | −1.54USD−0.02% | 33.68USD0.34% | 44.44%16/36 | 0.979 |
| B_oct19_31_exploratory | −104.34USD−1.04% | 140.85USD1.41% | 28.00%14/50 | 0.377 |
| B_limit_one_bar_expiry | −51.79USD−0.52% | 95.99USD0.96% | 31.82%21/66 | 0.638 |
| B_breakout_one_bar_expiry | −110.62USD−1.11% | 164.06USD1.64% | 31.67%19/60 | 0.501 |
| B_manual_pause | No trades | No trades | No trades | No trades |

## Source and deployment evidence

Canonical strategy SHA-256: `3b51541fbc34049c69792432556f86590bf5f6e832b5aab860334155f0b54b2e`.

Raw records: [32 module runs](v030-matrix.jsonl) and [11 feature runs](v030-features.jsonl). Each includes timestamp, input values, source hash and the observed tester text. The [earlier 48 runs](TRADINGVIEW_RESULTS.md) belong to the previous source and are retained separately.

The user reports deployment and supplied a Telegram screenshot of test-buy-004. This demonstrates receipt of that test message. No native live alert delivery, Vercel cold-start latency, real broker execution, untouched out-of-sample evaluation or demo forward test was observed in this upgrade. No running alerts, backend deployment or real messages were changed/sent. Recreate the indicator alert after installing the new Pine source because TradingView alerts retain a script snapshot.

The temporary chart test tab used autosave disabled. The original three indicator states were restored exactly, and autosave was returned to enabled; see [restoration record](v030-chart-restoration.json). 
