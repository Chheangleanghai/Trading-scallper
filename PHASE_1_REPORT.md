# Phase 1 Audit Report — XAUUSD SMART SCALPER PRO v0.8.0

**Audit date:** 2026-10-31 (Asia/Phnom_Penh)  
**Scope:** Code and evidence audit only. No release version bump, push, deployment, trading-rule optimization, or live trade was performed.

## Executive summary

The current working tree identifies itself as v0.8.0. The generated indicator and strategy both use Pine Script v6 and derive their analysis/confirmation engine from the same shared source. Local automated checks pass. The repository contains explicit, conservative operational definitions for modules A–H.

This audit did **not** establish that all eight modules are correct on real market history, that indicator and strategy outputs match candle by candle, or that the system is profitable. Existing synthetic assertions exercise predicates and shared state rules, but do not constitute full historical OHLC lifecycle tests for every module. Native event fixtures are absent for C–H. A current-version matched historical parity run, Bar Replay repaint audit, out-of-sample evaluation, and walk-forward test remain outstanding.

No new trading-logic defect was confirmed during this Phase 1 source review, so no signal behavior was changed. The known alert-version metadata defect (payloads identifying v0.8.0 code as v0.6.0) is already corrected in the current source via `SCRIPT_VERSION`; a source regression test verifies the generated indicator and strategy payloads use the release version.

## Repository and version audit

- `package.json`, generated indicator, generated strategy, shared Pine engine, and alert payloads identify version `0.8.0`.
- `pine/indicator.pine` and `pine/strategy.pine` are generated from shared Pine modules. The generated-source check passes.
- Indicator and Strategy share candidate analysis/confirmation code. Their execution adapters intentionally differ: indicator-estimated fills versus TradingView strategy-emulator fills. Those differences mean source equality alone is not event parity.
- `pine/validation.pine` is a synthetic predicate/assertion harness, not a complete market simulator or Pine broker emulator.
- The repository was already dirty when this Phase 1 audit began. Existing v0.8.0 changes were preserved. This audit did not commit or push them.

## Module review and evidence

The table distinguishes code review from evidence of historical correctness. “Predicate checks” means synthetic assertions; it does not mean that a module passed real-market validation.

| Module | Operational rule reviewed | Synthetic predicate coverage | Native historical lifecycle evidence | Audit result |
|---|---|---:|---:|---|
| A — Sweep + MSS + FVG | Confirmed pivot sweep/reclaim, later displaced structure break with FVG, then a later retest | Present | Six legacy A events from v0.6.0; not current-version paired history | Logic is explicit; full lifecycle and current parity unverified |
| B — CRT | Previous completed reference candle sweep/reclaim, followed by a later break of the sweep candle | Present | 67 captured B_CRT indicator-estimate events; not paired against current strategy output | Evidence is indicator-only and does not prove strategy parity |
| C — Turtle Soup variant | Confirmed-pivot false breakout and later directional confirmation; explicitly not the original multi-day formulation | Present | None | Source and predicate reviewed; historical lifecycle unverified |
| D — Support/resistance | Repeated confirmed pivot level, displaced breakout/retest or rejection/failed breakout | Present | None | Source and predicate reviewed; historical lifecycle unverified |
| E — Supply/demand | Opposite candle zone, displaced confirmed swing break, then later zone test/confirmation; demand and supply are separate candidates | Present | None | Source and predicate reviewed; historical lifecycle unverified |
| F — Trend pullback | Structure direction and EMA alignment, pullback, then later trigger confirmation | Present | None | Source and predicate reviewed; historical lifecycle unverified |
| G — AMD/PO3 approximation | Compressed prior range, boundary sweep/reclaim, then later displaced continuation | Present | None | Source and predicate reviewed; heuristic only; historical lifecycle unverified |
| H — Quasimodo/RTM-inspired approximation | Five confirmed alternating pivots, recorded closing neckline break, then later retest | Present | None | Source and predicate reviewed; narrow approximation; historical lifecycle unverified |

The 107 synthetic Pine assertion calls recorded by the project cover the A–H predicate families and common safety/state rules. They do not prove all lifecycle transitions, invalidation/expiry combinations, broker fills, or alert timing for each module.

## Repainting and future-data review

Source review found these safeguards in the current Pine implementation:

- Candidate mutation and signal selection run under confirmed-bar processing.
- Swing pivots become available on their confirmation bars and are not used before confirmation.
- Higher-timeframe H1/M15 context requests use prior completed source-bar values with `lookahead_on` to avoid consuming an incomplete higher-timeframe candle.
- CRT references use the prior completed reference candle; daily/weekly context uses prior completed periods.
- Entry markers/plans are created when the relevant setup/confirmation becomes known; the code does not intentionally backdate entries to pivot bars.

These are source-level observations, not a completed repaint audit. Realtime/reload comparison and TradingView Bar Replay tests have not been recorded for v0.8.0. Feed revisions, historical data changes, broker-emulator intrabar assumptions, and indicator-versus-strategy fill modeling still require practical verification.

## Bugs and fixes

### Confirmed and corrected in the current v0.8.0 source

- **Stale alert script version:** The alert JSON had previously identified the script as v0.6.0 after project upgrades. The current shared source uses the v0.8.0 `SCRIPT_VERSION` constant, and a regression test checks version consistency. This correction changes metadata only, not trading behavior.

### New confirmed trading-logic defects

- **None confirmed in this Phase 1 review.** No rule change was made. This is not a claim that the strategy is bug-free; several behaviors need native historical tests before they can be accepted.

## Automated verification performed

Command run from the project root:

```text
npm run verify && npm audit
```

Results:

- TypeScript typecheck: passed.
- Vitest: **96 tests passed across 8 files**.
- Generated Pine source consistency: passed.
- Independent Pine parser: indicator, strategy, and validation files parsed.
- `npm audit`: **0 vulnerabilities**.
- `git diff --check`: passed.

The independent Pine parser is not TradingView’s compiler. Passing Node/backend tests does not validate TradingView execution or market profitability.

## TradingView compilation evidence (at Phase 1 completion)

The existing v0.8.0 verification record reports that the exact generated indicator and strategy compiled in TradingView. At Phase 1 completion, their SHA-256 hashes matched that record:

- Indicator: `270bfb2954da4ef3cc9f2e5429f45646635ea96811a540aed708991da3d11828`
- Strategy: `0eb73deec4a14d1a0dcac0de406b140ad0b2e7a70468296cc3b0cfd5fc5d320c`

Compilation at Phase 1 completion is supported by the recorded native compile evidence. I could not open or operate the user’s TradingView chart in that session to repeat compilation or inspect its current live chart state. The existing v0.8.0 report states the strategy could not be added beside the indicator because of the TradingView Basic study limit, the script could not be cloud-saved under that account limit, and the chart’s installed strategy remained v0.6.0. Current chart parity and persistence were not verified.

The subsequent Phase 2 working-tree predicate refactor changed these hashes. The TradingView compile evidence above does **not** apply to the modified hashes now in the worktree; native compilation must be repeated before treating those files as chart-ready.

## Missing historical verification

- No complete current-version native OHLC lifecycle fixtures for A–H.
- No current-version paired indicator/strategy `PLAN_AUDIT` logs or candle-by-candle Entry/SL/TP comparison.
- No current-version M1/M3/M5/M15 cost-aware backtest matrix established by this audit.
- No Bar Replay/reload repaint comparison.
- No out-of-sample period or walk-forward evaluation.
- No new TradingView → Vercel → Telegram end-to-end delivery test in this phase.
- No performance claim or win-rate conclusion is supported by these results.

The existing comparator in `scripts/compare-plan-audit.mjs` is a testable way to compare exported plan logs, but its unit and CLI smoke tests use synthetic rows. It has not been run against matched current-version market logs.

## Remaining work for Phase 2

1. Build deterministic native OHLC lifecycle fixtures for valid and invalid setups for C, D, E-demand, E-supply, F, G, and H; retain A/B regression fixtures.
2. Capture current v0.8.0 indicator and strategy audit logs using the same broker feed, symbol, timeframe, date window, and inputs. Compare signal candle, direction, module, entry mode, Entry, SL, and TP1–TP3; classify emulator-fill differences separately.
3. Verify no historical alert replay is sent as a new live Telegram event, and test duplicate/retry behavior within the documented stateless backend limitations.
4. Perform TradingView Bar Replay and reload comparisons on representative dates, including pivot confirmation, HTF boundaries, DST/session boundaries, pending limit/breakout orders, stop/target same-bar ambiguity, and gaps.
5. Run cost-aware M1/M3/M5/M15 evaluation with the actual feed assumptions, commission, spread/slippage assumptions, sample boundaries, and strategy enablement recorded. Keep development and untouched evaluation periods separate.
6. Run out-of-sample and, where data permit, walk-forward evaluation. Report trade counts, costs, drawdown, expectancy, and uncertainty without treating the heuristic quality score as win probability.
7. Recompile and add the same current script versions to the user’s chart, then save/reload and inspect scale membership and visible prices when TradingView account limits permit.
8. Revisit only defects demonstrated by these fixtures or logs. Do not lower filters or optimize for a target win rate merely to increase signal count.

## Phase 1 disposition

Phase 1 code review and local automated verification are complete. Important market-validation and chart acceptance items remain explicitly unverified. No push, deployment, release, or live trade was performed. **Stop here pending approval before Phase 2.**
