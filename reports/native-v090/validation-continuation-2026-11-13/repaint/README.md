# Recalculation and live-evidence review — 2026-11-13

**General non-repainting remains UNVERIFIED.** This read-only audit reuses preserved evidence and records the current historical repeat separately. Sources and original artifacts retain their existing hashes. Machine-readable findings are in [status.json](status.json).

## Current observational coverage

The current Indicator and Strategy diagnostic hashes match the November 9 static audit. Each wrapper uses five completed-source `[1]` requests, confirmed-bar candidate/plan mutation, confirmed pivots, and a guarded CRT reference timeframe. The wrappers have no volume, `varip`, or viewport-dependent trading path. These safeguards establish source-level properties. Native runtime coverage is assessed separately. [Static audit](../../validation-continuation-2026-11-09/repaint/static-audit.json).

`SIGNAL_DIAG` records `barOpen`, `observedAt=time_close`, candidate/plan state and decision checks. It omits raw OHLC, `barstate.isrealtime/ishistory`, and boot/update counters. `indicator_candidate_trace.pine` also omits these measurement fields and belongs to the frozen baseline parent. Neither stream establishes a qualified entry's actual live first appearance by itself. The existing stable-live snapshot probe records raw OHLC/HTF plus runtime flags and execution counters at lines 1616–1623, using its distinct stable-display parent `267920fe…`; it supplies an existing measurement approach for an isolated current-parent experiment.

## Current M5 → M3 → M5 export

The two November 4 Indicator exports contain 211 diagnostic events over 15 M5 bars and are byte-identical. Both retain effective capture ID `indicator-xauusd-m5-20261113-03:1794567042288` and SHA-256 `6a0c833481fd3c1faa72369810428abff4734d9c8fec9f0ea38fc3bfdd6f2ead`. Exported-stream equality passes. Independent execution remains unverified because cached-result reuse remains possible. These files represent one effective capture for independent-run claims. [Before](../native/indicator-nov4.csv), [after interval round trip](../native/indicator-nov4-recalculated.csv).

The November 11 fresh-ID historical rerun is now exported. The original and repeat use the same source, trading inputs, date window, feed and loaded-history start, but different effective capture identities. Each has a structurally complete, zero-drop window stream of 328 events across 25 M5 bars. All 328 substantive diagnostic events and all 74 `PLAN_AUDIT` rows through the endpoint match at zero tolerance; later plans were excluded because the chart kept advancing. This establishes bounded historical re-execution repeatability. Export-envelope authenticity remains unavailable, and live first appearance is a separate requirement. [Fresh repeat result](fresh-repeat-result.json), [repeat export](../native/indicator-nov11-repeat-fresh.csv), [comparison script](compare-fresh-repeat.mjs).

## Preserved unresolved observations

The archived historical snapshot comparison retains 11/11 OHLC/context/candidate/execution/plan matches. All 11 `lastBarIndex` metadata values differ. This covers those captured rows. [Historical comparison](../../validation-continuation-2026-11-09/repaint/archived-historical-repeat.json).

The archived live test captured one genuine realtime confirmed bar, opening November 6 05:05 UTC and closing 05:10 UTC. Runtime flags change from realtime to historical after reapplication. OHLC and derived/candidate/execution/plan fields match, while raw volume changes from `0` to `null`. Strict raw-data equality therefore remains FAIL. The observed live bar had zero qualified plans, leaving entry first appearance unverified. Original duplicate closing observations were preserved and aggregated only after their complete data snapshots were proven equal. [Raw-backed live analysis](../../../native-v080/live-reload-2026-11-06/live-reload-analysis.json), [strict comparison](../../validation-continuation-2026-11-09/repaint/archived-live-repeat.json).

The separate November 4 09:55 UTC F plan changed planned Entry and formatted `signalPrice` from 4044.77 to 4044.89. Actual Strategy fill changed 4044.79 to 4044.91. The older full OHLC/HTF/dataset snapshot is missing. Later full snapshots retain close 4044.89. The retained records establish the 0.12 historical price discrepancy and its downstream arithmetic. Feed revision, loaded-history dependence and engine behavior remain unproven causes. Matching later captures retain this unresolved earlier observation. [Original records and chronology](../../../native-v080/drift-investigation-2026-11-06/FINDINGS.md).

The highest-value remaining evidence is a qualified live plan captured on its first confirmed closing execution, with exact source and settings, raw OHLC/HTF/candidate/engine state, realtime/history flags and execution identity, followed by a same-source reload/reapplication under matching inputs and history. No live-trading or alert action is required for that observation.
