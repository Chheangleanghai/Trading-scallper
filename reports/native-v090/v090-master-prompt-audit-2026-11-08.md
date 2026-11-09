# v0.9.0 master prompt review and current gate status — 2026-11-08

## Decision

The supplied master prompt is a sound research brief. Its strongest requirements are to preserve v0.8.0, separate faster setup visibility from confirmed entries, account by complete position, keep indicator estimates distinct from emulator fills, verify Pine compilation natively, and separate local engineering from performance and live-readiness gates.

It is too broad to implement safely as one undifferentiated upgrade. The project should proceed in gated experiments: (1) source identity and native compilation, (2) same-rule diagnostics and native execution capture, (3) isolated rule hypotheses, and only then (4) untouched out-of-sample comparison. Do not alter entry, stop, target, sizing, session, or time-exit rules until a specific defect or experiment is supported by evidence.

**Current decision: v0.9.0 is NOT RELEASED.** Local engineering checks pass for the current diagnostic experiment. A bounded native Strategy run did execute on TradingView, but explicit compiler/token evidence, exact editor copy-back, Indicator/Strategy parity, Replay/reload, full historical position export, and performance validation remain unverified.

Subsequent local hardening and the verified research-package workflow are recorded in [local-hardening-2026-11-08.md](local-hardening-2026-11-08.md). That continuation passes 238 tests across 27 files and fixes confirmed evidence-intake, target-counting, legacy-message attribution, and credential-scan gaps. The original test counts below describe the earlier inspection; native/performance gates remain open.

## Source identity and scope

The frozen v0.8.0 sources remain unchanged at these SHA-256 values:

| Source | SHA-256 |
| --- | --- |
| `pine/indicator.pine` | `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` |
| `pine/strategy.pine` | `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` |

Current experimental source hashes:

| Source | SHA-256 | Parent relationship |
| --- | --- | --- |
| `pine/experiments/strategy_signal_diagnostics.pine` | `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d` | Embedded parent SHA matches `strategy_signal_clarity.pine` |
| `pine/experiments/indicator_signal_diagnostics.pine` | `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852` | Generated from the corresponding clarity experiment |
| `pine/experiments/strategy_signal_clarity.pine` | `8461833b9f466380dd03d877e94215165544dfee038e407e6d130c840abac479` | Diagnostic Strategy parent |

These are research experiments, not a versioned v0.9.0 release package. The compact Strategy generator removes Strategy-only presentation blocks. A regression test compares decision, sizing, order, and exit sections with the parent after diagnostic hooks are removed. This source-size reduction does **not** prove that the compiled Pine token ceiling is met.

## A–H code audit at the current-source level

The definitions below describe the implementation in `STRATEGIES.md` and the separate A–H research engine. They are operational heuristics, not standardized market definitions or evidence of predictive power. The frozen v0.8.0 source defaults to A only; the research candidates may have separate A–H settings.

| Module | Implemented setup/confirmation summary | Current evidence limit |
| --- | --- | --- |
| A — Sweep/MSS/FVG | Previously confirmed pivot sweep/reclaim; later displaced MSS close with FVG; still later FVG retest and directional close. | Strict, multi-stage setup; zero selected plans in the archived combined sample does not mean zero detections. |
| B — CRT | Sweep/reclaim of the prior completed reference candle; later directional close beyond the sweep candle. | 46 selected positions in the archived combined run; results are cost-sensitive and not an isolated B-only experiment. |
| C — Pivot false breakout | Sweep/reclaim of an aged confirmed pivot; later close beyond the sweep candle's opposite end. | This is an intraday confirmed-pivot variant, not classic multi-day Turtle Soup. Nine archived selected positions are too few for robust claims. |
| D — K-SNR | Repeated confirmed pivot level followed by displaced breakout/retest or rejection/failed-break confirmation. | Three archived positions only. “K-SNR” is the display name; internal ID remains `D_SNR`. |
| E — Supply/demand | Prior opposite candle zone plus displacement through known swing; later zone test and directional close; far-edge breach invalidates. | Five archived positions under shared arbitration; not a controlled E-only evaluation. |
| F — Trend pullback | Structural direction and EMA ordering; pullback to EMA band; later close through frozen pullback extreme while trend remains valid. | Twelve archived positions; weak historical result is hypothesis-generating only. |
| G — AMD approximation | Compressed prior range and sweep/reclaim; later displaced close beyond the opposite frozen range edge. | Zero selected positions in the archived combined run; not proof of no setups or module failure. |
| H — Quasimodo approximation | Five alternating confirmed pivots, correctly ordered closing neckline break, then later first-shoulder retest. | Two archived positions; too small to judge performance. |

All ready candidates face common configurable checks (date window, side, invalidation, target availability, optional location filters, volatility, pause, session, H1/EMA alignment, stop distance, entry distance, TP2 RR, ordered prices, quota, cooldown, and heuristic quality). Multiple concepts can watch independently; they need not agree. Only one plan is selected per script instance; opposing qualified directions cancel that bar's selection. A score is not a win probability. M1/M3/M5/M15 charts calculate independently and may legitimately show different sides.

## What has been implemented and locally verified

- Capture-scoped diagnostic event IDs include capture, symbol, timeframe, source hash, run tag, and sequence. Analyzer checks IDs and rejects mixed capture/source/model contexts.
- Capture analysis distinguishes internal event-budget completion from structural log continuity and explicitly leaves TradingView export authenticity unauthenticated.
- Candidate, check, selection, plan, order, fill, exit-row, and complete-position events can be correlated; quantity and gross/commission/net arithmetic are checked without deducting commission twice.
- First blocker must match the first failed check; the engine's rejection reason is checked against the same check ordering.
- Indicator-only diagnostic results no longer report simulated fills or realized costs as zeros; unavailable execution fields remain null.
- The compact Strategy experiment preserves its parent trading-decision/order blocks under the regression comparison and removes large Strategy presentation sections.
- A prior archived paired run reports 77 completed positions / 113 exit rows: gross price P&L +$51.898, commission $134.1201774, net −$82.2221774, 33 wins / 44 losses, PF 0.77345. It ends Nov. 6 and is not a current v0.9 test or evidence of out-of-sample performance.

These points are local code, test, or archived-artifact findings. They do not establish current TradingView compilation, parity, non-repainting, or profitability.

## Verification results

| Check | Result | Scope |
| --- | --- | --- |
| `npm run verify` | PASS — typecheck, 26 test files / 223 tests, generated Pine consistency, independent parser on 31 Pine files | Local only; parser is not TradingView compiler validation. |
| `npx vitest run tests/signal-diagnostics.test.mjs` | PASS — 20/20 focused tests | Synthetic lifecycle/accounting fixtures plus source invariants; not native fills. |
| `python3 scripts/generate_signal_diagnostics.py --check` | PASS | Generated sources match generator output and parent SHA expectations. |
| `npm audit --omit=dev` | PASS — 0 reported vulnerabilities | Dependency audit. |
| `npm ls --omit=dev --depth=0` | PASS — empty production dependency tree | This package currently declares no production dependencies. |
| `git diff --check` | PASS | Whitespace/conflict-marker check. |
| Native Strategy run | PARTIAL PASS | TradingView produced a bounded 447-event M5 Strategy capture and two broker-emulator closed-position rows. This proves the attached script compiled and executed far enough to run; no compiler-pane image or compiled-token count was retained. |
| Exact editor source copy-back | NOT VERIFIED | The capture parent SHA matches the local clarity parent; the experimental source hash was not embedded in events or verified by copy-back. |
| Paired Indicator/Strategy parity | NOT TESTED | The Indicator log pane had no events; no matched native plan streams were captured. |
| Replay/reload and non-repainting | NOT TESTED | No controlled before/after replay or reload capture was preserved. |
| Full historical trade export | NOT AVAILABLE | The bounded capture has two complete positions; it is not the 115-row historical trade export. |

## Important gaps and improvements to the master prompt

1. **Treat the old token-limit result as a blocker, not a locally solvable metric.** The previous 102,238-token Strategy exceeded TradingView's reported 100,256 limit. The current compact draft needs native compilation; local character count and parser success are not substitutes.
2. **Do not equate the November 7 screenshot with the archived 77-position run.** The genuine Strategy Tester List of Trades CSV for rows 1–115 has not been found locally. Obtain that exact CSV and analyze it separately before updating those statistics.
3. **Define experiment boundaries before tuning.** A time-exit change changes slot occupancy and therefore later selected plans. Compare full independent chronological runs with identical feed/history/settings, not a re-scoring of the original fills.
4. **Keep outcome labels evidence-based.** `TRADE_CLOSED` alone is not a time exit; use actual exit ID/comment and captured settings/source. Never infer stop path or spread from an OHLC-only plan estimate.
5. **Avoid a single giant implementation.** The 25 audit questions per module are a checklist, not 25 mandatory filters. First establish source/settings identity and native compile, then test one falsifiable defect hypothesis at a time.
6. **Keep alerts outside this release gate.** Current production alert behavior must remain unchanged; local webhook tests do not prove TradingView alert delivery or Telegram delivery. No live alerts/messages should be created during this research task.

## Native test state and required action

The saved native Strategy capture is documented in `tradingview-diagnostics-review-2026-11-08.md`: 447 sequential events across 36 M5 bars, two B_CRT positions, both exiting 15 minutes after fill with `TRADE_CLOSED` comments and `Close entry(s) order B_CRT` IDs. The captured Strategy input dialog showed a 15-minute maximum holding time. Their combined result was gross −$10.308, commission $3.4879192, net −$13.7959192; this is two observations, not a profitability conclusion.

The chart was subsequently cleaned up in the authorized restore step: the temporary diagnostics Indicator and Strategy were removed, `FOREXCOM:XAUUSD` M5 at UTC+7 remains open, the A–H confirmation-review study is visible, and Autosave is on. The exact earlier three-study layout is **not verified as restored**: only one saved `Unnamed` layout was available, and the baseline Indicator plus exit-audit Strategy were not present in the observed chart state. Do not claim a complete original study-set restoration.

In a later continuation, Chrome control was available and confirmed the same signed-in `FOREXCOM:XAUUSD` M5 chart. Autosave was temporarily switched off and restored on; no study was attached, removed, or saved. The attempt to open the local Pine source through a `file://` browser URL was explicitly denied by the browser security policy. No workaround was attempted, so there was no new current-source native compile, source copy-back, paired comparison, or Replay test. The chart was left on the same review study with Autosave on.

The next useful native gate requires the user to paste the local diagnostic Indicator into a temporary TradingView Pine Editor draft, compile it, and copy the editor text back for exact-source comparison. Then capture its genuine bounded event stream and run a paired comparison against the retained Strategy capture only if source, settings, history, and execution context can be matched. The present Strategy capture is not paired, so it does not establish parity.

## Release gates

- **Local engineering:** PASS for the checks listed above; working tree still includes pre-existing experimental changes and is not a tagged release.
- **Native TradingView research candidate:** BLOCKED pending explicit compiler/token evidence, exact-source copy-back, paired native Indicator evidence, full relevant Tester export, and controlled Replay/reload. A bounded Strategy capture is available and its scope is documented.
- **Performance validation:** INCONCLUSIVE; the archived sample is net negative and not out-of-sample evidence. No rule change is justified from it alone.
- **Live readiness:** NOT APPROVED / NOT TESTED. No deployment, real orders, live alerts, or Telegram messages were performed.
