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
- The Pine validation harness now contains **144 synthetic assertion calls**, including 18 candidate lifecycle assertions and eight detector-to-lifecycle setup gates. It exercises production state methods and production pure predicates but uses artificial OHLC; it does not execute the full production module loop over a synthetic time series, and it is not real-market lifecycle evidence.

## Verification run after these edits

`npm run verify && npm audit && git diff --check`

- TypeScript: passed.
- Vitest: 96 tests passed in 8 files.
- Generated Pine consistency: passed.
- Independent Pine parser: indicator, strategy, validation passed.
- Dependency audit: 0 vulnerabilities.
- Diff whitespace check: passed.

The 96 Vitest tests include the Pine runtime harness. The harness evaluates the synthetic assertions in the local third-party transpiler; this is not a TradingView compiler or market simulator. The updated Pine hashes are:

- `pine/indicator.pine`: `9fcd10744bc780ab886afa8abd545d9451f8f3496f877210f4bc8933eae63252`
- `pine/strategy.pine`: `cca1f3fa6971b44e48849cfc2f369271525d3b765a42321d99e25b2cb88ff864`
- `pine/validation.pine`: `8b509024bf40f263d5d00734ed89e4c8669d16ef8e2d303c7d06852e000082c2`

Because these source hashes differ from the v0.8.0 versions recorded as compiled in TradingView, native Pine compilation of this worktree revision is **not verified**. I could inspect the TradingView tab, but macOS denied keyboard automation needed to put the local source into Pine Editor. A default TradingView “My script” was briefly compiled and added during the access check, then removed from the chart. After cleanup, the chart legend still listed the four pre-existing studies (Backtest, Premium GOLD Signal, Logic 18.12, and SMART SCALPER PRO). No Save action or reload verification was performed, so layout persistence and the selected editor draft are not certified. The observed compile log was for TradingView's default “My script”, not this project's code.

## Still required for Phase 2

- Module-specific end-to-end traces from each C–H detector through candidate acceptance/rejection and invalidation/expiry. Current fixtures gate candidate creation on valid production predicates and exercise the shared production candidate methods, but do not invoke each detector against a complete synthetic bar sequence.
- Matched current-source TradingView indicator and strategy `PLAN_AUDIT` exports. The existing parity utility has only been exercised with synthetic logs; without native exports no candle-by-candle parity claim can be made.
- TradingView Bar Replay/reload checks for repaint behavior and current-source native compilation.
- Current-source, cost-aware M1/M3/M5/M15 historical evaluation and separately bounded out-of-sample/walk-forward periods.
- End-to-end TradingView → Vercel → Telegram verification of realtime-only alerts and duplicate limitations. No new live message was sent.

No Pine rule was loosened to increase signals. The heuristic setup score is not a win probability. Do not interpret this progress as evidence of profitable or live-ready trading.
