# Native TradingView test results — 2026-10-30

**Research conclusion: the current rules are not approved for live trading.** Of the 32 isolated module/timeframe runs, 26 lost money, 5 were positive and 1 had no trades. Small positive samples do not establish an edge. No parameters were optimized to maximize win rate.

These are observed TradingView Strategy Tester results on the connected **FOREX.com XAUUSD** feed. They are functional smoke tests on available history, not an out-of-sample or forward-tested performance claim.

## Verification

- Native TradingView: full strategy compilation and all eight modules on four chart timeframes.
- Native regression script: **44 assertions passed**, including tick-rounded 2R, zero-risk and one-tick-shortfall checks. See [chart capture](validation-44-native.png).
- Local Node22 verification: **67 tests across five files**, strict TypeScript, generated-source consistency and independent Pine parsing. Local pure-Pine assertions use an independent transpiler and an explicit failing canary; this tool is not TradingView.
- The indicator and strategy use one shared generated engine. Native indicator acceptance is recorded with its [chart capture](final-indicator-forexcom-m5.png).

Native Pine JSON audit: **67 captured historical payloads covered all nine alert event types and both directions**. Every captured payload is validated and Telegram-formatted by the backend regression test. This verifies the shared serializer/schema boundary, not live TradingView webhook or Telegram delivery. See [audit metadata](pine-alert-audit.json) and ../tests/fixtures/native-pine-alerts.jsonl.

## Assumptions

$10,000 USD initial capital; 0.5% planned-risk ceiling; maximum simulated notional90% of equity; feed point value/minimum units; commission0.01% per execution; slippage2 feed ticks; no Bar Magnifier; bar-close calculations; next-tick market orders; fixed1/2/3R projections; 15-minute time exit; rounded original-unit partial exits. Other inputs are source defaults except the isolated enabled module. Costs are examples and have not been calibrated to the broker’s historical spread or execution.

The feed/chart history limit produced different loaded intervals: M1 Oct26–30, M3 Oct12–30, M5 Oct5–30, and M15 Aug3–Oct30,2026. They are **not equal-period comparisons**. The live right edge advanced during testing. Raw snapshots and timestamps are retained.

**Trades/win rate below are TradingView exit-record counts, which can count partial exits separately.** The on-chart module summary aggregates completed positions; its count and win rate can differ. Profit factor “—” means unavailable/undefined, not an invented infinite value.

## All 32 observed runs

| Module | Chart | Loaded interval | Net P&L | Max drawdown | Profitable exit records | PF | Expectancy / exit record |
|---|---|---|---:|---:|---:|---:|---:|
| A | M1 | Oct 26, 2026 — Oct 30, 2026 | −7.74USD−0.08% | 7.74USD0.08% | 0.00%0/4 | 0 | −1.93USD−0.11% |
| B | M1 | Oct 26, 2026 — Oct 30, 2026 | −51.22USD−0.51% | 66.98USD0.67% | 26.32%15/57 | 0.49 | −0.90USD−0.05% |
| C | M1 | Oct 26, 2026 — Oct 30, 2026 | −64.16USD−0.64% | 64.47USD0.64% | 24.59%15/61 | 0.4 | −1.05USD−0.06% |
| D | M1 | Oct 26, 2026 — Oct 30, 2026 | −17.08USD−0.17% | 17.34USD0.17% | 30.00%6/20 | 0.305 | −0.85USD−0.05% |
| E | M1 | Oct 26, 2026 — Oct 30, 2026 | −14.98USD−0.15% | 15.14USD0.15% | 20.00%2/10 | 0.42 | −1.50USD−0.10% |
| F | M1 | Oct 26, 2026 — Oct 30, 2026 | −67.55USD−0.68% | 67.88USD0.68% | 13.33%4/30 | 0.125 | −2.25USD−0.09% |
| G | M1 | Oct 26, 2026 — Oct 30, 2026 | +1.28USD+0.01% | 7.06USD0.07% | 100.00%1/1 | — | 1.28USD0.01% |
| H | M1 | Oct 26, 2026 — Oct 30, 2026 | +0.64USD+0.01% | 3.66USD0.04% | 60.00%3/5 | 1.242 | 0.13USD0.01% |
| A | M3 | Oct 12, 2026 — Oct 30, 2026 | −0.30USD0.00% | 3.33USD0.03% | 0.00%0/1 | 0 | −0.30USD0.00% |
| B | M3 | Oct 12, 2026 — Oct 30, 2026 | −117.14USD−1.17% | 156.41USD1.56% | 29.79%28/94 | 0.524 | −1.25USD−0.05% |
| C | M3 | Oct 12, 2026 — Oct 30, 2026 | −76.83USD−0.77% | 76.83USD0.77% | 25.49%13/51 | 0.397 | −1.51USD−0.05% |
| D | M3 | Oct 12, 2026 — Oct 30, 2026 | −1.43USD−0.01% | 18.92USD0.19% | 27.27%3/11 | 0.926 | −0.13USD−0.03% |
| E | M3 | Oct 12, 2026 — Oct 30, 2026 | −33.11USD−0.33% | 55.89USD0.56% | 4.76%1/21 | 0.336 | −1.58USD−0.10% |
| F | M3 | Oct 12, 2026 — Oct 30, 2026 | −41.58USD−0.42% | 56.78USD0.57% | 11.76%2/17 | 0.283 | −2.45USD−0.11% |
| G | M3 | Oct 12, 2026 — Oct 30, 2026 | −23.67USD−0.24% | 24.42USD0.24% | 0.00%0/5 | 0 | −4.73USD−0.15% |
| H | M3 | Oct 12, 2026 — Oct 30, 2026 | −5.48USD−0.05% | 14.93USD0.15% | 66.67%4/6 | 0.713 | −0.91USD0.01% |
| A | M5 | Oct 5, 2026 — Oct 30, 2026 | −13.66USD−0.14% | 13.66USD0.14% | 0.00%0/1 | 0 | −13.66USD−0.16% |
| B | M5 | Oct 5, 2026 — Oct 30, 2026 | −111.13USD−1.11% | 164.16USD1.64% | 34.12%29/85 | 0.536 | −1.31USD−0.02% |
| C | M5 | Oct 5, 2026 — Oct 30, 2026 | +1.47USD+0.01% | 53.77USD0.54% | 42.31%22/52 | 1.015 | 0.03USD0.01% |
| D | M5 | Oct 5, 2026 — Oct 30, 2026 | −15.47USD−0.15% | 23.47USD0.23% | 25.00%3/12 | 0.544 | −1.29USD−0.10% |
| E | M5 | Oct 5, 2026 — Oct 30, 2026 | −34.32USD−0.34% | 42.75USD0.43% | 12.50%2/16 | 0.189 | −2.15USD−0.09% |
| F | M5 | Oct 5, 2026 — Oct 30, 2026 | −2.67USD−0.03% | 26.59USD0.27% | 42.86%3/7 | 0.92 | −0.38USD0.03% |
| G | M5 | Oct 5, 2026 — Oct 30, 2026 | −12.66USD−0.13% | 18.02USD0.18% | 0.00%0/1 | 0 | −12.66USD−0.15% |
| H | M5 | Oct 5, 2026 — Oct 30, 2026 | −5.98USD−0.06% | 37.22USD0.37% | 37.50%3/8 | 0.782 | −0.75USD−0.06% |
| A | M15 | Aug 3, 2026 — Oct 30, 2026 | −6.86USD−0.07% | 25.74USD0.26% | 0.00%0/1 | 0 | −6.86USD−0.08% |
| B | M15 | Aug 3, 2026 — Oct 30, 2026 | −216.67USD−2.17% | 241.23USD2.41% | 43.18%38/88 | 0.507 | −2.46USD−0.04% |
| C | M15 | Aug 3, 2026 — Oct 30, 2026 | −62.87USD−0.63% | 82.30USD0.82% | 34.78%8/23 | 0.488 | −2.73USD−0.06% |
| D | M15 | Aug 3, 2026 — Oct 30, 2026 | −13.25USD−0.13% | 15.81USD0.16% | 50.00%2/4 | 0.22 | −3.31USD−0.04% |
| E | M15 | Aug 3, 2026 — Oct 30, 2026 | +36.46USD+0.36% | 16.35USD0.16% | 85.71%6/7 | 6.554 | 5.21USD0.10% |
| F | M15 | Aug 3, 2026 — Oct 30, 2026 | −74.96USD−0.75% | 102.11USD1.02% | 28.57%4/14 | 0.216 | −5.35USD−0.14% |
| G | M15 | Aug 3, 2026 — Oct 30, 2026 | No trades | — | — | — | — |
| H | M15 | Aug 3, 2026 — Oct 30, 2026 | +0.97USD+0.01% | 10.02USD0.10% | 50.00%2/4 | 1.126 | 0.24USD0.00% |

## Entry, stop, target and management checks

Each profile starts from B-only M5 defaults, then changes the recorded parameters. These are behavior checks; selecting a better historical profile would require a separate preregistered research/test process.

| Profile | Net P&L | PF | Profitable exit records |
|---|---:|---:|---:|
| entry_limit | −16.98USD−0.17% | 0.884 | 37.33%28/75 |
| entry_breakout | −187.22USD−1.87% | 0.361 | 25.81%16/62 |
| break_even_and_trailing | −111.13USD−1.11% | 0.536 | 34.12%29/85 |
| structure_targets | −21.65USD−0.22% | 0.377 | 23.53%4/17 |
| hybrid_targets | −69.54USD−0.70% | 0.485 | 34.04%16/47 |
| atr_stop | −143.83USD−1.44% | 0.462 | 29.76%25/84 |
| swing_stop | −30.72USD−0.31% | 0.758 | 33.82%23/68 |
| ob_stop | −126.30USD−1.26% | 0.3 | 28.00%14/50 |
| sweep_stop | −111.13USD−1.11% | 0.536 | 34.12%29/85 |
| no_partials | −103.97USD−1.04% | 0.569 | 34.69%17/49 |
| manual_pause | No trades | — | — |
| quality_100 | No trades | — | — |
| asian_session | −116.68USD−1.17% | 0.439 | 28.57%16/56 |
| new_york_session | −107.81USD−1.08% | 0.496 | 34.52%29/84 |
| dst_overlap_session | −19.76USD−0.20% | 0.786 | 40.00%14/35 |
| fib_discount_filter | −76.30USD−0.76% | 0.324 | 28.57%8/28 |

## Fixes made during testing

1. Added a configurable exposure ceiling to risk-based unit sizing. Previously some valid plans required more buying power than the emulator’s default1× margin, giving no fills despite submitted plans.
2. Replaced floating-point minimum-R and minimum-stop comparisons with tick-count comparisons. An exact2R price ladder can otherwise evaluate to1.99999999998 and be rejected. One-tick-shortfall rejection is regression-tested.
3. Rendered dashboards on the last confirmed historical bar as well as the last bar, so a strategy panel does not stay blank until the current live candle closes.
4. Rejected candidates with missing/nonpositive structural invalidation even under alternative stop modes; kept initial and managed stops separate and made empty-body/configuration HTTP errors explicit.

## Limits and remaining acceptance

- No real broker orders were placed. Tester fills and indicator touches are simulations.
- Telegram credentials and webhook secret were not configured; real phone delivery and Vercel deployment remain unverified.
- The Basic account reported one saved script and two applied studies. Existing saved scripts were not overwritten and no upgrade/publication was performed. A separate temporary chart tab was used for isolated testing. Its shared-layout behavior affected the layout; the original three indicators were recovered from pre-test cached layout data, their inputs/styles were verified, and the restored FOREX.com M5 layout was saved with autosave on. See [restoration verification](chart-restoration.json).
- Broad adversarial bar-replay tests, provider-revision invariance, other feeds, realistic broker-cost calibration, baseline comparison, out-of-sample/walk-forward research and demo forward testing remain outstanding.
- Positive cases have small samples. The primary A setup is particularly sparse in this sample. A heuristic quality score is not a probability; the initial results do not justify live deployment.

## Reproducibility and raw evidence

Final strategy SHA-256: `5002409ac85bcb40ad15e260f8caa0cf019890eea36ddeab81ca6d4ff32aa037`.

[Raw matrix](tradingview-matrix.jsonl) · [Raw feature profiles](tradingview-features.jsonl) · [CSV summary](tradingview-summary.csv). Source defaults and module rules are in ../STRATEGIES.md.

Pre-tick-fix observations are archived separately. Stale/unconfirmed UI probes are explicitly marked and excluded from these tables; they are retained for audit rather than presented as passed tests.
