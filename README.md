# XAUUSD SMART SCALPER PRO

Pine Script v6 market analysis and backtesting, with a lightweight Node22/TypeScript Vercel → Telegram relay. All trading calculations stay in Pine. No database, trade execution service, frontend or background polling process is required.

**v0.6.1 adds a backend entry-status validation guard; 89 local tests pass.** Production has not been redeployed. See [code review and remaining acceptance work](reports/V061_CODE_REVIEW.md).

**Pine v0.6.0 compiled and ran in native TradingView.** The updated strategy is installed on the saved FOREX.com XAUUSD M5 chart; main-scale coordinates, original trading settings, strategy properties and unrelated indicators were checked after reload. The v0.6.0 verification passed 86 tests; its native shared-predicate harness passed 107 assertions. See [current evidence and limits](reports/V060_VALIDATION.md).

Historical smoke tests cover eight isolated modules on M1/M3/M5/M15: 24 cases lost, seven gained and one had no trade. Displayed results match v0.5.0 across all 32 cases. These are case counts, not trade win rates or proof of profitability. The user confirmed receiving the single authorized manual relay TEST. A native TradingView-origin alert through the deployed chain, genuine OOS and demo forward evaluation remain outstanding. The backend was not redeployed this release.

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

Local backend tests and source-generation checks can run here. The current generated synthetic Pine harness contains **107 assertions** for shared strategy predicates, gates, score behavior and state labels; all 107 passed in native TradingView on 2026-10-31 (see [native assertion evidence](reports/v060-native-assertions.json)). The prior 82-assertion v0.5 harness is retained as historical evidence. Full adversarial state-machine replay across changed feeds/data remains additional research; the test report distinguishes observed checks from outstanding ones. Native Strategy Tester smoke tests cover eight isolated modules on M1/M3/M5/M15. The backend also validates 67 historical Pine-generated payloads covering all nine alert event types. Research baselines and out-of-sample/walk-forward evaluation have not been performed. Deployment and manual Telegram test delivery are user-reported; native live-signal delivery has not been independently observed.

Version 0.2.2 expands delivery verification to 75 automated tests, including all 67 native payloads through the full handler and actual loopback HTTP, failure handling and concurrency. See [TESTING.md](TESTING.md). Pine logic and the recorded historical results are unchanged.

Version 0.3.0 fixes same-bar pending-cancellation replacement, adds research date/direction controls, and expands the native harness to 58 assertions. See [the upgrade report](reports/V030_RESULTS.md). The earlier 48 runs belong to the previous Pine source; their hashes and results are retained separately.

Version 0.3.1 improves readability: larger high-contrast text, plain-language labels, adjustable sizes, fewer historical annotations and clear current-versus-previous plan information. See [readability release notes](reports/V031_READABILITY.md).

Version 0.4.0 adds the default Reference chart layout: directional CHoCH/BOS, named CRT/liquidity sweeps, confirmed SNR zones, OB/FVG candidates, swing steps and right-edge EMA21/55 tags. See [definitions and verification](reports/V040_REFERENCE_UI.md). These are presentation/context annotations, not additional trade confirmations.

Version 0.5.0 adds smaller/paler context labels, a light dashboard, an explicit new-signal gate, one closing structure event per confirmed pivot, and a time-qualified closing neckline break for Quasimodo. See [the pattern audit and 32-run results](reports/V050_AUDIT.md). The rules remain heuristic; profitable live performance is not established.

Version 0.5.1 fixes a detached chart price scale left by the earlier layout update. The script now shares the candle axis, verified after save/reload and native coordinate checks. Pine calculations are unchanged; 81 automated tests pass. See [scale repair evidence](reports/V051_SCALE_REPAIR.md).
