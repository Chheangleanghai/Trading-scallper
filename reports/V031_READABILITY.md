# v0.3.1 — Readable chart text

The dashboard and chart annotations use larger, high-contrast text and plain-language descriptions. Trading calculations, event names, payload schema and strategy defaults are unchanged.

- Dashboard and chart label sizes: Small, Normal (default), Large.
- Solid dark panels, alternating rows, left-aligned text, clear direction colors.
- Strategy identifiers are translated for display, for example A becomes “Sweep + reversal + gap”.
- Stop loss, take profit, simulated fill, win rate and profit factor use expanded names. Performance includes account currency, percent signs and holding-time units.
- Setup score explicitly says it is not a win percentage.
- Previous plan prices are hidden by default when there is no current trade. Developing setups show prices only when their current confirmation has calculated a plan. Previous prices can be enabled in Readability settings.
- Detailed swing labels default off. Only the latest 15 structure annotations remain by default; their text is offset from candles. Historical entry markers stay on their actual confirmation/fill bars.
- Strategies with no completed trades are hidden from the performance table by default. A no-trade state is identified explicitly.

Open the script's Settings → Inputs → Readability to adjust size and visibility. Larger sizes occupy more chart space; reduce the structure-label count when candles are tightly compressed. These changes apply only to this script's drawings and tables, not TradingView's toolbar or other indicators.

Both generated scripts were compiled in TradingView on FOREXCOM:XAUUSD M5. The updated strategy replaces this project's previous strategy on the chart. Existing strategy inputs were matched by input name, and unrelated indicators' states were checked unchanged. Chart save and configuration evidence is in [v031-chart-update.json](v031-chart-update.json). See the [native chart preview](v031-readable-final.png).

The local Node22 suite passes 75 tests, including generated-source consistency and independent parsing. The unchanged 58-assertion validation harness was verified natively in v0.3.0; it was not rerun for this display-only release. The previous 43 historical runs belong to the v0.3.0 source hash and are not presented as new v0.3.1 performance tests. No new profitability claim, backend deployment, running-alert change or real Telegram message is part of this update.
