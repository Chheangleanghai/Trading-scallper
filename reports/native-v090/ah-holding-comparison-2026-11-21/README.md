# TradingView A–H holding time and MSNR comparison

TradingView compiled and ran the exact experimental Indicator and Strategy on standard `FOREXCOM:XAUUSD` five-minute candles on November 21, 2026. Both Pine Editor copies matched the local source by SHA-256. All eight modules were enabled, and new plans were admitted from November 6 at 07:00 through November 20 at 07:00 UTC+7, with the end exclusive. [Indicator source](../../../pine/experiments/indicator_signal_diagnostics.pine) · [Strategy source](../../../pine/experiments/strategy_signal_diagnostics.pine)

The comparison used the London session, H1 alignment, a 75 minimum quality score, Close entry, the structural stop with a 0.15 ATR buffer, and fixed 1R/2R/3R targets with partial allocation. Strategy Properties were $10,000 initial capital in USD, 0.01% commission per side, two ticks of slippage, one-tick order delay, bar-close calculation, and 1x leverage. The holding-time runs changed only the holding limit and capture ID. The MSNR run changed only the Module D concept and capture ID relative to K-SNR at 15 minutes. A separate spread model was absent.

## Position results

| Module D and maximum hold | Positions | Wins | Exit rows | P&L before commission | Commission | Net P&L | Max drawdown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| K-SNR, 15 minutes | 36 | 18 | 57 | $14.54 | $63.67 | −$49.13 | $103.70 |
| K-SNR, 30 minutes | 35 | 16 | 73 | $54.04 | $62.05 | −$8.01 | $83.07 |
| K-SNR, 45 minutes | 33 | 16 | 80 | $74.33 | $58.47 | +$15.86 | $75.98 |
| MSNR, 15 minutes | 41 | 22 | 67 | $62.60 | $72.61 | −$10.01 | $84.00 |

All 145 completed position groups across the four runs reconcile to their exits, including the initial quantity and commission. The runs overlap in market history, so the 145 is a validation count. Net P&L includes commission once. P&L before commission comes from emulator fill prices with slippage already applied. Max drawdown comes from the Strategy Tester display.

| Variant | Final stop | Final target | Final time close | Net from time-close positions |
| --- | ---: | ---: | ---: | ---: |
| K-SNR, 15 minutes | 5 | 1 | 30 | +$6.19 |
| K-SNR, 30 minutes | 9 | 2 | 24 | +$92.99 |
| K-SNR, 45 minutes | 13 | 3 | 17 | +$172.99 |
| MSNR, 15 minutes | 7 | 1 | 33 | +$70.06 |

The 45-minute run had the highest net result and smallest recorded drawdown in this sample. Its largest winner, a +$42.08 trend-pullback position, exceeded the entire +$15.86 net gain. The remaining observed trades total −$26.23. The 45-minute run shares 31 exact plans with the 15-minute baseline. Holding time changes how long the strategy stays occupied, so the portfolio comparison also includes changes in which plans it can take.

At 15 minutes, MSNR raised the portfolio's net result by $39.12 and produced five completed Module D positions totaling +$29.99. Portfolio net still ended at −$10.01 after costs. These observations retain the effects of competition among the eight modules.

The 45-minute result breaks even at about $0.213 of hypothetical additional round-trip cost per unit of price exposure across the same completed trades. A $0.25 scenario puts the total at −$2.77 with the fills and quantities held fixed. This measures cost sensitivity using the captured trades. Broker spread and fill changes were outside the measurement.

## Exact Indicator and Strategy plan comparison

The two 15-minute pairs matched 150 normalized lines of common trading inputs. The comparator used zero price tolerance and checked setup time, selected module, direction, score, entry, stop, and all three targets. The detailed event window covers 84 matching candle timestamps from November 11 at 17:00 through November 12 at 00:00 UTC+7, with the end exclusive. All six streams closed their diagnostic windows with zero dropped events. One position in the 45-minute run started before that window. Its plan, fill, and exits reconcile in the full audit.

| Module D concept | Indicator plans | Strategy plans | Exact shared plans | Indicator only | Strategy only | Same time, different module |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| K-SNR | 37 | 36 | 35 | 2 | 1 | 0 |
| MSNR | 41 | 41 | 37 | 3 | 3 | 1 |

On November 11, both concepts reproduced the same divergence. At 17:35 the Indicator estimated a prior CRT close and freed its slot. The Strategy observed the equivalent emulator exit during its 17:40 calculation. The resulting candidate states differed. At 18:35 the Indicator selected a new CRT sell and cleared a developing Turtle Soup candidate. The Strategy kept that candidate and selected it at 18:40. The other mismatch timestamps are preserved in the report data. Several fall outside the detailed event window and retain their observed plan differences without a new causal classification.

## Verification and next evaluation window

`npm run verify` passed 250 tests across 29 files and parsed 33 Pine scripts. The chart was reloaded with its five original studies and visibility. The original Indicator matched its saved source fingerprint and was reopened in Pine Editor and Pine Logs. Autosave was verified on and Replay off.

The November 6–20 runs are retrospective. The weekend session supplied no live-qualified entry for a first-appearance comparison. The previously observed TradingView Basic gate still limits the available historical Replay workflow. The experiment retains both MSNR and longer holding-time variants for evaluation. The larger untouched evaluation has locally fixed source, settings, and dates from November 23 at 07:00 through December 7 at 07:00 UTC+7. Its market observations are pending. [Frozen validation settings](forward-validation.json)

The six compressed exports preserve the original Pine Logs CSV bytes. The machine-readable report contains their hashes, full plan and exit records, exact mismatch details, and results from the existing diagnostic and position analyzers. [Comparison data](comparison.json)
