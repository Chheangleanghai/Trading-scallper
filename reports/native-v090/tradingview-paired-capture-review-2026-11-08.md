# TradingView paired diagnostic capture review — 2026-11-08

## Scope

Downloaded a fresh Pine Logs export for the experimental Indicator on the signed-in TradingView chart and compared its bounded `SIGNAL_DIAG` capture with the saved Strategy capture. Both are FOREXCOM:XAUUSD, M5, with the same Nov 6 21:00 through Nov 7 00:00 WIB diagnostic window and the same first loaded-bar timestamp. No source, baseline rules, alerts, orders, or TradingView inputs were changed during this capture.

## Evidence and capture integrity

| Capture | ID | Events | Sequence / bars | Analyzer status |
| --- | --- | ---: | --- | --- |
| Indicator estimate | `indicator-xauusd-m5-20261108-01:1794149732214` | 452 | 1–452; 36 consecutive M5 bars | Complete within window; zero dropped; export structurally complete, authenticity not authenticated |
| Indicator repeat | `indicator-xauusd-m5-20261108-01:1794150218545` | 452 | 1–452; same 36 M5 bars | Complete within window; zero dropped; normalized event stream exactly repeats the first Indicator capture |
| Indicator repeat 2 | `indicator-xauusd-m5-20261108-01:1794150552762` | 452 | 1–452; same 36 M5 bars | Complete within window; zero dropped; normalized event stream exactly repeats both earlier Indicator captures |
| Strategy emulator | `capture-2026-11-07-01:1794130529225` | 447 | 1–447; 36 consecutive M5 bars | Complete within window; zero dropped; export structurally complete, authenticity not authenticated |

The first new Indicator capture reports one start and one end record, `attempted: 451`, `observedBars: 36`, `dropped: 0`, and no analyzer completeness problems. Both repeat exports have new capture IDs but the same 452 normalized events after removing capture-specific `captureId` and `eventId`; they independently reproduce all plans, blockers, and states. All three log event `parentSha256` values match the on-disk Indicator clarity parent. The Pine Logs exports also contain older unrelated log rows; the analyzer filters by the v2 schema and capture ID.

Raw evidence and machine-readable analysis:

- Indicator CSV SHA-256: `21418c71a658bc560bb3a91ed568b1ba7135ebe3c37577916e1d6d49d8122b14`
- Indicator repeat CSV SHA-256: `42793cb18647c85ddb1d46398b9c85346d160694307c509b79a4c41988b47d86`
- Indicator repeat 2 CSV SHA-256: `32097a3aebc5b403fa0fcfd773528f092d7cfbfe57866ef802c88071d7590df7`
- Strategy CSV SHA-256: `3f305b2431c6bae0cbdd6acff5aea307441b2ccfea8973aaba564f99504f0e93`
- Indicator analysis JSON SHA-256: `0b23117e35bd9624b2b2f44aae73b8d6d3a9b5fd9f8fb7d990b1188aba2cd53a`
- Indicator repeat analysis JSON SHA-256: `8d13fc45622f6f3863d0e7451ba012fe73c8401758bc8287041372d5290d3f71`
- Indicator repeat 2 analysis JSON SHA-256: `0ec302d0497bfb4db9ee391970da78a3a3498089d82fd23e266e9a50642d24bb`

## Planned signal comparison

Both streams selected the same two `B_CRT` SELL plans. Candidate ID, plan ID, plan timestamp, planned Entry, SL, all three targets, quality, and selected-plan outcome match exactly (tolerance 0):

| Plan time (WIB) | Candidate setup time (WIB) | Entry | SL | TP1 | TP2 | TP3 | Quality |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Nov 6 22:30 | Nov 6 22:20 | 4049.56 | 4058.60 | 4040.52 | 4031.48 | 4022.44 | 90 |
| Nov 6 23:35 | Nov 6 23:20 | 4059.76 | 4068.08 | 4051.44 | 4043.12 | 4034.80 | 90 |

Setup-to-confirmation took 2 M5 bars for the first plan and 3 M5 bars for the second; both were qualified and submitted on their confirmation bar. The Indicator is an estimate and reports no broker fills. The Strategy emulator recorded each entry fill one M5 bar after order submission.

This is **observed exact parity for the two selected plans only**. It is not a formal source-and-settings-attributed parity pass: the exports do not authenticate the active editor contents or record every runtime input and Strategy Properties override. The Strategy and Indicator parent source hashes differ by design, and the diagnostic wrapper hashes are not embedded in the events.

## Module observations in this window

These are setup IDs observed by the two bounded captures, not total historical opportunity counts. A zero means no matching event was recorded in this window; it does not prove the concept never formed.

| Module | Indicator setups | Strategy setups | Selected plans in each |
| --- | ---: | ---: | ---: |
| A · Sweep/MSS/FVG | 1 | 1 | 0 |
| B · CRT | 5 | 4 | 2 |
| C · Pivot false break | 1 | 1 | 0 |
| D · K-SNR | 0 | 0 | 0 |
| E · Supply/demand | 0 | 0 | 0 |
| F · Trend pullback | 2 | 1 | 0 |
| G · AMD range | 2 | 2 | 0 |
| H · Quasimodo | 0 | 0 | 0 |

The extra Indicator `B_CRT` and `F_TREND_PULLBACK` candidates both appear at 23:50 WIB, when the Indicator estimates the second plan closed. The Strategy remains occupied until its emulator time-exit is processed at 23:55 WIB. This timing is consistent with the two engines becoming available on different bars and is a plausible explanation for those extra Indicator candidates; it does not establish a logic defect. The extra F candidate remained at setup stage at capture end. Its checks include observations for a candidate whose setup began before the capture window, so blocker tallies must not be read as six distinct setups. The within-window F candidate was blocked by H1 alignment and also failed stop-distance, entry-distance, and quality checks.

## Strategy fills, exits, and costs

The Strategy capture contains two submitted orders, two fills, two closed positions, and two exit rows. Neither position had a partial target exit. Both exits are reported as time exits by the diagnostic and are consistent with the captured close-order ID/comment.

| Position | Fill → exit | Qty | Gross price P&L | Commission | Net P&L | Exit |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| B_CRT SELL | 4049.54 → 4050.56 | 2.2 | −$2.244000 | $1.782022 | −$4.026022 | Time exit |
| B_CRT SELL | 4059.74 → 4063.58 | 2.1 | −$8.064000 | $1.705897 | −$9.769897 | Time exit |
| **Total** |  |  | **−$10.308000** | **$3.487919** | **−$13.795919** | 2 positions |

The gross values use the Strategy rows’ actual entry and exit prices, size, and point value. Commission is subtracted once; modeled slippage is already reflected in the fill prices. No additional spread scenario is included. These two losing positions are a small bounded sample, not evidence of long-run profitability or lack of it.

## Source identity and limits

Current frozen baseline hashes remain unchanged:

- `pine/indicator.pine`: `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`
- `pine/strategy.pine`: `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`

Experimental source hashes at review time:

- Indicator parent `pine/experiments/indicator_signal_clarity.pine`: `d4d4866086e13d95fb0e5162bee51050a6fe47a010f4be004bdc5d5c28aba69e`
- Indicator diagnostics wrapper `pine/experiments/indicator_signal_diagnostics.pine`: `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852`
- Strategy parent `pine/experiments/strategy_signal_clarity.pine`: `8461833b9f466380dd03d877e94215165544dfee038e407e6d130c840abac479`
- Strategy diagnostics wrapper `pine/experiments/strategy_signal_diagnostics.pine`: `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d`

The Indicator is attached to the TradingView chart and is producing complete native logs; this confirms the active Indicator runs. Exact editor copy-back of the wrapper, a fresh native Strategy compile in this session, controlled Bar Replay/reload, and a full settings capture were not performed. A separate earlier Strategy capture supplies emulator order/fill/exit evidence, but does not authenticate the active Strategy editor copy. All exports are structurally complete but unauthenticated. Therefore this review does not claim native non-repainting verification, full A–H lifecycle parity, or a release gate pass.

## Next evidence needed

The highest-value next step is a controlled native Strategy capture using the same verified wrapper source, chart history, full input snapshot, and Strategy Properties as the Indicator run, followed by a reload/Bar Replay comparison. Preserve those settings with the raw logs so any later candidate divergence can be attributed to engine state, execution timing, or rule logic.

## Replay attempt and local verification

TradingView Bar Replay was opened and positioned at November 6, 2026 20:55 WIB, immediately before the capture window. TradingView displayed a plan prompt stating that intraday strategy replay requires an upgraded plan; this account is on Basic. The prompt was closed without upgrading, and Replay was exited. The chart returned to normal mode. No Replay/reload non-repainting result is available from this run.

Local verification was rerun after the evidence files were added. `npm run verify` passed: TypeScript check, 27 test files / 238 tests, Pine generation checks, diagnostics source-hash checks, and independent parsing of 31 Pine files. The independent Pine parser is not TradingView's compiler and does not verify broker-emulator behavior.
