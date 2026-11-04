# v0.9.0 module audit — v0.8.0 baseline

**Reviewed:** 2026-11-03  
**Disposition:** static and synthetic review only; no baseline trading rules changed.

## Source identity and review method

The frozen baseline hashes remain Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` and Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`. All eight modules share confirmed-bar candidate handling, expiry/invalidation, common per-candidate risk checks, and deterministic arbitration. The implementation is in [`pine/modules/update.pine.inc`](../pine/modules/update.pine.inc), [`pine/modules/predicates.pine.inc`](../pine/modules/predicates.pine.inc), and [`pine/engine.pine.inc`](../pine/engine.pine.inc).

The generated Pine validation harness contains 206 synthetic assertions. It exercises both-direction predicates, positive and negative setup fixtures, later-bar confirmation, and candidate invalidation/expiry. These local fixtures are useful regression checks; they do not exercise a complete TradingView chart, broker emulator, replay/reload, or live feed.

## Module findings

| Module | Production sequence | Existing focused coverage | Scope / limitation |
| --- | --- | --- | --- |
| A — Sweep + MSS + FVG | One unused confirmed swing is swept/reclaimed; on a later bar, a displaced directional MSS and FVG must coincide; a still later FVG retest close qualifies. | Bull/bear sweep, MSS/FVG and displacement predicates; same-bar rejection; later retest lifecycle; invalid setup fixtures. | Strict three-stage conjunction can be sparse. Confirmed-pivot reversal approximation; not a defect by itself. |
| B — CRT | Sweep/reclaim of the previous completed CRT candle; freeze its range and sweep-candle trigger; a later directional close through the trigger confirms. | Bull/bear range-sweep/reclaim, reference reuse, later break, same-bar and opposite-direction rejection. | Uses the configured completed reference candle; CRT timeframe is guarded against being lower than chart timeframe. |
| C — Turtle Soup | A confirmed pivot must age by the configured bars; a wick crosses it and close reclaims; a later directional close through the sweep candle confirms. | Pivot-age and false-break predicates, one-use pivot, later confirmation, negative boundary fixture. | An intraday confirmed-pivot false-break variant, not the classic multi-day Turtle Soup definition. |
| D — Support/resistance | Repeated confirmed pivots form a tolerance band; either displaced break then later retest, or rejection then later directional trigger. | Two-touch and displacement requirements, rejection touches, later confirmation, one-touch rejection fixture. | Levels depend on configured ATR tolerance and pivot clustering; this is heuristic horizontal S/R. |
| E — Supply/demand | Full range of the preceding opposite candle is a zone only after displacement closes through a previously known confirmed swing; later zone retest qualifies. | Bull/bear departure, displacement and opposite-candle requirements, retest sequence and tested-bar cap. | Zone definition and test counting are explicit approximations. A wick through the far edge invalidates conservatively. |
| F — Structural pullback | Confirmed chart structure plus EMA9/21 (optionally EMA50) trend; pullback into the band; a later close breaks the pullback candle trigger. | Bull/bear pullback, overshoot rejection, structure prerequisite, trend persistence, later trigger. | Trend invalidation cancels a setup. EMA crossover alone does not qualify. |
| G — AMD range approximation | Prior bars define a compressed range; current sweep/reclaim freezes it; later displaced close beyond the opposite boundary confirms. | Range width, zero width, sweep/reclaim, cooldown boundary, later displacement and bad-range rejection. | Rolling range is not proof of accumulation/manipulation/distribution by any participant. |
| H — Quasimodo approximation | Five alternating confirmed pivots must satisfy the directional geometry and neckline-break timing; a later retest close qualifies. | Bull/bear pattern geometry, missing-head rejection, neckline timing, later retest and invalid geometry fixture. | Bounded confirmed-pivot approximation; not a comprehensive discretionary RTM definition. |

All candidates are independently maintained. Invalidated or expired candidates cannot confirm; an accepted plan resets competing candidates. Candidates are qualified individually before arbitration. Opposing qualified directions reject the bar; otherwise the highest score wins, with candidate-array order resolving ties. See `pine/engine.pine.inc` around the candidate qualification/arbitration block and `pine/modules/candidate_state.pine.inc` for lifecycle methods.

## Confirmed semantics to carry into product review

- The `Maximum entries per session` counter increments when a plan is selected, before order-size acceptance or fill (`pine/engine.pine.inc`, `sessionTrades += 1`). It therefore caps accepted plans, not necessarily actual filled entries. Preserve baseline behavior; a later version can rename the input or deliberately change semantics with separate validation.
- The `Maximum entry distance from FVG` label describes a shared candidate-zone midpoint distance check for all modules, not only FVG (`pine/engine.pine.inc`, `anchor` and `distanceOK`). This is a labeling mismatch, not evidence of faulty order logic.
- Partial TP1/TP2 sizes are rounded down to `syminfo.mincontract`; TP3 receives the remainder (`pine/modules/orders.pine.inc`). The displayed 33/33/34 split is therefore approximate and can collapse into fewer partials for small unit sizes.
- `quality` is a heuristic checklist score, not a probability of winning. Existing UI labels already state that it is not a win rate.
- Strategy time exit is checked on confirmed strategy calculation and submits `strategy.close(... immediately=false)`. Broker-emulator fill timing is distinct from the Indicator's OHLC estimate. One captured isolated experiment confirms a `TRADE_CLOSED` exit for that run only; it does not establish general baseline execution parity.

## Repaint-risk review and release gate

Static inspection found prior completed higher-timeframe/reference values for `lookahead_on`, confirmed-bar updates for trading state, and confirmed pivots without negative plot offsets. No future-data defect was established by this review. Static checks and synthetic fixtures cannot prove no repainting on TradingView. The current paired M5 logs contain one common A plan, so parity remains `SINGLE_PLAN_MATCH`; multi-plan parity and Bar Replay/reload remain **NOT VERIFIED**. Strategy Tester CSV exports, reproducible cross-timeframe/cost results, and out-of-sample evidence remain open. Keep v0.8.0.
