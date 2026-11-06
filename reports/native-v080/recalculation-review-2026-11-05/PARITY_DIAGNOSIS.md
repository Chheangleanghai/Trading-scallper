# Planned-signal divergence: execution state versus unresolved data — 2026-11-05

The current pair still fails full planned-signal parity at tolerance zero: Indicator 74 plans, Strategy 75, 72 common, 69 exact common plans, three differing common keys and five unpaired plans. This review explains the execution-state mechanism behind most disagreements; it does **not** convert that result into a parity pass or explain the separate historical chart-close change after reload.

The fresh lifecycle exports and source establish that the two engines do not always have the same candidate-creation opportunity. Indicator Close mode becomes active at the confirmed plan close and releases its estimate when its OHLC/time logic closes. The Strategy follows broker state and observes actual closed trades at its next bar-close calculation. For the relevant timed positions, actual emulator exit time equals the Indicator estimate close, but the Strategy's `TRADE_CLOSED.eventTimestamp` is one M5 bar later. **Actual exit, observation time and historical row prefix are different timestamps.**

The key consequence is more than a delayed notification: `updateCandidates()` gates new B–H setups on `not active and not pending and not brokerBusy`. A five-minute later release can freeze a different candle's high/low as the next trigger, miss a CRT sweep candle altogether, or change the quota path later that session. An identical predicate implementation therefore does not imply identical independent closed-loop plan streams.

## Current evidence and bounded causal assessment

All times below are UTC. Raw records and their original line numbers are collected in [parity-timelines.json](parity-timelines.json). The prior native candidate traces come from separate frozen-parent experiments in `continuation-2026-11-05/`; their identities and hashes are retained. They support the mechanism and repeat these historical differences; they are **not** newly captured candidate traces for the confirmation-review hash.

| Decision | Current mismatch | Evidence and assessment |
| --- | --- | --- |
| Oct19 10:35 | Indicator-only F SELL | Previous common F plan10:05 closes in the Indicator at10:20, while Strategy observes its actual10:20 exit at10:25. Current Indicator setup is10:20. Prior native traces directly show Indicator creating F at10:20 with trigger4167.79 while Strategy is busy; Strategy instead creates F at10:25 with trigger4164.96 and is not ready at10:35. **Strong execution-dependent setup explanation**, supported by current lifecycle and prior native state trace. |
| Oct19 11:05 | Strategy-only B BUY | Indicator has already accepted five London plans, including its extra10:35 F; Strategy has four. Current raw plan counts establish the Indicator quota block. Prior trace explicitly records `Session plan limit` for Indicator B and an accepted Strategy B. **Quota block established**, as a consequence of earlier plan-stream divergence. |
| Oct22 08:35 | Strategy-only B SELL | Previous common B08:10 closes at08:25 in the Indicator, observed08:30 in Strategy. Prior native traces show Indicator creating a B setup08:25 (trigger4088.70, invalidation4093.25), then invalidating it at08:30. Strategy misses the earlier creation while busy, creates a different08:30 B (trigger4090.05, invalidation4094.17), and triggers08:35. The current accepted Strategy plan uses that08:30 setup. **Strong execution-dependent candidate-memory explanation**; no evidence that missing Indicator plan should have passed its frozen rules. |
| Oct22 15:40 | F SELL setupTimestamp differs | Prior common B15:10 has Indicator close15:25 and Strategy observation15:30. Current new F setup timestamps are exactly15:25 and15:30, while Entry4050.67 and all planned levels match. Prior native traces directly show the two creation opportunities and triggers4053.73 versus4051.68. **Execution-dependent setup-origin mismatch**, rather than a price mismatch. |
| Nov3 08:40 | F SELL setupTimestamp differs | Prior B08:05 releases Indicator at08:20, Strategy at08:25. Current F setup timestamps are08:20 versus08:25; Entry3906.84 and all planned prices match. Prior native traces show Strategy busy at08:20 and later F creation at08:25. **Execution-dependent setup-origin mismatch**. |
| Nov4 10:20 | Indicator B BUY90 versus Strategy F BUY80; stops/targets differ slightly | Prior common F09:55 releases Indicator at10:10 and Strategy at10:15. Prior native traces show Indicator creating both B/F at10:10. At10:20 both qualify, B90 wins over F80. Strategy misses the10:10 CRT sweep while busy, creates F10:15, and has no ready B at10:20. B and F invalidation anchors differ4041.08 versus4041.06, producing SL4040.39 versus4040.37 and corresponding fixed-R target differences. **Strong execution-dependent module/arbitration explanation**. Fill slippage is not the reason for these planned levels. |
| Nov5 12:15 | Indicator-only F BUY | Current Indicator F setup originates11:10, the same earlier close of preceding F10:55. Strategy observes that prior closure at11:15. This is the same opportunity-shift mechanism, **but no Nov5 candidate trace exists**, so the exact later Strategy candidate status/trigger/rejection at12:15 is not established. Keep **exact cause unverified**; do not assert which F filter failed. |
| Nov5 14:20 | Strategy-only B BUY | Indicator's12:15 extra F means its13:45 B is the fifth accepted London plan. Strategy's13:45 B is its fourth; it takes its fifth at14:20. Current accepted-plan counts plus the quota predicate establish the Indicator's quota block. Whether its candidate would otherwise have qualified was not logged. **Quota explains absence**, without inventing that missing counterfactual candidate. |

The archived traces directly record different candidate inputs and readiness. They do not show a confirmed error in `breakConfirmed`, `retestConfirmed`, level ordering or the highest-score choice for these cases. Current captures do not include OHLC snapshots for every relevant bar, so this review cannot categorically exclude additional data differences.

## Source evidence

The line pointers refer to unchanged `pine/experiments/indicator_confirmation_review.pine` and `strategy_confirmation_review.pine`:

- Indicator **line198**: `planSlotAvailable()` requires inactive, not pending, no broker occupancy and no cancellation. Strategy **line3** derives `brokerBusy` from actual `strategy.position_size`.
- Indicator **lines371–385**: `maintain()` invalidates the frozen candidate before trigger confirmation; the later trigger is tested against that candidate's own stored level, not another model's level.
- Indicator **lines511–520**; Strategy **lines529–538**: B–H setup creation/confirmation is inside `idleForSetup`; B freezes sweep-candle trigger/invalidation and consumes its reference timestamp at creation.
- Indicator **lines576–588**: F freezes the pullback candle's trigger and structural invalidation; its trend must remain valid.
- Indicator **lines761–787**: estimate time/touch closure releases active state before candidate update at **line804**.
- Strategy **lines754–765,767–826**: broker fill/closed-trade synchronization updates state when emulator records are observed. **Lines1158–1159** submit the deferred timed `strategy.close()` call.
- Indicator **lines839,853–865**; Strategy **line929**: every candidate still passes the quota and risk conjunction; highest score wins. Indicator **lines893–907** increments the accepted-plan count and clears all candidate stages when a plan is selected. This makes earlier divergence propagate forward.

No source or rules were changed in this investigation.

## What remains a different, unresolved problem

The **Nov4 09:55 plan Entry4044.77 →4044.89 after reload**, with its three targets changing and SL unchanged, is separate from the10:20 module disagreement. Close-mode planned Entry is set from the chart `close`; the lifecycle `signalPrice` corroborates the changed value. A delayed broker notification, partial exit or fill slippage cannot by itself explain a changed input close. The archived state evidence above therefore must not be used to dismiss that reload failure. Collect matching OHLC, HTF context and loaded-history snapshots around09:50–09:55 before/after recalculation to identify the cause.

For Nov5 12:15, collect fresh candidate state before update, after update and after arbitration around11:05–12:20. This should record slot occupancy, stage, frozen setup/trigger/invalidation, trend validity, ready status and rejection reason for F. The current sample only proves the earlier release-time difference, not the entire chain to the missing plan.

## Recommended engineering interpretation

The present planned-signal stream is execution-coupled. Full independent Indicator/Strategy parity is consequently a stronger requirement than identical pattern predicates, and it is currently not met. Do not remove setupTimestamp/module mismatches or enlarge tolerance to relabel the run successful.

An isolated future design could compare a shared virtual planning stream against the same market/slot state while treating broker execution acceptance separately. That would be a deliberate state-model change, requiring new hashes, native checks and OOS evaluation; it is not a cosmetic comparator fix and was not implemented here. Until then, report exact common-plan matches, execution-state divergences and unresolved data discrepancies separately. No guarantee of faster entries, higher profitability or non-repainting follows from this diagnosis.
