# TradingView candle-close and reload verification

TradingView compiled the exact research Indicator and added it to a standard `FOREXCOM:XAUUSD` five-minute chart on November 21, 2026. The copy from Pine Editor matched the generated source byte for byte. The research copy records when a plan first appears within a candle. [Pine source](../../../pine/experiments/indicator_signal_live_probe.pine) · [Chart screenshot](probe-native-chart.jpg) · [Verification record](verification.json)

## TradingView results

| Check | Result |
| --- | --- |
| Native Pine compile and Add to chart | Passed |
| Two independent historical calculations | All 9 candle snapshots matched from November 11 at 18:15 through 19:00 UTC+7, with the end exclusive |
| Qualified plan in that window | The same B CRT sell appeared at the 18:35 candle close in both calculations |
| Full Indicator plan audit against the source Indicator | All 37 plans matched exactly in each run with the same trading inputs |
| Live candle-close and reload | Pending a realtime qualified plan. The live comparison correctly rejected historical-only exports as evidence |
| Local verification | 255 tests passed across 29 files. The independent parser checked 34 Pine scripts |

Both historical runs used the A–H, K-SNR and 15-minute settings from the [holding-time comparison](../ah-holding-comparison-2026-11-21/README.md). The 37-plan audit covers the full November 6–20 admission window. The nine snapshots cover the shorter window above. The chart returned to its saved layout with the five original studies, the original Indicator in Pine Editor and Pine Logs, and Autosave on. [First export](historical-a.csv) · [Second export](historical-b.csv) · [Historical comparison](historical-comparison.json) · [Live evidence check](live-check.json)

## Capture a realtime signal and reload

1. Add the research Indicator before the first candle opens. Use the symbol, chart type, timeframe and frozen trading inputs in the [forward settings](../ah-holding-comparison-2026-11-21/forward-validation.json). Enable **Log candle-close snapshots** in **Live signal research**. The default capture covers bar opens from November 23 at 15:00 through November 24 at 00:00 UTC+7, with the end exclusive. Keep the capture window short enough to export the full log.
2. Export the Pine Logs after a qualified realtime candle closes and before recalculating the script. Save that export as `live.csv`. Each closed candle has a `DATA_SNAPSHOT_AUDIT` record and a `SNAPSHOT_EXECUTION_AUDIT` record. The execution record identifies whether the script observed the opening update and which update first showed a plan. [TradingView bar states](https://www.tradingview.com/pine-script-docs/concepts/bar-states/) · [Pine execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)
3. Recalculate after the same candle becomes historical. Keep the source, capture window, trading inputs and loaded history the same. Use a new **Snapshot run ID** and export `reload.csv`.
4. Compare the two exports. A pass requires a qualified realtime candle observed from its opening update, first appearance at its closing update, and matching historical records for every observed live candle. Feed differences such as volume changing from `0` to `null` appear in the comparison.

```sh
python3 scripts/compare-data-snapshots.py live.csv reload.csv \
  --execution live --output live-comparison.json
```

## Live probe for the next-open time-exit experiment

The historical timing experiment resolved the three K-SNR and seven MSNR differences. The new `indicator_time_exit_live_probe.pine` observes this same timing engine and leaves its trading calculations intact. It records whether an exit is queued and which time-exit mode, entry mode, maximum hold and Module D settings produced each snapshot. The comparison rejects exports with different settings and reports queued-exit differences with the other execution state. The original v1 capture format remains supported. [Timing experiment and TradingView results](../time-exit-timing-2026-11-21/README.md) · [Timing probe source](../../../pine/experiments/indicator_time_exit_live_probe.pine)

For the MSNR comparison, use **MSNR body flip**, enable **Estimate time exit at next bar open (Close entry)**, and keep **Close** entry, a **15-minute** maximum hold and the **London** filter. Use the same source and trading inputs for both exports. The live window begins November 23 at 15:00 UTC+7 by default.

On November 21, the user pasted the next-open probe into a fresh Indicator draft. The editor showed the expected title and final audit lines at line 2094. TradingView displayed **Compiled.** and **Added to chart.** at 21:17:39 UTC+7, and the probe appeared in the Pine Logs script picker. Full source copy-back and a runtime capture with the test inputs remain unverified. The probe settings were unavailable in the chart legend, and the default capture window had yet to open. I undid the temporary insertion, reloaded the saved layout, and checked the five original studies, right price scale, original Pine Logs, Replay off and Autosave on. Local verification passed all 258 tests and parsed 36 Pine scripts.

TradingView showed the **Basic** plan upgrade prompt when November 11 was selected for a five-minute Bar Replay. The replay was exited and the layout returned to its saved state. The November 21 test supplied zero realtime qualified candles. The performance evaluation on the frozen November 23–December 7 window is pending. [Forward settings](../ah-holding-comparison-2026-11-21/forward-validation.json)
