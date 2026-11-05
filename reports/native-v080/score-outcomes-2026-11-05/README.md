# Score/outcome research and native reload check — November 5, 2026

**New work:** an offline outcome-join tool, four focused checks, independent raw-CSV reconciliation, and one genuine native Strategy reload comparison. Frozen Pine files, existing raw captures and previous ZIPs are preserved. Project remains **v0.8.0**.

## Quality scores: calibration remains inconclusive

`scripts/analyze-plan-outcomes.mjs` joins explicit plans to complete emulator positions using symbol, timeframe, plan time and module, then verifies setup/version/direction, planned prices, actual entry identity, quantities, account currency and final net reconciliation. Partial exits are one position; net already includes commission, which is not subtracted twice. Missing groups/open plans remain separate. Duplicate or inconsistent input fails rather than silently manufacturing an outcome.

The exact-source quantity experiment's previously captured M5 run contains 92 complete positions and 140 exit rows. Its planned-risk cash denominator is the logged `accountRiskPerUnit × initialQty`, not the configurable maximum risk budget or a guarantee of maximum loss.

| Heuristic score | Complete positions | Winners | Observed win rate | Net P&L | Mean net per position |
| --- | ---: | ---: | ---: | ---: | ---: |
| 80 | 22 | 9 | 40.91% | −$0.5811156 | −$0.0264143 |
| 90 | 68 | 27 | 39.71% | −$82.3551292 | −$1.2111048 |
| 100 | 2 | 1 | 50.00% | −$1.1789580 | −$0.5894790 |

Overall: 37 winners / 55 losers, gross before commission **+$76.322**, commission **$160.4372028**, net **−$84.1152028**, mean net **−$0.9142957 per complete position**, position PF **0.793688**, mean net/planned-initial-risk R **−0.103634**. These are already-inspected, in-sample experimental outcomes, not current-baseline or untouched OOS results.

In this M5 capture, B/C always scored 90, D/E/F always 80, and H always 100. There is **no within-module score variation**, so module effects cannot be separated from score effects in these data. A/G have no completed positions here; their performance is not estimated. This observed confounding is not a claim that every module must always have a fixed score under all inputs or market conditions.

The source score is a deterministic checklist (`pine/modules/predicates.pine.inc:41`), and mandatory H1/RR/volatility/session gates fix several components under these run settings. A score of 100 is not a forecast of a 100% win rate. The one-of-two 100-point result has a descriptive IID-binomial Wilson 95% interval of roughly **9.45%–90.55%**; serial dependence and selection limit that interpretation further. No threshold/module was selected or changed from these results. **SCORE_CALIBRATION_INCONCLUSIVE**.

`corrected-outcomes.json` and `legacy-outcomes.json` preserve per-position and module/direction/score summaries separately. Do not pool the runs as independent trades. `verify-outcomes.py` independently joins the original CSVs in Python, checks their preserved hashes and reconciles all 92 positions in each run, including score buckets and planned-risk R.

## Native M15 reload: identical exports, bounded result

Chrome initially disconnected and displayed its profile picker. The user reopened the saved TradingView chart. After native access recovered, the following actual steps completed:

1. On the existing **FOREXCOM:XAUUSD M15** chart, opened the visible exit-audit Strategy's Pine Logs and used **Settings → Download logs**.
2. Inspected the hidden saved Indicator's log view; it showed no logs. No Indicator before/after result is claimed.
3. Captured the chart and performed one native browser reload without editing source, inputs, Properties, visibility or timeframe.
4. Waited for the Strategy's historical calculation, then downloaded its logs again.
5. Closed the temporary log pane. The final native state shows M15, original Strategy visible, saved Indicator hidden, Replay off, editor/log panes closed and **All changes saved**. Screenshots and accessibility observations are preserved.

**Result: `OBSERVED_RELOAD_LOG_IDENTITY`.** Both raw CSVs are exactly **507,517 bytes**, SHA-256 `850895a543f573cd0a332be13cebe3f09068a537580e351f0bb37219625e9c4c`. Each contains **650 identical records**: 104 plans, 104 complete-position groups, 119 actual exit rows and 323 lifecycle messages. All display prefixes and embedded payload values match exactly, including plan/setup/event/entry/exit timestamps, prices, quantities and P&L. Captured records span August 6 through November 4, 2026.

The preserved prior restored Strategy copy-back is `a8267588770637b4a75e50367267dac11a8ba6783cdd9084e7d9620ff3961623`; no new copy-back or compile was repeated during this check. That continuity and the saved chart are documented rather than claiming a generic title or payload version independently authenticates today's source. Full inputs were not recaptured in this check; visible scalar legend values and visibility persisted.

The reloaded legacy M15 run reconciles **104 complete positions, 45 winners / 59 losers**, net **−$196.6002099** (native Tester **−$196.60**), gross before commission **−$17.789**, commission **$178.8112099**. Native Tester **54/119 profitable closed rows** is a partial-row statistic, not 54 winning positions. These results belong to the restored legacy experiment and its broader history, not the corrected M5 sample or the prior short fixed-window matrix.

This is a historical reload observation for one saved experimental Strategy. It does **not** establish when a signal first appeared, candle-by-candle non-repainting, native Bar Replay, paired Indicator stability or baseline multi-plan parity. Those release gates remain open. The Free account's Replay gate was not bypassed.

## Reproduce and validate

```sh
node scripts/analyze-plan-outcomes.mjs reports/native-v080/continuation-2026-11-05/corrected-strategy-native.txt > corrected-outcomes.json
node scripts/analyze-plan-outcomes.mjs reports/native-v080/continuation-2026-11-05/legacy-trace-native.txt > legacy-outcomes.json
python3 reports/native-v080/score-outcomes-2026-11-05/verify-outcomes.py
python3 reports/native-v080/score-outcomes-2026-11-05/verify-reload.py
```

The first two example outputs go to the current directory and do not overwrite preserved evidence. The verification scripts regenerate their derived JSON/text artifacts from unchanged raw CSVs.

Focused tests: **4/4**. Full `npm run verify`: **173 tests / 17 files passed**, TypeScript, generation consistency and all ten independent Pine parses passed. `npm audit --omit=dev`: **0 vulnerabilities**. Production dependency tree: **empty**. Output is saved here. No Pine source or production webhook changes were made; no live orders, alerts, Telegram messages, deployment or account upgrade occurred.

The existing quantity correction remains isolated. Strict parity differences, candle-by-candle evidence and untouched OOS are unresolved; the unchanged prospective M5 holdout starts **November 6, 2026 UTC**. This analysis does not alter that protocol, source, inputs or evaluation window.
