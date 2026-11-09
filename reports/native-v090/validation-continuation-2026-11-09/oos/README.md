# OOS protocol and available-data audit — 2026-11-09

**Result: the larger prospective OOS study cannot be completed today.** The existing frozen window ends **2026-11-20 00:00 UTC**, which is still future at this audit. No future bars, positions, or profitable outcomes were invented. No source, parameter, module, feed, or holding-time selection was made from the results below.

The audit is reproducible with `python3 reports/native-v090/validation-continuation-2026-11-09/oos/audit-oos.py`. It verifies the original protocol/source/reference hashes and reuses the existing `analyzePlanOutcomes` accounting engine on decoded native CSV Message records. It does not rerun the full local test suite or interact with TradingView.

## Frozen protocol remains intact

The locally prepared November 5 protocol is `reports/native-v080/continuation-2026-11-05/prospective-oos-protocol.json`. Its intended admission interval is **Nov 6–20 UTC** on **FOREXCOM:XAUUSD standard M5 candles**. It explicitly records `runtimeApplied=false`, and it is not independently registered.

- Frozen source: `pine/experiments/strategy_quantity_units.pine`.
- Frozen and current on-disk SHA-256: `bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed` — exact match.
- All four referenced complete-input/Strategy-Properties capture hashes still match.
- Intended overrides: `useResearchWindow=true`, `researchStart=1793923200000`, `researchEnd=1795132800000`. All other values remain the frozen 115-control configuration: A–H on, M5, London/H1 filters, quality 75, Close entry, 15-minute maximum holding, partial targets, risk 0.5%, notional cap 90%, break-even/trailing off; USD 10,000, commission 0.01% per side, 2-tick slippage, no spread model.
- The protocol requires at least **1,000 actual preceding M5 calculation bars** and source copy-back plus complete current native Inputs/Properties. Fewer than 30 completed positions is explicitly inconclusive; 30 is not a statistical-power guarantee.
- Nov 6–13 and Nov 13–20 are predefined chronological summaries without retuning, not walk-forward optimization.

Machine-readable reference checks and full protocol context are in `protocol-and-coverage-audit.json`.

## Available native evidence is not that protocol run

The newest preserved native Strategy export audited here is `reports/native-v090/tradingview-strategy-diagnostics-2026-11-08-repeat.csv`, SHA-256 `a05d294dc820d78d0ca1ffac71c1e5c8f4ddf194d65884fcd0564287e0e3b0bd`.

The existing analyzer reconciles **79 admitted plans, 79 completed positions, and 115 actual exit rows**, with no incomplete positions or plans lacking exit rows in this export. Actual entries span **Oct 12 10:05 UTC through Nov 6 16:35 UTC**; the last exit is **Nov 6 16:50 UTC**. Its 75 admitted plans before Nov 6 directly demonstrate that this run did **not** apply the protocol's Nov 6–20 admission restriction. This conclusion is based on native plan timestamps, not an assumption from source defaults.

The export belongs to the diagnostics wrapper (`strategy_signal_diagnostics.pine`, current SHA-256 `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d`), rather than the exact frozen quantity source. The diagnostic window only records 36 actual M5 bars on Nov 6; `firstDataTime=2026-10-11 22:00 UTC` shows an early loaded start but does not by itself count 1,000 preceding calculation bars. There is no complete future market-bar dataset in this audited capture.

The complete native accounting output is preserved as `existing-strategy-outcomes.json`. This is reanalysis of existing evidence, not another independent sample.

## Exploratory overlap, explicitly not new OOS

Four completed positions entered on Nov 6 overlap the originally intended study window. They have already been examined in the project's Tester/diagnostic work. Slicing them out of an all-history run cannot reproduce a run that admits no pre-window entries: earlier trades change equity, explicit quantity, slot occupancy, session state, and later candidate histories.

| Already inspected Nov 6 position | Actual exit rows | Gross before commission | Commission | Net |
| --- | ---: | ---: | ---: | ---: |
| C_TURTLE_SOUP | 3 | +11.9460000 | 1.7089230 | +10.2370770 |
| B_CRT | 1 | −13.2930000 | 1.7081715 | −15.0011715 |
| B_CRT | 1 | −2.2440000 | 1.7820220 | −4.0260220 |
| B_CRT | 1 | −8.0640000 | 1.7058972 | −9.7698972 |
| **Total** | **6** | **−11.6550000** | **6.9050137** | **−18.5600137** |

The three C exit rows are one complete position with TP1, TP2 and final-close comments. The four positions contain one win and three losses. Closed-position drawdown from zero is $28.7970907; this is distinct from unavailable intratrade drawdown. Net already includes commission, and slippage is already embedded in the native fill prices. No second fee or slippage deduction, assumed spread deduction, or module-performance optimization was performed.

Detailed positions, module summaries, quantities through the existing reconciliation checks, and limitations are in `exploratory-protocol-overlap.json`. The result is descriptive and sparse. It is not untouched OOS, an efficacy finding, or evidence that future performance has a particular sign.

## What remains possible and what is missing

The exact frozen quantity source and reference settings are available to run prospectively. The original Nov 6–20 study can only reach its endpoint after Nov 20 UTC and after any cross-end position is followed to closure. Its complete raw evidence must include all admitted plans, orders/fills, complete and partial exit rows, rejected/missing/open positions, costs, and separate drawdown definitions. It also needs a counted 1,000-bar warm-up and exact native source, Inputs, and Properties capture.

As of this November 9 audit, **Nov 10–20 UTC** is a wholly future tail that has not yet produced market outcomes. If used, it must be disclosed as a separate prospective continuation with the same frozen source and parameters, and it must not silently replace the original window or be called a completed result today. This audit does not create or apply a replacement protocol, schedule background work, or guarantee enough positions in that short interval.

**Highest-value next action:** apply and record the exact frozen source/configuration before the still-future bars arrive, then collect them through the declared endpoint without tuning. The current native Strategy diagnostics capture can improve engineering provenance, but it cannot by itself finish this prospective OOS gate.

No Pine sources or baseline rules were changed. Only files in this evidence directory were created by this audit.
