# TradingView MSNR and stop-loss comparison

On November 20, 2026, TradingView compiled and ran the experimental [Indicator](../../../pine/experiments/indicator_signal_diagnostics.pine) and [Strategy](../../../pine/experiments/strategy_signal_diagnostics.pine) on standard `FOREXCOM:XAUUSD` five-minute candles. Both Pine Editor copies matched the local source before compilation. The existing K-SNR concept was the control. The experimental MSNR body flip uses two closed, opposite-direction candles to establish a price level, then waits for a displaced break and a confirmed first retest on a later candle. An independent run tested the optional `Structure + ATR floor` stop.

## Strategy Tester results

New plans were admitted from November 6, 07:00 to November 20, 07:00 UTC+7, with the end exclusive. Only Module D ran. All three Strategy runs used the London session, H1 alignment, a minimum score of 75, Close entry, a 15-minute holding limit, and 1R/2R/3R targets with 33%/33%/34% partial exits. The account started with $10,000. The tested properties used 0.01% commission per side, two ticks of slippage, 100% margin in each direction, and zero pyramiding. A separate spread model was absent.

| Module D concept and stop | Completed positions | Exit rows | Winning positions | P&L before commission | Commission | Net P&L | Max drawdown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| K-SNR, structural stop | 1 | 1 | 0 | $0.82 | $1.79 | −$0.98 | $2.55 |
| MSNR, structural stop | 3 | 6 | 1 | $14.46 | $5.30 | +$9.16 | $13.78 |
| MSNR, structural stop with 1 ATR minimum | 3 | 6 | 1 | $14.45 | $5.30 | +$9.14 | $13.80 |

Exit rows are grouped by verified plan and position identity. P&L before commission uses the emulator's fill prices, which include configured slippage. Net P&L includes commission once. Max drawdown comes from TradingView's displayed metric. Individual rows are rounded for display.

| MSNR standard-stop plan, UTC+7 | Side | Entry | Initial SL | TP1 | TP2 | TP3 | Net P&L |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| November 11, 19:55 | SELL | 4,040.96 | 4,044.88 | 4,037.04 | 4,033.12 | 4,029.20 | −$10.49 |
| November 12, 15:45 | SELL | 3,941.50 | 3,953.38 | 3,929.62 | 3,917.74 | 3,905.86 | +$25.70 |
| November 13, 15:35 | SELL | 3,892.22 | 3,899.83 | 3,884.61 | 3,877.00 | 3,869.39 | −$6.05 |

The November 11 position stopped out through all three exit legs. The November 12 position took TP1 and closed its remaining size on a timed market close. The November 13 position and the single K-SNR position each show a market-close exit order at the configured 15-minute holding limit. The MSNR position-level average was −0.19R using planned initial cash risk. The $25.70 winner accounted for the positive dollar result.

The 1 ATR option selected the same three entries and widened every short stop by one tick ($0.01). The original stop distances on the two plans with ATR detail were 1.45 and 2.25 ATR. The buffered structure distance governed both stops. Rounding outward accounts for their one-tick changes. The third plan falls outside the detailed diagnostic window. This sample gives no basis for a wider default stop or promotion of MSNR to the saved chart.

## Plan agreement and repeatability

The Indicator and Strategy matched the setup times, plan times, directions, scores, entries, stops, and three targets on all four plans across the two matched pairs. The comparison used zero price tolerance. The two scripts have separate execution models, with simulated orders and realized P&L coming from the Strategy.

All six exports had 1,140 matching diagnostic candle timestamps from November 6, 21:00 through November 13, 00:00 UTC+7, with the end exclusive. They had no diagnostic gaps or dropped events. K-SNR found nine setups and confirmed three distinct setups on 26 bars, all outside the selected session. MSNR found 89 setups and confirmed 18. Eleven were first blocked by the session filter, four by H1 alignment, and one by stop distance. Two plans qualified within this detailed window. The MSNR Indicator repeat matched all 3,734 diagnostic events after accounting for capture identifiers and reproduced all three plans.

Intraday Bar Replay was blocked by TradingView Basic when selecting a November 11 M5 start. The repeat used historical data. Live non-repainting, agreement across all eight enabled modules, and performance on a larger untouched sample remain unverified. The capture confirms identical candle timestamps within the diagnostic window. A raw OHLC checksum was unavailable.

## Reproducibility

The [comparison data](comparison.json) has the source and export hashes, settings, run statistics, exact plan prices, and Strategy exit orders. The six compressed CSVs preserve the original Pine Logs exports. `npm run verify` passed 250 tests across 29 files and independently parsed 33 Pine scripts. `git diff --check` passed. Both frozen production script hashes were verified.

The saved layout was reloaded with its original five studies and visibility, and the existing Indicator was reopened in Pine Editor and Pine Logs. Autosave was verified on and Bar Replay off. The test builds were temporary.
