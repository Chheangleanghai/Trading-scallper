# v0.4.0 — Reference chart layout

The new default Reference layout follows the supplied chart: green/red directional structure labels, neutral gray sweep tags, faint outlined zones, confirmed swing steps and right-edge swing/EMA tags. It uses the existing feed prices and confirmed context; it does not draw an example setup or imply a trade exists.

## Concepts displayed

| Annotation | Exact operational meaning |
|---|---|
| Bullish / Bearish BOS | Confirmed close crossing the last confirmed swing in the same direction as the previous structure break; the initial break is also BOS. |
| Bullish / Bearish CHoCH | The same confirmed break, opposite to the previous structure-break direction. This is a price-action definition, not proof of an institutional event. |
| HIGH / LOW LIQUIDITY SWEEP | Price breaches a previously confirmed swing and closes back inside the prior swing range. Each side is annotated once per confirmed pivot. |
| CRT HIGH / LOW SWEEP | Price breaches the corresponding boundary of the previous completed CRT reference candle and closes back inside its range. Once per reference candle and direction; a lower reference timeframe is omitted from context. |
| SNR SUPPORT / RESISTANCE | At least two confirmed pivots cluster within the configured ATR level tolerance. Zone width is frozen at recognition. A close through the far boundary invalidates the zone. A new confirmed cluster/touch can replace or requalify it. |
| BULL / BEAR OB · candidate | Existing displacement/opposite-candle heuristic: an impulsive candle breaks the previous opposite candle's high/low. The opposite candle range is the zone. A confirmed close through its far boundary invalidates it. It is not a guaranteed supply/demand level. |
| BULL / BEAR FVG | Three-candle gap with a directional middle candle meeting the configured displacement threshold. A later completed candle fully touching the far gap boundary removes it. |
| SWING HIGH / LOW | Most recent confirmed pivot, stepped forward only from its confirmation bar. |
| EMA 21 / EMA 55 | Orange EMA21 and blue EMA55 visual context. EMA55 does not replace the strategy's EMA50 or alter trend-pullback rules. |

These concepts were selected because they have visible, objective definitions in this implementation. Their presence does not establish predictive value or profitability. Gray markers and candidate boxes can appear with the corresponding strategy disabled. Only the unchanged qualified entry engine sends BUY/SELL events. Both-side sweeps are marked ambiguous in the context panel.

## Layout and controls

Settings → Inputs → Chart style selects Reference or the previous Dashboard layout. Reference uses a compact analysis panel at bottom left; full signal/performance tables remain available in Dashboard mode. The panel names the current structure, recent sweep context, available zone types and entry/setup stage.

Existing visibility controls still hide EMAs, OBs, FVGs or structure markers. Chart style adds swing-level, SNR, CRT and liquidity context toggles. Same-side sweep text has an eight-bar default spacing limit to reduce overlap; detection and trading rules are unaffected. Readability controls retain adjustable font size and a bounded recent label count. Overlapping CRT/liquidity detections on one side share a two-line tag. Right-edge tags and zones extend by a configurable number of bars, within Pine's future-drawing limits.

No entry, pivot or zone is backdated to an earlier candle. Confirmed structure/sweep/zone changes use bar closes. EMA lines and their latest-value tags can develop during the live candle; they are visual context and do not change confirmed entry semantics. Zone widths are derived from ATR, not widened simply to fit text. Absent or invalid zones are not manufactured to resemble the example.

## Verification

- Canonical indicator and strategy compiled in native TradingView on FOREXCOM:XAUUSD.
- Native checks cover M1/M3/M5/M15 and Dashboard, Large labels and hidden-overlay settings. See [native check records](v040-native-checks.json).
- Node22 verification: 75 automated tests, strict TypeScript, generated-source consistency and independent Pine parsing passed.
- Order adapter, broker synchronization, strategy candidates, scoring predicates, context engine and performance aggregation match v0.3.1. This release adds presentation context and leaves trading calculations and alert JSON unchanged.
- The unchanged 58-assertion validation source retains its earlier native evidence. It was not rerun for this UI release. Earlier historical performance runs belong to their recorded prior source hashes; no new profitable-strategy claim is made.
- Prior trading inputs are matched by name, unrelated indicator states are checked unchanged, and the chart save is recorded in [v040-chart-update.json](v040-chart-update.json).

[Native chart preview](v040-reference-final.png). No backend deployment, live alert replacement or real Telegram message was performed for this UI update.
