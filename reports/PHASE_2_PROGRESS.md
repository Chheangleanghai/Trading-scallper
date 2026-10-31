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

## Native TradingView interaction attempt (2026-10-31)

- TradingView is open on the FOREX.com XAUUSD M5 chart. The Pine Editor shows an “Untitled script” with the local indicator's v0.8.0 header and matching visible tail. Its compile log remains the previous 8:08 PM / 9:22 PM entries; `Update on chart` is disabled. The Strategy Tester panel is not open.
- To verify the full draft without changing it, I attempted to copy the editor contents for a local hash comparison while preserving/restoring the clipboard. macOS denied System Events keystrokes with error 1002 (“osascript is not allowed to send keystrokes”). Copy therefore failed and no source comparison, new compile, or editor modification occurred.
- Minimum manual action: in macOS System Settings → Privacy & Security → Accessibility, enable the terminal/Codex app used for automation (if you want this UI automation), then tell me to retry. Or, without changing macOS permissions, open Pine Editor, use its script dropdown to create a separate temporary script (keep the existing `Untitled script` intact), paste the local indicator source there, and click Add to chart/Update; for the strategy, open `pine/strategy.pine` in another temporary draft and add it to Strategy Tester. Do not save over an existing script. Export the Strategy Tester report and Pine Logs for both scripts after matching symbol, timeframe, date range, and inputs.
- This OS permission restriction blocks direct keyboard-driven source replacement/copy and therefore full-source hash verification and compilation in this run. Other native checks remain **NOT VERIFIED**. No alert, publish, save, deployment, push, or trade was performed.

## Native TradingView verification retry (2026-10-31)

This section supersedes the prior keyboard-permission blocker for this retry; the older section remains as a record of the earlier failed attempt.

- **Keyboard automation: PASSED.** macOS automation successfully activated Chrome and sent `Cmd+L` followed by `Escape` through System Events (exit status 0). This verifies keyboard input to the active browser, not unrestricted access to every app/control.
- **Temporary source identity: PASSED.** The pre-existing `Untitled script` editor content was copied and compared against `pine/indicator.pine`. After normalizing Monaco's non-breaking spaces and line endings, the complete source matched SHA-256 `54d545acede6c9541afa60d805330caf09f08f517d162bc5f4cfacd4e37cd161`. A separate unsaved strategy draft was populated, copied back, normalized, and matched `pine/strategy.pine` SHA-256 `3d6a13c4e0aefc7a37f905cc103062069af42b2c6674ff17aa09b94b5e2138b4`.
- **Indicator native compile: PASSED.** TradingView's Pine log displayed “Compiling…”, then “Compiled. Added to chart.” for the temporary indicator draft whose complete source matched the local hash above.
- **Strategy native compile: PASSED.** TradingView's Pine log displayed “Compiling…”, then “Compiled. Added to chart.” for the separate temporary strategy draft whose complete source matched the local hash above.
- Drafts were not saved or published. No saved script was intentionally overwritten, no existing study was removed, and no alert, deployment, or trade was made. The temporary indicator was added as an additional chart study; the chart layout was not saved. The temporary strategy remains an unsaved draft.
- **Strategy Tester exports and timeframe matrix: BLOCKED / NOT VERIFIED.** After compilation, the active chart showed no Strategy Tester / Strategy Report panel or result tabs (the bottom panel was not visible); an existing `XAUUSD SMART SCALPER PRO Backtest` row was hidden, and its source revision could not be identified from its name. Adding the temporary strategy produced a compile log but no accessible report/export in this browser view. I did not treat the legacy study or older archived CSV as current-source output.
- Consequently, no current-source M1/M3/M5/M15 result, cost settings, trade export, or PLAN_AUDIT log was obtained. Indicator/strategy candle-by-candle parity, Bar Replay/reload repaint checks, and out-of-sample/walk-forward validation remain **NOT VERIFIED**. No live alert was created or sent.
- **Minimum TradingView action needed to unblock results:** open the Strategy Tester / Strategy Report panel for the newly compiled temporary strategy (not the hidden legacy Backtest study), confirm the report is for the current source, and export its performance and trade list on each of M1, M3, M5, and M15 with commission/slippage settings recorded. For event parity, enable research audit logging in both matching source versions and export their Pine Logs for the same symbol, timeframe, dates, and inputs. Bar Replay must then be run across a confirmed historical setup and a reload/replay check recorded. Account/UI limitations may prevent multiple strategy instances or reports; if so, record that exact limitation rather than substituting older runs.
- **Release status:** project remains v0.8.0. Native compilation is now verified for the exact local indicator and strategy sources; compile success does not verify signal correctness, profitability, backtest performance, or repaint behavior. No v0.9.0 release claim is made.

## Strategy Report identity check (2026-11-01)

- TradingView's XAUUSD chart now exposes a Strategy Report. The chart is FOREX.com:XAUUSD, M5, with report period **2026-10-05 through 2026-10-31**. The report title and chart legend identify `XAUUSD SMART SCALPER PRO Backtest`; the corresponding legend row is marked **Active strategy** (TradingView entity ID `FrcF9f`). The report shows 1 trade, 0 winners, total P&L **−$13.66 (−0.14%)**, maximum drawdown **$13.66 (0.14%)**, profit factor 0, and module A (`A_SWEEP_MSS_FVG`) at −$13.66. These are captured as preliminary UI observations only.
- TradingView's source attribution shows `Pine Editor` / `Untitled script`. I copied the complete currently visible Pine Editor model read-only and normalized Monaco non-breaking spaces and line endings. The normalized editor source is 93,792 bytes / 1,387 lines, SHA-256 `05f2f447f40fe91a9facec83478e85dc8dc9c5a45779d300266d30afc345fb94`. Its opening declaration is the XAUUSD Backtest strategy, but it does **not** match local `pine/strategy.pine` (100,989 bytes / 1,470 lines, SHA-256 `3d6a13c4e0aefc7a37f905cc103062069af42b2c6674ff17aa09b94b5e2138b4`); the editor copy also lacks the local `SCRIPT_VERSION = '0.8.0'` marker.
- **Identity verdict: FAILED for current-source acceptance.** The report belongs to the chart's active Backtest strategy object, but the source currently exposed by Pine Editor is not byte-equivalent (after editor normalization) to the current local v0.8.0 strategy. Therefore the −$13.66 M5 result cannot be attributed to the requested local source, and it may be a stale/modified Backtest revision. It is excluded from current-source performance conclusions.
- The report UI shows “Commission load” but no verified cost values were captured; editor inputs, slippage, spread treatment, trade list export, and a performance export were not verified. No timeframe was changed and no report was exported from this unverified strategy.
- Current-source M1/M3/M5/M15 backtests, matched current-source `PLAN_AUDIT` logs, candle-level parity, Bar Replay/reload checks, and out-of-sample results remain **NOT VERIFIED**. The Strategy Report visibility blocker is resolved, but source identity mismatch now blocks using its results.
- No TradingView source was edited or saved, no existing study was removed, and no alert, deployment, publication, or trade was made during this identity check. The only source interaction was selecting/copying the visible editor text; the clipboard was restored afterward.
- **Minimum action to unblock current-source Strategy Tester:** open a new unsaved temporary strategy draft without replacing `Untitled script`, paste the exact current local `pine/strategy.pine`, verify its normalized full-file SHA-256 is `3d6a13c4e0aefc7a37f905cc103062069af42b2c6674ff17aa09b94b5e2138b4`, compile it, and confirm its own Strategy Report becomes active. If TradingView warns that adding it will replace/remove an existing chart strategy, cancel and preserve the current study; the user must choose an available chart/layout slot or explicitly authorize a reversible replacement. After a source-matched report is active, record costs/inputs and export each timeframe before drawing any parity or performance conclusions.

## Source-matched strategy report and timeframe pass (2026-11-01)

This pass follows the identity check above. The first report/source comparison failed; a separate unsaved strategy draft was then populated from the local strategy source and compiled. This later evidence supersedes the earlier recommendation to create that draft, but it does **not** resolve the audit-log/source-version discrepancy described below.

- **Local verification rerun:** `npm run verify` passed: TypeScript, **99 tests across 8 files**, generated Pine consistency, and the independent Pine parser for indicator, strategy, and validation. The parser explicitly does not certify TradingView compilation or broker-emulator behavior. `git diff --check` also passed. No test code or Pine source was changed.
- **Local source identity:** normalized Pine Editor source matched `pine/strategy.pine`, SHA-256 `3d6a13c4e0aefc7a37f905cc103062069af42b2c6674ff17aa09b94b5e2138b4` (100,989 bytes). The source declares `SCRIPT_VERSION = '0.8.0'`. TradingView logged `Compiling…`, `Compiled.`, and `Added to chart.` for the separate unsaved `Untitled script` strategy draft. No source was saved or published.
- **Report attribution:** the visible report was associated with TradingView's active strategy row `XAUUSD SMART SCALPER PRO Backtest`, entity ID `FrcF9f`; Pine Editor attribution showed `Untitled script`. The active row and report refreshed after the local-source draft was added. This supports attribution to the new draft for the reported M5 run, but the study title/entity ID is reused and the Pine Logs contain events from a different script version. Treat the following as **current-source UI observations with a provenance caveat**, not as exported/reproducible performance records.
- **Instrument/feed and capital:** FOREX.com:XAUUSD, standard candles, initial capital USD 10,000. Strategy properties showed order size 100% equity, pyramiding 0, 1x long/short leverage, bar-close calculation, no tick/fill recalculation, default bar detail (4 ticks/bar), requested-price limit fills, and one-tick order execution delay.
- **Costs:** source and Strategy Properties showed commission 0.01% and slippage 2 ticks. There is no explicit fixed spread input/model in the strategy source or captured properties. These figures must not be described as a complete broker spread simulation.
- **Inputs:** A (`A_SWEEP_MSS_FVG`) enabled; B–H disabled; common quality threshold 75 with strategy-specific thresholds off; both directions; London session filter on; H1 alignment required; EMA alignment filter off; fixed-R targets 1R/2R/3R; structure stop; minimum TP2 R:R 2; close entry; 15-minute maximum holding period; break-even/trailing off; optional liquidity/Fibonacci/premium-discount requirements off. Research date restriction off. For log collection only, `Log qualified plans and lifecycle events` was temporarily enabled in the strategy's chart inputs; this did not change source code.
- **Observed Strategy Tester values** (each timeframe is a separate run, not one combined portfolio):

  | Chart TF | Report date range shown | Trades | Winners | Net P&L | Max drawdown | Profit factor |
  | --- | --- | ---: | ---: | ---: | ---: | ---: |
  | M1 | 2026-10-26–2026-10-31 | 4 | 0/4 (0%) | −$7.74 (−0.08%) | $7.74 (0.08%) | 0 |
  | M3 | 2026-10-12–2026-10-31 | 1 | 0/1 (0%) | −$0.30 (~0.00%) | $3.33 (0.03%) | 0 |
  | M5 | 2026-10-05–2026-10-31 | 1 | 0/1 (0%) | −$13.66 (−0.14%) | $13.66 (0.14%) | 0 |
  | M15 | 2026-08-03–2026-10-31 | 1 | 0/1 (0%) | −$6.86 (−0.07%) | $25.74 (0.26%) | 0 |

  The Strategy Report's module breakdown showed module A only. The total of these independent, timeframe-specific observations is seven trades, zero winners; the samples are tiny and differ in date coverage. This is not evidence of a stable win rate or a fair OOS result. The lower timeframes have particularly short displayed history, consistent with account/data availability limits.
- **Export status: BLOCKED.** No actual performance-report file or raw trade-list export was captured. The report view showed report-data controls gated with “Upgrade to get full access to Strategy report data”; the available Basic-plan view did not expose a usable export control. Numbers above were read from the visible report, not imported from a downloaded artifact. A reproducible run manifest is consequently incomplete; source hash and captured cost/settings are recorded above, while no separate spread value is available.
- **PLAN_AUDIT: NOT VERIFIED for v0.8.0.** Pine Logs for the Backtest-named study exposed one historical `PLAN_AUDIT` record and associated lifecycle events, but those JSON payloads declare `scriptVersion: "0.6.0"`, while the local compiled source declares `0.8.0`. The record is therefore stale or from another source revision and is excluded from current-source evidence. The Indicator log view showed “Waiting on logs”; its `auditLog` input has not been enabled/collected. No matching pair exists.
- **Indicator/strategy parity: NOT VERIFIED.** Without two matching-version PLAN_AUDIT exports on identical chart candles, no candle-by-candle comparison of timestamps, direction, strategy, Entry, SL, or targets can be made.
- **Bar Replay/repainting: NOT VERIFIED.** No controlled replay with recorded setup/confirmation bars and reload comparison was completed. Confirmed-pivot logic and confirmed higher-timeframe requests in source are static-code safeguards, not a substitute for that native replay check.
- **Out-of-sample/walk-forward: NOT VERIFIED.** No sufficiently long current-source trade series or raw fills were exported, so a defensible chronological split and walk-forward evaluation cannot be calculated. There is no profitability or live-readiness claim.
- **Preservation/safety:** the strategy draft remains unsaved; no existing saved script was overwritten, no studies were removed, and no alerts were published, no deployment was made, and no trades were executed. Chart input logging was enabled temporarily. The current chart may have a temporary added study; the chart layout was not saved.

### Exact action needed to finish the blocked native checks

1. To resolve the report/log provenance caveat, open Pine Logs for the current temporary strategy after clearing or otherwise isolating prior logs (if TradingView Basic exposes no clear operation, use a fresh unsaved strategy instance only if the account permits it), then verify a newly generated audit payload says `scriptVersion: 0.8.0` and matches the local source hash above. Current logs marked `0.6.0` must not be used.
2. Enable `Log qualified plans and lifecycle events` on the exact local v0.8.0 indicator draft, apply/recalculate it, and collect its Pine Logs on the same symbol/timeframe/date/input configuration. Preserve the strategy log and indicator log as separate files.
3. Obtain the full report data/trade list through an available TradingView export feature or plan access; record the export file, report period, source hash, all inputs/properties, and any spread assumption. Do not substitute the older Backtest study or archived CSV.
4. Run a replay of a timestamped current-source setup and record the visible confirmation bar before/after stepping and after chart reload. Until these artifacts exist, parity and repainting remain not verified.

**Release gate:** project version remains v0.8.0. M1/M3/M5/M15 report panels were observed for the separate temporary local-source draft, but source-version-matched logs, exported trade records, parity, replay, and OOS testing remain incomplete. v0.9.0 release criteria are therefore **not met**.
