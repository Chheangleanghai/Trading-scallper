# TradingView Strategy Tester UI observations — 2026-11-01

These are values read from the signed-in TradingView Strategy Tester during a live browser session. They are **UI observations, not exported reports**. The chart displayed `FOREXCOM:XAUUSD`; the Strategy Tester was attached to `XAUUSD SMART SCALPER PRO Backtest`. The active editor buffer was not copied back during this run, so these results are **not independently attributed to the current local Strategy SHA-256**.

## Results displayed by TradingView

| Chart interval | Report date range | Trades | Winners | Net P&L (USD) | Max drawdown (USD) | Profit factor |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| M1 | 2026-10-26–2026-10-31 | 4 | 0 | -7.74 | 7.74 | 0 |
| M3 | 2026-10-12–2026-10-31 | 1 | 0 | -0.30 | 3.33 | 0 |
| M5 | 2026-10-05–2026-10-31 | 1 | 0 | -13.66 | 13.66 | 0 |
| M15 | 2026-08-03–2026-10-31 | 1 | 0 | -6.86 | 25.74 | 0 |

Each interval was a separate Strategy Tester run with displayed initial capital of USD 10,000. These runs do not form one portfolio, and their combined arithmetic is not a portfolio result. The sample is too small to support a profitability conclusion.

## Visible run context and limits

- Strategy inputs displayed module A enabled and B–H disabled; the research date-window restriction was off; audit logging was checked; H1 alignment and London session filters were on; EMA alignment was off; entry mode was Close; targets were Fixed R; stop mode was Structure.
- Strategy properties showed 0.01% commission, 2 ticks slippage, USD 10,000 initial capital, and 1x long/short leverage. The report toolbar showed default bar-detail settings. No explicit spread model was configured. The displayed default order size is not a substitute for verifying effective script-specified quantity.
- The Strategy Tester presented an upgrade prompt for full report data. No CSV or trade-level export was obtained.
- The Indicator Pine Logs panel showed only the script-opened message and no `PLAN_AUDIT` record. Strategy logs were not extracted. No new parity result is claimed.
- Bar Replay was opened and the chart was navigated to 2026-10-12 10:30 UTC, before the previously reviewed 10:55 UTC plan timestamp. TradingView ignored synthetic browser pointer events for selecting the start candle. After the user enabled Accessibility for Visual Studio Code, a real `System Events` chart click still failed with macOS error `-25211` (`osascript is not allowed assistive access`); keyboard input also did not select a bar. No start bar was selected and no candles were advanced, so Replay/reload behavior was not tested.
- After the user subsequently enabled Accessibility for Chrome, `osascript`, Terminal, and Visual Studio Code, the TradingView tab was located and activated again. A single follow-up `System Events` click still returned `-25211`; macOS did not deliver the click. No chart state changed, and no further click attempt was made.
- The chart was returned to FOREXCOM:XAUUSD M5, with the Indicator visible, Strategy hidden, Replay off, and the opened panels closed.

## Gate assessment

This adds a live-observed four-interval Strategy Tester matrix, but does not close the current-source reproducibility gate: source-hash attribution, exported trades, full settings manifest, and spread sensitivity remain missing. Multi-plan parity, Replay/reload, OOS, and profitability remain unverified or unestablished. Project version remains 0.8.0.
