# Backtesting and research protocol

Recorded historical smoke-test results are in [reports/TRADINGVIEW_RESULTS.md](reports/TRADINGVIEW_RESULTS.md). They are mostly negative and do not establish profitability. The strategy includes all eight independently selectable modules; only A is enabled by default. Pine has been compiled and exercised in TradingView on FOREX.com XAUUSD. A positive backtest would not establish future profitability.

## Simulation settings

Use `pine/strategy.pine` in Strategy Tester on standard candles. Defaults: $10,000 USD capital, 0.5% planned risk, 0.01% commission per execution and 2 ticks slippage. These are examples, not measured XAUUSD costs. Configure capital, currency, commission and slippage in Strategy Properties for your broker; approximate spread conservatively in costs and stress it. Keep recalculation on every tick/order fills and process-orders-on-close disabled for the baseline.

Risk-based size is simulated units = equity × risk% / account-currency planned stop risk, capped by a configurable notional/equity ceiling (default90%), using the feed's `syminfo.pointvalue`, currency conversion, and rounding down to `syminfo.mincontract`. No broker lot size is calculated. Verify feed contract metadata, currency conversion, margin and minimum unit increments before interpreting results. Unknown/invalid metadata skips the order. Account conversion can be unavailable on some feeds. Gaps and slippage can exceed planned risk.

All plans use shared entry/SL/TP calculations. Close-mode market entries execute at the next available tick, not the preceding close. Limit entries use FVG midpoint; stop entries use one tick beyond the rejection candle. Pending cancellations only occur on script calculation at close. The emulator may fill before the cancellation decision, including a fill-and-stop on the same bar. Indicator touch estimates intentionally differ in such cases. Strategy entry/exit notifications use emulator fill/exit records, rather than indicator touch guesses. Protective stop updates are reissued for surviving original fractions only.

Partial exits allocate approximately 33%, 33%, 34% of original units to TP1/2/3 with the initial protective SL. Quantities round down to the feed minimum unit, with all residual units assigned to TP3. Very small positions may skip early partials. Reissues use frozen original quantities, and already filled target orders are not recreated. Disable partials for a full TP3 exit. A 15-minute maximum hold is checked at chart close and submits a market close on the next tick: it is not an exact wall-clock guarantee. On M15, detection/exit granularity is much coarser than on M1. Bars around closures/gaps may extend holding periods. Optional break-even and ATR trailing stops default off. They tighten only after a confirmed close reaches the configured favorable R from actual simulated fill to initial SL; updated stops apply to subsequent bars. The initial SL never changes. Break-even does not cover fees or gap losses. Fixed targets remain anchored to the planned entry; compute realized R using the actual fill and costs rather than the plan projection.

Use Bar Magnifier where available to assess fill ambiguity. It does not authorize the analysis engine to infer M1 setups from M5 OHLC. Compare with a conservative run; do not pick the fill settings that produce the highest profits.

## Record results

Export the trade list and preserve symbol/feed, timeframe, data interval, script version/hash, all inputs, properties and costs. Record:

| Metric | Source / calculation |
|---|---|
| Trades, win rate, profit factor | Strategy Tester overview; record whether partial exits count as separate trades |
| Maximum drawdown | Strategy Tester, absolute and percent, with calculation mode |
| Average trade / expectancy | Net P&L divided by completed trades; also aggregate each position's partial exits |
| Expectancy in R | Per-position net P&L / initial account-currency planned risk, averaged |
| Holding time | Exit timestamp minus actual entry timestamp; aggregate partials by position |
| Performance by strategy | Enable modules individually, then combinations; bottom-right table aggregates completed positions by A–H (E includes supply and demand) |
| Session performance | Separate exported trades by entry-time local session, accounting for DST |

## Evaluation sequence

1. Verify the manual replay cases in TESTING.md before reading performance.
2. Freeze a rule set, cost assumptions and quality threshold. Specify development and untouched test dates **before** evaluation.
3. Use multiple feeds and representative trends, ranges, volatility shocks and quiet periods; record sample size and uncertainty. Avoid conclusions from a handful of trades.
4. Evaluate M1 and M5 separately; test M3/M15 as secondary configurations. Include Asian, London and New York windows in separate runs.
5. Compare a simple EMA pullback baseline and a no-skill directional baseline under identical sizing, exits, costs and periods. Baselines remain research tasks; no results are invented here.
6. Compare thresholds such as 65/75/85 and nearby pivot/ATR settings without automatically selecting the highest win rate. Save losing and no-trade runs too.
7. Evaluate untouched out-of-sample data. Walk forward using fixed-length development/test windows, recording all decisions and avoiding overlap leakage.
8. Stress commission, spread/slippage, entry delay, gaps and pending-order assumptions. Reject results driven by optimistic intrabar paths or parameters that work only in one slice.
9. Forward-test on demo. Reconcile each alert to chart time and each simulated fill to the trade list; assess notification losses separately from strategy quality.

Acceptance of profitability, performance robustness, and live suitability remains unverified until this work is completed.

## On-chart per-module summary

The bottom-right strategy table reports completed positions (partials grouped), win percentage, profit factor, average net P&L/expectancy, and average full-position holding minutes by A–H, plus account maximum drawdown and net P&L. Per-position net P&L is the change in the emulator's cumulative net profit at complete closure, including simulated transaction costs. Holding time runs from entry to final partial exit. Zero-loss PF is shown as a dash rather than a fabricated finite ratio. The table computes from emulator records; exported report snapshots provide observed smoke-test results.

The table is an aid to reconciliation, not a substitute for the exported trade list. Verify sums against Strategy Tester, especially when chart history is truncated or platform trade-history limits apply. Compare each isolated module, session, timeframe and quality threshold under the same costs before using combined arbitration. Baseline/walk-forward research remains unperformed.

## v0.3.0 research controls

The Research input group adds a disabled-by-default date window and a Both / BUY only / SELL only direction selector. A permitted confirmation bar must open at or after the start and close strictly before the end. Both are absolute timestamps; TradingView displays time inputs in its selected chart timezone. An enabled inverted/empty window raises an explicit runtime error. Existing indicator/strategy warm-up and confirmed higher-timeframe context use loaded history before the window; only new plans are gated. Pending plans are cancelled at a confirmed close outside the window. Existing filled trades keep their original exits and may close beyond the window, so reports are not mark-to-market at the end date. A broker-emulator fill can occur before a close-time cancellation; the date window is not an intrabar order firewall.

Use frozen calendar windows to compare rules and direction under identical loaded history and costs. The Oct 5–19 and Oct 19–31 checks in the upgrade report are exploratory splits of already inspected data, **not untouched out-of-sample evidence**. This release does not optimize settings or change the enabled defaults.

A cancellation now blocks replacement plans on that same confirmed bar. This prevents the cancelled plan's strategy ID from being replaced before the order adapter processes cancellation. Re-evaluation starts on a later bar, still subject to cooldown and normal setup rules. This fixes order handling; it is not a claim of improved returns.

## Forward evaluation after v0.6.0

Freeze source hash, inputs, broker feed, account currency and cost assumptions before collecting new data. History already reviewed while developing v0.2–v0.6 is development evidence, not untouched OOS. Keep new chronological evaluation periods separate; record all trades, rejected setups, session and holding time. Evaluate rolling windows without choosing parameters using their future results. Include actual broker cost assumptions and stress higher costs. Do not infer an edge from a single trade or a quality score. v0.6.0 has no new completed OOS or walk-forward performance result.
