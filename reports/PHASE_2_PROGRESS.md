# Phase 2 Progress — Validation Improvements

**Date:** 2026-10-31 (Asia/Phnom_Penh)  
**Status:** Local validation work in progress. No release, push, deployment, or market-performance claim.

## Verification status requested for v0.9.0 (2026-10-31)

This section separates local checks from tests that require a full native TradingView run. The project remains **v0.8.0**.

| Check | Status | Evidence / limitation |
| --- | --- | --- |
| Local automated suite | **PASSED** | Re-run in this workspace: `npm run verify`; TypeScript passed and Vitest reported 99 tests in 8 files. |
| Generated Pine source consistency | **PASSED** | `npm run pine:check` passed. |
| Independent Pine parser | **PASSED (limited)** | Indicator, strategy, and validation parsed. This is not TradingView's compiler or strategy emulator. |
| Dependency audit | **PASSED** | `npm audit --omit=dev`: 0 vulnerabilities. |
| Whitespace / patch check | **PASSED** | `git diff --check` passed. |
| Synthetic Pine assertions | **PASSED (synthetic only)** | 206 checks are in the fixture harness; they use generated/artificial inputs and do not establish historical signal accuracy. |
| Indicator native TradingView compile | **PARTIAL / NOT VERIFIED against full local hash** | User screenshot shows “Compiled. Updated on chart”, the indicator legend, and a visible source tail matching local `pine/indicator.pine`. The full editor buffer was not captured or hashed. A fresh read-only check of the currently accessible browser tab found no open Monaco editor, so the compile cannot be repeated from this session. |
| Strategy native TradingView compile | **NOT VERIFIED** | No evidence that the current complete `pine/strategy.pine` was submitted and compiled in TradingView. |
| Current-source Strategy Tester, M1/M3/M5/M15 with costs | **NOT VERIFIED** | No current-revision results captured. The archived 32-row matrix has another source hash and cannot stand in for this run. |
| Indicator/strategy event parity | **NOT VERIFIED** | No paired current-source `PLAN_AUDIT` exports for identical symbol, timeframe, dates, and settings. |
| Bar Replay / repaint timing | **NOT VERIFIED** | No controlled replay/reload observations or event log captured. Confirmed-pivot logic and prior-bar HTF requests reduce known repaint risks but do not replace this verification. |
| Out-of-sample / walk-forward | **NOT VERIFIED** | No current-source, separated test-period fills or report. |
| Native TradingView → Vercel → Telegram alert | **NOT VERIFIED; not attempted** | Current instruction requires approval before sending an alert. The earlier user-confirmed manual webhook receipt was not a TradingView-generated event and does not verify this path. No alert was sent in this verification pass. |
| Push, deploy, real trades | **NOT PERFORMED** | Explicitly excluded from the requested scope. |

Current local SHA-256 values were recomputed during this verification and still match the hashes recorded below. No source code, version, configuration, deployment, or TradingView chart state was changed in this pass. The browser tab presently accessible is the XAUUSD chart page with Pine Editor closed; prior screenshot evidence is therefore recorded as user-provided evidence, not a fresh compilation by this run.

### Exact TradingView evidence needed to close blocked checks

1. In Pine Editor, open the full current `pine/indicator.pine`, compile it, and save it. Capture the Pine Editor compile result and the complete source identity (copy/export the exact saved editor source or compare its SHA-256 outside TradingView with the local file).
2. Open the complete current `pine/strategy.pine` in Pine Editor and compile it. Add that strategy to Strategy Tester. If the Basic plan's script/chart limits block adding it alongside the indicator, use a duplicate chart or temporarily remove only a study you explicitly choose; do not overwrite or delete any script.
3. Export indicator and strategy `PLAN_AUDIT` logs using matching symbol/feed, timeframe, date window, and inputs. Include enough rows to compare each event's bar timestamp, direction, module, planned entry, stop, and three targets.
4. Use Bar Replay around representative confirmed and rejected setups; record the bar at which each event first appears and whether any confirmed event changes after replay/reload.
5. Run current-source Strategy Tester on M1, M3, M5, and M15, record commission/slippage settings and report exports, then define separate development and out-of-sample windows before assessing results.
6. Native alert delivery remains untested until explicitly approved. Do not create a live/public alert during this pass.

## Completed in this progress step

- Extracted the Support/Resistance breakout and rejection expressions into shared pure Pine predicates and wired the existing Strategy/Indicator engine to call those same predicates. The expressions were moved without changing their conditions.
- Extracted the A-module three-bar Fair Value Gap expression into one shared pure Pine predicate and wired the shared engine to it, preserving the original strict inequalities.
- Added seven synthetic S/R cases: bullish/bearish breakout, insufficient pivot touches, missing displacement, bullish/bearish rejection, and no-touch rejection.
- Added four synthetic FVG cases: bullish/bearish gaps and equality-boundary negatives.
- Extracted the production `Candidate` type and its `begin`, `maintain`, `confirmBreak`, and `confirmRetest` methods into shared source. Production module calls now pass candle index, time, and OHLC explicitly; the Pine fixture harness includes the exact same lifecycle implementation.
- Added synthetic lifecycle cases for A–H, checking that a candidate cannot confirm on its setup bar and records a later valid confirmation on its knowledge bar. Added distinct invalidation-before-confirmation and expiry cases.
- Gated each A–H lifecycle fixture's candidate creation on the corresponding valid setup predicate(s): A sweep/MSS/FVG; B range reclaim; C pivot false breakout; D confirmed S/R rejection; E displacement; F structural pullback; G compressed-range sweep; H five-pivot geometry plus correctly timed neckline break.
- Added eight negative detector-to-candidate fixtures. Each invalid setup (A missing sweep/gap, B no reclaim, C no pivot sweep, D insufficient touches, E no displacement, F no structure trend, G over-wide range, H invalid pivot geometry) must leave its candidate inactive.
- Added one wrong-direction/weak-confirmation bar to each A–H lifecycle fixture; the candidate must remain unready, then may confirm only on a later qualifying bar.
- One initial negative H fixture accidentally met the implemented bearish QM geometry. The local assertion run caught it; the fixture values were corrected to violate the head/shoulder relation, then the full suite passed.
- Added static regression tests requiring every HTF/reference `request.security` call to use prior-bar data with `lookahead_on`, disallowing lower-timeframe/lookahead-off requests, and checking confirmed-bar analysis and close-confirmed entry alerts.
- Extracted additional inline module gates into shared predicates used by both production detection and fixtures: A bounded/unused-pivot sweep, B reference-candle reuse, C pivot age/reuse, E zone-test limit, F continuing trend validity, and G AMD cooldown.
- Added 22 synthetic cases for those gates, including boundary and reused-identity negatives. Conditions were moved without changing valid-state behavior.
- Added terminal lifecycle fixtures for all nine module candidates (A, B, C, D, E demand, E supply, F, G, H), each checking structural invalidation and maximum-age expiry through the production `Candidate.maintain` method. These add 18 synthetic checks.
- Extracted Strategy A's exact bullish/bearish MSS + three-bar FVG + ATR displacement conjunction into a shared pure predicate used by the production engine and fixtures. Replaced A's aggregate setup example with a sequential sweep → later MSS/FVG → later retest simulation, including same-bar and wrong-direction rejection cases. Trading conditions are unchanged.
- The Pine validation harness now executes **206 synthetic assertion checks**: predicate/module gate cases, valid/invalid setup fixtures, wrong-direction/weak-confirmation bars, A's staged lifecycle, candidate confirmation timing, and candidate invalidation/expiry. It uses artificial OHLC and shared production predicates/state methods; it still does not run the complete production module loop over full synthetic bar series and is not real-market lifecycle evidence.
- Corrected the validation chart's status text, which previously claimed 160 assertions despite the harness containing more. The validation script now displays 206, and a regression test derives the runtime count including repeated terminal lifecycle cases.
- Added a regression test that derives the fixture assertion count and fails if the displayed count drifts again.

## Verification run after these edits

`npm run verify && npm audit && git diff --check`

- TypeScript: passed.
- Vitest: 99 tests passed in 8 files.
- Generated Pine consistency: passed.
- Independent Pine parser: indicator, strategy, validation passed.
- Dependency audit: 0 vulnerabilities.
- Diff whitespace check: passed.

The 99 Vitest tests include the Pine runtime harness, static HTF/confirmation safeguards, and a regression check that keeps the displayed assertion count synchronized with its fixtures. The harness evaluates the synthetic assertions in the local third-party transpiler; this is not a TradingView compiler or market simulator. The updated Pine hashes are:

- `pine/indicator.pine`: `54d545acede6c9541afa60d805330caf09f08f517d162bc5f4cfacd4e37cd161`
- `pine/strategy.pine`: `3d6a13c4e0aefc7a37f905cc103062069af42b2c6674ff17aa09b94b5e2138b4`
- `pine/validation.pine`: `c62c3f792af5cb0567a2481017bb19dc809760b38b812bc2c4ccb7190a553d43`

## Existing TradingView Strategy Tester evidence found

The repository also contains `reports/tradingview-summary.csv` and its detailed `reports/tradingview-matrix.jsonl`: 32 recorded single-module runs (A–H) across M1, M3, M5, and M15, captured on 2026-10-30. These are genuine archived TradingView result records, but every row carries source SHA-256 `5002409ac85bcb40ad15e260f8caa0cf019890eea36ddeab81ca6d4ff32aa037`, which does not match the current indicator, strategy, or validation source hashes above. They therefore cannot be represented as tests of this current worktree.

Descriptive totals calculated from the CSV, summing the independent module runs within each timeframe (not a portfolio simulation):

| Timeframe | Runs | Trades (wins) | Sum of displayed run PnL |
| --- | ---: | ---: | ---: |
| M1 | 8 | 188 (46) | -$220.81 |
| M3 | 8 | 206 (51) | -$299.54 |
| M5 | 8 | 182 (62) | -$194.42 |
| M15 | 8 | 141 (60) | -$337.18 |

The M15 group includes one no-trade run. These separate strategies may overlap and their PnL must not be interpreted as one combined account result. The archived results are mostly negative and do not establish profitability; importantly, they belong to a different source revision and the CSV contains no raw trade-level fills for recomputing costs or independent out-of-sample performance.

In the latest TradingView view supplied and inspected, Pine Editor is titled “Untitled script” and shows the indicator's source tail around lines 1293–1333; that visible code matches the same lines in current local `pine/indicator.pine`. The Pine log shows “Compiling… Compiled. Updated on chart.” and the chart legend includes “XAUUSD SMART SCALPER PRO”. This is evidence that the visible indicator revision compiled and was applied. The full editor contents and their hash were not captured, so exact whole-file identity with the current local hash is not certified. The strategy source was not submitted to Pine Editor and Strategy Tester results for this revision were not captured. The chart legend also showed “My script” and three unrelated studies; its provenance is uncertain and it was left untouched. No Save or reload persistence verification occurred.

## Still required for Phase 2

- Module-specific end-to-end traces from each C–H detector through candidate acceptance/rejection and invalidation/expiry. Current fixtures gate candidate creation on valid production predicates and exercise the shared production candidate methods, but do not invoke each detector against a complete synthetic bar sequence.
- Matched current-source TradingView indicator and strategy `PLAN_AUDIT` exports. The existing parity utility has only been exercised with synthetic logs; without native exports no candle-by-candle parity claim can be made.
- TradingView Bar Replay/reload checks for repaint behavior, whole-file source-hash confirmation for the compiled indicator, native strategy compilation, and current-source Strategy Tester results. The visible indicator revision compiled and was updated on chart, but the full local-source identity remains unverified. The archived TradingView summary uses a different source hash.
- Current-source, cost-aware M1/M3/M5/M15 historical evaluation and separately bounded out-of-sample/walk-forward periods.
- Native TradingView alert → Vercel → Telegram verification of realtime-only alerts and duplicate limitations. An earlier authenticated manual webhook test returned HTTP 200 and the user confirmed receipt of a TEST ONLY message (`reports/v060-live-relay-test.json`); this validates the relay path at that time, not delivery from a TradingView-generated alert or the present deployment configuration.

No Pine rule was loosened to increase signals. The heuristic setup score is not a win probability. Do not interpret this progress as evidence of profitable or live-ready trading.

## Follow-up verification pass (2026-10-31)

- Re-ran `npm run verify`: TypeScript passed, **99 tests passed in 8 files**, generated Pine consistency passed, and the independent parser passed for indicator, strategy, and validation.
- Re-ran `npm audit --omit=dev`: **0 vulnerabilities**. `git diff --check` passed.
- Recomputed Pine hashes; all three still match the values listed above. Only README/testing/setup documentation was corrected to identify 206 as the current synthetic count and 107 as historical v0.6.0 evidence. Pine logic and project version were not changed.
- Read-only TradingView inspection found the XAUUSD chart and prior compile-log messages, but the Pine editor was not available as a readable full source buffer in the active browser view. The visible chart includes both the indicator and a study named “XAUUSD SMART SCALPER PRO Backtest”; its exact source revision cannot be inferred from the name. No chart study, script, or alert was changed. Therefore no new native compile or current-source Strategy Tester result is claimed.
- The current local TradingView source hashes remain unverified natively; paired live-source PLAN_AUDIT logs, replay evidence, cost-aware current-source timeframe matrix, OOS/walk-forward and native alert delivery remain **NOT VERIFIED**. No Telegram alert, deployment, push, or trade was made.

## Browser follow-up (2026-10-31)

The TradingView Pine Editor panel was opened without modifying the draft. Its tab is named “Untitled script”; the accessible editor text begins with the current indicator declaration and `SCRIPT_VERSION = '0.8.0'`, and the visible tail around lines 1297–1334 matches the local indicator. The editor's “Update on chart” control is disabled, while its log contains only the earlier 8:08 PM and 9:22 PM compile/update entries. This suggests the visible draft has no pending edits, but it does not reveal the complete editor model or prove a compile against the current local SHA-256. The chart still lists a study named “XAUUSD SMART SCALPER PRO Backtest”; its revision and current Strategy Tester run remain unknown. No source was pasted, saved, replaced, or recompiled; no chart state or alerts were changed.

## Additional follow-up (2026-10-31)

- Re-ran local checks once more: 99/99 tests, TypeScript, generation consistency, independent Pine parsing, zero production dependency advisories, and whitespace check passed.
- Searched the project for newly supplied TradingView audit exports, raw trade exports and logs. No current-source PLAN_AUDIT pair or new trade export was present; only the archived summary CSV and synthetic comparator tests were found.
- Rechecked the open TradingView page. The Pine Editor shows the previous compile log; the page does not expose a Strategy Tester panel or result export. The editor's visible current indicator source remains unmodified. No TradingView compile or backtest result was fabricated from the old log or the study name.
- Therefore the prior blocked items remain **NOT VERIFIED**: exact-hash native compiles for both current Pine files; current-source Strategy Tester across M1/M3/M5/M15 with costs; paired candle-level audit comparison; Bar Replay/reload; OOS/walk-forward; and native TradingView-origin Telegram alert delivery. No alert, publish, save, deploy, push, or trade was performed.

## User ZIP review follow-up (2026-10-31)

- Re-ran `npm run verify`: **99/99 tests passed**, with TypeScript, generated-source consistency, and independent parsing of all three Pine files passing. `npm audit --omit=dev` found zero vulnerabilities and `git diff --check` passed.
- Checked local secret handling without reading `.env`: `.gitignore` ignores `.env*`, and `.env` is not tracked by Git. This verifies only the local working tree; it does not inspect or certify any separately uploaded ZIP archive.
- Switched to the already-open TradingView chart and opened Pine Editor. It exposes an “Untitled script” draft whose first lines identify the current v0.8.0 indicator; the visible editor tail matches local lines. “Update on chart” is disabled and its log has no new compile entry, so there was no new native compile. Strategy Tester is not open in the current view. No script or chart was overwritten or saved.
- The uploaded ZIP itself was not available as a local workspace file in this run. The project remains v0.8.0; native Strategy Tester, current-source parity, replay, OOS/walk-forward, and TradingView-origin Telegram delivery remain **NOT VERIFIED**.
