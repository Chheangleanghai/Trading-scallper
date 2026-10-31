# Phase 2 Progress — Validation Improvements

**Date:** 2026-10-31 (Asia/Phnom_Penh)  
**Status:** Local validation work in progress. No release, push, deployment, or market-performance claim.

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
- The Pine validation harness now executes **200 synthetic assertion checks**: predicate/module gate cases, valid/invalid setup fixtures, wrong-direction/weak-confirmation bars, candidate confirmation timing, and candidate invalidation/expiry. It uses artificial OHLC and shared production predicates/state methods; it still does not run the complete production module loop over full synthetic bar series and is not real-market lifecycle evidence.
- Corrected the validation chart's status text, which previously claimed 160 assertions despite the harness containing more. The validation script now displays 200, and a regression test derives the runtime count including the repeated terminal lifecycle cases.
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

- `pine/indicator.pine`: `efe7d8ffab10210df8eb1e42714a8bf11a3e7c09b21e0f8ffc4bdf7ebcda5f8b`
- `pine/strategy.pine`: `281245aa3aa8e76f0f3d8767f713d03f060d88692cf075c37786c3969235b93a`
- `pine/validation.pine`: `eb37fd80019e1e676f34792c2e93406d01a0edd5c041ab32671c01975430b647`

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

Because these source hashes differ from the v0.8.0 versions recorded as compiled in TradingView, native Pine compilation of this worktree revision is **not verified**. I could inspect the TradingView tab, but macOS denied keyboard automation needed to put the local source into Pine Editor. A default TradingView “My script” was briefly compiled and added during the access check, then removed from the chart. After cleanup, the chart legend still listed the four pre-existing studies (Backtest, Premium GOLD Signal, Logic 18.12, and SMART SCALPER PRO). No Save action or reload verification was performed, so layout persistence and the selected editor draft are not certified. The observed compile log was for TradingView's default “My script”, not this project's code.

## Still required for Phase 2

- Module-specific end-to-end traces from each C–H detector through candidate acceptance/rejection and invalidation/expiry. Current fixtures gate candidate creation on valid production predicates and exercise the shared production candidate methods, but do not invoke each detector against a complete synthetic bar sequence.
- Matched current-source TradingView indicator and strategy `PLAN_AUDIT` exports. The existing parity utility has only been exercised with synthetic logs; without native exports no candle-by-candle parity claim can be made.
- TradingView Bar Replay/reload checks for repaint behavior and current-source native compilation. An older TradingView summary exists, but its recorded source hash is different from this worktree.
- Current-source, cost-aware M1/M3/M5/M15 historical evaluation and separately bounded out-of-sample/walk-forward periods.
- Native TradingView alert → Vercel → Telegram verification of realtime-only alerts and duplicate limitations. An earlier authenticated manual webhook test returned HTTP 200 and the user confirmed receipt of a TEST ONLY message (`reports/v060-live-relay-test.json`); this validates the relay path at that time, not delivery from a TradingView-generated alert or the present deployment configuration.

No Pine rule was loosened to increase signals. The heuristic setup score is not a win probability. Do not interpret this progress as evidence of profitable or live-ready trading.
