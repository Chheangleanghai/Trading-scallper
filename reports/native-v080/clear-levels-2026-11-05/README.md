# Clear Entry / SL / TP display — November 5, 2026

The user's requested screenshot style is implemented in a separate **presentation-only** Indicator: [`indicator_clear_levels.pine`](../../../pine/experiments/indicator_clear_levels.pine). Frozen v0.8.0 Indicator and Strategy files remain unchanged.

## What changed

- Solid white-on-gray **Entry (planned)**, white-on-red **Stop Loss**, and white-on-green **Take Profit 1 / 2 / 3** labels, with exact mintick prices and risk/reward shading.
- The latest ended plan stays visible by default. Dashed lines and a prominent **PREVIOUS BUY/SELL PLAN — ENDED** card distinguish it from a fresh signal. Original signal time/module are frozen separately from later candidate direction changes.
- A fixed price card shows all five prices without overlap at any zoom, plus the actual current WAIT reason. Indicator execution is explicitly an estimate.
- Clear mode suppresses context drawings and the large dashboards; **Context + levels** remains available. Existing BUY/SELL markers stay on their original confirmed signal bars.
- Price-label bodies are anchored inside the chart's right edge. The first native reload exposed off-screen future labels when TradingView restored zero future margin; the final version corrects that presentation defect. The initial source/copy-back and screenshots are retained separately.

At equal symbol/history/inputs/timeframe, this changes the display rather than the number or timing of signals. M5 evaluates confirmed plans at five-minute closes, compared with fifteen-minute closes on M15. A setup must still pass its confirmation, session, trend, volatility, score and risk gates.

## Why the user was not seeing levels

Native observations showed the original saved Indicator **hidden**. Its inputs had historical drawings **Off** and **Show previous trade prices when no current plan = false**. The source deletes current plan drawings after closure under those settings. The captured current WAIT reason was **Outside selected session**; the actual session remained London 08:00–17:00. On November 5, 2026, that corresponds to **15:00–00:00 Cambodia time**, with the end on November 6. No session/quality filter was weakened to manufacture an immediate signal.

## Source and actual tests

Final source SHA-256: `4ab564ff12404f5a40318eee2a43468b1345ffcdc01a112732c8a2bbb2c9df24`.

- Final full native editor copy-back matches exactly: `indicator-editor-copy-final.pine`. Native Pine Editor showed **12:16:17 PM Compiling…**, **12:16:45 PM Compiled.**, and **Updated on chart.** (Phnom Penh time). AX and PNG evidence are preserved.
- The baseline reconstruction test removes the bounded presentation changes and reconstructs the exact frozen Indicator, including every trading predicate, state transition, alert and audit statement. The generator refuses a drifting baseline.
- Native original-versus-initial-clear and final-clear exports contain **69 plans and 300 total records each, byte-identical**, SHA-256 `4ab2b4546fe1351d300d1895c07cf41917d2c26d2b7804029d903d431c5c8eed`. Zero-tolerance comparison reports no planned-field or execution-model differences. This is Indicator display-regression evidence, not Indicator-versus-Strategy parity. The final export was captured after its exact-copy-back compile; `final-native-log-equality.json` and `final-plan-comparison.json` record the final comparison.
- Complete observed input comparison: original **115 controls**, new **117**. All trading inputs match, including A–H enabled, audit on, Close entry, London/H1 filters, quality 75, holding time 15 and date restriction off. The two existing presentation differences are label size **Small → Normal** and retaining previous prices **false → true**. Two added display controls select clear mode and line/box extension.
- Final full `npm run verify`: **174 tests / 18 files passed**, TypeScript, frozen generation consistency and eleven independent Pine parses passed. Production dependency audit: **0 vulnerabilities**; production dependencies remain empty.

The native test loaded a separate unsaved draft; the saved original script was not edited. The Free plan's one-saved-script cap blocked a second named script. That upgrade prompt was dismissed; the local source and editor copy-back are preserved. No alert, live trade, Telegram message, deployment or upgrade occurred. Earlier baseline compile evidence, raw research files, OOS protocol and archives are preserved.

Regenerate with `python3 scripts/generate_clear_signal_indicator.py`; verify without writing with `python3 scripts/generate_clear_signal_indicator.py --check`.

## Applied chart and remaining limits

The saved FOREXCOM:XAUUSD M5 layout uses the new clear display. The original two studies remain on the chart, hidden rather than removed, with their trading inputs preserved. The new study shares the existing right price scale and was brought in front of candles so its price card remains opaque and readable. Editor, Logs and Tester panes are closed; Replay is off. The [final foreground/save/reload capture](final-foreground-after-reload.png) visibly confirms the opaque five-price card, previous-plan status and saved M5 layout. AX confirms All changes saved, Replay off and Editor closed.

At the current wide zoom, price-aligned labels for the old plan can overlap because the five nearby levels occupy a small vertical range. The fixed card presents all five values independently of zoom. It explicitly identifies the displayed November 4 10:55 UTC B BUY plan as **PREVIOUS / ENDED**; it is not a new November 5 entry. A fresh qualifying plan replaces those displayed prices automatically.

This completes the requested display implementation and native display-regression check. It does not close Strategy parity, candle-by-candle Replay, prospective OOS or profitability gates, nor does it guarantee a new signal immediately. The Free plan still blocks a second named script save, but the separate applied draft is stored in the chart layout and its standalone local source is preserved.
