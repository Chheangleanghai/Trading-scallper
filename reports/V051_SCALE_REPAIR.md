# v0.5.1 — Correct the detached chart price scale

The screenshot exposed a real display error: the scalper had an independent overlay scale while XAUUSD candles used the main right axis. Consequently, a label reporting an EMA above the current price could appear below the candles.

The earlier automated chart update replaced a source ID without preserving its main-series price-axis association. The chart loader created an independent overlay scale for the replacement. Compilation/runtime checks and backtest metrics did not detect this layout error. Earlier preview images may therefore show displaced overlays.

## Repair and verification

- Pinned the scalper to the main XAUUSD scale using the native `as-series` operation and enabled Auto scale to fit the data.
- Saved the chart and reloaded the saved layout. The reloaded scalper shares the main-series axis and has no independent overlay scale.
- Compared three native price-to-coordinate samples: candle and script coordinates match exactly. Also inspected the actual reloaded chart rendering.
- Strategy inputs, plot styles and unrelated indicator settings were unchanged during repair.
- The existing tester still reports −13.66 USD (−0.14%) and 0/1 profitable exit records. This is a losing backtest result, not a scale-setting error; fixing the display does not improve returns.
- Local Node22 verification passes **81 tests in seven files**. Six layout regression cases cover detached scales, immutable repair, idempotence, invalid main-axis mappings, other-axis preservation and both native Study/StudyStrategy source types.

Evidence: [native repair/save record](v051-scale-repair.json), [reloaded layout and coordinate checks](v051-reload-check.json), [corrected chart](v051-aligned-chart.png).

The three Pine sources match their v0.5.0 hashes exactly. No new strategy backtest, Pine compilation, parameter optimization, alert replacement, backend deployment or Telegram message was needed or performed for this layout-only release. The existing 82-assertion evidence and historical results remain attached to their original source/version records. Strategy profitability remains unproven.

## Prevent recurrence

Prefer updating an existing Pine study through the native editor. If an owned serialized layout is edited, replacing a pane source is insufficient: its ID must also be mapped to the main-series price axis. Use `pinStudyToMainScale()` and `assertSharedPriceScale()` from `scripts/chart_layout.mjs`, or the native pin-to-main-series operation, then save and verify again after reload. The validator was also run on the actual sanitized reloaded layout.
