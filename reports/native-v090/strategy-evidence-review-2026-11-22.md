# Strategy evidence review — November 22, 2026

## Decision

Keep the v0.8.0 production defaults. Keep the custom MSNR body-flip rule and M15 confirmation filter as optional research settings. Do not promote any tested variant on the current historical results. The fixed November 23–December 7 window is the next untouched comparison; preserve its sources and settings until the data is captured.

## What published research supports

- Osler's study of support/resistance levels supplied by six FX firms found evidence that the levels predicted intraday trend interruptions, with predictive power varying by exchange rate and firm. Its data covered selected currency pairs and 1996–1998, not XAUUSD M5 or this indicator's pivot clusters. [New York Fed, *Support for Resistance: Technical Analysis and Intraday Exchange Rates*](https://www.newyorkfed.org/research/epr/00v06n2/0007osle.html)
- A second Osler study examined order placement at one FX dealing bank. Take-profit and stop-loss orders clustered around round numbers and had different directional patterns; stop orders could intensify moves after levels were crossed. This motivates testing both rejection and continuation after a level break. It does not validate any round-number threshold or entry in this project. [New York Fed, *Currency Orders and Exchange-Rate Dynamics*](https://www.newyorkfed.org/research/staff_reports/sr125)
- Lo, Mamaysky and Wang formalized chart-pattern recognition and reported incremental information for some patterns in daily U.S. stock data from 1962–1996. Their result supports explicit, reproducible pattern definitions; it does not establish predictive performance for these A–H approximations on gold. [NBER Working Paper 7613](https://www.nber.org/papers/w7613)
- White's Reality Check formalizes the risk of choosing a best-looking model after repeatedly reusing the same time series. This project has already compared several hold durations, SNR concepts, stops and M15 settings on overlapping historical periods. Those comparisons are exploratory; the next frozen dates must not be retuned after inspecting the results. [White, *A Reality Check for Data Snooping*](https://doi.org/10.1111/1468-0262.00152)

## What this project has measured

The current `MSNR body flip` is a project-defined rule: two opposite closed candles form a body level, a later displaced close breaks it, and only the first later retest can confirm. It should not be presented as a canonical or universally agreed MSNR definition. The implementation and its synthetic edge-case checks are in [`msnr_body_flip.pine.inc`](../../pine/experiments/msnr_body_flip.pine.inc) and [`signal-diagnostics.test.mjs`](../../tests/signal-diagnostics.test.mjs).

The November 20 Module-D-only TradingView comparison recorded one K-SNR position (net −$0.98) and three MSNR positions (one winner, net +$9.16). The broader A–H, 15-minute-hold MSNR run recorded 41 positions, 22 winners and net −$10.01 after commission. These results use different portfolio scopes and small samples; the positive Module-D subtotal does not establish a profitable portfolio. [Module-D comparison](msnr-comparison-2026-11-20/README.md) · [A–H holding-time comparison](ah-holding-comparison-2026-11-21/README.md)

M15-filter results also change across historical windows: one comparison worsened net by $59.76; another improved it by $7.63 while the filtered portfolio still lost money. Keep the filter off by default pending unseen data. [M15 historical results](m15-validation-2026-11-22/README.md)

## Measurement gap and next experiment

Module D has multiple setup modes (`Breakout retest`, `Failed breakout`, and `Rejection`) while MSNR has its separate body-flip process. The current diagnostic stream records the D concept and MSNR body level but does not carry the candidate's setup mode through the selected-plan record. Existing logs therefore cannot cleanly estimate performance by D subtype. Keep the frozen November 23 run unchanged; add subtype attribution only in a separately hashed follow-up capture.

For that follow-up, predeclare one source, one timeframe/feed, one cost model and one chronological holdout. Compare level rejection and post-break continuation as separate hypotheses. Preserve all completed positions and partial exit rows, report net planned-risk R and drawdown with costs once, and show incomplete positions separately. Avoid parameter search on the holdout. Add round-number levels only as a separately defined candidate with a predeclared level spacing and tolerance.

## Limits

The cited studies are old and use different markets, feeds and rules. They provide hypotheses, not evidence that this indicator predicts XAUUSD. Static code inspection, Pine parsing, a TradingView compile, or Indicator/Strategy agreement within a bounded window cannot prove non-repainting or live profitability. The forward capture and later untouched blocks are still required.
