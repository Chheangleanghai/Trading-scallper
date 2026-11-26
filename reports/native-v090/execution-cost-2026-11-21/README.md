# XAUUSD execution-cost filter

The research Indicator and Strategy can block a qualified setup when estimated round-trip costs exceed a chosen share of its planned stop-loss risk. The chart gives the blocking reason, and accepted plans show the estimated cost share. The filter runs after the existing A–H checks and before the engine selects a plan. It defaults to off. [Indicator](../../../pine/experiments/indicator_execution_cost.pine) · [Strategy](../../../pine/experiments/strategy_execution_cost.pine)

The estimate uses percentage commission on planned entry and stop prices, modeled slippage in ticks per market or stop fill, and optional additional round-trip spread. The model applies slippage to both legs for Close and Breakout entries and only to the stop leg for Limit entries. These inputs affect candidate selection. TradingView's Strategy Properties govern its simulated fills and performance accounting. [TradingView on commission and slippage](https://www.tradingview.com/pine-script-docs/concepts/strategies/#simulating-trading-costs)

## Archived XAUUSD M5 plans

In the November 6–20 sample, the two 15-minute runs had positive gross P&L and negative net P&L after commission. The table applies the new filter's formula to the original plans with 0.01% commission per side, two ticks of slippage per market or stop fill and zero additional spread. [Prior Strategy exports and results](../ah-holding-comparison-2026-11-21/README.md)

| Variant | Original plans | Median modeled cost as share of risk | Above 10% | Above 15% | Above 20% |
| --- | ---: | ---: | ---: | ---: | ---: |
| K-SNR, 15 minutes | 36 | 12.35% | 23 | 12 | 7 |
| K-SNR, 30 minutes | 35 | 12.50% | 24 | 12 | 7 |
| K-SNR, 45 minutes | 33 | 12.54% | 22 | 12 | 7 |
| MSNR, 15 minutes | 41 | 12.50% | 27 | 15 | 8 |

This check holds the original plans fixed. Blocking a plan can free the slot for a later candidate. The native comparison below measures the resulting change in selection at a 15% cap.

## TradingView comparison

TradingView compiled and ran both research scripts on standard `FOREXCOM:XAUUSD` five-minute candles. The run used MSNR body flip with a 60-bar maximum level age, all eight modules, London session, Close entry, a structural stop, fixed 1R/2R/3R targets and a 15-minute holding limit. It admitted plans from November 6 at 07:00 through November 20 at 07:00 UTC+7, exclusive. The Indicator's next-open time exit estimate was enabled for this run.

| Strategy run | Closed positions | Wins | Final stop exits | Commission | Net P&L | Max drawdown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Archived MSNR control | 41 | 22 | 7 | $72.61 | −$10.01 | $84.00 |
| MSNR with 15% cost cap | 35 | 17 | 4 | $61.82 | −$25.91 | $83.40 |

Indicator and Strategy agreed on all 35 plan records across the test window, including the module, direction, setup time, entry, SL, targets and score. The filter changed which plans the Strategy could take. It shared 23 exact plans with the control, dropped 18 and added 12. The filtered Strategy's 47 exit rows reconciled to 35 positions. Commission decreased by $10.79 and net P&L declined by $15.90. The setting defaults to off based on this comparison.

Both diagnostic exports covered the same 84 candle timestamps as the control from November 11 at 17:00 through midnight UTC+7, with zero dropped records. Each run logged eight first cost blockers during that shorter window, six for B, one for C and one for D. The source patches record the test inputs and reproduce the local Pine Editor paste payloads. The comparison was historical. Live behavior and performance on unseen data remain unverified. [Comparison data](native-comparison.json) · [TradingView results screenshot](strategy-native-result.jpg) · [Frozen forward settings](../ah-holding-comparison-2026-11-21/forward-validation.json)

## Verification

All 260 local tests passed, including the shared Pine formula for buy, sell, and limit entries, threshold equality, invalid stops, and the diagnostic reason. The independent parser checked 38 Pine scripts.
