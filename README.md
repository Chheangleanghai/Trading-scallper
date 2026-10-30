# XAUUSD SMART SCALPER PRO

Pine Script v6 market analysis and backtesting, with a lightweight Node22/TypeScript Vercel → Telegram relay. All trading calculations stay in Pine. No database, trade execution service, frontend or background polling process is required.

**TradingView compilation and historical execution have now been checked on the FOREX.com XAUUSD chart.** The initial costed results are mostly negative; this is not a live-approved strategy. See [recorded test results](reports/TRADINGVIEW_RESULTS.md). Deployment, real Telegram delivery, out-of-sample research and demo forward testing remain outstanding.

## Included

- Eight independent strategy modules: A sweep/MSS/FVG (default), B CRT, C pivot Turtle Soup, D confirmed SNR, E supply/demand, F structural EMA pullback, G AMD approximation, H confirmed Quasimodo approximation. Additional modules default off.
- Confirmed pivots, HH/HL/LH/LL, BOS/CHoCH/MSS, equal levels, H1 trend and M15 structure; active-chart setup and execution without fabricated M1 reconstruction.
- Structured candidates, per-candidate safety checks, 0–100 heuristic quality, optional per-strategy thresholds, deterministic selection and rejection of opposing valid directions.
- Close/limit/breakout entries, structural/sweep/swing/ATR/OB stops, fixed/structure/hybrid targets, cooldown, session plan limits, unit-based simulated risk sizing with an explicit notional cap, tick-based minimum-R checks and time exits.
- Optional partial exits, break-even and ATR trailing; immutable initial stop plus separately reported managed stop.
- DST-aware Asian/London/New York/overlap sessions and manual news exclusions. Optional day/week/session levels, Fibonacci, premium/discount, OB/breaker and spring/upthrust context. Elliott Wave excluded.
- Priced BUY/SELL markers, SL/TP lines, latest-plan risk/reward boxes, FVG/OB zones, context overlays and compact dashboard. Strategy adds per-module completed-position statistics.
- Authenticated `/api/webhook`, strict payload validation, escaped Telegram HTML, awaited delivery, bounded request time and clear failure responses. Credentials only in backend environment variables.

Exact rules and limitations are in [STRATEGIES.md](STRATEGIES.md). These are operational price-action definitions, not proof of institutional behavior or winning probabilities.

## Local checks

Use Node22 and Python3 (Python is only for generating standalone Pine files):

```sh
npm ci
npm run typecheck
npm test
npm run pine:check
```

Edit `pine/engine.pine.inc` and `pine/modules/*.pine.inc`, then run `npm run pine:generate`. Generated `indicator.pine`, `strategy.pine`, and `validation.pine` are standalone TradingView scripts. No library publishing is needed. `pine:check` detects generated-source drift; it is not a Pine compiler.

## TradingView and Telegram

1. Follow [TRADINGVIEW_SETUP.md](TRADINGVIEW_SETUP.md) to manually compile the synthetic validation script, indicator and strategy, and check chart replay. Use standard M1/M5 candles; M3/M15 are secondary supported charts.
2. Start with only A enabled. Independently evaluate each optional module before combined runs. Shared safety settings still apply when a single module is enabled.
3. Follow [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) to configure the three Vercel secrets and test authenticated delivery. No Telegram token belongs in Pine or TradingView.
4. Follow [BACKTESTING.md](BACKTESTING.md) and [TESTING.md](TESTING.md) for realistic costs, fill assumptions, manual acceptance and out-of-sample research.

## Price and event semantics

Signal price is the confirmation close. Planned entry is close, zone midpoint or one tick beyond the confirmation candle. Filled entry is an indicator estimate or a Strategy Tester emulator fill, labeled with its execution model. Market strategy orders normally fill on the next bar; pending limit/stop plans are never labeled filled before a trigger/fill.

Events cover BUY/SELL, entry, three targets, SL, invalidation and closure. All notifications are evaluated at chart close. BUY/SELL use `alert.freq_once_per_bar_close`; multiple management events use `freq_all` inside the confirmed-close guard. Payloads retain initial plan prices and add current managed SL, simulated fill, status, target source, setup/confirmation/event timestamps and execution model. Event IDs include symbol/feed, chart TF, plan time, direction, strategy and event type.

The indicator uses conservative OHLC estimates; the strategy uses actual emulator records for fill notifications. Neither confirms real broker execution. Feed changes, data revisions, different history/settings, OHLC ambiguity, gaps, account conversion and platform limits remain material. No claim of durable deduplication, exactly-once delivery or reliable retries is made.

## Readiness

Local backend tests and source-generation checks can run here. The generated synthetic Pine harness contains 44 assertions for shared strategy predicates, risk ladders, scores and stop tightening; **the 44 assertions passed in TradingView on 2026-10-30**. Full adversarial state-machine replay across changed feeds/data remains additional research; the test report distinguishes observed checks from outstanding ones. Recorded Strategy Tester smoke tests are supplied in the results report. The backend also validates 67 historical Pine-generated payloads covering all nine alert event types. Research baselines, out-of-sample/walk-forward evaluation, Vercel deployment and real Telegram delivery have not been performed.

Version 0.2.2 expands delivery verification to 75 automated tests, including all 67 native payloads through the full handler and actual loopback HTTP, failure handling and concurrency. See [TESTING.md](TESTING.md). Pine logic and the recorded historical results are unchanged.
