# OOS coverage and accounting refresh — 2026-11-13

The original prospective study remains **INCOMPLETE**. Its declared endpoint is **2026-11-20 00:00 UTC**, which is future at this audit. The first predefined Nov 6–13 summary period has elapsed. A verified native run of the original frozen source and admission settings remains missing from the evidence audited here.

## Provenance checks

The November 5 protocol and its exact source remain unchanged. The current bytes of `pine/experiments/strategy_quantity_units.pine` match frozen SHA-256 `bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed`. All four frozen input/Properties reference hashes match. The protocol still records `runtimeApplied=false` and independent registration as false.

Its original admission window is Nov 6–20 UTC on standard FOREXCOM:XAUUSD M5 candles. It requires the original 115-control configuration, actual native Inputs/Properties and source copy-back, at least 1,000 counted preceding M5 calculation bars, every admitted position, and closure follow-up for any position carried beyond the endpoint. The protocol marks fewer than 30 complete positions inconclusive. Thirty positions alone does not establish independence or statistical power.

Current research diagnostics use `strategy_signal_diagnostics.pine`, SHA-256 `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d`. The current browser capture is root-owned. Any newer diagnostic-source results need their own source, loaded-history and capture attribution before comparison with this protocol.

## Existing native accounting reproduced

The existing `analyzePlanOutcomes` implementation was rerun against decoded Message records from `reports/native-v090/tradingview-strategy-diagnostics-2026-11-08-repeat.csv`. The resulting analysis exactly matches the preserved November 9 analysis. The original raw CSV SHA-256 is `a05d294dc820d78d0ca1ffac71c1e5c8f4ddf194d65884fcd0564287e0e3b0bd`.

| Existing sample measure | Reproduced result |
| --- | ---: |
| Qualified plans | 79 |
| Complete positions | 79 |
| Actual exit rows | 115 |
| Incomplete positions / plans without exits | 0 / 0 |
| Wins / losses | 33 / 46 |
| Observed position win rate | 41.7721519% |
| Gross before commission | $41.5900000 |
| Commission | $137.6080966 |
| Net | −$96.0180966 |
| Position profit factor | 0.745124536 |

Decimal arithmetic over the 115 unique `closedTradeIndex` rows verifies **41.5900000 − 137.6080966 = −96.0180966**. Net already includes commission. Modeled slippage is embedded in the native fill prices. No additional slippage, commission or assumed spread deduction was made.

| Module | Complete positions | Exit rows | Net USD |
| --- | ---: | ---: | ---: |
| A | 0 | 0 | 0.0000000 |
| B | 48 | 71 | −110.0970622 |
| C | 9 | 12 | +28.9242367 |
| D | 3 | 4 | +26.7809972 |
| E | 5 | 10 | −15.1668641 |
| F | 12 | 13 | −25.2804462 |
| G | 0 | 0 | 0.0000000 |
| H | 2 | 5 | −1.1789580 |

These counts describe the inspected shared-arbitration sample. The existing isolated A/G evidence remains separate. This audit selects no module, parameter, score threshold or holding time from these outcomes.

The exit rows contain 27 `STOP_LOSS_HIT`, 16 `TP1_HIT`, 2 `TP2_HIT` and 70 `TRADE_CLOSED` records. Grouping by actual symbol, timeframe, entry ID and entry time yields **9 final stop positions and 70 final time-close positions**. Every time-close row has a `Close entry(s) order …` exit ID and an actual holding duration of at least 15 minutes. The exact diagnostic source has one `strategy.close` path, at line 1440, guarded by the holding-time condition. This combination supplies the classification evidence. Partial target rows are aggregated into their original position and have no separate final-position count.

## Original OOS coverage remains incomplete

The reproduced native entries span Oct 12 10:05 through Nov 6 16:35 UTC, with the last exit at Nov 6 16:50 UTC. Seventy-five admitted plans precede the protocol start, establishing that this export ran with a broader admission history. Earlier entries affect equity, quantity, occupied slots and candidate state.

Four already-inspected Nov 6 positions overlap the declared interval. Their six exit rows total gross **−$11.6550000**, commission **$6.9050137** and net **−$18.5600137**, with one win and three losses. They retain their exploratory subset attribution. The bounded diagnostic capture includes 36 M5 bars. Its early `firstDataTime` does not establish a counted 1,000-bar warm-up.

The November 9 prospective tail suggestion starting Nov 10 has also partly elapsed. This refresh creates no replacement window and supplies no completed untouched OOS claim. New prospective work needs an explicitly recorded start before its observed outcomes, followed through its declared endpoint without retuning.

## Verification statuses

- **PASS** — frozen source and all four reference hashes, exact reproduction of the existing 79-position analysis, 115 unique exit indices, decimal cost reconciliation and one final category per complete position.
- **FAIL** — no new automated accounting failure in this refresh.
- **SKIP** — native execution of the exact frozen-source protocol, counted warm-up verification, endpoint completion through Nov 20, and independent OOS efficacy conclusions.

The machine-readable audit is `status.json`. The earlier repaint audit retains its unresolved live/reload observations. Accounting reproduction supplies no additional repainting evidence.

The highest-priority next action is to obtain the exact frozen-source native run with the original Nov 6–20 admission settings and counted warm-up. Preserve all native plans, fills and exits through Nov 20, then follow carried positions to closure. Source changes, tuning, native browser interactions and scheduled background work were outside this read-only audit.
