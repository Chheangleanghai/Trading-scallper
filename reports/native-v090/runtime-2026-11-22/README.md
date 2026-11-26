# XAUUSD Pine runtime experiment

The separate research builds skip structural target collection and sorting in Fixed R mode. Diagnostics reset their per-bar state inside the capture window and once when it ends. The scripts cache the parts of each log header that stay fixed through a run. TradingView's Pine guide describes caching repeated calculations that change infrequently. [Indicator](../../../pine/experiments/indicator_runtime.pine) · [Strategy](../../../pine/experiments/strategy_runtime.pine) · [TradingView optimization guide](https://www.tradingview.com/pine-script-docs/writing/profiling-and-optimization/#storing-calculated-values)

## TradingView regression

Both research builds compiled and ran on the existing `FOREXCOM:XAUUSD` five-minute chart. The comparison reused the earlier-week MSNR configuration with the M15 filter enabled specifically for the test. It admitted plans from October 30 at 07:00 through November 6 at 07:00 UTC+7, exclusive. The control and revised version of each script used the same first loaded candle and 192 matching diagnostic bars. [Earlier-week controls](../m15-validation-2026-11-22/README.md)

| Exact matches against each archived control | Indicator | Strategy |
| --- | ---: | ---: |
| Signal plans | 20 | 20 |
| Detailed records, excluding capture identifiers | 2,536 | 2,544 |
| Full audit messages | 85 | 151 |
| Simulated exit rows | — | 26 |

Both diagnostic captures ended with zero dropped records. Strategy outcomes matched for all 20 completed positions, including −$5.06 net P&L and $36.34 maximum drawdown. The 82 recorded Strategy candidate checks in the detailed window used Fixed R and bypassed the structural sort. Before that window, the new capture guard skipped the per-bar diagnostic resets on 1,128 calculation bars.

The archived Strategy run displayed TradingView's heavy-script warning. The revised run completed and the warning was absent when the report was inspected. [TradingView result](strategy-native-result.jpg) · [Comparison data](native-comparison.json)

## TradingView Pine Profiler

I ran the original and optimized versions separately on the same `FOREXCOM:XAUUSD` five-minute chart. Both comparisons used the earlier-week research window, the M15 filter enabled, and Fixed R targets. The profiler measures the loaded chart calculation, which includes bars outside the plan-admission window.

| TradingView measurement | Original | Optimized |
| --- | ---: | ---: |
| Strategy confirmed-bar block executions | 5,520 | 5,520 |
| Strategy confirmed-bar block time | 340.8 ms | 291.5 ms |
| Strategy displayed total script time | 0.6 s | 0.5 s |
| Strategy Tester net P&L | −$5.06 | −$5.06 |
| Strategy Tester maximum drawdown | $36.34 | $36.34 |
| Strategy Tester exit rows | 26 | 26 |

| Indicator confirmed-bar block executions | 5,520 | 5,520 |
| Indicator confirmed-bar block time shown | 0.5 s (51.7% of total) | 435.2 ms (47.2% of total) |
| Indicator displayed total script time | 1.1 s | 0.9 s |
| Indicator line time shown | 12.9 ms (1.2%) | 12.5 ms (1.4%) |

The Strategy block took about 14% less time in this sample. The Indicator tooltip showed 0.5 seconds for the original block and 435.2 ms for the optimized block; TradingView rounded the original value, so that pair does not support a precise percentage claim. The optimized Indicator also showed a lower total time in this sample. These are single-run measurements, and profiler estimates vary. Repeatedly toggling profiling on the original Strategy returned identical readings. No entry, filter, risk, or exit rule changed in this runtime optimization, so it does not establish improved signal accuracy or profitability. Longer out-of-sample evaluation remains pending. [Original Strategy profile](strategy-profiler-original.jpg) · [Optimized Strategy profile](strategy-profiler-optimized.jpg) · [TradingView profiling guidance](https://www.tradingview.com/pine-script-docs/writing/profiling-and-optimization/#repetitive-profiling)

The original editor payload had SHA-256 `264d1670c30110a754a2c1bc040c323c5dbdda44fa6122cc5e2853d856fcc622`. The optimized payload had SHA-256 `d1f97c1d5ef86f1d3f38cf51fe8b391ddeb84322e5f1a645066fe3c0007f2b49`. Apply the saved Strategy patch to the optimized research source to reproduce the payload. [Optimized settings patch](strategy-native-defaults.patch) · [Original settings and source](../m15-validation-2026-11-22/validation-settings.json)

All 264 local tests passed and 42 Pine files passed independent parsing. The target regression exercised both directions, duplicate structural levels, and the Hybrid fallback. TradingView used Fixed R for the native comparison. The saved XAUUSD chart and Autosave were restored after the test.

The source patches reproduce the locally prepared test payloads. The compressed CSVs preserve the raw TradingView exports. The M15 option remains off in the source defaults. [Frozen forward evaluation](../m15-validation-2026-11-22/validation-settings.json)
