# TradingView chart maintenance

When applying updates to an existing TradingView chart:

- Preserve user trading inputs and unrelated indicators.
- Replacing a source ID alone can detach the study from the candle price scale. Use the native as-series pin or scripts/chart_layout.mjs to bind it to the main series.
- Assert shared axis membership and absence of an independent overlay scale. Support both Study and StudyStrategy source types.
- Save the layout and verify persistence after reload. Compare native price coordinates and inspect the rendered chart; compilation alone does not establish visual correctness.
- A scale-only repair must not change trading calculations or be presented as improved backtest performance.
