# Strategy Tester timeframe observations — 2026-11-04

## Scope

Read-only observations of the TradingView Strategy Tester for the visible unsaved **“XAUUSD SMART SCALPER PRO Backtest · Exit audit experiment”** on `FOREXCOM:XAUUSD`. The experiment was the active report source while changing chart intervals. Bar Replay remained off. No inputs, Strategy Properties, alerts, saved layouts, or source files were changed. No trade was placed and no CSV was exported.

This is a UI observation, not a raw Strategy Tester export. The chart displayed initial capital of 10,000 USD and default detailization. The tester's available date window varied by interval, so these rows are not a controlled same-period performance comparison. The active study label does not independently prove the editor buffer hash during this run; the separate experiment copy-back and compile record is documented in `trade-exit-reconciliation-2026-11-03.md`.

## Observed results

| Interval | Tester date range shown | Visible result |
| --- | --- | --- |
| M1 | Oct 26–Nov 4, 2026 | Four closed-trade rows, all SHORT. Three rows: entry Oct 26 16:51 at 4,018.14, exit 16:59 at 4,020.61, size 0.7, net −$2.29 each (−0.08% each). One row: entry 16:51 at 4,018.14, exit 17:06 at 4,025.97, size 0.1, net −$0.86 (−0.21%). The displayed row P&L sums to −$7.73. Identical timestamps/prices mean these rows must not be interpreted as four independent signal plans; partial/closed-order grouping is unresolved from this table alone. |
| M3 | Oct 19–Nov 4, 2026 | Strategy Tester displayed “This strategy hasn't made any trades with current settings.” No trade rows. |
| M5 | Oct 5–Nov 4, 2026 | One LONG: entry Oct 12 10:55 at 4,177.50; exit 11:10 at 4,171.83; size 2.1; displayed position value $8.77K; net −$13.66; return −0.16%. This matches the separately reviewed exit-audit row. |
| M15 | Aug 3–Nov 4, 2026 | One LONG: entry Oct 2 14:00 at 4,191.46; exit 14:15 at 4,189.03; size 2.1; displayed position value $8.8K; net −$6.86; return −0.08%. |

During the M1-to-M3 transition, the tester briefly continued to expose the prior M1 rows. The settled M3 view showed no-trade text and the M3-specific date range; that settled view is the recorded result. M5 and M15 results were likewise read after their interval and report view updated.

## Interpretation and limitations

- The four windows differ substantially (M1 starts Oct 26; M15 starts Aug 3). The figures cannot be compared as if they covered the same period or exposure.
- The M1 list contains four closed-trade rows, not proof of four independent plans. Its aggregate displayed-row sum is −$7.73; no broader portfolio statistic is inferred.
- The M3 report's no-trade message is limited to its displayed Oct 19–Nov 4 window and the current settings.
- A same-period Custom date range could not be applied: TradingView opened its Deep Backtesting upgrade gate on the Basic plan. No upgrade was made. The report was returned to the default available-chart-range selection afterward.
- The M5 trade reconciles to the exit-audit experiment's previously captured 15-minute `TRADE_CLOSED` path. This run does not independently identify the M15 or M1 exit IDs/comments.
- No Strategy Tester overview metrics, full trade export, exact common date window, spread model, or complete settings manifest were captured. Multi-timeframe performance and profitability are therefore not established.
- Replay/reload remains unverified. In the follow-up attempt, the Replay date/time fields accepted `2026-10-12` and `09:55`, but the visible chart stayed on Nov 3–4. Keyboard confirmation did not apply the date; clicking the accessibility `Select` button failed with `elementHasNoFrame`, then the date picker disappeared without moving the chart. I confirmed the Replay toggle was returned to off. No replay bars were advanced and no signal timing or repaint conclusion was recorded.

## Chart state after review

Restored chart interval to M5. The exit-audit experiment was hidden again, the baseline Indicator remained visible, and Bar Replay remained off. The chart layout remains unsaved. The frozen baseline Pine sources were not edited; their last recorded SHA-256 values remain Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` and Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`.

## Free-plan Replay access check — 2026-11-04

- Opening Bar Replay exposed TradingView's plan comparison page. The Essential column explicitly displayed “Bar Replay available here.” No plan option or subscription button was selected.
- The chart accessibility tree showed Bar Replay enabled during the attempt. I turned it off and verified the control reported off; no candles were advanced and no replay/reload observation was made.
- The visible page remained the plan comparison overlay. Beneath it, the accessibility tree showed a chart URL requesting `FOREXCOM:XAUUSD` while the chart header identified `SPX` / `SP_DLY:SPX`. Because the symbol state was inconsistent and the plan page obscured the chart, this attempt produced no new XAUUSD market evidence.
- The TradingView UI is left on the plan comparison overlay. No upgrade, alert, trade, or saved chart change was made. The frozen baseline source hashes remain unchanged.

## Follow-up access attempt — 2026-11-04

- Chrome accessibility control became available for the TradingView tab. The XAUUSD symbol search returned the `FOREXCOM:XAUUSD` result, and selecting it changed the Chrome window title to XAUUSD. The chart accessibility image still identified the loaded data as `SP_DLY:SPX`, so the symbol was not verified as restored in the chart itself.
- The screenshot still showed TradingView's plan comparison page. Its visible close X was not exposed in the accessibility tree, and a screen-coordinate click failed with `noWindowsAvailable`; the page was not dismissed. No subscription option was selected.
- Bar Replay remained off during the symbol-restoration attempt. No Replay bars or Pine Logs were obtained in that attempt. No alert, trade, source, or saved-layout change was made.

## Free-plan Strategy Tester and settings inspection — 2026-11-04

- Confirmed the loaded chart is `FOREXCOM:XAUUSD`, M5. The open Strategy Tester report is titled **“XAUUSD SMART SCALPER PRO Backtest · Exit audit experiment”**, with the visible report window Oct 5–Nov 4, 2026 and initial capital 10,000 USD.
- The List of trades contains one LONG: entry Oct 12, 2026 10:55 at 4,177.50; exit 11:10 at 4,171.83; size 2.1; displayed position value 8.77K USD; net −$13.66; return −0.16%. Overview reports total P&L −$13.66 (−0.14%), max drawdown $13.66 (0.14%), profitable trades 0/1, gross profit $0, gross loss $13.66, profit factor 0, and expectancy −$13.66 (−0.16%). This is one experiment trade, not evidence of baseline profitability.
- Strategy Properties shown in the UI: initial capital 10,000 USD; default order size 100% of equity; pyramiding 0; commission 0.01 percent; long and short leverage 1x; slippage 2 ticks; default bar detailization (4 ticks per bar); script execution on bar close; order execution delay one tick.
- The visible experiment inputs show A enabled and B–H disabled, date-window restriction off, direction Both, quality threshold 75, H1 alignment on, session filter on with London selected, and research audit logging off. The input dialog exposed only its first 100 of 188 items; remaining inputs, including the effective `timeExit`, were not independently read in this pass.
- The **Download .csv** control opened a dialog stating that exporting strategy trades requires an upgrade from the current Basic plan. The dialog was closed without selecting Upgrade; no CSV was produced. The report overview also marks some detailed metrics as upgrade-gated.
- These are direct UI observations of the isolated Exit audit experiment, not a newly hash-attributed baseline Strategy run. No Pine Logs were collected, no settings were changed, and no Replay bars were advanced. This is not a same-period multi-timeframe matrix or an OOS result.
