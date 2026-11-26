# Forward evaluation runbook

Status at preparation: **not started**. The admission window begins November 23, 2026 at 00:00 UTC (07:00 Asia/Phnom_Penh) and ends December 7 at 00:00 UTC (07:00 local), exclusive. The predeclared weekly split is November 30 at 00:00 UTC (07:00 local). Use the same standard `FOREXCOM:XAUUSD` M5 history and at least 1,000 warm-up bars for every run.

## Keep the two comparisons separate

Both plans use the same dates, but they test different variables with different frozen source files. Do not combine their outputs into one comparison.

| Evaluation | Frozen source | Runs | Question |
| --- | --- | --- | --- |
| Holding time and Module D concept | `pine/experiments/strategy_signal_diagnostics.pine` · SHA-256 `0268050018e688454874306c77fa353fddcf1c5f0455b671b805dcb5a5b7b6d1` | K-SNR at 15, 30, and 45 minutes; MSNR body flip at 15 minutes | How do the predeclared hold/concept variants compare on these future bars? |
| M15 confirmation filter | `pine/experiments/strategy_m15_alignment.pine` · SHA-256 `7cb9707f32b545447de8ddd4fe0a18b6baf53fe47ac084d6f2e5146d897be4d8` | MSNR body flip, 15-minute hold, M15 filter off and on | Does this frozen M15 rule change the selected portfolio on these future bars? |

The MSNR/M15-off setting is a conceptual overlap, but the frozen sources differ. Keep separate raw exports and label them with their source hash. The M15 question is the paired off/on comparison; the four hold/concept runs answer a separate question. Neither test changes production defaults.

## Fixed settings

Use the values in the [frozen M15 settings](validation-settings.json) and [holding-time settings](../ah-holding-comparison-2026-11-21/forward-validation.json). The common M5 setup is A–H enabled, London session, H1 alignment, 15-minute CRT reference, quality 75, close entry, structural stop with 0.15 ATR buffer and 3 ATR maximum, fixed 1R/2R/3R targets, 33%/33%/34% partials, 0.5% simulated risk, and no break-even or trailing stop. The MSNR variant uses a 60-bar maximum unbroken level age.

Keep Strategy Properties at $10,000 USD, 0.01% commission per side, two ticks of slippage, 1x long and short leverage, zero pyramiding, bar-close calculation, one-tick order delay, and requested limit price. No separate spread model is set, so do not describe these results as including broker spread.

## Capture procedure

1. Preserve the saved TradingView chart. Turn Autosave off before adding temporary research scripts. Confirm the symbol, standard candles, timeframe, source SHA, input values, and Strategy Properties for each run.
2. Set the absolute Research window to start `2026-11-23T00:00:00Z` and end `2026-12-07T00:00:00Z`. Pine requires the full signal bar to be inside the window. Keep all other inputs fixed for that comparison; change only the declared concept, hold duration, or M15 switch.
3. Turn `auditLog` on and leave the large per-candidate diagnostics capture off for the full two-week run. The latter records bar-level detail and can exceed its event budget. Save each raw Pine Logs CSV separately with its variant and source hash in the filename. Capture Strategy Tester properties, summary, and the chart input values for each run.
4. Run the Strategy over identical loaded history for each variant. After the admission window closes, allow the last admitted positions to finish; include their later exits. Count a position once by plan/entry identity, not once per partial-exit row. Do not subtract commission twice: the Strategy net result already includes it.
5. Attribute positions to the week containing their plan timestamp. Keep the November 30 boundary predeclared. Record completed positions, wins, net P&L, commission, final stop exits, planned-risk R, and maximum drawdown for each run. Preserve missing or open positions as incomplete rather than assigning them zero P&L.
6. Analyze each untouched Pine Logs export independently with `scripts/analyze-signal-diagnostics.mjs`. The analyzer accepts TradingView `.csv` and `.csv.gz` files directly. For the legacy audit rows used in this run, pass the matching holding-time assumption so the final market-close row can be labeled as a time exit only when its exit ID and elapsed hold support that classification:

   ```sh
   CAPTURE='reports/native-v090/forward/K-SNR-15.csv.gz'
   HOLD_MINUTES=15
   node scripts/analyze-signal-diagnostics.mjs "$CAPTURE" \
     --chart-currency USD \
     --time-exit-minutes "$HOLD_MINUTES" \
     --sole-time-close > "${CAPTURE%.csv.gz}.analysis.json"
   ```

   Repeat with unique `CAPTURE` and `HOLD_MINUTES` values for each frozen run. Use 15 for both MSNR and K-SNR 15, 30 for K-SNR 30, and 45 for K-SNR 45. Keep the Strategy Tester summary and analyzer output together; never edit the raw export. The time-exit flags are caller-supplied legacy context. New diagnostic captures carry their close cause in the event records and do not need those flags. Compare M15 off/on only within the M15 pair, and compare hold/concept variants only within the holding-time set. Report exact source and input mismatches before interpreting outcome differences.
7. Restore the saved chart, original five studies, Replay state, Pine Editor state, and Autosave after the temporary runs.

## Limits

The historical studies are not evidence of future returns; the M15 filter improved one retrospective window and worsened another. This frozen two-week comparison is still a small sample, has no separate spread model, and cannot guarantee future fills. The adjacent realtime first-appearance/reload probe is a different test and requires its own captured live and historical exports. Do not change thresholds or choose a winning variant after looking at the first split.
