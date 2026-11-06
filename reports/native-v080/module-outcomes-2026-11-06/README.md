# Actual selected-module outcomes — November 6, 2026

The preserved native M5 Strategy capture contains **75 completed positions, 109 closed-trade rows, 32 winning positions and 43 losing positions**. Actual price P&L before commission is **+$53.2450000**; commission is **$130.7030829**; realized net is **−$77.4580829**, with completed-position net profit factor **0.777373528**. These historical selected positions do not establish module effectiveness, OOS performance or future profitability.

This extends the earlier score/module summaries with an independent Decimal reconciliation of the current stable source, all A–H rows including zero samples, exact actual-entry grouping, holding times and partial-aware final-exit causes. It does not rerun unrelated tests or modify Pine, inputs, raw evidence or the saved chart. Project stays **v0.8.0** and its database-free production architecture is unchanged.

## Evidence attribution and scope

- Raw [stable-strategy-raw.csv](../live-reload-2026-11-06/stable-strategy-raw.csv): SHA-256 `82f145f6d6617ded2052ac2c71fc3ff1bf5bcbacf07e0c3d0360d84f535ee29b`.
- Separate [stable Strategy](../../../pine/experiments/strategy_stable_display.pine): SHA-256 `ce6c1256bd9d29387f194be4ac715e479bf98f14bdcc0e9c697e5f4110f2aae9`. The existing complete native editor copy-back normalizes exactly to this source. Native compile context and runtime provenance remain in the [original capture review](../live-reload-2026-11-06/README.md). The log payload itself has no source hash.
- All **117 actual native inputs** are retained in the JSON result and linked by file hashes. All A–H enabled, Close entry, H1 alignment, London session, quality75, cooldown5, maximum5 plans/session, holding15minutes, fixed R1/2/3 and partial exits. Research-window restriction is **off**; its configured start/end are not an active sample restriction.
- Captured Strategy Properties are USD10,000, commission0.01% per side, slippage2ticks, one-tick order delay and on-bar-close calculations. Group telemetry records USD account currency, point value1 and minimum tick0.01. No explicit spread model is configured.
- First completed position entry **October12 10:05 UTC**; last completed position entry **November5 14:20 UTC**. This is the span of actual selected entries in the export, not a newly asserted complete backtest window or OOS split.

## Completed positions by selected module

Wins and losses use the **entire position's net result after all partial rows and commission**, not individual TP/SL legs. E combines Demand and Supply; the JSON also retains those subtypes. Display name K-SNR retains the actual export ID `D_SNR`.

| Module | Positions | Win / loss / flat | Actual exit rows | Gross price P&L | Commission | Net USD | Group net PF | Mean hold min | Final time / stop |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A · Sweep / MSS / FVG |0|0 / 0 / 0|0|0|0|0|No sample|—|0 / 0|
| B · CRT |45|17 / 28 / 0|68|−3.0370000|78.2629715|−81.2999715|0.623|14|39 / 6|
| C · Confirmed-pivot Turtle Soup |8|6 / 2 / 0|9|32.6750000|13.9878403|18.6871597|3.224|15|8 / 0|
| D · K-SNR |3|3 / 0 / 0|4|32.0660000|5.2850028|26.7809972|No observed losses|15|3 / 0|
| E · Supply / demand |5|1 / 4 / 0|10|−6.4210000|8.7458641|−15.1668641|0.560|10|3 / 2|
| F · Trend pullback |12|4 / 8 / 0|13|−4.3200000|20.9604462|−25.2804462|0.635|15|12 / 0|
| G · AMD approximation |0|0 / 0 / 0|0|0|0|0|No sample|—|0 / 0|
| H · Confirmed Quasimodo approximation |2|1 / 1 / 0|5|2.2820000|3.4609580|−1.1789580|0.942|10|1 / 1|
| **All selected positions** |**75**|**32 / 43 / 0**|**109**|**53.2450000**|**130.7030829**|**−77.4580829**|**0.777**|**13.933**|**66 / 9**|

Profit factor equals sum of positive **group net** results divided by the magnitude of negative group net results: `270.4703652 / 347.9284481 = 0.777373528…`. D has only three winning observations and no observed loss; a finite profit factor is not estimated. A/G have no selected completed positions; missing efficacy is not assigned a win rate or a zero profit factor.

Gross price P&L already uses actual emulator fill prices with the configured slippage. It is **before commission**, not frictionless. Four positions had positive price P&L but negative net after commission. The total positive gross is insufficient to cover this run's fees; this is an observed sample result, not a recommendation to change rules or costs.

## Exact arithmetic and partial-aware exits

The independent script decodes the CSV Message column without rewriting it. Each position is joined by symbol, timeframe, module/actual entry ID, actual entry time and plan timestamp. All109 unique closed-trade indexes are consecutive; all75 groups have matching accepted plans and complete closed quantities. There are no duplicate, unmatched or incomplete groups in this capture.

For each group:

```text
gross price P&L = sum(direction × (actualExit − actualEntry) × abs(exitSize) × pointValue)
commission     = sum((actualEntry + actualExit) × abs(exitSize) × pointValue × 0.0001)
net            = gross price P&L − commission
               = sum(closed-row profit) = TRADE_GROUP_AUDIT.netProfitDelta
```

All three monetary reconciliations have **exact zero residual at the serialized precision** for every group. The script permits only1e−7 cash serialization error and reports the actual residuals; it never applies a nonzero price-matching tolerance. Costs are not subtracted twice from native closed-row profit. The unchanged repository outcome analyzer separately agrees on every selected subtype's count, wins/losses and net, and overall75 positions/109 rows/−77.4580829USD.

**Final time exits66; final stop exits9.** Time classification requires each final row's exact `Close entry(s) order <entryId>` ID, `TRADE_CLOSED` comment, actual15-minute holding time, captured `timeExit=15` input and the reviewed source's **sole** `strategy.close` call under the elapsed-time condition ([source line1158](../../../pine/experiments/strategy_stable_display.pine#L1158)). The label is not inferred from duration or comment alone. Stop classification uses the actual final `STOP_LOSS_HIT` comments from bracket orders.

The native bracket IDs `TP1`, `TP2`, `TP3` each contain a stop leg and a target leg ([source line1147](../../../pine/experiments/strategy_stable_display.pine#L1147)). Therefore an exit with ID `TP3` and comment `STOP_LOSS_HIT` is a stop fill, not TP3 success. The109 rows comprise66 timed close rows,27 stop-leg rows,15 `TP1_HIT` rows and1 `TP2_HIT` row. No `TP3_HIT` row is present. Nine stopped positions generated three bracket rows each; they count as nine losing positions, not27 trades. Fifteen positions had actual profitable target partials; those partials do not individually establish a whole-position winner.

Twenty-four positions have multiple closed rows, including the nine simultaneous bracket-stop groups; fifteen have exits at more than one actual timestamp. Holding times are0minutes for2 groups,5minutes for3,10minutes for4 and15minutes for66. The two0minute groups entered and stopped within the same M5 timestamp. These values do not reveal their precise intrabar time/path; no zero-risk or instantaneous real-world execution is inferred.

## Selection and research limits

This all-modules run admits one plan/position slot at a time ([source line907](../../../pine/experiments/strategy_stable_display.pine#L907)). The safe candidate with highest quality wins; ties retain the existing candidate order A,B,C,D,E-demand,E-supply,F,G,H ([array](../../../pine/experiments/strategy_stable_display.pine#L406), [strict-score comparison](../../../pine/experiments/strategy_stable_display.pine#L948)). Opposing qualified directions suppress an entry, and session/H1/risk/quality/cooldown/quota gates further select the observed population. B's45 selected positions therefore do not prove45 unique CRT opportunities independent of the other modules. A/G's zero selected positions do not identify which detection, filter, arbitration or shared-state gate excluded them.

These are conditional selected outcomes, not independent module backtests. C/D's small positive subsets do not justify preferred settings or establish an edge. Their observations are sparse and the inspected data are not untouched OOS. Gross positive H becomes net negative after fees; E-demand and E-supply remain separately visible in the JSON so their mixture is not hidden.

This capture overlaps earlier reports and must not be pooled with them as an additional independent sample. The preserved Nov4 F entry recalculation changes F by **−0.2640264USD**, producing this total instead of the earlier−77.1940565USD. Its root cause remains unresolved in the [separate drift review](../drift-investigation-2026-11-06/FINDINGS.md); it is not attributed to a module improvement or a display effect.

No live order, real alert, Telegram message or deployment occurred. General non-repainting, untouched OOS/walk-forward performance, spread sensitivity and future profitability remain unverified. No module, threshold or trading-rule change is recommended from this selected sample.

## Reproduce

From the project root:

```bash
python3 reports/native-v080/module-outcomes-2026-11-06/analyze-module-outcomes.py
```

The script verifies the preserved raw/source hashes and native copy-back attribution, requires all117 captured inputs, validates identities/quantity/cash/exit causes and cross-checks the existing analyzer. It writes only [module-outcomes.json](module-outcomes.json). Decimal monetary values are serialized as strings to preserve their actual exported precision.
