# Qualified C plan and same-Indicator reload check — November 6, 2026

The saved confirmation-review Indicator produced a **C BUY plan at 11:20 UTC** and a **B SELL plan at 12:15 UTC** on November 6. Both planned records match the temporary stable-display Strategy exactly at tolerance zero. The C position closed in three parts for **+$10.237077 net**; B time-closed for **−$15.0011715 net**. These are emulator research results. The full historical streams still fail strict parity.

Before the paired follow-up, the C plan's Entry4066.00, SL4062.66 and targets4069.34 /4072.68 /4076.02 were also unchanged across a native Indicator reload. This is a bounded same-Indicator stability result, not a full non-repainting pass.

The plan was already present when observation resumed around18:30 Phnom Penh. Its first appearance was **not observed**. [Before-reload chart](../module-isolation-2026-11-06/qualified-c-plan-resumed.png).

## Actual comparison

| Artifact | Records / plans | SHA-256 |
| --- | --- | --- |
| [Before raw CSV](indicator-before-reload-raw.csv) |324 /75|`49c7a0f93d26ecd0feccd10f0c4a38870b5eee19a2fe84b5ad97fb5a7503b3b7`|
| [After raw CSV](indicator-after-reload-raw.csv) |324 /75|`e2504a6e35844078ab46bd2d9406c8a752518b29475f1b97ebf4525a1a1fd015`|

**All75 PLAN_AUDIT records match in every original field at tolerance0. All324 original Message strings are also identical.** The two files differ only in displayed `Date` formatting: before uses+07:00, after−00:00. Every prefix represents the same instant. Embedded payload timestamps are unchanged; no timezone correction or row rewriting was applied to the raw evidence. [Reproducible comparison](reload-analysis.json).

The newest record is:

| Field | Value in both captures |
| --- | --- |
| Symbol / timeframe |FOREXCOM:XAUUSD /5|
| Module / direction / mode |C_TURTLE_SOUP /1 /Close|
| Plan timestamp |1793964000000 =Nov6 11:20UTC|
| Setup timestamp |1793963100000 =Nov6 11:05UTC|
| Entry / SL |4066.00 /4062.66|
| TP1 / TP2 / TP3 |4069.34 /4072.68 /4076.02|
| Quality / accepted |90 /true|
| Execution model |INDICATOR_ESTIMATE|

The before capture has BUY_SIGNAL and ENTRY_TRIGGERED with `eventTimestamp=11:20UTC`, followed by TP1_HIT with `eventTimestamp=11:25UTC`. These payloads are identical after reload. The historical display prefix is the corresponding M5 bar open, five minutes earlier. TP1 is an Indicator touch estimate; it does not establish an emulator or broker fill. The75 plans comprise all74 plans in the preceding stable-display Indicator capture, unchanged, plus this one new C plan.

At11:35UTC, the [final chart](final-chart.png) visibly changed to `WAIT · previous BUY`, `Signal cooldown`, and `Time exit (est.)11:35UTC`; the ladder became muted to identify a closed previous plan. This screenshot was captured **after** both raw exports and is separate evidence. No Strategy Tester exit price, partial fill, realized PnL or profitability conclusion is inferred from it.

## Attribution and limits

The captured stream is the existing saved `XAUUSD SMART SCALPER PRO · A-H Confirmation review` Indicator. Its previously verified local hash is `0a19862b22973e13a31abb29e59a75a18f3e0b84bb76deb2154eae7fa4cd1ed3`. No source text was pasted, updated or compiled during this check. The saved study was retained through reload, with A–H and audit visibly enabled in the restored controls. This is saved-instance continuity evidence; the CSV carries no full source hash, and no fresh full editor copy-back was made. The separate stable-display Strategy editor draft remained unattached after restoration and is not the source of these Indicator records.

No full bar-state/OHLC snapshot was captured at the plan's first live close. A matching historical reload cannot exclude an earlier appearance, feed correction or every live/historical divergence. The saved Indicator still uses the older viewport-dependent renderer; the separately tested stable-display alternative has not been promoted into the saved chart. This result does not resolve the earlier Nov4 recalculation discrepancy.

The initial comparison above covers **same-Indicator reload**, independently of the later paired exports below. No Bar Replay, untouched OOS, spread calibration, broker fill or Telegram delivery is claimed. Baseline v0.8.0 source and database-free backend are unchanged.

## Completed paired Strategy follow-up

Under the existing temporary-testing authorization, Autosave was turned off and the unchanged stable-display Strategy draft was added as a fourth study. Pine Editor showed successful compilation at **19:03:55 Phnom Penh /12:03:55 UTC**. A screen-capture interruption was resolved after the user brought TradingView forward; exports and restoration were then completed. No source editing was required.

All **117 actual Strategy inputs** were captured across nine overlapping AX pages. They match the prior saved Indicator's 117-control capture exactly, including all A–H enabled, audit on, quality75, London session, H1 alignment, Close mode, 15-minute hold and partial exits. [Observed inputs and controls](paired-runtime-inputs.json). The Indicator context relies on the earlier full capture and unchanged saved-instance continuity; it was not independently recaptured in full again. The research date restriction is off. Configured date inputs remain Jan1,2026–Jan1,2027 UTC, but do not restrict this run. Raw event coverage is not proof of the chart's full warm-up/history range.

[Native Strategy Properties](paired-properties-resumed.ax.txt) show USD10,000, commission0.01% per side, slippage2 ticks, default four-tick bar detail, on-bar-close calculation, one-tick execution delay and1x leverage. Explicit Pine `qty` controls order size. There is no spread model. The earlier file `paired-properties.ax.txt` actually shows Inputs during the interruption; use the resumed Properties capture linked here.

| Preserved native export | Rows / plans | SHA-256 |
| --- | --- | --- |
| [Indicator paired CSV](indicator-paired-raw.csv) |330 /76|`b7bda756ed58a028a2a599db4c78582fd29b435fea56e64ecdf7130781963273`|
| [Strategy first CSV](strategy-paired-raw.csv) |602 /77|`31bbd84dee6d156646b28ec53a5560fe4a4fe3a6cda68fc7215048587c73ee79`|
| [Strategy final CSV](strategy-paired-final-raw.csv) |602 /77|`2541b80179fe343775957472620c2eb451755d3224a86cd24bd726c21c77048d`|

Both Strategy exports have identical Message strings and Date instants; only timezone formatting differs. CSV decoding is performed in memory, without rewriting the raw artifacts. [Reproducible paired analysis](paired-analysis.json).

### Planned fields versus execution

| Plan UTC / module | Planned Entry | SL | TP1 / TP2 / TP3 | Planned comparison |
| --- | ---: | ---: | --- | --- |
| Nov6 11:20 /C |4066.00|4062.66|4069.34 /4072.68 /4076.02|Exact, all original fields except executionModel|
| Nov6 12:15 /B |4063.93|4073.60|4054.26 /4044.59 /4034.92|Exact, all original fields except executionModel|

Both are Close-mode, quality90, executionAccepted=true. C setup is11:05 UTC; B setup is11:40 UTC. This **two-new-plan match** does not erase the failed full-stream result: **76 Indicator plans /77 Strategy plans,74 common timestamps,71 exact common plans,3 differing common plans,2 Indicator-only and3 Strategy-only plans**. The existing comparator independently reports the same failure at tolerance zero. Differences are retained in JSON: Oct22 15:40 and Nov3 08:40 differ in setup time; Nov4 10:20 differs in selected module, setup time, score, SL and targets. Execution models are reported separately.

The Indicator filled-entry estimates are4066.00 and4063.93. Actual emulator entries are4066.02 and4063.91. Strategy `ENTRY_TRIGGERED.eventTimestamp` is five minutes later than the common plan timestamp, while actual `entryTime` equals the plan timestamp at the next M5 opening. The actual C/B final exits are11:35/12:30 UTC; their Strategy close notifications are observed at11:40/12:35. Historical Date prefixes refer to the observation bar's opening, while lifecycle eventTimestamp uses its close. Actual entry/exit times come from separate emulator fields. These are different clocks, not contradictory prices or a parity pass.

### Actual exits and exact arithmetic

| Position / exit leg | Qty | Actual entry → exit | Gross USD | Commission USD | Net USD |
| --- | ---: | --- | ---: | ---: | ---: |
| C /TP1 at11:20 |0.6|4066.02 →4069.34|1.992|0.4881216|1.5038784|
| C /TP2 at11:30 |0.6|4066.02 →4072.68|3.996|0.4883220|3.5076780|
| C /time remainder at11:35 |0.9|4066.02 →4072.64|5.958|0.7324794|5.2255206|
| **C total** |**2.1**|**15-minute total hold**|**11.946**|**1.7089230**|**10.2370770**|
| **B /time close at12:30** |**2.1**|**4063.91 →4070.24**|**−13.293**|**1.7081715**|**−15.0011715**|

Gross = direction×(actual exit−actual entry)×quantity×pointValue. Fee = (actual entry+actual exit)×quantity×pointValue×0.0001. Native telemetry gives pointValue1, minTick0.01 and minContract0.1. Gross already includes emulator slippage through the actual fills; do not subtract slippage again. `profit` is already net of commission; subtracting it again would double-count fees.

The C quantity allocation is0.6/0.6/0.9 and closes all2.1 units. Its TP1 and TP2 records carry their actual exit identifiers/comments. The final0.9 C row and the2.1 B row have exact `Close entry(s) order <module>` identifiers, `TRADE_CLOSED` comments,15-minute actual holds and corresponding TIME_EXIT lifecycle classifications. The source has a single timed `strategy.close` call at [strategy_stable_display.pine:1158](../../../pine/experiments/strategy_stable_display.pine#L1158), using elapsed actual entry time and `immediately=false`. These combined facts establish the timed final closes for these captured emulator positions. They are not stop exits. B's actual exit4070.24 is below its short stop4073.60; no B TP/SL partial row exists. This does not establish live broker execution or exclude every intrabar path assumption.

Sizing also reconciles independently. C equity9922.5419171 gives riskQty14.8541046663 and exposureQty2.1963324460; B equity9932.7789941 gives riskQty5.1358733165 and exposureQty2.1997182763. Each uses the smaller exposure quantity, floored to0.1 units =2.1. Planned initial cash risk is$7.014 for C and$20.307 for B, below the nominal0.5% risk budget because the90% exposure cap binds. The UI default order-size setting does not override these explicit quantities.

### Full captured emulator sample and limits

The final export reconciles **77 complete positions /113 actual exit rows** with zero Decimal residual: **gross+$51.898 −$134.1201774 commission =−$82.2221774 net**. This rounds to the native Tester's−$82.22. There are33 positive and44 negative completed positions; group-net profit factor is0.7734486993. Final exits are68 timed closes and9 stops. The temporary UI's earlier112 rows were partial exit rows before the B close, not112 independent positions. The new two-position extension contributes−$4.7640945 net to the preceding75-position sample.

The selected-module counts are A0, B46, C9, D3, E5, F12, G0, H2. These are combined arbitration selections, not independent module efficacy tests. A-only/G-only coverage is recorded separately. This historical inspected sample is negative after configured costs; it does not prove universal unprofitability or establish an OOS edge. The two new Nov6 plans are not a substitute for the frozen prospective protocol, complete run context or adequate future data. No filter, rule or target was tuned from these outcomes.

Source attribution uses the previously exact-copy-backed stable Strategy hash `ce6c1256bd9d29387f194be4ac715e479bf98f14bdcc0e9c697e5f4110f2aae9` with unchanged editor continuity and fresh compile. The Indicator uses the saved confirmation-review hash above. CSVs do not authenticate their own source hashes, and no new full copy-back was made. The earlier Nov4 reload drift, general non-repainting, strict full-stream parity, reproducible cross-timeframe/spread research and OOS gates remain open.

### Final restoration

The saved three-study M5 chart was reloaded, removing the temporary fourth Strategy. [Original study visibility](paired-original-studies-restored.ax.txt) shows the confirmation-review Indicator visible, original exit-audit Strategy and baseline Indicator hidden. [AutosaveON](paired-autosave-restored.png) and the [final restored chart](paired-final-restored.png) were visually verified. Pine Editor and Logs are closed. Baseline sources, trading rules and database-free backend are unchanged. No real trade, live alert, Telegram send, paid upgrade, account switch or deployment occurred.

Reproduce from the project root:

```bash
python3 reports/native-v080/qualified-plan-2026-11-06/analyze-reload.py
python3 reports/native-v080/qualified-plan-2026-11-06/analyze-paired.py
```
