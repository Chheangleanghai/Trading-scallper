# v0.8.0 source audit and M5 loss review

**Review date:** 2026-11-01  
**Status:** research review; v0.8.0 baseline is unchanged.

## Source identity and scope

The frozen local baseline still hashes to Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` and Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`. This review inspected the shared Pine engine, modules A–H, Strategy broker synchronization and order adapter, performance aggregation, webhook validation/delivery, and the supplied evidence. No baseline trading code or production webhook code was changed.

The pipeline is:

`confirmed chart/HTF data → shared context and pivots → module candidates → later confirmation → common risk/quality gates → deterministic direction arbitration → Indicator estimate or Strategy order → exit management → lifecycle/log/alert output`.

`pine/modules/predicates.pine.inc` contains shared signal and price predicates. `pine/modules/candidates.pine.inc` owns candidate setup/confirmation for B–H; A's sweep/MSS/FVG state remains in the shared engine. `pine/modules/broker_sync.pine.inc` uses emulator fills and closed-trade rows for the Strategy. `pine/modules/orders.pine.inc` calculates quantity and places exits. The visual and webhook layers do not create trade candidates.

## Module review

| Module | Reviewed sequence | Main static limitation |
| --- | --- | --- |
| A | Confirmed-pivot sweep/reclaim → later displaced MSS + FVG → later FVG retest close | Strict conjunction makes entries sparse; this is not evidence of a defect. |
| B | Sweep of the prior completed CRT candle → later close through the frozen sweep-candle trigger | Requires CRT timeframe at least as large as chart timeframe; guarded at startup. |
| C | A confirmed pivot must age by the configured amount before a false breakout/reclaim is used | This is a confirmed-pivot approximation, not the classic 20-day Turtle Soup setup. |
| D | Repeated confirmed S/R pivots → displaced breakout/retest or rejection | Touch count and tolerance define heuristic horizontal zones. |
| E | Opposite candle zone → displacement through a known confirmed swing → later zone retest | Tested bars are counted and bounded; demand and supply are separate candidates. |
| F | Confirmed chart structure + EMA trend → pullback into EMA band → later break trigger | Trend invalidation cancels the candidate. |
| G | Compressed prior range → sweep/reclaim → later displacement | It is explicitly a rolling-range AMD approximation. |
| H | Five alternating confirmed pivots + correctly ordered neckline break → later retest | It is explicitly a confirmed-pivot Quasimodo approximation. |

Candidates are independently maintained, expire or invalidate, and are arbitrated only after the shared qualification checks. Opposing eligible directions block a trade. The engine uses confirmed-bar state changes and prior completed HTF/reference values for its `lookahead_on` requests; pivots are confirmed and not plotted with negative offsets. This is a favorable static review, **not** a Bar Replay/reload or non-repainting pass.

## Confirmed findings

| Finding | Evidence and effect | Disposition |
| --- | --- | --- |
| The displayed 0–100 value is a heuristic, not a win probability. | `qualityScore()` is a weighted checklist of structure, liquidity, fixed points, H1 alignment, RR, volatility, and session. Module A assigns 20 structure and 20 liquidity points; maximum is 100. The dashboard already says “Setup score · not win %”. | Correctly label it **Heuristic Quality** in interpretation; do not calibrate a probability from this sample. |
| “Maximum entry distance from FVG” is a narrower name than the common filter's use. | The shared rejection check measures distance from each candidate zone midpoint (`(upper + lower) / 2`), including CRT, S/R, demand/supply, trend pullback, AMD, and QM candidates. | Low-severity UI wording mismatch; no Pine behavior changed. |
| The session cap counts qualified plans, not confirmed fills. | `sessionTrades` increments when a best plan is accepted, before Strategy quantity validation or broker fill. A rejected size or unfilled pending plan can therefore consume the cap while the input reads “Maximum entries per session.” | Semantics are confirmed. Keep frozen behavior; a future approved version should either rename it “Maximum plans per session” or count actual fills. |
| Partial percentages are constrained by the symbol's minimum contract. | `q1` and `q2` are each floored to `syminfo.mincontract`; `q3` receives the remainder. For a small initial quantity, TP1/TP2 quantities can be zero and the remainder can all be assigned to TP3. | Expected quantity-grid behavior, but the 33/33/34 label is not guaranteed for every feed/size. Experimental telemetry records the closed-row size; the next run should also retain symbol minimum-contract metadata. |
| The configured time exit is evaluated on strategy calculations and is not an exact wall-clock fill. | The strategy checks elapsed time at bar close and calls `strategy.close(... immediately=false)`. With the recorded closed-bar/one-tick delay settings, fill can occur at the next eligible emulator tick. | Expected emulator behavior; compare actual `exit_time` and exit comment. Do not call a later log prefix the actual exit time. |

No demonstrated faulty entry price arithmetic, inverted stop/target ladder, lookahead leak, duplicate direction arbitration, or invalid position-size calculation was found in the reviewed paths. Risk and exits remain feed-dependent and need actual symbol metadata and trade rows to verify a concrete order.

### Risk and Strategy properties

The Strategy passes explicit `qty=qty` to `strategy.entry()`. TradingView documents that `default_qty_type` / `default_qty_value` apply only when an entry/order call omits `qty`; therefore the reported 100%-of-equity default order size does **not** determine this script's entry quantity. The script calculates risk quantity and notional-exposure quantity, takes the smaller, then floors to `syminfo.mincontract`. Strategy margin, commission, slippage, and order-delay properties still affect emulator outcomes and must be recorded.

For the supplied plan, planned price risk is `4177.48 - 4170.88 = 6.60`. As an illustration only, if account conversion is 1:1, `syminfo.pointvalue = 1`, equity is $10,000, `riskPct = 0.5`, and `maxExposurePct = 90`, the risk cap gives about 7.576 units while the notional cap gives about 2.154 units. Before contract rounding and costs, the exposure cap would therefore bind and imply about $14.22 to the planned stop. If the minimum contract were 1, quantity would floor to 2 and planned stop loss would be $13.20 before costs. These are conditional calculations, **not** the captured trade's actual quantity, fill, loss, or explanation; its point value, minimum contract, and source identity are not established by the trade record.

## Investigation of the observed M5 loss

`reports/v050-final-smoke.jsonl` records a TradingView Strategy Report observation for `FOREXCOM:XAUUSD` M5, range **2026-10-05 through 2026-10-31**, captured 2026-10-30 UTC:

- 1 trade, 0 profitable, net **−$13.66**, maximum drawdown **$13.66**, profit factor **0**.
- Its recorded source hash is `2569d7f10aadf60144597d346aae3ebfa7ab9d7378363d0d9bc3e1ca33d94087`, which differs from the frozen Strategy hash above. It is an observed report result, but it is **not exact-current-source evidence**.
- The record includes a module input list but no trade-level export, no entry/exit row, and no effective Properties object. It does not supply actual entry/exit time, exit price/comment, filled size, per-fill commission, or per-row excursions.

The separate Oct 12 copied Pine Logs contain one A BUY plan: plan timestamp `1791802500000` (10:55 UTC), planned entry 4177.48, SL 4170.88, TP1 4184.08, TP2 4190.68, TP3 4197.28, quality 100. The Strategy log reports filled entry 4177.50 and later logs `TRADE_CLOSED`; that payload's `eventTimestamp` is an observation-bar close and supplies no actual exit price, exit reason, trade size, or realized P&L. These logs are copied user evidence without source-hash attribution. The date overlap and one-trade report do not prove that this plan is the reported −$13.66 trade.

The **100/100** score can still lose because it is a confluence checklist, not a calibrated success probability. The 0.01% commission and two-tick slippage settings contribute to net results, but the available records do not permit their actual contribution to this loss to be calculated. The reported default 100% sizing does not override the explicit quantity calculation. The −$13.66 is near the conditional stop-risk examples above, but it cannot be identified as a stop loss or attributed to sizing, commission, slippage, a time exit, or a signal defect without the trade row and current-source identity.

TradingView's Strategy Report Trades CSV can provide entry/exit time, price, size, return, favorable/adverse excursion, cumulative P&L, and duration; Pine's `strategy.closedtrades.*()` API additionally exposes exit ID/comment, per-row commission, run-up, and drawdown. The isolated experiment below logs those per-row fields and the full-position netprofit delta.

## Archived isolated-module Strategy Tester matrix

The workspace also contains five historical, 32-row per-module Strategy Tester matrices. Their recorded source hashes are `973d8774…b124e1`, `5002409a…aa037`, `3b51541f…b54b2e`, `2030f6c8…18dfd4a9`, and `05f2f447…45fb94`; none equals current Strategy hash `42b4e168…1ea3f5c0`. They are historical hash-specific observations, not current-source results. The rows preserve captured Strategy Report text and module toggles, but not a complete effective inputs/Properties manifest or downloadable Trades CSV, so they are not reproducible release evidence.

For the latest archived matrix, `reports/tradingview-matrix.jsonl` (file SHA-256 `c485b5b2ba552befa7ee6764271e8dfa71b81eef71ea19c31374eeb1eb6013ed`, all 32 rows record Strategy source hash `5002409ac85bcb40ad15e260f8caa0cf019890eea36ddeab81ca6d4ff32aa037`), the isolated module runs show:

| Timeframe | Archived date window | Trades / winners summed across the separate module runs | Modules net positive | Notes |
| --- | --- | ---: | ---: | --- |
| M1 | Oct 26–30, 2026 | 188 / 46 | 2 of 8 | Five calendar days; not an OOS sample. |
| M3 | Oct 12–30, 2026 | 206 / 51 | 0 of 8 | No module run ended net positive. |
| M5 | Oct 5–30, 2026 | 182 / 62 | 1 of 8 | Module C was +$1.47 on 52 trades (PF 1.015); module A was −$13.66 on one trade. |
| M15 | Aug 3–Oct 30, 2026 | 141 / 60 | 2 of 8 | Module E was +$36.46 on 7 trades (PF 6.554); H was +$0.97 on 4 trades (PF 1.126); G had no trades. |

Each total above combines eight **separate single-module runs**, not one strategy or portfolio. The date windows differ by timeframe, and the source hash differs from the current baseline. Small positive samples such as M15 E and H do not establish an edge. This archive supplies historical context and helps prioritize future capture; it cannot validate current-source performance, costs, parity, or profitability.

## Isolated exit-audit experiment

`pine/experiments/strategy_exit_audit.pine` is generated from the exact frozen Strategy hash by `scripts/generate_exit_audit_experiment.py`. Its distinct title identifies it in TradingView. The only source differences are that title plus log-only blocks in the Strategy closed-trade path and closed-position aggregation. The added logs are gated by the existing research-only `auditLog` input. They record each partial closed row's index, entry/exit identity, times, bars, prices, size, exit comment, P&L, commission, excursions, plan prices, initial size, and price-only R multiple; a group row records the full position's netprofit delta and symbol sizing metadata. The group context is pinned on the first closed row, so a later same-bar plan cannot overwrite the finished trade's identity.

The per-row `priceRMultiple` is a price-distance ratio relative to the planned initial stop; it excludes quantity and fees and is **not** labeled realized cash R. Group `netProfitDelta` is the Strategy's realized account-currency netprofit change for the position, not a sum inferred from planned prices. The candidate introduces no order-placement, cancellation, or alert calls. Its generated hash is `ea1b065fc6a987caaf61dfed7ede9622fc11d3d4e07c2c6c3405f34d4e920123`. It has not been natively compiled in TradingView, replay-tested, or backtested; independent parsing is not native verification.

After capture, analyze the untouched raw log file with `npm run audit:exits -- reports/native-v080/strategy-exits.log`. The analyzer groups partial rows by symbol, timeframe, plan timestamp, module/entry ID, and actual entry time; it reports row P&L and commission separately from the position-level net result. It flags missing and duplicate records and does not authenticate source identity or infer that row profit minus commission equals netprofit delta.

## Evidence needed to finish the loss diagnosis

Smallest useful user capture from the **same current-hash Strategy run**: Strategy Tester → **Trades** → download CSV with Date and time, Signal, Price, Size, Return, Favorable excursion, Adverse excursion, and Duration; plus the Properties/Data range view showing source identity, symbol tick/point/minimum-contract metadata, inputs, initial capital/currency, order size, leverage/margin, commission, slippage, and order delay. If using the experiment, also preserve raw `TRADE_EXIT_AUDIT` and `TRADE_GROUP_AUDIT` Pine Log lines. Keep existing evidence unchanged.

Until those records are available, the loss's exact trade identity and cause remain **UNRESOLVED**. Current-source multi-plan parity, Bar Replay/reload, reproducible current-source M1/M3/M5/M15 research, and OOS remain open. Keep the project release version at v0.8.0.

### Minimal manual capture for the isolated experiment

1. In TradingView create a separate, unsaved Strategy draft titled **XAUUSD SMART SCALPER PRO Backtest · Exit audit experiment**. Paste `pine/experiments/strategy_exit_audit.pine`, copy the complete editor buffer back to a new file, and require SHA-256 `ea1b065fc6a987caaf61dfed7ede9622fc11d3d4e07c2c6c3405f34d4e920123` before using its results.
2. Compile that draft and preserve the native success message. Use the same chart, M5 range, inputs, and Strategy Properties used for the comparison; enable the research `auditLog` input. Do not create an alert.
3. Save raw Pine Logs, the Strategy Tester Trades CSV, and the Properties view. Keep the baseline compile artifacts and baseline results separate from this experimental draft.
4. Run the exit-log analyzer on one raw export at a time; archive its JSON output with the untouched raw log and file hash.

## References

- [TradingView Pine Script strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/) — broker-emulator timing, default quantity versus explicit `qty`, Strategy Report trade exports, commissions/slippage, and `strategy.closedtrades.*()` fields.
- Frozen sources: `pine/indicator.pine`, `pine/strategy.pine`, `pine/engine.pine.inc`, and `pine/modules/`.
