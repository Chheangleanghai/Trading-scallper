# All-available-history plan parity review — 2026-11-09

**Strict planned-field parity fails for the available historical exports.** The fresh native Indicator export contains 78 plans; the preserved native Strategy export contains 79. There are 76 common plan timestamps: 73 exact matches and 3 differing common plans. Two plans occur only in Indicator and three only in Strategy. The repository comparator reports 14 field-or-missing-plan differences across **eight plan keys**, at tolerance 0.

This is all available `PLAN_AUDIT` history in these exports, from **2026-10-12 10:05 UTC through 2026-11-06 16:35 UTC**. It is not the entire market history. No plan, price, setup timestamp, or real mismatch was normalized away. Expected `executionModel` differences are preserved separately by the existing comparator.

| UTC plan timestamp | Difference | What current evidence establishes | What remains unresolved |
| --- | --- | --- | --- |
| Oct 19 10:35 (`1792406100000`) | Indicator-only F | Prior shared F closes in Indicator at 10:20; Strategy reports closure at 10:25. Indicator's new F setup is 10:20. | Current capture lacks candidate/ENGINE records at those times; archived traces support different later F triggers. |
| Oct 19 11:05 (`1792407900000`) | Strategy-only B | Earlier same-session accepted-plan counts are Indicator 5 / Strategy 4, consistent with the reported quota of 5. | No current `CHECKS` row shows whether an Indicator candidate reached its quota check. |
| Oct 22 08:35 (`1792658100000`) | Strategy-only B | Prior B closure observation is 08:25 Indicator / 08:30 Strategy; Strategy's new B setup is 08:30. | Current candidate replacement/invalidation path is absent; archived traces support it. |
| Oct 22 15:40 (`1792683600000`) | F setup timestamp only | Setup 15:25 Indicator / 15:30 Strategy matches prior B closure observations exactly. Prices and other planned fields match. | No current equivalent-state candidate trace establishes the complete causal path. |
| Nov 3 08:40 (`1793695200000`) | F setup timestamp only | Setup 08:20 Indicator / 08:25 Strategy matches prior B closure observations exactly. Prices and other planned fields match. | Same missing current ENGINE/candidate evidence. |
| Nov 4 10:20 (`1793787600000`) | B versus F; setup, quality, SL/TP differences | Prior F closure observation is 10:10 Indicator / 10:15 Strategy. Indicator selects B90 from 10:10; Strategy selects F80 from 10:15. | Current arbitration candidates are not logged there; archived traces support the B/F competition mechanism. |
| Nov 5 12:15 (`1793880900000`) | Indicator-only F | Prior shared F closure observation is 11:10 Indicator / 11:15 Strategy. Indicator's later selected F originated at 11:10. | **Highest-priority unresolved candidate episode:** no current trace proves what replacement or rejection occurs in Strategy before 12:15. |
| Nov 5 14:20 (`1793888400000`) | Strategy-only B | Earlier same-session accepted-plan counts are Indicator 5 / Strategy 4, consistent with quota saturation after the extra Indicator F. | Current candidate readiness/first blocker is not directly logged there. |

The five-minute close-observation differences above are direct facts from the **current** native lifecycle payloads, not inferred from chart prefix formatting. They support execution-state divergence because the engine creates candidates only while its position/order slot is idle. They do not prove every missing candidate transition. The two quota counts establish saturation under the reported maximum-five London-session context; the absence of a specific candidate's `CHECKS` event prevents treating its exact decision path as established.

All eight mismatched plan keys occur **outside** the complete native `SIGNAL_DIAG` window, which is Nov 6 14:00–17:00 UTC. Their missing `ENGINE`/`CHECKS` records mean **unavailable evidence**, not zero failed checks. Archived traces from other source variants support several mechanisms but are explicitly kept as supporting experiments, never relabeled as current captures. Full runtime settings equality and complete Strategy Properties are also not established by the existing pair.

The fresh Indicator's **78 available plans exactly repeat all 78 plans in its November 8 repeat export**, including every planned field and execution field, at tolerance 0. This is observed historical plan repeatability across exports. It does not constitute controlled reload/Replay validation or prove non-repainting.

## Reproduction and artifacts

Run from the repository root:

```sh
node reports/native-v090/validation-continuation-2026-11-09/parity/analyze-full-history.mjs
```

The evidence script reuses `decodePineCapture`, `parsePlanAudit`, and `comparePlanAudits`; raw CSVs remain unchanged. `full-history-comparison.json` includes raw source hashes, every actual mismatch, all available plan rows, current lifecycle timelines, archived classifications, and the exact repeatability comparison. `indicator-plans.json` and `strategy-plans.json` contain all parsed plan records.

No Pine source or trading parameter was edited. No full local suite was rerun for this read-only analysis. The existing comparator executed successfully and returned a substantive parity **FAIL**; that is an investigated result, not a tool failure.

## Highest-value next native evidence

Use the exact current wrappers and equivalent full Inputs, Strategy Properties, feed, M5 bars and loaded history. Change **only the diagnostic logging window**; changing the trading research window would change the historical engine state being investigated. Start with **Nov 5 10:30–14:45 UTC (17:30–21:45 WIB)**. It covers the prior shared F plan, Indicator's 11:10 setup, the missing Strategy candidate episode through 12:15, and the downstream 14:20 quota difference.

`targeted-windows.json` contains that priority window and five smaller windows covering the other mismatch origins. Each has a 6,000-event diagnostic budget, but actual dropped-event and export-completeness checks remain mandatory. Run both models with new capture identities, preserve exact source copy-backs, and compare `ENGINE`/`STATE`/`CHECKS` at the setup origins before declaring any rule defect or attempting a rule change.
