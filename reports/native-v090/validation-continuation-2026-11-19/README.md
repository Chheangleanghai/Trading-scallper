# Native validation continuation — 2026-11-19

This is a research-only progress record. No Pine source, trading rule, alert, order, Telegram destination, deployment, or saved TradingView chart setting was changed.

## What was checked today

- `npm run verify` passed: 27/27 test files, 238/238 tests, typecheck, generator checks and 31 independent Pine parses. Independent parsing does not certify TradingView compilation.
- The frozen quantity experiment remains SHA-256 `bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed`. The four frozen Inputs/Properties reference hashes still match the November 5 protocol. Baseline Indicator and Strategy remain `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` and `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`.
- Before the native run, the signed-in TradingView tab showed the saved `Unnamed` chart at `FOREXCOM:XAUUSD` **30 minutes**, UTC+7, with five studies hidden. The frozen quantity experiment was not a saved TradingView script; its exact local source was pasted into an unsaved Pine Editor for the temporary test.

## Native test and remaining gates

The November 5 protocol calls for the frozen `pine/experiments/strategy_quantity_units.pine` source on standard `FOREXCOM:XAUUSD` M5 candles, the 115-control reference configuration, `useResearchWindow=true`, and a November 6 00:00–November 20 00:00 UTC admission window. This test used those conditions. Its end is November 20 at **07:00 UTC+7**, still in the future at this capture.

The frozen source has no per-bar warm-up log. Its first exit row records `entryBar=2632` at 2026-11-06 18:20 UTC+7. There can be at most 137 standard M5 bars from the window's 07:00 start through 18:20 inclusive, so at least `2633 − 137 = 2496` calculation bars preceded the admission window. This exceeds the protocol's 1,000-bar warm-up requirement under standard sequential M5 bar indexing.

The November 5 protocol itself records `runtimeApplied=false` and `independentlyRegistered=false`. Running its past November 6–19 bars now can validate a **frozen-source historical reconstruction** if source/settings/history and all rows are captured. It cannot retroactively prove that this exact configuration was running live from November 6, or that these already-observed dates were untouched out-of-sample data. Keep any genuinely future observation and any retrospective reconstruction labeled separately. Do not infer profitability from the existing 79-position already-inspected sample.

Strict Indicator/Strategy full-history parity still fails at zero tolerance (11 affected plan keys, 17 field or missing-plan differences) under the different indicator-estimate and broker-emulator states. General live non-repainting is unverified; Free-plan Bar Replay previously reached a plan gate. See the [November 13 evidence](../validation-continuation-2026-11-13/README.md) for the completed native pairs and scoped historical repeat.

## Native Strategy capture, November 19

- The exact Pine Editor copy-back matched the frozen local experiment: 108,540 bytes, 1,548 lines, SHA-256 `bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed`. TradingView reported `Compiled.` and `Added to chart.`
- A–H were enabled, as were the research date window and audit logs. All other 115-control inputs were inspected against the earlier matrix-window reference; no trading parameter was changed. Observed Strategy Properties were USD 10,000 capital, 0.01% commission per side, two ticks slippage, pyramiding zero, 1x long/short leverage, bar-close calculations, and one-tick order delay. Explicit Pine quantity controls size. These are UI observations, not an independent export of the whole Properties dialog.
- The original [Pine Logs CSV](strategy-quantity-units-pine-logs.csv) is preserved unchanged, SHA-256 `e694bf42a5b3e78e97069ce668ae37b6707b6414f6c6e7317d80c851db8aa5ba`. The [decoded messages](strategy-quantity-units-pine-logs.txt), [position analysis](strategy-quantity-units-exit-analysis.json), and [summary](strategy-quantity-units-summary.json) are derived. The CSV contains 250 messages. The log payload does not embed source hash or full input settings, so attribution also depends on the observed copy-back and UI settings.

| Measure | Native result through November 19 |
| --- | ---: |
| Qualified plans / quantity audits | 31 / 31 |
| Completed positions / exit rows | 31 / 49 |
| Position winners / losers | 16 / 15 |
| Gross price P&L | +$15.620000 |
| Commission | −$54.883055 |
| Net P&L | −$39.263055 |

All 49 exit-row net profits reconcile exactly to the 31 position net-profit deltas. No exit or group record is missing or duplicated. Every position's closed quantity equals its initial quantity. All 31 TP allocations conserve 0.1-contract units without negative or fractional-step legs. The feed reports `mincontract=0.1`, `mintick=0.01`, `pointvalue=1`, and USD for chart/account currency. The Strategy report rounds net to −$39.26 and displays `25/49 = 51.02%` profitable **exit rows**. Position win rate is `16/31 = 51.61%`. Its displayed profit factor is 0.755.

| Module | Positions | Gross price P&L | Commission | Net P&L |
| --- | ---: | ---: | ---: | ---: |
| B CRT | 21 | −$31.653000 | $37.153340 | −$68.806340 |
| C pivot false break | 6 | +$59.673000 | $10.594512 | +$49.078488 |
| E supply | 1 | +$9.152000 | $1.782744 | +$7.369256 |
| F trend pullback | 1 | +$7.282000 | $1.779397 | +$5.502603 |
| G range sweep | 2 | −$28.834000 | $3.573063 | −$32.407063 |

A, D, and H had no completed positions **in this window**; that does not establish their setup counts or isolated efficacy. Final exit comments identify 26 `TRADE_CLOSED`, four `STOP_LOSS_HIT`, and one `TP3_HIT` positions. TP1 and TP2 also executed eight and two partial rows. All 26 `TRADE_CLOSED` positions held exactly 15 minutes by emulator entry/exit timestamps. The frozen source's only `strategy.close` is guarded by the `timeExit` elapsed-time check and uses `comment='TRADE_CLOSED'`, supporting time-exit attribution here. Those 26 positions produced +$0.177901 net after $46.027099 commission. A longer hold is an untested hypothesis. Slippage is already embedded in fills and was not deducted again.

Predeclared chronological summaries: November 6–13 UTC had 17 completed positions, eight wins, −$43.857753 net; November 13–20 UTC has 14 completed positions, eight wins, +$4.594698 net **through this partial November 19 capture**. These are retrospective calculations run after both spans began. The protocol was locally prepared, but neither independently registered nor running live from November 6; the result is not prospective or untouched out-of-sample evidence.

The Free/Basic account showed a paid-upgrade prompt for Strategy Tester List of Trades CSV export. No upgrade was made. Pine Logs CSV export succeeded. This run did not compare the old quantity allocation under identical settings, so it verifies native conservation and accounting but does not prove a performance improvement. After capture, the saved `Unnamed` layout was reloaded with Autosave off. It returned to `FOREXCOM:XAUUSD` **30m**, UTC+7, with its five original studies hidden and no temporary experiment. Autosave was turned back on and verified; Pine Editor and Pine Logs panels were closed.

Highest-value next action: after the November 20 00:00 UTC endpoint, capture the same frozen Strategy's completed window with unchanged source, inputs, feed, and Properties. Follow any position entered before the end through closure. Keep historical reconstruction and genuinely future precommitted observations labeled separately.
