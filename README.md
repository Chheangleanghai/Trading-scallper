# XAUUSD SMART SCALPER PRO

Pine Script v6 market analysis and backtesting, with a lightweight Node22/TypeScript Vercel → Telegram relay. All trading calculations stay in Pine. No database, trade execution service, frontend or background polling process is required.

**v0.8.0 adds plan-audit parity tooling and corrects the script version in alert payloads.** The parity utility compares confirmed plan records captured from the indicator and strategy on the same symbol/timeframe/history. A real matched A–H historical comparison has not yet been collected. See [v0.8.0 validation](reports/V080_VALIDATION.md).

**Historical evidence only:** Pine v0.6.0 compiled and ran in native TradingView, and its saved FOREX.com XAUUSD M5 chart was checked after reload. That does not certify the current v0.8.0 source. The current local source passes 99 automated tests and 206 synthetic assertions; the latter are not a TradingView compile or market replay. See [current verification status](reports/PHASE_2_PROGRESS.md) and [v0.8.0 validation](reports/V080_VALIDATION.md).

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

## Historical chart view

In **Settings → Inputs → Historical view**, `Historical plan drawings` offers `Off`, `Recent plans` or `Full bounded`. Accepted plans draw Entry, initial SL and TP1–TP3 levels starting on the confirmation bar. `Recent plans` keeps up to the configured plan count; `Full bounded` also limits eligible bars by `Full history lookback bars`. The drawing cap is ten plans. End labels show the last confirmed plan status; indicator OHLC outcomes are estimates, and strategy fills come from the TradingView emulator. This view draws qualified trade plans only; setup/context labels remain controlled separately by `Context annotation history`. Historical drawings do not generate alerts or backdated entries.

## Clear Entry / SL / TP display

The newer [confirmation-review Indicator](pine/experiments/indicator_confirmation_review.pine) and [Strategy](pine/experiments/strategy_confirmation_review.pine) add smaller text, an A–H confirmation board, setup guides and explicit time/stop closure labels. Both compiled natively. Fresh logs reconcile all75 completed emulator positions, net **−$77.19**; one historical Indicator plan changes prices after reload, so reload stability and general parity remain unverified. The pictured Nov5 BUY actually time-exited at14:00UTC for **+$6.75** in the emulator before the later fall through SL. See [actual verification and remaining limits](reports/native-v080/confirmation-review-2026-11-05/README.md). Baselines and trading rules remain unchanged; Telegram is not active on the Free account.

The new isolated [A–H Indicator candidate](pine/experiments/indicator_professional.pine) and [Strategy candidate](pine/experiments/strategy_professional.pine) enable A–H by default, remove standalone BUY/SELL badges, and show priced Entry/SL/TP1–TP3 plans with the existing context overlays. D is displayed as **K-SNR**, preserving its current confirmed support/resistance rules. Both candidates compiled natively; 178 local tests passed, and 74 Indicator plans were unchanged after reload. The fresh paired streams still mismatch and the complete-position Strategy sample is negative. The Free account blocked webhook activation. See [actual capture results and limitations](reports/native-v080/professional-candidate-2026-11-05/README.md). Baseline Pine files remain unchanged at v0.8.0.

The separate [clear-levels Indicator](pine/experiments/indicator_clear_levels.pine) adds bounded recent Entry/SL/TP1–TP3 plans, spaced price callouts and a compact dark status/price card. It preserves the frozen Indicator's trading rules. The preceding display revision matched 69 native plans at tolerance zero; the latest layout has local checks and an initial native compile, with final visual/session testing pending reliable chart focus. See [current reference-style UI work](reports/native-v080/reference-ui-2026-11-05/README.md) and [preserved preceding native evidence](reports/native-v080/clear-levels-2026-11-05/README.md).

## Offline plan/outcome research

For one genuine Strategy Pine Logs capture containing `PLAN_AUDIT`, `TRADE_EXIT_AUDIT` and `TRADE_GROUP_AUDIT` records:

```sh
node scripts/analyze-plan-outcomes.mjs one-run-pine-logs.txt > outcomes.json
```

The tool joins plans to complete positions, reconciles partial quantities and net results, and reports costs, planned-risk R, module/score summaries and missing outcomes separately. It rejects inconsistent or duplicated capture data. Keep runs separate; the tool does not authenticate source/settings or establish probability calibration, Replay stability or profitability. See the [genuine score and reload research](reports/native-v080/score-outcomes-2026-11-05/README.md).

## Readiness

The current generated Pine validation harness contains **206 synthetic assertions** over predicates, module setup gates and shared candidate state methods. The latest local verification passed **174 automated tests across 18 files**, TypeScript, generation checks and independent Pine parsing. Baseline native compile gates are accepted with their recorded evidence limits. Separate quantity/trace experiments have genuine native execution evidence, and the saved M15 exit-audit experiment produced identical logs across one reload. Strict multi-plan parity still fails; candle-by-candle non-repainting, untouched OOS and profitability remain unverified. See the [authoritative release assessment](reports/V090_RELEASE_READINESS.md). The backend has historical payload fixtures for nine event types, but a current native TradingView alert reaching Telegram has not been independently verified.

Version 0.2.2 expands delivery verification to 75 automated tests, including all 67 native payloads through the full handler and actual loopback HTTP, failure handling and concurrency. See [TESTING.md](TESTING.md). Pine logic and the recorded historical results are unchanged.

Version 0.3.0 fixes same-bar pending-cancellation replacement, adds research date/direction controls, and expands the native harness to 58 assertions. See [the upgrade report](reports/V030_RESULTS.md). The earlier 48 runs belong to the previous Pine source; their hashes and results are retained separately.

Version 0.3.1 improves readability: larger high-contrast text, plain-language labels, adjustable sizes, fewer historical annotations and clear current-versus-previous plan information. See [readability release notes](reports/V031_READABILITY.md).

Version 0.4.0 adds the default Reference chart layout: directional CHoCH/BOS, named CRT/liquidity sweeps, confirmed SNR zones, OB/FVG candidates, swing steps and right-edge EMA21/55 tags. See [definitions and verification](reports/V040_REFERENCE_UI.md). These are presentation/context annotations, not additional trade confirmations.

Version 0.5.0 adds smaller/paler context labels, a light dashboard, an explicit new-signal gate, one closing structure event per confirmed pivot, and a time-qualified closing neckline break for Quasimodo. See [the pattern audit and 32-run results](reports/V050_AUDIT.md). The rules remain heuristic; profitable live performance is not established.

Version 0.5.1 fixes a detached chart price scale left by the earlier layout update. The script now shares the candle axis, verified after save/reload and native coordinate checks. Pine calculations are unchanged; 81 automated tests pass. See [scale repair evidence](reports/V051_SCALE_REPAIR.md).
