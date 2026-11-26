# XAUUSD M15 filter on an earlier week

The M15 confirmation filter worsened net P&L by $59.76 in the October 30–November 6 retrospective run. It had improved net P&L by $7.63 in the November 6–20 run. The filter remains off by default. Both weeks used standard five-minute `FOREXCOM:XAUUSD` candles, all eight modules, the MSNR body flip, and the 15-minute holding limit. The earlier-week admission window ran from October 30 at 07:00 to November 6 at 07:00 UTC+7, exclusive. [Frozen settings](validation-settings.json) · [November 6–20 comparison](../m15-alignment-2026-11-22/README.md)

| Earlier-week Strategy run | Closed positions | Winning positions | Final stop exits | Commission | Net P&L | Max drawdown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M15 filter off | 23 | 14 | 1 | $40.65 | +$54.69 | $32.70 |
| M15 filter on | 20 | 11 | 1 | $35.44 | −$5.06 | $36.34 |

The filter removed four winning positions worth $62.17 net, three CRT and one supply-zone trade. It added one trend-pullback position worth $2.42 net. Nineteen positions shared a confirmation timestamp and had the same net total in both runs, including the stop-out. Eighteen matched on every plan field. One shared confirmation had a different setup timestamp with identical order prices.

TradingView compiled and ran both Strategy variants and the filtered Indicator. The Indicator and filtered Strategy matched all 20 plan records, including setup, confirmation timestamp, module, direction, entry, stop and targets. Each diagnostic export contained 192 matching candle timestamps with zero dropped records. All runs had 1,128 calculation bars before the admission window. The grouped Strategy outcomes reconcile the 32 control exit rows and 26 filtered exit rows to positions.

The filtered Strategy triggered TradingView's heavy-script warning near the account's 20-second runtime limit. It completed this test and produced a full export. The warning matters for longer runs. All 262 local tests passed. After the temporary runs, the saved XAUUSD layout was reloaded and its original five studies, Autosave and Replay state were verified. [Native comparison data](native-comparison.json) · [TradingView screenshot](strategy-native-result.jpg)

The earlier week has separate dates from the first M15 test and overlaps historical data reviewed in this project. The forward comparison is frozen for November 23 at 07:00 through December 7 at 07:00 UTC+7, exclusive. That window had yet to start at the time of this test. [Forward settings](validation-settings.json) · [Execution runbook](forward-runbook.md)
