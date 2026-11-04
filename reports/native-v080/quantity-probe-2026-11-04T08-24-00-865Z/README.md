# Isolated quantity-rounding investigation — 2026-11-04

**Native result: reproduced in all four legacy cases; zero remaining quantity in all four integer-unit controls.** The approved temporary test completed on `FOREXCOM:XAUUSD` M5. The original chart studies and source editor were restored by reloading the saved chart, the probe was removed, and Autosave was restored to its original ON setting.

The native all-module export previously showed 14 groups retaining 0.1 units after all three bracket exits. This follow-up isolates that quantity mechanism without modifying the frozen v0.8.0 Indicator, Strategy, or existing Exit audit experiment.

## Native results

Each row below was tested separately LONG and SHORT, for eight cases total. Quantities are absolute units; the raw logs preserve signed exit sizes and full emitted precision.

| Entry quantity | Allocation | Requested Q3 | Actual Q1 / Q2 / Q3 fills | Remaining after brackets | Cleanup close |
| ---: | --- | --- | --- | ---: | ---: |
| 2.1 | Legacy float | 0.8999999999999999 | 0.6 / 0.6 / 0.8 | 0.1 | 0.1 |
| 2.1 | Integer units | 0.9000000000000000 | 0.6 / 0.6 / 0.9 | 0 | 0 |
| 2.2 | Legacy float | 0.7999999999999999 | 0.7 / 0.7 / 0.7 | 0.1 | 0.1 |
| 2.2 | Integer units | 0.8000000000000000 | 0.7 / 0.7 / 0.8 | 0 | 0 |

The original download is preserved unchanged as [`quantity-probe-native.csv`](quantity-probe-native.csv), SHA-256 `f85ac33d67066bf693196e397d69262923445c7c8a3c7d42fdb60f92c54eff3c`. Its 53 records contain eight requests, eight observed fills, 24 bracket exits, four cleanup exits, eight after-bracket observations, and one completion record. All eight actual entries match their requests. Brackets plus observed residual, and total exits including cleanup, reconcile to each entry within `1e-9` units to accommodate emitted floating-point precision. No probe failure occurred. [`native-analysis.json`](native-analysis.json) contains every case and CSV line references.

This confirms a quantity-allocation defect for the tested 2.1/2.2-unit positions: the frozen Strategy's `initialQty - q1 - q2` expression produces a Q3 slightly below the intended contract quantity, and TradingView fills Q3 one 0.1-unit contract smaller in these cases. Replacing that calculation with integer-unit allocation removes the residual in the paired controls. This reproduces the mechanism consistent with the 14 earlier residual groups; it does not inspect TradingView's internal rounding implementation or prove every earlier group's full cause.

The baseline allocation is at `pine/strategy.pine:1005–1007`; the unchanged exit-audit experiment uses the same expressions at `pine/experiments/strategy_exit_audit.pine:1052–1054`. No production fix was applied. An isolated corrected Strategy still needs broader quantity coverage and native testing of target/stop combinations and repeated bracket updates before promotion.

These are artificial historical order-mechanics cases with forced stop placements and zero costs. Their Strategy Tester P&L has no signal-performance meaning. They do not establish planned-signal parity, Replay/non-repainting, corrected full-Strategy behavior, or profitability.

## Finding supported locally

Evaluating the frozen allocation expression with JavaScript IEEE-754 arithmetic gives:

| Entry quantity | Legacy q3 / minimum-contract step | Floor to units | Integer-lot control q3 / step |
| --- | --- | ---: | --- |
| 2.1 | 8.9999999999999982 | 8 | 9.0000000000000000 |
| 2.2 | 7.9999999999999991 | 7 | 8.0000000000000000 |

This earlier local calculation predicted one fewer minimum-contract unit. The native rows above now reproduce the predicted residual and the paired control outcome. `local-arithmetic.json` remains separate from the genuine TradingView export; it is not native evidence by itself.

TradingView documents that multiple `strategy.exit()` calls reserve portions of the position and that already-triggered stop prices can activate orders immediately. The control experiment uses those mechanics only to exercise order quantities. Reference: [TradingView Strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/).

## Prepared native experiment

Source: `pine/experiments/quantity_rounding_probe.pine`, SHA-256 `8cd566e4cfa29fd19e7418faa15061ea6183ace2ab06fe95b0720f679d3eb1db`.

Eight historical broker-emulator cases compare legacy floating allocation and integer-lot allocation at 2.1 and 2.2 units, for both long and short positions. Three artificial, already-triggered stop exits force Q1/Q2/Q3 to execute; later logging records the actual remaining position and any cleanup close. These stop placements are deliberately artificial and have no performance meaning. No production signal predicates or alert calls are present. Realtime bars cannot start cases.

All expected `QTY_PROBE_REQUEST`, `QTY_PROBE_FILLED`, `QTY_PROBE_EXIT`, `QTY_PROBE_AFTER`, and `QTY_PROBE_COMPLETE` artifacts were captured. Historical log prefixes run from October 6, 2026, 07:00 through 09:15 UTC. The full editor copy-back, obtained through native Copy and a separate plain-text TextEdit document, is [`quantity-probe-editor-copy.pine`](quantity-probe-editor-copy.pine). Its 97 source lines match the local probe byte-for-byte at the SHA-256 above. The AX text serializes an extra separator newline after the text value; only that separator was excluded when extracting the copy-back.

TradingView displayed `7:49:44 PM Compiling…`, then `7:49:46 PM Compiled.` and `Added to chart.` on November 4, 2026 (Asia/Phnom_Penh). [`probe-native-compiled.ax.txt`](probe-native-compiled.ax.txt) preserves the compiler messages; [`probe-native-compiled.png`](probe-native-compiled.png) shows all eight completed results.

## Temporary run and restoration

A separate browser tab opened an existing `FOREXCOM:XAUUSD` M5 layout at `/chart/1WInggOG/`, which identifies a different already-signed-in Free account from the original research layout. No account login or subscription change was performed. The tab already contains Premium GOLD Signal and an existing baseline Backtest draft; they were preserved.

**Create new layout** opened TradingView's Basic-plan prompt stating that only one saved layout is allowed. The prompt was dismissed without upgrading; `free-layout-limit.ax.txt` preserves that earlier limitation. The user then explicitly approved temporarily disabling Autosave, running the probe, and restoring the chart.

The actual test used the original signed-in research chart at `/chart/Y9SyfFkw/?symbol=FOREXCOM%3AXAUUSD`. Autosave was visibly ON before the run, visibly OFF during the run, and ON again only after the saved original chart had reloaded without the probe. A new unsaved Strategy draft was created rather than replacing the original editor's source. The probe was added temporarily, compiled, and its Pine Logs were downloaded through TradingView's own Download logs action.

Restoration evidence: [`restored-autosave-on.png`](restored-autosave-on.png) shows Autosave ON and the original studies; [`chart-restored-panels.png`](chart-restored-panels.png) shows the restored FOREXCOM:XAUUSD M5 chart, original exit-audit source in the editor, the probe absent, and the temporary Pine Logs panel closed. TradingView reports `All changes saved`. The original Indicator remains hidden and the exit-audit Strategy visible. The Strategy menu reports `Pin to scale (now right)` and the rendered chart has the shared right price scale. No new layout or script was saved, no inputs were changed, and no alert, live order, Telegram message, upgrade, or deployment occurred.

## Local validation

The preceding `npm run verify` passed TypeScript, **160 tests / 14 files**, generated-source consistency, and parsing of the baseline plus both experiments. That suite was not repeated during this evidence-only native run. The new checks are the eight native emulator cases and the downloaded-record reconciliation above. Baseline and existing experiment hashes remain unchanged in `verification-context.json`. The project remains v0.8.0 and the release remains blocked by the open parity, Replay, reproducible research, and OOS gates.
