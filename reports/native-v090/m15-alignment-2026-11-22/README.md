# Confirmed M15 structure filter

The research Indicator and Strategy can require a candidate's direction to match the last completed 15-minute candle's structure. The filter uses the existing confirmed break of a swing level. An opposing or neutral structure blocks plan selection after the other checks. The confirmation board gives the blocking reason. The filter defaults to off. [Indicator](../../../pine/experiments/indicator_m15_alignment.pine) · [Strategy](../../../pine/experiments/strategy_m15_alignment.pine)

The rule uses the previous M15 candle and takes decisions on closed chart bars. TradingView documents the offset higher-timeframe request as a way to use confirmed data consistently. Live signal behavior was outside this test. [TradingView higher-timeframe data](https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#avoiding-repainting)

## TradingView comparison

The baseline closed seven short positions at their stops within ten minutes of entry. None took TP1 before closing. Five were CRT, one MSNR and one AMD. That observation motivated testing a confirmation filter.

TradingView compiled and ran the research scripts on standard `FOREXCOM:XAUUSD` five-minute candles. All eight modules ran with MSNR body flip, H1 alignment, London session, Close entry, a 15-minute maximum hold, structural stops, and fixed 1R/2R/3R targets. Plans were admitted from November 6 at 07:00 to November 20 at 07:00 UTC+7, exclusive. The emulator used 0.01% commission per side and two ticks of slippage. The separate execution-cost filter was off.

| Strategy run | Positions | Wins | Final stop exits | Commission | Net P&L | Max drawdown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M15 filter off | 41 | 22 | 7 | $72.61 | −$10.01 | $84.00 |
| M15 filter on | 33 | 18 | 6 | $58.56 | −$2.37 | $54.47 |

The filter removed eight plans and introduced none. Four of the removed positions were profitable and four lost money, including one that hit its stop. P&L before commission decreased by $6.41, commissions decreased by $14.05, and net P&L improved by $7.63 using unrounded totals. The filtered run still lost money. The 56 filtered exit rows reconcile to 33 completed positions.

## Reproducibility

With the filter off, all 41 plans, 67 exit rows and 41 position group records match the archived MSNR baseline exactly. With the filter on, the Indicator and Strategy agree on all 33 plans at zero price tolerance. Diagnostics cover the same 84 candle timestamps across the three new captures and the control, with zero dropped records. Ten checks per filtered capture recorded opposing or neutral M15 structure during that shorter window. An earlier rule was already blocking each of those ten checks.

The compressed CSVs preserve the TradingView Pine Logs exports. The settings patches reproduce the local Pine Editor paste payloads. The comparison JSON records hashes, parameters, counts and the eight omitted positions. All 262 local tests passed and 40 Pine files parsed independently. After the temporary tests, the chart was reloaded with its five original studies, Autosave enabled and Replay off. [Comparison data](native-comparison.json) · [Strategy Tester screenshot](strategy-native-result.jpg)

The sample was already inspected and used to choose the M15 experiment. The filter remains optional while its performance on unseen data is unverified. The previously frozen validation starts November 23 at 07:00 UTC+7. [Frozen validation settings](../ah-holding-comparison-2026-11-21/forward-validation.json)
