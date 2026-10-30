# Validation

## Automated local checks

`npm run typecheck`, `npm test`, and `npm run pine:check` are the local checks. Tests mock Telegram requests; no external messages are sent. Coverage includes authentication, configuration, method/content type, malformed/oversized JSON, BUY/SELL price ordering, score/timestamp constraints, HTML escaping, reward/risk formatting, Telegram HTTP/API failures and success. Generated-source comparison prevents accidental drift between shared Pine source and standalone outputs; it is **not** a Pine compiler or a test of trading profitability.

`npm audit` checks dependency advisories. The lockfile is committed as part of the project; use `npm ci` for reproducible dependencies. No production npm dependency is needed. Runtime uses Node fetch and crypto.

## Recorded local verification

On 2026-10-30: TypeScript checking passed under Node v22.23.4; Vitest v5.0.5 passed 75 tests in 6 files; generated Pine source comparison passed; npm audit reported zero vulnerabilities. Telegram was simulated: delivery integration tests use actual fetch against a loopback HTTP server, while unit tests mock fetch. No real Telegram messages were sent. This establishes backend behavior within the covered cases, not deployed integration or trading correctness.

## TradingView acceptance checklist

| Case | Expected result |
|---|---|
| Compile both standalone scripts as v6 | No syntax/type errors; inspect all warnings |
| Pivot confirmation delay | No level/signal before right-hand confirmation; labels on knowledge bar |
| Sweep without reclaim | No setup |
| Opposite-side sweep on same bar | Rejected ambiguity |
| Sweep + later MSS but no FVG on MSS bar | No phase-2 setup |
| Sweep, later displacement/MSS/FVG, later rejection | Confirm only if all filters/quality and price checks pass |
| Reverse sequence with bearish bars | SELL SL above entry, strictly descending targets |
| New low/high through frozen sweep extreme | Setup invalidated before entry |
| Setup older than expiry | No stale confirmation |
| Limit/breakout plan not touched | Pending drawing, no BUY/SELL or ENTRY_TRIGGERED notification |
| Pending plan touched later | BUY/SELL + entry event on confirmed trigger bar |
| Pending expiry, pause, or session end | Cancellation/invalidation; no fabricated fill |
| Stop and target both touched after entry | Indicator reports stop first; compare emulator using Bar Magnifier |
| Stop/target touched on modeled fill bar | Indicator waits until later bar; emulator may fill and exit immediately |
| Cooldown / session cap | New plans blocked; a new local session resets the cap |
| DST boundary | Local session opens at chosen local time across UK/US clock changes |
| Manual news exclusion | No new plan in the chosen absolute-time window; active protective exits remain |
| Tick rounding / very small risk | Reject non-strict or invalid target ordering; no zero-risk signals |
| History reload / realtime replay | Same confirmed signal bars under unchanged feed/history/settings |
| H1/M15 boundary | Completed context changes only after source candle completion |
| M5 chart | No claim of M1 reconstruction; chart-level confirmations only |
| Gap through planned entry/stop | Inspect actual fill and excess risk; no broker execution implied by alert |
| Partial targets then time/stop exit | Position fractions sum to initial quantity; no over-exits |
| Broker fill closes while model differs | Strategy blocks overlaps using actual position state |
| Different broker symbol/tick metadata | Dynamic levels/rounding and validated simulated unit sizing |

## Deployment and Telegram acceptance (not executed here)

Deploy to a test Vercel project with real secrets, send an authenticated representative JSON event, inspect HTTP status, then check Telegram on the intended phone. Repeat with wrong secret, invalid prices, Telegram denial and timeout. Re-send an identical event to verify documented duplicate behavior. Validate all event types from TradingView alerts, not only a manual POST. Inspect message escaping with `<`, `>`, `&`, and quotes. Confirm no secrets appear in responses, source or app-level logs. Record deployed Node version and webhook latency, including cold starts.

Local unit tests do not establish Pine compilation, profitability, deployment or phone delivery. Native TradingView compilation, regression assertions and historical smoke runs are recorded separately in reports/TRADINGVIEW_RESULTS.md; real Telegram/Vercel acceptance remains outstanding.

## Expanded-module acceptance

Run `pine/validation.pine` in TradingView for 44 synthetic assertions over the same pure predicates used by the engine. Local generation checks verify matching sources. An independent development transpiler also runs the pure-predicate harness, explicitly rejecting unresolved runtime calls; a canary verifies that a deliberately failed assertion is detected. All 44 assertions additionally passed in native TradingView. This does not emulate the complete trading strategy locally. Then run each module alone with its input enabled (disable A when testing B–H):

| Module | Positive sequence to replay | Negative checks |
|---|---|---|
| A | Known pivot sweep, later MSS/FVG, later gap rejection | No FVG, same-bar entry, gap close invalidation |
| B | Completed CRT range sweep/reclaim, later directional break of sweep candle | Incomplete reference, no reclaim, no later confirmation, lower reference TF rejected |
| C | Aged confirmed pivot false breakout, later reversal confirmation | Pivot too young, sweep not reclaimed, same pivot reused |
| D | Two confirmed pivots at one level, displaced break, later retest/role reversal | One-touch level, no displacement, no retest; separately test rejection and failed-breakout branches |
| E | Opposite candle, displaced confirmed-swing break, fresh zone retest/rejection | Same-bar entry, far-edge wick, too many tested bars, missing impulsive swing break |
| F | Structural trend plus EMA alignment, valid pullback, later frozen-trigger break | Crossover alone, deep overshoot, trend lost before confirmation |
| G | Prior compressed range, one-sided sweep/reclaim, later displaced opposite-boundary break | Wide/zero range, no reclaim, nondisplaced continuation, repeated accumulation setup |
| H | Five alternating confirmed pivots satisfying shoulder/head/neckline, later shoulder retest | Missing head, missing neckline break, unconfirmed final pivot, repeated final-pivot key |

Test arbitration separately: one candidate alone can trade; same-direction valid candidates choose highest score; exact ties preserve documented module order; opposing fully eligible candidates reject; a candidate failing safety/quality must not veto a valid opposite candidate. Check score components by module (F and ordinary E get no automatic liquidity credit). Optional liquidity never exceeds 20, even when a sweep also has several labels.

For stop modes, independently verify unavailable OB/swing data rejects rather than fabricating a level. For target modes, fewer than three distinct confirmed opposing levels rejects Structure and explicitly labels Hybrid's fixed-R fallback; tick-rounded duplicate levels do not count twice. Actual TP2 R is checked after rounding.

For management, verify original stop never changes, managed stop never widens, a close-based break-even/trail update only affects subsequent bars, and strategy updates do not recreate a filled partial. Test minimum-unit positions where partial1/2 round to zero. Compare actual emulator entry/exit comments with JSON events, including a same-bar fill-and-stop. Reconcile per-module completed-position totals, net P&L and holding times against exported trades. No Pine/compiler/replay results are claimed by the existence of these cases.

The expanded backend suite also validates nullable pending fills, slipped simulated fills, managed stops beyond entry, optional metadata enums/timestamp ordering, and escaping of target-source text. Older core-only payloads remain supported.

## Native session evidence

See reports/TRADINGVIEW_RESULTS.md for exact code hashes, loaded intervals, cost assumptions and raw reports. Earlier pre-fix results and discarded stale UI probes are retained separately and are not represented as final-version results. Smoke-run success means the script executed and produced a valid report, not that it passed a profitability test.

A native log audit captured 67 historical payloads from the unchanged event serializer (with logging added in a temporary QA variant). All nine event types and both directions are represented. The exact payloads are regression fixtures in tests/fixtures/native-pine-alerts.jsonl and are validated/formatted by tests/native-alerts.test.ts. This does not certify live webhook delivery or broker fills.

Temporary-tab chart state affected the shared layout during cleanup. The three original indicators were recovered from pre-test cached chart data; their restored inputs/styles matched that backup, all were returned to their original hidden state, FOREX.com M5 was restored and the layout was saved. reports/chart-restoration.json records the verification without private input values.

## Additional delivery verification (v0.2.2)

All 67 captured Pine payloads pass through the full webhook handler, authentication, validation, HTML formatting and actual HTTP fetch against a local server. The transport destination alone is redirected to loopback; no request reaches Telegram. Tests verify 429 responses, invalid JSON, Telegram rejection, a stalled response aborted by the 2.2-second deadline, payload/query destination tampering, rejection before network access and twelve concurrent events. These checks passed on Node v22.23.4 and v24.21.0. This is local integration evidence, not Vercel cold-start measurement, real Telegram acceptance or phone delivery.

Pine source is unchanged from the recorded native TradingView compilation and 48 historical runs. No parameters were optimized against those negative results. Out-of-sample, walk-forward and demo forward testing remain required before live evaluation.
