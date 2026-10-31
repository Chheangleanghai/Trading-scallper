# v0.5.0 — Pattern audit and smaller, lighter UI

**The system is not established as profitable or suitable for live trading.** Of 32 isolated historical runs, 24 were negative, 7 positive and 1 had no trades. Positive tiny samples do not establish a reliable win rate.

## Corrections

- A confirmed swing can emit only one closing structure break. Wick-only touches, repeated recrosses and conflicting dual-direction breaks do not create new BOS/CHoCH. The M15 context applies the same rule.
- Quasimodo requires a recorded closing break of the matching neckline pivot after head confirmation and no later than right-shoulder confirmation. Geometry alone and a wick above/below the neckline are insufficient. The previous geometry-only implementation did not enforce this closing-break evidence. The resulting variant is deliberately conservative; fast breaks before head confirmation and breaks outside the retained six-per-side history can be omitted.
- Smaller default text, Tiny/Small/Normal/Large options, pale context label backgrounds (82% transparency), dark text and light dashboard surfaces. Confirmed BUY/SELL markers remain visually distinct.
- The compact panel adds a new-signal gate reason: session, ATR/warm-up, news pause, date window, cooldown, plan limit, pending order or remaining confirmation/risk checks. The panel moves to the middle right to avoid the watermark.

## What is and is not verified

The standalone native harness contains 82 assertions, including 24 new structure-break, ambiguity and QM chronology/lookup checks. The local Node22 suite passes 75 tests in six files, including execution of the assertion source through an independent harness, a failing canary, strict TypeScript, generation consistency and independent Pine parsing. Native TradingView compilation/execution and its actual success caption are recorded in [v050-native-assertions.json](v050-native-assertions.json); a successful test is not proof of predictive value.

| Module | Audited operational rule | Remaining limitation |
|---|---|---|
| A | Confirmed pivot sweep → later MSS/FVG → later rejection, shared safety checks | Very sparse trades; the loaded sample does not demonstrate an edge. |
| B | Completed-reference range sweep/re-entry → later sweep-candle break | One specified CRT approximation, not every discretionary CRT interpretation. |
| C | Aged confirmed-pivot false breakout → later reversal break | Intraday pivot variant, not the original 20-day Turtle Soup method. |
| D | Repeated confirmed pivot levels, displaced breakout/retest or rejection | Two pivots and ATR tolerance do not establish future level strength. |
| E | Opposite candle + impulsive break of confirmed swing → zone retest | Tested bars count individually; this is not proof of institutional supply/demand. |
| F | Structure + EMA9/21/(50) pullback and later trigger | EMA/structure conditions are not validated predictors of returns. |
| G | Prior compressed range → sweep/reclaim → later displacement | Rolling-range AMD heuristic, not proof of accumulation/manipulation. |
| H | Five confirmed pivots + time-qualified closing neckline break → later retest | Strict QM approximation; small samples and bounded history. |

The chart OB and FVG candidates are separate contextual annotations. They are not equivalent to a qualified strategy entry. The 0–100 score is a heuristic, not a winning probability. No strategy was enabled or threshold relaxed to force immediate signals.

## Native historical results

FOREXCOM:XAUUSD, standard M1/M3/M5/M15 candles, all other source defaults except the isolated module. $10,000 USD capital, 0.5% planned-risk ceiling, 90% notional/equity cap, 0.01% commission per execution, two ticks slippage, partial exits, fixed 1/2/3R targets and a 15-minute close-time holding check. These costs are examples, not calibrated broker spread/execution. Loaded history varies by timeframe and the live right edge advanced. This is inspected historical data, not an untouched out-of-sample test.

**Win-rate denominators are exit records and may count partial exits separately.** A 100% value from three exit records can reflect a single position and must not be described as a reliable strategy win rate. A missing profit factor with no losses is undefined, not a fabricated infinite result.

| Module | Chart | Loaded history | Net P&L | Drawdown | Profitable exit records | PF | Expectancy / exit |
|---|---|---|---:|---:|---:|---:|---:|
| A | 1m | Oct 26, 2026 — Oct 31, 2026 | −7.74USD−0.08% | 7.74USD0.08% | 0.00%0/4 | 0 | −1.93USD−0.11% |
| B | 1m | Oct 26, 2026 — Oct 31, 2026 | −57.91USD−0.58% | 70.87USD0.71% | 26.98%17/63 | 0.513 | −0.92USD−0.06% |
| C | 1m | Oct 26, 2026 — Oct 31, 2026 | −47.87USD−0.48% | 72.30USD0.72% | 30.00%21/70 | 0.593 | −0.68USD−0.04% |
| D | 1m | Oct 26, 2026 — Oct 31, 2026 | −17.08USD−0.17% | 17.34USD0.17% | 30.00%6/20 | 0.305 | −0.85USD−0.05% |
| E | 1m | Oct 26, 2026 — Oct 31, 2026 | −22.49USD−0.22% | 22.49USD0.22% | 23.08%3/13 | 0.394 | −1.73USD−0.09% |
| F | 1m | Oct 26, 2026 — Oct 31, 2026 | −67.55USD−0.68% | 67.88USD0.68% | 13.33%4/30 | 0.125 | −2.25USD−0.09% |
| G | 1m | Oct 26, 2026 — Oct 31, 2026 | +1.28USD+0.01% | 7.06USD0.07% | 100.00%1/1 | — | 1.28USD0.01% |
| H | 1m | Oct 26, 2026 — Oct 31, 2026 | +9.12USD+0.09% | 2.92USD0.03% | 100.00%3/3 | — | 3.04USD0.04% |
| A | 3m | Oct 12, 2026 — Oct 31, 2026 | −0.30USD0.00% | 3.33USD0.03% | 0.00%0/1 | 0 | −0.30USD0.00% |
| B | 3m | Oct 12, 2026 — Oct 31, 2026 | −117.30USD−1.17% | 156.41USD1.56% | 29.47%28/95 | 0.524 | −1.23USD−0.05% |
| C | 3m | Oct 12, 2026 — Oct 31, 2026 | −76.99USD−0.77% | 81.03USD0.81% | 25.00%13/52 | 0.396 | −1.48USD−0.05% |
| D | 3m | Oct 12, 2026 — Oct 31, 2026 | −1.43USD−0.01% | 18.92USD0.19% | 27.27%3/11 | 0.926 | −0.13USD−0.03% |
| E | 3m | Oct 12, 2026 — Oct 31, 2026 | −33.11USD−0.33% | 55.89USD0.56% | 4.76%1/21 | 0.336 | −1.58USD−0.10% |
| F | 3m | Oct 12, 2026 — Oct 31, 2026 | −45.86USD−0.46% | 56.78USD0.57% | 11.11%2/18 | 0.264 | −2.55USD−0.11% |
| G | 3m | Oct 12, 2026 — Oct 31, 2026 | −23.67USD−0.24% | 24.42USD0.24% | 0.00%0/5 | 0 | −4.73USD−0.15% |
| H | 3m | Oct 12, 2026 — Oct 31, 2026 | +10.14USD+0.10% | 7.53USD0.08% | 100.00%3/3 | — | 3.38USD0.07% |
| A | 5m | Oct 5, 2026 — Oct 31, 2026 | −13.66USD−0.14% | 13.66USD0.14% | 0.00%0/1 | 0 | −13.66USD−0.16% |
| B | 5m | Oct 5, 2026 — Oct 31, 2026 | −105.88USD−1.06% | 164.16USD1.64% | 34.88%30/86 | 0.558 | −1.23USD−0.02% |
| C | 5m | Oct 5, 2026 — Oct 31, 2026 | +1.47USD+0.01% | 53.77USD0.54% | 42.31%22/52 | 1.015 | 0.03USD0.01% |
| D | 5m | Oct 5, 2026 — Oct 31, 2026 | −15.47USD−0.15% | 23.47USD0.23% | 25.00%3/12 | 0.544 | −1.29USD−0.10% |
| E | 5m | Oct 5, 2026 — Oct 31, 2026 | −34.32USD−0.34% | 42.75USD0.43% | 12.50%2/16 | 0.189 | −2.15USD−0.09% |
| F | 5m | Oct 5, 2026 — Oct 31, 2026 | +13.27USD+0.13% | 26.59USD0.27% | 50.00%4/8 | 1.399 | 1.66USD0.05% |
| G | 5m | Oct 5, 2026 — Oct 31, 2026 | −12.66USD−0.13% | 18.02USD0.18% | 0.00%0/1 | 0 | −12.66USD−0.15% |
| H | 5m | Oct 5, 2026 — Oct 31, 2026 | −0.14USD0.00% | 31.38USD0.31% | 33.33%2/6 | 0.993 | −0.02USD−0.07% |
| A | 15m | Aug 3, 2026 — Oct 31, 2026 | −6.86USD−0.07% | 25.74USD0.26% | 0.00%0/1 | 0 | −6.86USD−0.08% |
| B | 15m | Aug 3, 2026 — Oct 31, 2026 | −216.67USD−2.17% | 241.23USD2.41% | 43.18%38/88 | 0.507 | −2.46USD−0.04% |
| C | 15m | Aug 3, 2026 — Oct 31, 2026 | −62.87USD−0.63% | 82.30USD0.82% | 34.78%8/23 | 0.488 | −2.73USD−0.06% |
| D | 15m | Aug 3, 2026 — Oct 31, 2026 | −13.25USD−0.13% | 15.81USD0.16% | 50.00%2/4 | 0.22 | −3.31USD−0.04% |
| E | 15m | Aug 3, 2026 — Oct 31, 2026 | +36.46USD+0.36% | 16.35USD0.16% | 85.71%6/7 | 6.554 | 5.21USD0.10% |
| F | 15m | Aug 3, 2026 — Oct 31, 2026 | −74.96USD−0.75% | 102.11USD1.02% | 28.57%4/14 | 0.216 | −5.35USD−0.14% |
| G | 15m | Aug 3, 2026 — Oct 31, 2026 | — | — | — | — | — |
| H | 15m | Aug 3, 2026 — Oct 31, 2026 | +6.21USD+0.06% | 2.31USD0.02% | 100.00%1/1 | — | 6.21USD0.07% |

## Source provenance and remaining work

The exact matrix source is [archived here](sources/v050-matrix-strategy.pine), SHA-256 `2030f6c8aef8fe4448eec5de9d404e11997f5f7f3954e96ea2e530b618dfd4a9`. The final canonical source differs only in moving the compact table from bottom left to middle right. This report generator asserts that exact one-line difference. No trade calculation changed after the matrix. Final native compilation and the UI save are documented in verification.json and v050-chart-update.json.

Raw matrix: [v050-matrix.jsonl](v050-matrix.jsonl). Small/light, Dashboard and Tiny/light native controls: [v050-native-checks.json](v050-native-checks.json). Entry notification still requires a confirmed chart close: M1 checks each minute, M5 each five minutes. A valid setup can be absent for long periods. Simulated touches do not confirm broker fills.

Untouched out-of-sample tests, walk-forward research, broker-calibrated cost stress, multiple feeds, demo forward testing and a native live-alert-to-phone reconciliation remain outstanding. No new Telegram messages or running alerts were created. Recreate the indicator alert to use the new logic; TradingView retains the script/input snapshot from alert creation.

[Updated chart preview](v050-light-final.png).
