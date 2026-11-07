# Signal diagnostics code review — 2026-11-07

## Assessment of the proposed engineering plan

The diagnostic-first plan is sound. Keep the baseline strategy rules frozen while adding observability, distinguish candidate signals from emulator orders, and refuse to treat missing data as zero. Do not read this diagnostics work as evidence of trading efficacy.

Two qualifications are essential:

1. A locally continuous `CAPTURE_START`…`CAPTURE_END` stream with no sequence gaps establishes structural consistency only within its configured window. It cannot authenticate that TradingView exported every UI log row or establish source/settings provenance by itself.
2. `FOREXCOM:GOLD` and `FOREXCOM:XAUUSD` must be separate evidence sets. The preserved November 7 raw file identifies `FOREXCOM:XAUUSD`, M5, and `INDICATOR_ESTIMATE`; no Strategy diagnostic export is present here. Do not combine any GOLD screenshot/results with this XAUUSD capture.

## Corrections implemented

- Diagnostic schema v2 creates an event ID from schema, unique capture ID, symbol, timeframe, frozen parent hash, run tag, and sequence. The analyzer deduplicates by the same composite identity and rejects conflicting duplicates. `captureId` combines a user-set per-run value with the script execution timestamp.
- The end marker reports `budgetComplete`, dropped count, attempted-event count, bar coverage, and `WINDOW_END`. The analyzer reports internal budget status separately from stream structure and labels structural completeness as unauthenticated.
- Added lifecycle coverage for selected candidate → qualified plan → order → fill → exit row → completed position. Impossible selected-plan/order link contradictions fail validation; stages absent from a bounded capture are surfaced as gaps instead of fabricated events. An entry/order predating the capture is explicitly marked as unobserved/outside-window possibility.
- Blocker instrumentation is generated from the same 19 actual boolean expressions passed to `candidateRejection`. The test/analyzer require the first failed check, human-readable first blocker, and engine rejection result to agree.
- Generated source parent SHA values are checked against the frozen parent files. Generated hashes below were computed from the actual experimental files on disk.
- Existing v1 capture ingestion remains supported. The prior raw CSV and older analysis JSON remain untouched; a new v2 analysis output was written separately.

## Preserved files and hashes

Frozen baseline hashes are unchanged:

- Indicator: `pine/indicator.pine` — `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`
- Strategy: `pine/strategy.pine` — `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`
- Diagnostic Indicator parent: `pine/experiments/indicator_signal_clarity.pine` — `d4d4866086e13d95fb0e5162bee51050a6fe47a010f4be004bdc5d5c28aba69e`
- Diagnostic Strategy parent: `pine/experiments/strategy_signal_clarity.pine` — `8461833b9f466380dd03d877e94215165544dfee038e407e6d130c840abac479`
- Experimental Indicator generated source: `pine/experiments/indicator_signal_diagnostics.pine` — `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852`
- Experimental Strategy generated source: `pine/experiments/strategy_signal_diagnostics.pine` — `1f35feac980142e1c5719a4e49e645c6d31d6851b83b19d85e22c060686d12b5`
- Preserved raw Indicator CSV: `indicator-run-research-1.csv` — `b2408cfebec8a5a40846e3791e98d1448628f480eaa22e6e8377154be83ed715`

## Results from the preserved Indicator capture

The updated analyzer re-read the preserved v1 CSV: 452 events over 36 consecutive M5 bars; internal budget complete; stream structurally complete but unauthenticated; 11 candidates detected; 8 confirmation-pass records; 2 selected/qualified B_CRT plans. The indicator model has no broker submissions, fills, actual exits, or realized costs, so those are unavailable, not zero.

| Module | Detected | Confirmation candidates | Selected plans | Notes |
| --- | ---: | ---: | ---: | --- |
| A | 1 | 0 | 0 | Invalidated in this window |
| B | 5 | 2 | 2 | Both selected plans are estimates |
| C | 1 | 0 | 0 | Invalidated in this window |
| D | 0 | 0 | 0 | No setup observed in this window |
| E | 0 | 0 | 0 | No setup observed in this window |
| F | 2 | 2 | 0 | Failed checks observed: stop distance 6, entry distance 6, H1 alignment 2, cooldown 1, quality 2 |
| G | 2 | 0 | 0 | No displacement confirmation recorded in this window |
| H | 0 | 0 | 0 | No setup observed in this window |

These are bounded-window diagnostic counts, not a Strategy Tester result or module performance comparison. The two B_CRT outcomes do not establish profitability.

## Verification

- Focused diagnostics tests: 19 passed.
- Full local verification: TypeScript passed, 222 tests passed across 26 files, generated Pine consistency passed, and the independent Pine parser passed all 31 local Pine files. The parser explicitly does not certify TradingView compilation or emulator behavior.
- `git diff --check` passed.
- No localhost EPERM error occurred in the full suite; this run does not indicate an environment-blocked integration test.

## Native validation status and next action

- The preserved older Indicator screenshot shows a compile/add event, but its post-paste editor buffer was not copied back. It is not exact-source provenance for the newly generated v2 experimental file.
- Experimental Strategy v2 has not been compiled or captured natively.
- No paired v2 `SIGNAL_DIAG`/`PLAN_AUDIT` streams, actual emulator positions/costs, or controlled Replay/reload artifacts are present. Native parity and non-repainting remain NOT VERIFIED.
- Highest-value next action: on one safe chart/profile using `FOREXCOM:XAUUSD` M5, paste each generated experimental source, verify post-paste copy-back hashes, compile both, then export each full Pine Log stream with identical dates/inputs and its run context. Keep the saved layout/restoration procedure in force. Do not switch feeds or instruments mid-pair.
