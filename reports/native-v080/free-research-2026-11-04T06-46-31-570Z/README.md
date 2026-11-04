# Free-account native research — 2026-11-04

**Result: `MULTI_PLAN_MISMATCH_EXPERIMENT`, tolerance 0. Historical export reload stability observed. Release remains v0.8.0.**

## Capture and settings

Downloaded actual Pine Logs through TradingView's **Pine logs → Settings → Download logs** on the logged-in Free/Basic account. The chart identifies `FOREXCOM:XAUUSD`, standard M5 candles. The Strategy Tester window is Oct 5–Nov 4, 2026. This capture compares the existing Indicator with **XAUUSD SMART SCALPER PRO Backtest · Exit audit experiment**. The frozen baseline Strategy was not the active report source.

The existing runtime configuration already enabled A–H. These module choices were preserved. Only research audit logging was enabled for both scripts; the hidden Indicator was temporarily shown so TradingView would calculate its logs. Three overlapping accessibility captures cover input items 0–188 for each script. Every corresponding observed label/control/value matches (`observed-input-comparison.json`). Settings include quality 75, H1 alignment on, London session filter on, research date-window restriction off, Close entries, 15-minute holding time, partial exits on, break-even/trailing off, risk 0.5%, and notional cap 90%.

The Strategy Properties capture shows USD 10,000 initial capital, default size 100% equity, pyramiding 0, commission 0.01%, slippage 2 ticks, 1x long/short leverage, default 4-tick bar detailization, bar-close script execution, and one-tick order delay. The Pine adapter supplies explicit `qty`; the default percent size does not replace that argument. No explicit spread model was captured. The exported log timestamps use `-00:00`; no chart timezone dialog was captured.

The prior exact-source compile/copy-back evidence is retained. This run did not repeat a complete current editor copy-back. Current local hashes remain Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`, baseline Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`, experiment `a8267588770637b4a75e50367267dac11a8ba6783cdd9084e7d9620ff3961623`. Active study names alone do not authenticate full runtime buffers. Do not mark a formal baseline release gate passed from this experiment.

## Raw artifacts

| Artifact | Records | SHA-256 |
| --- | ---: | --- |
| `indicator-pine-logs.csv` | 372 | `2ceadf7bffdb7ea2f1d1fbb3492ab7da7d81c3dcbbf208ceea65048f31e0f594` |
| `strategy-experiment-pine-logs.csv` | 622 | `2460ccd1665826892adabd1b2373779dcb72b5a1f56f84877aa07b16bac3d6ae` |

The original download files also remain in Downloads. The `.txt` companions decode CSV `Date` and `Message` columns into one `[Date]: Message` line per record; no payload values were changed. They are derived text, not separate native exports. Pine Logs CSVs are distinct from the plan-gated Strategy Tester trade-list CSV.

## Planned comparison

| Measure | Observed |
| --- | ---: |
| Indicator plans | 84 |
| Strategy experiment plans | 87 |
| Common plan timestamps | 79 |
| Fully matching common plans | 76 |
| Shared timestamps with a planned-field difference | 3 |
| Indicator-only plans | 5 |
| Strategy-only plans | 8 |
| Price-level mismatches at shared timestamps | 0 |

The comparator reports 16 mismatch records: one module difference, two setup-timestamp differences, and 13 missing-plan records. `INDICATOR_ESTIMATE` versus `STRATEGY_EMULATOR` is reported separately for all 79 common timestamps. This is a failed broader comparison even though many individual plans match. No signal filters or tolerances were relaxed.

| Plan close, UTC | Difference |
| --- | --- |
| Oct 8 07:35 | Indicator `C_TURTLE_SOUP`; experiment `B_CRT`; other compared fields match |
| Oct 8 08:35 | Strategy experiment only |
| Oct 8 09:15 | Strategy experiment only |
| Oct 9 07:50 | Strategy experiment only |
| Oct 9 08:05 | Indicator only |
| Oct 9 08:15 | Strategy experiment only |
| Oct 9 09:55 | Strategy experiment only |
| Oct 9 11:30 | Indicator only |
| Oct 9 12:30 | Indicator only |
| Oct 19 10:35 | Indicator only |
| Oct 19 11:05 | Strategy experiment only |
| Oct 21 09:55 | Indicator only |
| Oct 21 12:55 | Strategy experiment only |
| Oct 22 08:35 | Strategy experiment only |
| Oct 22 15:40 | F setup: Indicator 15:25; experiment 15:30 |
| Nov 3 08:40 | F setup: Indicator 08:20; experiment 08:25 |

`plan-comparison.json` preserves every comparator result. `mismatch-timeline.json` includes nearby actual lifecycle payloads for each difference.

## Execution coupling and observed residual size

The common source creates new B–H setups only when `not active and not pending and not brokerBusy` (`pine/strategy.pine:492`). Plan arbitration also requires an available plan slot (`:788`). Consequently, different fill/closure observations can alter future candidate setup times and arbitration. Equality of independent engine predicates does not ensure equality of future plans under these two execution models.

For Oct 22's F plan, the preceding Indicator closure has embedded `eventTimestamp` 15:25, versus experiment 15:30. The later F plan has the same 15:40 plan time and prices but setup times 15:25 versus 15:30. The Nov 3 pair has the same pattern at 08:20/08:25. This supports execution-driven setup timing differences. Logs do not expose every candidate transition, so the full causal history of every missing or module-mismatched plan is unresolved.

The first module mismatch follows an important exit discrepancy. The Oct 8 07:05 C short has three actual stop fills of 0.6, 0.6, and 0.8 units at 07:10, totaling 2.0 of its 2.1 units. A final 0.1-unit market close occurs at 07:20 and is observed in the 07:25 lifecycle payload. The Indicator marks the preceding trade closed at 07:15. Candidate availability therefore differs before the 07:35 C/B selection.

Across this export, **13 groups have all three stop IDs filled but retain 0.1 until a later market/time close**: nine entries of 2.1 units and four of 2.2 units. One additional group retains 0.1 after all three target IDs fill. The requested q3 calculation is `initialQty - q1 - q2` (`pine/strategy.pine:1007`), with no explicit lot-unit normalization of the remainder. Floating-point quantity truncation is consistent with the observed 0.8 versus intended 0.9 remainder for a 2.1 entry, but requested native quantities/reservations are absent from the telemetry. The exact rounding/reservation cause is not proven.

The research analyzer now emits `bracketCoverage` and a count of `groupsWithBracketResidual`. It flags only cases where TP1/TP2/TP3 exit IDs are all observed and a later `TRADE_CLOSED` row confirms remaining size. An ordinary partial TP followed by a time exit is not flagged. This is an offline diagnostic; baseline and experiment Pine sources remain unchanged.

## Actual experiment performance and costs

The logs contain **150 closed-trade rows belonging to 87 completed positions**, with no missing group record, duplicate row, or net-profit reconciliation mismatch. Position groups have 34 winners and 53 losers. The tester's 58/150 winners count closed rows, so it must not be presented as 58 winning independent plans.

- Gross price-movement P&L, using logged point value 1: **+$64.21**.
- Logged round-trip commissions summed across partial rows: **$151.6316762**.
- Net: **$64.21 − $151.6316762 = −$87.4216762**.
- Tester UI: net **−$87.42**, maximum drawdown **$207.70**, profit factor **0.779**, 150 closed rows, 58 positive rows.

All group `netProfitDelta` values reconcile with their actual partial-row profit sums. The sample is in-sample, uses the isolated experiment with all modules, and has no spread sensitivity or OOS result. It does not establish general profitability or a baseline release result.

## Normal reload check

The chart reported **All changes saved**, with no editor dialog open. A normal browser reload was performed, then each script's Pine Logs were downloaded again. `indicator-after-reload.csv` and `strategy-experiment-after-reload.csv` are byte-for-byte identical to their respective first exports, including every message, prefix, timestamp, level, exit row, and group result. Details: `reload-comparison.json`.

This is historical export stability for this chart/range. No Bar Replay candle was advanced and no intrabar first-appearance timing was observed. The non-repainting/Replay gate remains open. The Free account's Replay and Strategy Tester CSV upgrade prompts were not bypassed, and no subscription was started.

## Verification and isolated next experiments

Four focused regression cases were added for residual detection (both directions), ordinary partial exits, and floating-point noise. `npm run verify` passed TypeScript, **160 tests / 14 files**, generation consistency, and independent Pine parsing. `local-verification.txt` contains the actual output. No Pine rule, version, dependency, alert, deployment, or trade changed.

Final chart state is FOREXCOM:XAUUSD M5, Replay off, the Indicator hidden again as it was at the start of this capture, and the Strategy experiment visible. Research audit logging remains enabled on both instances for further capture. `final-chart.ax.txt` records the final chart controls.

Next useful native experiments are isolated from the frozen baseline: log requested q1/q2/q3 quantities in minimum-contract units at order creation; compare the existing allocation with integer-lot allocation on the same stop case; and log candidate begin/expiry/ready transitions around the first C/B mismatch. Any new Pine experiment needs its own hash and native compile before attribution. Do not loosen filters, discard mismatches, or claim non-repainting from historical reload alone.
