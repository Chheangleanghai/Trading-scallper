# XAUUSD Indicator time-exit comparison

The next-open Indicator matched all **36 K-SNR** and **41 MSNR** qualified Strategy plans in TradingView. The comparison used `FOREXCOM:XAUUSD` five-minute candles, the London filter, all eight modules, Close entry, structural stops, and a 15-minute hold. Plan admission ran from November 6 at 07:00 through November 20 at 07:00 UTC+7, with the end exclusive. [Prior holding-time experiment](../ah-holding-comparison-2026-11-21/README.md)

| TradingView run | Indicator plans | Strategy plans | Exact matches | Timestamps with plan differences |
| --- | ---: | ---: | ---: | ---: |
| K-SNR with time exit at candle close | 37 | 36 | 35 | 3 |
| K-SNR with time exit at the next candle open | 36 | 36 | 36 | 0 |
| MSNR with time exit at candle close | 41 | 41 | 37 | 7 |
| MSNR with time exit at the next candle open | 41 | 41 | 41 | 0 |

The comparison checked decision time, setup time, selected module, direction, entry mode, quality score, planned entry, stop loss and all three targets. All matched prices were exactly equal. Each comparison used the same first loaded candle and all 84 diagnostic bars, with zero dropped diagnostic events. The plan counts cover the full two-week admission window. Five of the 41 MSNR plans came from module D. [K-SNR comparison](comparison.json) · [MSNR comparison](msnr-comparison.json)

[K-SNR control export](ksnr-control-native.csv.gz) · [K-SNR next-open export](ksnr-next-open-native.csv.gz) · [MSNR next-open export](msnr-next-open-native.csv.gz) · [MSNR TradingView screenshot](msnr-native-chart.jpg)

## What changed

The Indicator previously freed its plan slot at the candle close when the holding limit elapsed. TradingView's Strategy submitted the close then and detected the fill when it next calculated. With the research switch enabled, the Indicator estimates the time exit at the following candle's open and processes it at that candle's close, before evaluating another plan. An already-touched stop or final target on the deadline candle takes priority. The setting applies to Close entry and defaults to off. [Pine source](../../../pine/experiments/indicator_time_exit_timing.pine) · [TradingView order timing](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

On November 10 and 11, both next-open configurations agreed with the Strategy on when the existing CRT time exits were observed. For example, the November 11 exit had a 17:35 exit timestamp and was observed at the 17:40 candle close. The original Indicator observed it at 17:35 and began evaluating new setups sooner. Both next-open runs selected the same Turtle Soup plan as their Strategy at 18:40. All times are UTC+7. [K-SNR lifecycle observations](comparison.json) · [MSNR lifecycle observations](msnr-comparison.json)

## Exit and fill audit

The same TradingView exports contain 125 matching K-SNR event IDs and 143 matching MSNR event IDs. Every completed plan matched on final exit reason and on the candle close that reported the exit. All 30 K-SNR and 33 MSNR time exits also matched on their recorded exit timestamp. The Strategy's recorded timestamp was five minutes earlier for the remaining stop or final-target exits. The Indicator records those exits at the confirming candle close. The Strategy uses the emulator's recorded fill time.

| Final exit | K-SNR | MSNR |
| --- | ---: | ---: |
| Time limit | 30 | 33 |
| Stop loss | 5 | 7 |
| Final target | 1 | 1 |

The Strategy reported entries one candle after the Indicator. Its entry fills were less favorable by $0.02 in XAUUSD price across both runs, consistent with two ticks of simulated slippage. Each Strategy closure matched its final exit row, and each position's quantity and net P&L reconciled to its grouped exit legs. The data come from overlapping historical runs and measure the scripts' reported events. [Detailed exit and fill audit](lifecycle-comparison.json)

## Verification and limits

- TradingView compiled and added both experiments. Pine Editor copy-back matched the test source after normalizing line endings. The MSNR source patch reproduces the exact version compiled for that run and changes only the title and input defaults. [MSNR source patch](msnr-native-defaults.patch)
- All 256 local tests passed across 29 files, and the independent parser checked 35 Pine scripts.
- The original five chart studies, Pine Logs and Indicator editor were restored. Autosave was verified on. The new timing option remains in the separate research Indicator.
- The Indicator estimates fills. TradingView Basic blocked the five-minute Bar Replay attempt. Live signal behavior and performance on the frozen November 23–December 7 window remain open. [Live probe](../live-probe-2026-11-21/README.md) · [Frozen validation settings](../ah-holding-comparison-2026-11-21/forward-validation.json)
