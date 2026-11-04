# Strategy exit reconciliation — 2026-11-03

## Scope and evidence status

This review uses the trade fields supplied by the user and a direct observation of the open TradingView Strategy Tester on 2026-11-03. The tester visibly showed FOREX.com XAUUSD M5, range Oct 5–Nov 3, 2026, and one Long row with the supplied 10:55 / 11:10 times, 4177.50 / 4171.83 prices, size 2.1, −$13.66, and −0.16%. The applied Strategy's visible input legend included a 15-minute time exit. The list did not expose exit ID/comment. Clicking **Download .csv** displayed TradingView's plan-upgrade gate stating that strategy trade export requires an upgrade from Basic; no upgrade was made and no CSV was created. The active Strategy row was not hash-matched during this observation, so runtime source attribution and actual Properties overrides remain unverified. The Strategy was temporarily shown to inspect the row, then hidden again. A final UI check confirmed the Indicator is shown, the Strategy is hidden, the Strategy Tester panel is closed, and the chart layout remains unsaved. The uploaded chart image is preserved at `tradingview-chart-indicator-m5-2026-11-03.png` (SHA-256 `ba54c782787ce3eaa5b36340decb5fbef77613bacc259d4046c3a430f9b27c56`); it shows a chart/Indicator view, not the Strategy Tester trade row or its exit identifiers.

## Net P&L reconciliation

Assuming a full 2.1-unit long position, an effective point value of 1 USD per price unit, and 0.01% commission on each side:

| Component | Calculation | USD |
| --- | --- | ---: |
| Gross price P&L | (4171.83 − 4177.50) × 2.1 | −11.907 |
| Entry notional | 4177.50 × 2.1 | 8,772.750 |
| Entry commission | 8,772.750 × 0.0001 | 0.877275 |
| Exit notional | 4171.83 × 2.1 | 8,760.843 |
| Exit commission | 8,760.843 × 0.0001 | 0.8760843 |
| Total commission | Entry + exit | 1.7533593 |
| Net P&L | −11.907 − 1.7533593 | −13.6603593 → **−$13.66** |

Using the exact captured net `−$13.6603593`, return on entry notional is `−0.155697967%`, which rounds to **−0.16%** and matches the experiment audit row. As a percentage of $10,000 initial capital, the same loss is −0.1366% (−0.14%). The displayed ~$8.77K position value agrees with 4177.50 × 2.1. The experiment now supplies point value 1, confirming the price-value assumption for that isolated run; it does not independently authenticate the original applied baseline instance. The reconciliation uses the full 2.1-unit exit row and both entry/exit commissions.

## Exit cause and bracket orders

The baseline sets `timeExit` to 15 minutes (`pine/strategy.pine:63`). Its broker time-exit check compares the current bar close with the emulator entry timestamp and submits `strategy.close(..., comment='TRADE_CLOSED', immediately=false)` after the threshold (`pine/strategy.pine:1019-1020`). With a 10:55 entry timestamp on M5, elapsed time reaches 15 minutes at the bar closing 11:10. Since the strategy uses `process_orders_on_close=false`, `calc_on_every_tick=false`, and `calc_on_order_fills=false`, a close order created at that bar close can first fill at the next available tick, normally the next bar open, timestamped 11:10. The reported timestamps therefore fit the configured time exit. This is the **most likely cause, not confirmed**: only actual `exitId`/`exitComment` or equivalent row evidence can prove it. TradingView documents next-tick order fills and the `immediately` behavior in its [strategy execution documentation](https://www.tradingview.com/pine-script-docs/concepts/strategies/).

The normal stop is 4170.88; the reported exit is 4171.83, or 0.95 above the stop. With default break-even and trailing disabled, this is inconsistent with a normal stop fill at that stop level. TP1 is 4184.08 and subsequent targets are higher, so an exit at 4171.83 is not a TP limit fill. An earlier TP partial followed by a later market close cannot be excluded if the displayed trade row aggregates exits; only the closed-trade rows settle that. The Strategy's ordinary lifecycle handler emits generic `TRADE_CLOSED` when flat and does not include the row's exit ID, comment, price, or profit in that event (`pine/strategy.pine:696-713`).

Partial exits are enabled by default. For a 2.1 size and `syminfo.mincontract=0.1`, the source's 33% floors imply TP1=0.6, TP2=0.6, TP3=0.9 units; each bracket also has the shared managed stop (`pine/strategy.pine:1004-1013`). If `mincontract` differs, those quantities differ. A 2.1-unit single full-position exit row would rule out prior partial exits for that row; the user-provided summary does not state whether 2.1 is an exit-row size or an aggregate position size.

## Quantity calculation

The source sizes from planned entry and stop using point value, account conversion, strategy equity, risk percentage, the maximum-notional percentage, and `syminfo.mincontract` (`pine/strategy.pine:989-995`). With the source defaults, and conditionally assuming equity $10,000, point value 1, planned entry 4177.48, stop 4170.88, USD conversion 1, risk 0.5%, exposure cap 90%, and min contract 0.1:

- Risk per unit: (4177.48 − 4170.88) × 1 = $6.60.
- Risk-limited quantity: $50 / $6.60 = 7.57576.
- Exposure-limited quantity: $9,000 / (4177.48 × 1) = 2.15441.
- The exposure cap binds; flooring to a 0.1 minimum unit yields **2.1**.
- Planned stop risk at 2.1 units is $13.86 before costs, approximately 0.139% of $10,000.

If min contract were 0.01, this conditional calculation would floor to 2.15 instead. The actual run's `pointvalue`, `mintick`, `mincontract`, equity at order creation, Properties overrides, and input overrides were not supplied. TradingView documents that `syminfo.pointvalue`, `syminfo.mintick`, and `syminfo.mincontract` are instrument-specific values; see [Chart information](https://www.tradingview.com/pine-script-docs/concepts/chart-information/). The declared two-tick slippage could contribute to the 0.02 difference between planned 4177.48 and reported fill 4177.50, but without the bar open and tick metadata its contribution is not isolated.

## Isolated diagnostic improvement and checks

Confirmed gap: baseline `TRADE_CLOSED` telemetry does not identify which closed-trade rows, exit IDs/comments, actual prices, commissions, or sizes produced the flat position. I improved only the generated research experiment. `pine/experiments/strategy_exit_audit.pine` now records per-row `exitId`, `exitComment`, entry/exit time and bar, price, size, profit, commission, and excursions; its group record also captures equity and the sizing intermediates (risk quantity, exposure quantity, raw quantity, rounded quantity, point value, tick size, and minimum contract). The experiment remains separate from the baseline. Current experiment SHA-256: `a8267588770637b4a75e50367267dac11a8ba6783cdd9084e7d9620ff3961623`.

The matching analyzer `scripts/analyze-strategy-exits.mjs` reports exit rows by identity/comment and reconciles grouped net-profit deltas while preserving partial rows. Focused checks passed: 5 tests across 2 files; deterministic experiment generation check; independent Pine parser for the experiment and baseline scripts; `git diff --check`. The tests verify the experiment strips back to the frozen baseline apart from title/log-only code. This is not a TradingView compile or a native Strategy Tester run.

Baseline files remain unchanged:

- Indicator SHA-256: `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`.
- Strategy SHA-256: `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`.

## Initial isolated-experiment plan (superseded by the follow-up below)

In a separate unsaved TradingView Strategy draft, copy `pine/experiments/strategy_exit_audit.pine`, hash-match that editor buffer to the experiment hash above, compile it, keep the same symbol/timeframe/date range and actual inputs, enable its research audit input, then export the raw `TRADE_EXIT_AUDIT` and `TRADE_GROUP_AUDIT` rows. Run `node scripts/analyze-strategy-exits.mjs <raw-pine-logs.txt>`. An exit comment of `TRADE_CLOSED` would confirm the market time exit; `STOP_LOSS_HIT` or `TP*_HIT` rows would reveal bracket fills and partials. Keep the experiment separate from the baseline Strategy.

One losing trade does not establish whether the strategy is profitable.

## TradingView exit-audit follow-up — 2026-11-03

The isolated unsaved Strategy draft titled **“XAUUSD SMART SCALPER PRO Backtest · Exit audit experiment”** first compiled in TradingView at `12:53:19 PM`–`12:53:46 PM`; at that point a complete editor copy-back hash had not been obtained. The later exact-source copy-back and compile below supersede that initial limitation. The baseline Strategy was not edited, and the saved chart/layout was not saved.

Copied Pine Logs rows are preserved in `strategy-exit-audit-captured-rows-2026-11-03.log` (SHA-256 `458c41d433f6636873be325706148137682e9518b5f7db4f6a6d7cc538eff4e8`). The file contains the observed PLAN_AUDIT, entry/lifecycle, exit-audit, and group-audit rows for this position; it is a selected-row capture, not a complete Pine Logs export. The analyzer result is saved in `strategy-exit-analysis-2026-11-03.json`.

**Exit cause is confirmed for this isolated experiment run.** Its single `TRADE_EXIT_AUDIT` row reports `closedTradeIndex=0`, `size=2.1`, `actualEntry=4177.50`, `actualExit=4171.83`, `exitComment=TRADE_CLOSED`, and `exitId=Close entry(s) order A_SWEEP_MSS_FVG`. The experiment has one `strategy.close()` path with that comment, at the time-exit check; the TP/SL `strategy.exit()` brackets use `TP1_HIT`, `TP2_HIT`, `TP3_HIT`, or `STOP_LOSS_HIT` comments. The group record says `holdMinutes=15`. Thus the full 2.1 units closed via the time-exit market order. `partialInput=true` means brackets were configured, but the single full-size closed row and its close-order comment show that no bracket partial or stop fill contributed to this result.

The bar timing matches the code: entry time is 10:55, and the first confirmed M5 close at which `time_close - strategy.opentrades.entry_time(0) >= 15 * 60000` is 11:10. The code submits `strategy.close(..., comment='TRADE_CLOSED', immediately=false)` there. With `process_orders_on_close=false`, the emulator can fill at the next available tick, the 11:10 next-bar open. The captured exit time is 11:10 and exit bar index is 1538. This identifies the exit path; it does not establish why that bar's fill price was 4171.83 beyond the recorded emulator price and configured two-tick slippage.

### Captured arithmetic and sizing

The exit row reports `profit=-13.6603593`, `commission=1.7533593`, and the group `netProfitDelta=-13.6603593`. The price move at point value 1 is `(4171.83 - 4177.50) × 2.1 × 1 = -11.907`. Commission at 0.01% on each side is `4177.50 × 2.1 × 0.0001 = 0.877275` on entry and `4171.83 × 2.1 × 0.0001 = 0.8760843` on exit, totaling `1.7533593`. Therefore `-11.907 - 1.7533593 = -13.6603593`, matching both the closed-trade profit field and group net delta. The reported return `-0.155697967%` rounds to `-0.16%`; position value at fill is `4177.50 × 2.1 = $8,772.75`.

The group audit supplies `pointValue=1`, `minTick=0.01`, `minContract=0.1`, `sizingEquity=10000`, `riskPctInput=0.5`, and `maxExposurePctInput=90`. The sizing intermediates reconcile: per-unit stop risk is `(4177.48 - 4170.88) × 1 = $6.60`; risk quantity is `$50 / $6.60 = 7.5757576`; exposure quantity is `$9,000 / (4177.48 × 1) = 2.1544089`; flooring to 0.1 units gives 2.1. The exposure cap, not the risk cap, set the size. At 2.1 units, planned initial-stop risk is `$13.86` before transaction costs. The 0.1 step yields partial bracket quantities 0.6 / 0.6 / 0.9, but none filled in this trade.

The research analyzer previously exposed row profit and commission separately without calculating their price-move reconciliation. It now reports the point-value price movement, profit-plus-commission, and whether closed-row profit matches the final group net delta. A currency-conversion caveat is included because point-value price movement is not automatically in the account currency for every symbol. Focused tests now pass: **6 tests in 2 files**; deterministic experiment generation and independent Pine parsing also pass. No baseline Pine source changed. Current SHA-256 values remain Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` and Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`.

This one result does not establish profitability, broader strategy performance, or baseline exact-hash compile provenance. Keep the separate experiment and its captured rows as research evidence only.

### Exact editor copy-back and compile confirmation

The complete editor copy-back is preserved as `strategy-exit-audit-editor-copy-2026-11-03.pine` (1,537 lines; SHA-256 `8e01bf6a58c08df806cb4ce22a5a5d3f1bdb187547fbcb65aff22e80377b2802`). The clipboard omitted only the final LF: all line contents match the local experiment. After converting line endings to LF and restoring that terminal newline, `strategy-exit-audit-editor-copy-2026-11-03.normalized.pine` hashes to `a8267588770637b4a75e50367267dac11a8ba6783cdd9084e7d9620ff3961623`, exactly matching `pine/experiments/strategy_exit_audit.pine`.

After the matching copy-back, the TradingView Pine Editor displayed `1:07:00 PM Compiling…`, `1:07:02 PM Compiled.`, and `1:07:02 PM Added to chart.` for this isolated experiment on FOREXCOM:XAUUSD M5. The messages were observed in the UI but no screenshot was saved. This establishes an exact-hash native compile for the research experiment. It does not replace or modify the frozen baseline Strategy compile gate.

The latest focused validation passed 6 tests across 2 files, the deterministic experiment generation check, independent Pine parsing of the experiment and baseline scripts, and `git diff --check`. Baseline source hashes remain Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` and Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`.
