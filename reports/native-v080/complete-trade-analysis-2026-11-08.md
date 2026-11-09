# XAUUSD Strategy evidence review — 2026-11-08

## Scope and evidence boundary

The requested TradingView Strategy Tester export for rows **1–115** was not found in the repository. The strongest available execution evidence is the archived paired native run in [`qualified-plan-2026-11-06/strategy-paired-final-raw.csv`](qualified-plan-2026-11-06/strategy-paired-final-raw.csv), SHA-256 `2541b80179fe343775957472620c2eb451755d3224a86cd24bd726c21c77048d`. It is a 602-record Pine Logs CSV, not the requested full List of Trades CSV. It contains 77 plan/position groups and 113 actual exit audit rows, ending at 2026-11-06 12:30 UTC (19:30 WIB). It does not cover the full later period through November 7.

The user's three named examples were independently found in this archived native run and their IDs, prices, quantities, fees, and P&L reconcile. This establishes those examples, but does not prove that all of the requested 115 screenshot rows belong to this same capture. No later rows were inferred.

The archived run identifies `FOREXCOM:XAUUSD`, M5, version 0.8.0; USD 10,000 initial capital; commission 0.01% per side; two ticks of Strategy slippage; `minTick=0.01`, `pointValue=1`, `minContract=0.1`; partial exits enabled; London 08:00–17:00 Europe/London session; 15-minute time exit; and the research date-window input disabled. The strategy settings and inputs were captured in the archived paired report. The raw CSV does not cryptographically bind those settings or its source hash to each row.

Frozen baseline source hashes remain:

| Source | SHA-256 |
| --- | --- |
| `pine/indicator.pine` | `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` |
| `pine/strategy.pine` | `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` |

The native paired strategy artifact was attributed in the prior report to the exact-copy-backed stable-display source hash `ce6c1256bd9d29387f194be4ac715e479bf98f14bdcc0e9c697e5f4110f2aae9`. Current local research sources are different: diagnostic Indicator `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852` and diagnostic Strategy `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d`. The diagnostic Strategy's embedded parent hash `8461833b9f466380dd03d877e94215165544dfee038e407e6d130c840abac479` matches the on-disk `strategy_signal_clarity.pine`. The current compact diagnostic Strategy has not been natively compiled or copy-back verified.

## Complete position accounting

Positions were joined using symbol, timeframe, plan timestamp, module/entry ID, and actual entry time. All 77 position groups have a matching group audit; all 113 exit-row indices are unique; summed exit quantity exactly equals initial quantity in all 77 groups. The raw row `profit` totals reconcile exactly to Strategy `netProfitDelta`. Gross price P&L is `net row profit + actual commission`; commission is not subtracted a second time.

| Metric | Archived native sample |
| --- | ---: |
| Completed positions / actual exit rows | 77 / 113 |
| Wins / losses / breakeven | 33 / 44 / 0 |
| Position win rate | 42.86% (naive IID Wilson 95% interval 32.4%–54.0%) |
| Gross wins / gross losses by position | +$342.271 / −$290.373 |
| Net gross price P&L | +$51.898 |
| Commission | −$134.1201774 |
| Net P&L | **−$82.2221774** |
| Net profit factor (position net wins ÷ position net losses) | 0.77345 |
| Net expectancy / median position | −$1.06782 / −$1.98039 |
| Mean winning / losing position | +$8.50629 / −$8.24840 |
| Mean / median hold | 13.96 / 15 minutes |
| Largest net win / loss | +$23.629719 B_CRT / −$20.3377416 H_QUASIMODO |
| Maximum consecutive losing positions | 8 |
| Closed-position realized-equity drawdown from $10,000 | $213.1381 |

The drawdown above uses only sequential completed-position net results; it is not TradingView's intrabar Strategy Tester maximum drawdown. Commission was exactly 0.01% of recorded round-trip gross turnover ($1,341,201.774). Fees were 39.19% of the sum of positive gross position P&L. Strategy fills already include the configured slippage; no additional slippage was deducted. The IID interval is descriptive only and does not account for serial dependence or selection effects.

### Module results

These are **selected completed positions under shared A–H arbitration**, not independent module tests. A and G had no selected positions in this run; zero does not mean zero setups or zero candidates.

| Module | Positions W/L | Gross P&L | Commission | Net P&L | Net PF | Stop / timed final exits | Positions reaching TP1 / TP2 / TP3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A · Sweep/MSS/FVG | 0 | — | — | — | — | 0 / 0 | 0 / 0 / 0 |
| B · CRT | 46 (17/29) | −$16.330 | $79.971 | −$96.301 | 0.582 | 6 / 40 | 10 / 1 / 0 |
| C · Pivot false breakout | 9 (7/2) | +$44.621 | $15.697 | +$28.924 | 4.443 | 0 / 9 | 2 / 1 / 0 |
| D · K-SNR | 3 (3/0) | +$32.066 | $5.285 | +$26.781 | N/A (no net losses) | 0 / 3 | 1 / 0 / 0 |
| E · Supply/demand | 5 (1/4) | −$6.421 | $8.746 | −$15.167 | 0.560 | 2 / 3 | 1 / 0 / 0 |
| F · Trend pullback | 12 (4/8) | −$4.320 | $20.960 | −$25.280 | 0.635 | 0 / 12 | 1 / 0 / 0 |
| G · AMD range | 0 | — | — | — | — | 0 / 0 | 0 / 0 / 0 |
| H · Quasimodo | 2 (1/1) | +$2.282 | $3.461 | −$1.179 | 0.942 | 1 / 1 | 1 / 0 / 0 |

There were 29 BUY positions (+$43.430 net; 16 wins/13 losses) and 48 SELL positions (−$125.652 net; 17 wins/31 losses). The run was configured to select the London session, so it cannot compare Asian, London, and New York performance. One plan bar opened inside London hours but its next-tick emulator fill was exactly 17:00 London. This is a session-boundary behavior to define explicitly, not enough by itself to call a strategy defect.

## Exit and stop-loss investigation

All **68** `TRADE_CLOSED` positions have the exact `Close entry(s) order <module>` exit ID, `TRADE_CLOSED` comment, and 15-minute recorded hold. Together with the captured `timeExit=15` setting and source's elapsed-time `strategy.close` condition, these qualify as verified time exits in this archived run. All **9** stopped positions carry `STOP_LOSS_HIT` comments; the three closed rows per position correspond to the TP1/TP2/TP3 exit orders whose stop legs executed. There were 16 positions with a TP1 partial, two with TP2, and none with TP3; target hits are not mutually exclusive with a later time exit.

| Entry UTC | Module / side | Actual entry | Initial SL → stop fill | SL distance from fill (ticks) | Qty | Hold | Gross / fee / net USD |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Oct 16 15:10 | B / BUY | 4185.95 | 4181.51 → 4181.49 | 444 | 2.1 | 0m | −9.366 / 1.7571624 / −11.1231624 |
| Oct 19 09:15 | B / BUY | 4172.12 | 4168.84 → 4168.82 | 328 | 2.1 | 10m | −6.930 / 1.7515974 / −8.6815974 |
| Oct 21 07:15 | E supply / SELL | 4114.74 | 4120.02 → 4120.04 | 528 | 2.1 | 5m | −11.130 / 1.7293038 / −12.8593038 |
| Oct 21 09:25 | B / SELL | 4120.52 | 4125.24 → 4125.26 | 472 | 2.1 | 10m | −9.954 / 1.7316138 / −11.6856138 |
| Oct 26 14:50 | H / SELL | 4017.92 | 4026.34 → 4026.36 | 842 | 2.2 | 5m | −18.568 / 1.7697416 / −20.3377416 |
| Oct 27 08:15 | E supply / SELL | 3996.79 | 4000.64 → 4000.66 | 385 | 2.2 | 0m | −8.514 / 1.7594390 / −10.2734390 |
| Oct 27 12:55 | B / SELL | 4020.68 | 4026.78 → 4026.80 | 610 | 2.2 | 5m | −13.464 / 1.7704456 / −15.2344456 |
| Oct 28 10:45 | B / BUY | 4047.58 | 4044.47 → 4044.45 | 311 | 2.1 | 10m | −6.573 / 1.6993263 / −8.2723263 |
| Nov 03 12:05 | B / SELL | 3902.33 | 3907.70 → 3907.72 | 537 | 2.2 | 10m | −11.858 / 1.7182110 / −13.5762110 |

All stop fills were 0.02 (two ticks) beyond their stop price in the adverse direction, consistent with the configured two-tick slippage; the fills include that cost. None of these nine grouped positions has an earlier TP partial. Two stopped positions have the same entry and exit bar index; seven exit on later bar indices. The raw evidence has no candle OHLC snapshots or ATR values, so stop-vs-candle path, ATR-normalized distance, spread impact, and whether the stop sat inside a structural zone cannot be established from this export. No evidence here justifies widening stops.

The three screenshot examples reconcile exactly with the archived audit:

- **C_TURTLE_SOUP BUY, Nov 6 11:20 UTC:** quantities 0.6/0.6/0.9; gross $11.946 − commission $1.708923 = net **$10.237077**; one position, three exit rows, 15-minute time exit.
- **H_QUASIMODO SELL, Oct 26 14:50 UTC:** quantities 0.7/0.7/0.8, all three exit legs hit the same stop at 4026.36; gross −$18.568 − commission $1.7697416 = net **−$20.3377416**; one position, not three signals.
- **B_CRT BUY, Nov 5 14:20 UTC:** quantities 0.6 and 1.5; gross $13.143 − commission $1.7347845 = net **$11.4082155**; one position, two exit rows.

## Concept, latency, parity, and experiment limits

The code's A–H are operational heuristics, not universally standardized or independently validated definitions: A sweep→MSS/displacement/FVG→retest; B completed CRT reference-range sweep and later reversal break; C confirmed-pivot false breakout (not the classic 20-day Turtle Soup system); D repeated confirmed-pivot K-SNR breakout/rejection; E opposite-candle supply/demand departure and retest; F structural EMA trend pullback; G compressed-range sweep then displaced break (AMD approximation); H confirmed five-pivot Quasimodo geometry with neckline and retest. The 77-position execution export records selected positions, not per-module detected/rejected candidates or setup-to-confirmation latency.

A separate Nov 7 **Indicator-only** diagnostic capture observed 11 setups over 36 M5 bars in its bounded three-hour window: A1, B5, C1, D0, E0, F2, G2, H0; eight confirmation-pass events and two selected B plans. Those two Indicator estimates had 2- and 3-bar setup-to-confirmation latency. It is structurally complete only within that window, unauthenticated as a full log export, and not an actual Strategy fill dataset. Its recorded experimental source hash (`0931720f236cd4c4faa9b350674d950a6582c84dbac5ed89d65a8e08bd964161`) differs from the current local diagnostic Indicator hash, so it is not attributed to the current local file. Do not combine its counts or latency with the 77-position P&L sample.

The existing paired comparison is not full-stream parity: 76 Indicator plans and 77 Strategy plans, 74 common timestamps, 71 exact common plans, three differing common plans, two Indicator-only and three Strategy-only. Two differences involve `setupTimestamp`; the third includes selected module and planned fields. This remains unresolved. The old native Strategy is recorded as compiled in the paired run; no new TradingView compile, copy-back, Replay, reload, or Strategy Tester export was performed now because the browser-control host was unavailable. The **current** compact diagnostic Strategy has no native compile confirmation. A previous larger diagnostic Strategy draft was reported at 102,238 compiled tokens against a 100,256 limit; the current source changed afterward, but its native compiled-token count remains unknown.

No time-exit alternatives (30/45 minutes or disabled) were re-run. These change trade-slot occupancy and therefore alter later eligible plans, so position-level arithmetic from the existing exits cannot validly simulate those counterfactuals. No source trading rules were changed: the dataset confirms cost drag but does not identify a validated entry, stop, module or time-exit rule that improves future net expectancy without a chronological out-of-sample replay.

## Verification performed

- `npm run verify` — PASS: TypeScript typecheck; 26 test files, 223 tests; generated Pine consistency; independent parser passed all 31 Pine files. Parser output explicitly does not certify TradingView compilation or emulator behavior.
- `python3 scripts/generate_signal_diagnostics.py --check` — PASS; generated experimental hashes matched the checked-in Indicator and compact Strategy.
- `npx vitest run tests/signal-diagnostics.test.mjs` — PASS: 20/20 focused tests, including exact parent comparison of the plan-decision and order/exit blocks after diagnostic-only hooks are stripped.
- `npm audit --omit=dev` — PASS: zero reported vulnerabilities.
- `git diff --check` — PASS.
- TradingView UI/native checks — NOT RUN in this turn: Chrome was running, but the browser-control host was unavailable. No native compile or current-source parity claim is made.
- In this continuation, the only code change was the focused invariant test; Pine source and trading rules were not changed. This report was updated with the new check, and pre-existing compact Strategy and generator changes were preserved.

## Next evidence needed

Export the **TradingView Strategy Tester → List of trades CSV** for the exact latest run showing rows 1–115 (FOREXCOM:XAUUSD M5, through Nov 7) and attach it. That is the one missing artifact needed to reconcile the additional rows and rerun complete position, module, cost, and exit statistics for the period you supplied.
