# Display restart correction and genuine live-close review — November 6

The isolated Indicator and Strategy now have a presentation-only alternative that removes a documented chart-refresh dependency. Both standalone candidates compiled natively with exact normalized editor copy-backs. A full A–H diagnostic variant retained a genuine realtime M5 close and was compared with a historical reload. **The strict full-data comparison is not passed: volume changed from 0 to missing.** OHLC, derived context, execution/candidate state and plan state match for that bar. It produced no qualified entry, so this does not verify entry first appearance or general non-repainting.

Project remains **v0.8.0**. Baseline and confirmation-review parent files are unchanged. Temporary candidates were not saved into the layout; the original saved M5 chart, all 117 inputs, study visibility and Autosave were restored. [Final chart](final-chart.png), [input restoration](restored-input-comparison.json), [Autosave](autosave-restored.png).

## Confirmed display dependency and isolated correction

The confirmation-review renderer at Indicator line 1025 / Strategy line 1168 reads `chart.left_visible_bar_time` and `chart.right_visible_bar_time` to estimate label spacing. TradingView documents refreshes when a script uses these variables and the chart moves or a new bar appears. Its execution-model documentation also distinguishes script loading from incremental realtime executions. [Official indicator FAQ](https://www.tradingview.com/pine-script-docs/v5/faq/indicators/), [current execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/).

Although these values feed only presentation, they create a dependency for the entire script. The earlier three snapshot exports regenerated closed rows as historical around new-bar boundaries; no genuine realtime close is present in those files. This is consistent with the documented refresh mechanism. It is not proof that the same mechanism caused the separate Nov4 price change.

`scripts/generate_stable_display.py` replaces only that visible-range accumulation with a trailing 100-candle high/low range for label spacing and changes the candidate titles. It adds no inputs and changes no pattern, confirmation, arbitration, sizing, order, stop, target, cooldown or session predicate. The two reconstruction tests recover the entire frozen parents exactly. Both candidates retain the small A–H board, K-SNR name, clear Entry/SL/TP drawings and context overlays.

The display tradeoff is explicit: optional connector spacing uses recent candles rather than adapting to the visible viewport. Price lines and prices stay at their original levels. The existing default has connector spacing off. This change removes the viewport dependency; no CPU benchmark, higher signal rate or earlier confirmation is claimed.

| Separate source | SHA-256 | Native success, Phnom Penh |
| --- | --- | --- |
| `indicator_stable_display.pine` | `267920fe769cd46f70269457d6194ba4b40d70819d8188bedc86d45b8bb9b680` |12:17:26|
| `strategy_stable_display.pine` | `ce6c1256bd9d29387f194be4ac715e479bf98f14bdcc0e9c697e5f4110f2aae9` |12:20:11|
| `indicator_stable_live_snapshot.pine` | `18d4b52e499e12090672c75baefe2ca0657b70b7ee801abcaf22f6ae8456a79b` |12:04:32; reapplied12:13:10|
| Minimal `runtime_state_probe.pine` | `4e4aced8a6c9feca4e85d12330133d02ab9ecb559911290e895958cdaf074e13` |11:57:26; updated11:57:27|

Each copy-back and compile AX/PNG is retained in this directory. Native compile claims refer to these separate hashes, not a new compile of the untouched baseline.

## Actual capture sequence and classification

All market times below are UTC on November6. Capture sessions span the early morning; filenames do not establish continuous observation or native capture chronology.

1. The first live-snapshot variant retained the viewport dependency and logged only historical classifications at the00:55,01:00 and01:05 bar opens. `initial-raw.csv`, `live-raw.csv`, and `live-final-raw.csv` contain **zero realtime confirmed closes**. Their names do not turn them into live evidence. [Classification review](execution-classification-review.json).
2. The minimal six-line runtime control has no A–H engine or viewport references. Its raw182-record download contains an actual realtime confirmed close at **05:00:00.527**, proving that this account/runtime can expose realtime closing execution. This control alone says nothing about A–H entry stability.
3. The full stable-display probe then captured the05:00 bar closing05:05 as realtime. Replacing the input-free control reset the audit-log override to false; that eight-record export is preserved as `stable-live-first-raw.csv`. All eight concepts were enabled, but this first export is not used as the matched-input main comparison.
4. Research logging was restored to true. All **117 actual native controls** were captured and match the saved parent configuration. This intentional input change restarted the diagnostic. The next close, **05:10**, was captured with that configuration and an unchanged startup counter through the bar transition.
5. With Autosave off, the saved chart was reloaded, and the identical diagnostic was reapplied to the original study. Its fresh complete editor copy-back matched. The05:05 bar was then classified historical in `stable-after-reload-raw.csv`. This is reload plus reapplication, not an uninterrupted attachment claim.

TradingView defines `isrealtime` and `ishistory` separately, with `isconfirmed` true at a realtime closing update and on historical bars. The observations below use these embedded flags, not visual candle position or the export filename. [Official bar-state documentation](https://www.tradingview.com/pine-script-docs/concepts/bar-states/).

## Live close versus reload: exact result

The main observed live bar opens **05:05**, closes **05:10**, timestamp1793941800000. It has:

| Field | Live confirmed close | Historical counterpart |
| --- | ---: | ---: |
| Open |4048.325|4048.325|
| High |4052.905|4052.905|
| Low |4047.595|4047.595|
| Close |4052.195|4052.195|
| Volume |0|missing (`null`)|
| Derived context / candidate / execution fields |Match|Match|
| Plan on this bar |None|None|
| First loaded bar / target bar index |1791756000000 /5317|1791756000000 /5317|
| Last bar index |5317|5318|

Live classification is `realtime=true, history=false, confirmed=true`; reload is `realtime=false, history=true, confirmed=true`. Before reload, startup time 1793941675070 persists through both confirmed observations and the new-bar heartbeat. The update counter advances through 5354 and 5355 on closing observations, then 5356 on the new bar, without a new startup. Exact records are in [the analysis](live-reload-analysis.json).

The feed/runtime emitted **two confirmed observations for the same closing bar**. Their data snapshots are exactly equal; execution update counters differ. Both original rows and their metadata remain in the raw CSV. The research analysis explicitly aggregates them into one comparison bar only after validating every field is equal, and records all original row numbers and counts. It refuses to select one if any data snapshot differs. The original strict snapshot intake still rejects duplicate rows; its behavior was not relaxed. The two `*-unique-derived.log` files are clearly labeled derivatives, not raw TradingView exports.

The overall comparator correctly reports `dataAndStateEqual=false` because volume0 versusnull is a raw-context difference. No tolerance was enlarged and no missing value was filled. The standalone candidates do not reference volume, so this difference does not enter their trading predicates; that does not justify calling the full-data result equal. The advancing `lastBarIndex` is reported as metadata separately.

There were **zero qualified plans on the observed live bar**. The London filter was closed. Thus matching plan state means `null` remained `null`; it is not a test of a BUY/SELL entry appearing on the correct first bar. There was no Bar Replay, and no live order or alert was involved.

## Regression, inputs and historical plans

- Full `npm run verify` passed: TypeScript, **203 tests /25 files**, baseline generation consistency, **23 independent Pine parses**. Four focused new tests cover the confirmed viewport dependency, exhaustive parent reconstruction and read-only probe separation. [Actual output](local-full-verification.txt).
- Standalone Indicator's **74 plans** exactly match its captured diagnostic-source records. Standalone Strategy's **75 plans** exactly match the preceding current-parent Strategy trace, in every original PLAN_AUDIT JSON field. This validates each new display clone against its reference; it is not a cross-model parity pass. [Source regression](stable-standalone-regression.json).
- The74 historical Indicator plans also match across the main live-probe/reload captures. [Historical plan comparison](stable-plan-reload-comparison.json).
- Actual Indicator/Strategy settings have117 inputs each and zero differences. Audit is on; all A–H on; Close entry; London session; H1 alignment; quality75; cooldown5; quota5; holding15minutes; FixedR targets; research-window restriction off. [Input comparison](stable-runtime-input-comparison.json).
- Strategy Properties: USD10,000,0.01% commission, two ticks slippage, on-bar-close calculation, default four-tick detail, one-tick order delay,1x leverage. Explicit Pine `qty` overrides the default size control. No spread model or new OOS result is inferred. Raw group telemetry totals75 complete positions and net **−77.4580829USD** in this historical recalculation. This differs from the earlier−77.1940565 capture by the separately documented historical Entry change; it is not an independent new sample or proof of a display-rule effect.
- All117 original saved Indicator inputs were independently read again after restoration and match the pre-test reference. Study count3, visible confirmation-review Indicator, hidden original exit-audit Strategy and hidden baseline Indicator were preserved. Both temporary Strategy and restored Indicator report the existing right price scale. Editor/log panes are closed, legends collapsed and Autosave is on.

## Remaining limits and useful next evidence

The [preserved-evidence drift investigation](../drift-investigation-2026-11-06/FINDINGS.md) establishes that Nov4's old/new chart-close proxy also changed the simulated entry by0.12. It recovered formatted signal price and candidate anchors, not the missing original full OHLC/HTF snapshot. The root cause remains unresolved. A mislabeled older reload screenshot predates its final compile; that image cannot supply later final-source chronology.

The stable display candidates are prepared and tested separately. They have not replaced the user's saved Indicator, and baseline source hashes remain unchanged. Further evidence needs a **qualified live setup**, its first confirmed appearance and levels, then same-source reload comparison; controlled Replay and sufficient untouched OOS data remain open. No general non-repainting, full independent plan-stream parity, profitability, guaranteed signal frequency or Telegram delivery claim is established. No deployment, live alert, real Telegram message, account upgrade or live trade occurred. Production remains database-free.

Reproduce the raw-backed analysis with:

```bash
python3 reports/native-v080/live-reload-2026-11-06/analyze-live-reload.py
```
