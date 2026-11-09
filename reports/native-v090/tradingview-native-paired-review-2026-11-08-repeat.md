# TradingView paired diagnostics review — repeat Strategy capture, 2026-11-08

## Result

The experimental Strategy compiled and ran on TradingView, and a fresh Strategy Pine Logs export is now paired with the matching Indicator export. On `FOREXCOM:XAUUSD`, M5, for the shared window **2026-11-06 21:00 through 2026-11-07 00:00 WIB**, the two selected plans match every compared planned field at **zero tolerance**: two Indicator plans and two Strategy plans, zero plan-field mismatches.

This is a **bounded two-plan planned-signal match**, not a full-history parity pass, non-repainting result, or profitability finding. Indicator estimates and broker-emulator fills remain different execution models.

## Captures and completeness

| Stream | Capture ID | Events | Sequence | Bars | Dropped | Analyzer export status |
| --- | --- | ---: | --- | ---: | ---: | --- |
| Indicator estimate | `indicator-xauusd-m5-20261108-01:1794150552762` | 452 | 1–452, continuous | 36 consecutive M5 bars | 0 | Structurally complete, unauthenticated |
| Strategy emulator | `indicator-xauusd-m5-20261108-01:1794151806658` | 447 | 1–447, continuous | 36 consecutive M5 bars | 0 | Structurally complete, unauthenticated |

Each stream has one `CAPTURE_START` and one `CAPTURE_END`, reports `budgetComplete=true`, and has no sequence, event-ID, bar-coverage, or analyzer completeness problems. `CAPTURE_END` says internal event-budget completion; it does not authenticate TradingView’s export or prove that the active editor source and every runtime setting were captured. Both streams share the same symbol, timeframe, run tag, requested window, and first loaded-bar time. All eight modules are enabled in each capture.

The raw Pine Logs CSV files contain plan rows outside this three-hour window. An unfiltered parse therefore returned 78 Indicator rows and 79 Strategy rows with historical missing-plan and changed-plan differences. Those records are outside the paired capture scope. The comparison below explicitly filters plan timestamps to `windowStart < timestamp <= windowEnd`; it does not discard any mismatch inside the declared window.

Raw evidence and hashes:

- Indicator CSV: `tradingview-indicator-signal-diag-2026-11-08-repeat2.csv`, SHA-256 `32097a3aebc5b403fa0fcfd773528f092d7cfbfe57866ef802c88071d7590df7`
- Strategy CSV: `tradingview-strategy-diagnostics-2026-11-08-repeat.csv`, SHA-256 `a05d294dc820d78d0ca1ffac71c1e5c8f4ddf194d65884fcd0564287e0e3b0bd`
- Machine-readable bounded comparison: `tradingview-native-paired-comparison-2026-11-08-repeat.json`

## Planned fields

| Plan close time (WIB) | Candidate setup | Direction / module | Entry | SL | TP1 | TP2 | TP3 | Quality |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Nov 6 22:30 | 22:20 | SELL / B_CRT | 4049.56 | 4058.60 | 4040.52 | 4031.48 | 4022.44 | 90 |
| Nov 6 23:35 | 23:20 | SELL / B_CRT | 4059.76 | 4068.08 | 4051.44 | 4043.12 | 4034.80 | 90 |

The comparator also matched script version, symbol, timeframe, setup timestamp, direction, module, entry mode, and execution-accepted flag. Its only two reported differences are the expected `INDICATOR_ESTIMATE` versus `STRATEGY_EMULATOR` model field. The Indicator has no broker fills; the Strategy order fills on the next available emulator tick.

The first plan took two M5 bars from setup to confirmation; the second took three. Both qualified and submitted on their confirmation bar. Strategy fill observations arrive one bar after submission; the fill timestamp is the next bar’s open, equal to the order bar’s close timestamp.

## A–H observations

Counts below are events observed within these two captures, not historical module efficacy. The extra Indicator B and F candidates at 23:50 WIB occur when the estimate model considers the second position closed. The Strategy emulator’s exit fill timestamp is also 23:50, but its script reports the closed position on the 23:55 bar. This one-bar observation delay is consistent with engine-state timing. The extra Indicator candidates were setups, not plans; the F candidate also failed H1 alignment, stop-distance, entry-distance, cooldown, and quality checks.

| Module | Indicator setups | Strategy setups | Indicator selected plans | Strategy selected plans |
| --- | ---: | ---: | ---: | ---: |
| A — Sweep/MSS/FVG | 1 | 1 | 0 | 0 |
| B — CRT | 5 | 4 | 2 | 2 |
| C — Pivot false break | 1 | 1 | 0 | 0 |
| D — K-SNR | 0 | 0 | 0 | 0 |
| E — Supply/demand | 0 | 0 | 0 | 0 |
| F — Trend pullback | 2 | 1 | 0 | 0 |
| G — AMD range approximation | 2 | 2 | 0 | 0 |
| H — Quasimodo approximation | 0 | 0 | 0 | 0 |

Zero means no corresponding setup event was observed during this window. It does not mean a module is broken or never triggers. One F candidate was already active before the 21:00 capture boundary; its in-window confirmation/check observations do not include its original setup event. Thus some within-window F blocker counts describe carried-in state as well as new candidates.

The diagnostic analyzer validates `firstBlocker` against the first element of `failedChecks`, verifies the blocker message, and requires `decisionConsistent=true` for each emitted check record. The capture parsed without invariant or lifecycle-correlation failures. Busy engine observations are global state records and are not counts of rejected setups.

## Strategy fills, exits, and costs

The native Strategy stream contains two submitted orders, two fills, two exit rows, and two completed positions. Both positions closed after 15 minutes with `exitComment=TRADE_CLOSED` and exit ID `Close entry(s) order B_CRT`; the active Strategy input showed a 15-minute maximum holding time. The source’s `strategy.close` is guarded by that holding-time condition. These two exits are therefore classified as time exits with supporting ID/comment and timing evidence. There were no TP or partial-exit rows in this capture.

| Position | Actual fill → exit | Qty | Gross price P&L | Commission | Net P&L | Exit |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| B_CRT SELL | 4049.54 → 4050.56 | 2.2 | −$2.244000 | $1.782022 | −$4.026022 | Time exit |
| B_CRT SELL | 4059.74 → 4063.58 | 2.1 | −$8.064000 | $1.705897 | −$9.769897 | Time exit |
| **Total** |  | **4.3** | **−$10.308000** | **$3.487919** | **−$13.795919** | **2 positions** |

For a short, gross is `(entry − exit) × quantity`. The fee is 0.01% on entry plus exit value: `((entry + exit) × quantity) × 0.0001`. Net equals gross less this fee, with no second slippage deduction; modeled slippage is already reflected in emulator fills. These two losses do not show that the strategy is unprofitable.

## Source identity and preservation

| File | SHA-256 |
| --- | --- |
| Frozen baseline `pine/indicator.pine` | `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` |
| Frozen baseline `pine/strategy.pine` | `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` |
| Experimental Indicator diagnostics wrapper | `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852` |
| Experimental Strategy diagnostics wrapper | `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d` |
| Indicator clarity parent named in event payload | `d4d4866086e13d95fb0e5162bee51050a6fe47a010f4be004bdc5d5c28aba69e` |
| Strategy clarity parent named in event payload | `8461833b9f466380dd03d877e94215165544dfee038e407e6d130c840abac479` |

Both embedded parent hashes match their on-disk parent files. The experimental Strategy source was pasted and its editor contents copied back for exact local SHA-256 comparison before the run; TradingView reported compilation and chart update success. The Indicator was already producing native logs, but this repeat did not include a new exact editor copy-back or compiler/token-headroom capture. The diagnostic events name the parent hashes, not wrapper hashes, and exports are not cryptographically authenticated. A complete source-plus-inputs-plus-Strategy-Properties provenance gate therefore remains open. The baseline hashes above are unchanged; no baseline or trading-rule source was edited for this paired review.

## Verification and remaining limits

- **Native TradingView:** Strategy compilation and broker-emulator run succeeded; raw Strategy and Indicator diagnostic logs were exported and analyzed. The temporary Strategy was removed afterwards. The original A–H confirmation-review Indicator remains on the FOREXCOM:XAUUSD M5 chart; the temporary Strategy is no longer attached. Autosave was left off and the temporary layout was not saved.
- **Replay / non-repainting:** Not verified. TradingView Basic blocked intraday Strategy Bar Replay in the prior attempt. The result does not establish non-repainting.
- **Historical trade export:** The Free account’s Strategy Tester CSV export was unavailable in the earlier test. This report uses two captured positions only; it does not replace the historical position-level analysis.
- **Local checks for this addendum:** A bounded parser/comparator assertion verified matching capture context, one start/end per stream, continuous unique IDs/sequences, 36 consecutive bars, complete internal budgets, matching source-parent hashes, and two exact plans per side. No Pine trading rules or production files were edited while producing this report.
- **Local verification rerun for this addendum:** `npm run verify` passed: TypeScript typecheck, 27 test files / 238 tests, generated Pine checks, diagnostic source-hash checks, and independent parsing of 31 Pine files. The independent parser is not TradingView’s compiler and does not establish broker-emulator behavior.

The next highest-value evidence is a source/settings-attributed capture with a saved snapshot of both scripts’ full inputs and Strategy Properties, followed by a controlled reload/Replay test if the account plan allows it. Until then, report only this bounded two-plan match.
