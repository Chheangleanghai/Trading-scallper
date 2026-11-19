# B/CRT reference expiry — matched TradingView backtest

**Completed November 19, 2026.** TradingView compiled and ran both exact Strategy sources on standard `FOREXCOM:XAUUSD` five-minute candles. The experiment lowered the historical net loss by $2.75 and reduced maximum drawdown. Both runs lost money after commission. The B/CRT improvement mostly disappeared once the other modules' changed results were included. Keep this rule experimental pending an evaluation on unseen data.

## Run scope

- The Pine admission window ran from November 6 at 00:00 UTC through November 19 at 00:00 UTC, end exclusive. The chart displayed those settings as 07:00 UTC+7. TradingView's broader Tester history label extended before the Pine window. The admission window is the one applied to the logged plans.
- Both runs used the same temporary tab in sequence. The experiment updated the original temporary Strategy in place. The observed Inputs and Properties dialog text matched after ignoring the title and focus markers. A–H were enabled, with London session, M15 CRT reference, Close entry, 15-minute hold, and audit logging enabled. Properties showed USD 10,000 starting capital, 0.01% commission per execution, two ticks of slippage, 1x leverage, zero pyramiding, bar-close script execution, requested limit price, and one-tick order delay. No separate spread model was applied.
- Both runs' first position begins at `entryBar=2632` on November 6 at 11:20 UTC. This establishes at least 2,496 prior calculation bars from the maximum number of M5 bars between the start and first entry. The separate full candle and pre-window state series were not exported.
- The original full editor copy-back matched `eb601426b7a71779cd0aee0f56f987a6cf723cf48b23131aa29d9214913f4851` and TradingView displayed `Compiled.` at 19:18:56 UTC+7. The experimental full copy-back matched `f53c0a101164217398434c8e3894624149e1848b3fa8bef9e1f02c461f262457` with `Compiled.` at 19:23:47 UTC+7.

## Outcomes

| Measure | Original | Experiment |
| --- | ---: | ---: |
| Completed positions | 31 | 33 |
| Closed exit rows | 49 | 55 |
| Winning positions | 16 | 16 |
| Position win rate | 51.61% | 48.48% |
| Gross price P&L | +$15.620000 | +$21.757000 |
| Commission | $54.883055 | $58.272041 |
| Net P&L | −$39.263055 | −$36.515041 |
| Tester maximum drawdown | $103.70 | $87.19 |
| Position profit factor | 0.755 | 0.793 |

The net difference was **+$2.7480141**. The experiment gained $6.137000 in gross price P&L and incurred $3.3889859 in extra commission. The fills already include slippage. Exit rows reconcile to every complete position, with no missing positions, partial residuals or duplicate exit records detected by the comparator. TradingView's profitable-trade display counted **exit rows** (25/49 versus 27/55). The table groups partials into positions.

| Module | Original positions / net | Experiment positions / net |
| --- | ---: | ---: |
| B · CRT | 21 / −$68.81 | 20 / −$32.16 |
| C · Confirmed-pivot false break | 6 / +$49.08 | 8 / +$20.64 |
| E · Demand | 0 / — | 1 / +$8.87 |
| E · Supply | 1 / +$7.37 | 1 / +$7.37 |
| F · Structural EMA pullback | 1 / +$5.50 | 2 / −$16.50 |
| G · Compressed-range sweep | 2 / −$32.41 | 1 / −$24.74 |

B's net improved by $36.6415099. The other modules together went from +$29.5432845 to −$4.3502113. A, D and H had no completed positions in either run. The rule changed which plans were available later and therefore changed the combined strategy's outcomes.

The experimental log recorded **192 actual reference expiries**, each with both completed M15 timestamps. Ten original B setups were logged as expired in the experiment by the time the original selected them. A further original setup expired after its original selection time under the altered state. No experimental plan selected a B setup on or after its logged expiry. Of 16 shared plan timestamps, 15 match on all compared planned fields and one changes from B to C. There are 15 original-only and 17 experimental-only plan timestamps. These are expected changes to measure in a rule experiment. Indicator/Strategy parity requires a separate comparison.

## Evidence and cleanup

- [Original Pine Logs CSV](original.csv) contains 250 records, SHA-256 `e694bf42a5b3e78e97069ce668ae37b6707b6414f6c6e7317d80c851db8aa5ba`. It matches the previously captured quantity-units reference CSV byte for byte in this window.
- [Experimental Pine Logs CSV](experiment.csv) contains 463 records, SHA-256 `13c1b9feb3674dbdf08c9b6ffb80fd2b3017764917dd3cefd0d30ef4740f0317`.
- [Comparison report](comparison.json) reconciles the two exports and lists changed plans and expiry events. It reports that source, settings and window review are required because the comparison code has no access to TradingView. The source copy-backs and observed dialog controls are recorded above.
- The temporary tab was reloaded before restoring Autosave and closing it. The extra connection had temporarily displaced the original tab under TradingView Basic's connection limit. The original XAUUSD tab was reconnected, the leftover Pine Editor was closed, and the five original hidden studies, “All changes saved” status, UTC+7 and Autosave on were verified. No temporary test strategy appears on the saved chart.

Reproduce the comparison from the checkout root:

```bash
node scripts/compare-crt-freshness-runs.mjs \
  reports/native-v090/validation-continuation-2026-11-19/crt-freshness-native/original-messages.txt \
  reports/native-v090/validation-continuation-2026-11-19/crt-freshness-native/experiment-messages.txt
```

This completes the historical Strategy comparison for this window. The follow-up compiled and ran the Indicator, with 31 exact plans and three differences that fail strict parity. The same follow-up confirmed Basic's M5 Replay restriction and recorded a future comparison window. [Indicator parity, Replay and future window](indicator-replay.md)
