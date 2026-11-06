# Isolated A / G native coverage — November 6, 2026

**A produces two qualified historical positions when run alone; G produces no accepted trade in this observed run.** This distinguishes A's zero selected trades in the combined A–H run from an inability to qualify at all. It does not establish which particular combined-run state or arbitration decision suppressed either A plan.

Temporary testing used the existing verified stable-display Strategy draft on `FOREXCOM:XAUUSD` M5. TradingView displayed a fresh `Compiled.` / `Added to chart.` event at **12:50:38 Phnom Penh** in [the applied-source record](strategy-applied.ax.txt). No source text was edited in this continuation. The prior exact native copy-back for SHA-256 `ce6c1256bd9d29387f194be4ac715e479bf98f14bdcc0e9c697e5f4110f2aae9` remains in the [stable-display capture](../live-reload-2026-11-06/README.md); no second full copy-back was performed for this unchanged editor buffer.

## Actual settings and exports

All **117 A-only inputs** were read from fourteen native AX captures. Compared with the prior combined stable run, the only differences are B–H disabled. A stays enabled; audit logging is enabled. Quality75, London session, H1 alignment, cooldown5, quota5, stop/target rules and15-minute holding time remain unchanged. [Input comparison](isolated-runtime-inputs.json).

The input dialog showed absolute date/time values in UTC+7 (`07:00` for the existing UTC-midnight timestamps), whereas the earlier capture displayed UTC. The current chart screenshot and downloaded log prefixes establish UTC+7 for the isolation capture. Normalizing those displayed times to UTC preserves the earlier exact epoch values. The research-window restriction is off; the equal news start/end do not enable an exclusion window. The cause of the UI display-zone change was not established; it is not treated as a trading-rule change.

G was selected by turning A off and G on, with no other setting action. Its top **53 controls** were captured independently and match that transition. The other64 controls were not independently captured a second time; action continuity supports preservation, rather than a claimed complete G recapture. [Native G controls](g-inputs-top.ax.txt).

[Strategy Properties](strategy-properties.ax.txt) show USD10,000 initial capital,0.01% commission per side, two ticks of slippage, on-bar-close calculation, one-tick order delay, default four-tick detail and1x long/short leverage. Explicit Pine quantity remains authoritative. No spread model was added.

## Actual results

Both native Tester panes display **October12–November6,2026**. That UI range does not separately prove identical warm-up history or complete feed coverage. No data was extended or filter loosened to manufacture more signals.

| Isolated module | Completed positions | Gross price P&L | Commission | Net USD | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| A · Sweep / MSS / FVG |2|−11.2140000|3.4876968|−14.7016968|14-record genuine Pine Logs CSV; native Tester rounds to−$14.70,0/2 wins |
| G · AMD approximation |0|Not estimated|Not estimated|Not estimated|Native Tester says no trades; Pine Logs says waiting on logs |

A's [unmodified raw CSV](a-only-raw.csv) SHA-256 is `15e6fc91c6aaba33099f9ba057b042c33ca13e4e19783b27e449b7c869475a67`. It contains two complete groups and two exit rows, with exact quantity, price P&L, commission and net reconciliation:

| Plan / actual entry UTC | Actual entry | Actual exit UTC / price | Qty | Gross | Fees | Net |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Oct12 10:55 |4177.50|Oct12 11:10 /4171.83|2.1|−11.9070000|1.7533593|−13.6603593|
| Nov5 09:20 |4129.21|Nov5 09:35 /4129.54|2.1|0.6930000|1.7343375|−1.0413375|

Both final rows identify `Close entry(s) order A_SWEEP_MSS_FVG` with `TRADE_CLOSED`, actual hold15minutes and the captured `timeExit=15`. The unchanged source has one `strategy.close` call, conditioned on elapsed holding time. These jointly support timed-close classification. No SL or TP partial row appears in either isolated A position. The Oct12 arithmetic reproduces the original pictured−$13.66 result; it is overlapping evidence, not another independent losing trade. Gross uses actual emulator fills and already reflects configured slippage.

For G, **Download logs is disabled**. [Native no-trade screenshot](g-zero-report.png), [AX](g-zero-report.ax.txt), and [disabled export](g-export-unavailable.ax.txt) are preserved. No empty CSV or synthetic audit records were created. Zero accepted trades does not identify whether range detection, later displacement, H1/session/risk gates or expiry excluded potential setups; it does not prove G is broken or effective.

## Restoration, validation and limits

Autosave was turned off under the existing temporary-testing authorization. Reload removed the temporary fourth Strategy and restored the saved three-study configuration: visible confirmation-review Indicator, hidden original exit-audit Strategy and hidden baseline Indicator. A–H and audit are enabled in the [restored native top controls](restored-inputs-top-resumed.ax.txt). Editor/log panes were closed; [Autosave is visibly on](autosave-restored-resumed.png). The [final chart](../qualified-plan-2026-11-06/final-chart.png) retains the right price scale and normal view. No saved script, baseline Pine file, trading predicate, alert or deployment changed.

Focused validation used the real captures:117 A controls, seven expected module differences,53 G controls with no unexpected differences, exact two-position Decimal arithmetic and the existing partial-aware outcome analyzer. The input extraction helper was corrected to distinguish AX `text field` controls from text labels and to permit the visible session separator. No production or Pine code changed and no unrelated full suite was repeated.

This small inspected sample cannot establish module profitability or justify parameter tuning. G's zero-trade result is a bounded coverage observation. The combined sample's A/G zero selections are not independent efficacy tests. Full paired parity, controlled first-appearance/non-repainting, spread-calibrated research and untouched OOS remain open. Project stays v0.8.0; production remains database-free. No live trade, real alert, Telegram message, account upgrade or deployment occurred.

Reproduce from the project root:

```bash
python3 reports/native-v080/module-isolation-2026-11-06/extract-isolation-inputs.py
python3 reports/native-v080/module-isolation-2026-11-06/analyze-isolation.py
```
