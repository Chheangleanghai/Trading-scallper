# Native validation continuation — 2026-11-13

This report keeps the research-only TradingView observations separate from local checks and from the unfinished prospective study. No Pine source, baseline rule, TradingView alert, live order, Telegram destination or deployment was changed.

## Status

| Requested check | Result | Evidence and limit |
| --- | --- | --- |
| Native Indicator and Strategy compilation | **PASS for the captured experimental wrappers** | Both produced genuine `SIGNAL_DIAG` and `PLAN_AUDIT` rows on signed-in `FOREXCOM:XAUUSD` M5. Exact editor copy-backs match current on-disk wrappers after CRLF-to-LF normalization. This is not a baseline production release. |
| Fresh paired settings and capture | **PASS within five bounded windows** | Actual 69 trading inputs match in each pair; captured Strategy Properties show 0.01% commission, 2-tick slippage, one-tick execution delay, one close calculation per bar and 1x leverage. Start/end sequence, BAR coverage and zero dropped events pass. Export-envelope authenticity is unavailable. See [native evidence](native/), [pair analyzer](parity/analyze-new-native-captures.mjs) and [native input parser](parity/native-inputs.mjs). |
| Full loaded-history planned-field parity | **FAIL at tolerance 0** | Current history: 77 Indicator and 77 Strategy plans, 73 common, 70 exact common, 11 affected keys and 17 field or missing-plan differences. All 11 current affected keys now have causally classified evidence; most arise downstream of the Indicator estimate versus broker-emulator position state. They remain real strict mismatches. Original November 9 history: 78/79 plans, 76 common, 73 exact, 8 affected keys. The current and original loaded-history starts differ. See [causal review](parity/README.md) and [machine-readable comparison](parity/current-full-history-comparison.json). |
| Strategy positions and costs | **PASS for captured historical rows** | The existing native sample has 79 completed positions, 115 exit rows, gross +$41.5900000, commission $137.6080966 and net −$96.0180966. Partial exits are grouped once by position. This sample is not an untouched out-of-sample result. See [accounting audit](oos/README.md). |
| Historical repeat and non-repainting | **PASS for one fresh-ID historical repeat; unverified generally** | The Nov 11 rerun used a new effective capture identity and the same source, trading inputs, window, feed and loaded-history start. All 328 substantive diagnostic events and 74 plans through the endpoint matched at zero tolerance. This does not prove live first appearance or general non-repainting. Earlier live/reload raw volume and one historical entry-price discrepancy remain unresolved. See [repaint audit](repaint/README.md). |
| Controlled Bar Replay | **SKIP** | The preserved Free-plan native Replay attempt reached TradingView's plan gate. No upgrade or workaround was used. |
| Frozen chronological OOS efficacy | **INCOMPLETE** | The original Nov 6–20 UTC endpoint is still future on Nov 13. No exact frozen-source native run with verified admission settings and counted 1,000-bar warm-up is present. Four Nov 6 overlapping positions belong to a broad-history exploratory run and are not substituted for the protocol. See [OOS audit](oos/README.md). |
| Full local verification | **PASS** | `npm run verify`: 27/27 files, 238/238 tests, 0 failures, 0 skips; typecheck, generators and 31 independent Pine parses passed. Focused diagnostics plus loopback-intercepted delivery integration: 37/37. The prior localhost `EPERM` did not recur. See [results](tests/verification-results.json). |

## November 11 A–H window

Detected setup / selected-plan counts from the complete bounded native stream. These are window observations, not profitability estimates. Confirmation events may repeat on later bars.

| Module | Indicator | Strategy |
| --- | ---: | ---: |
| A | 1 / 0 | 1 / 0 |
| B | 6 / 2 | 2 / 1 |
| C | 1 / 0 | 1 / 1 |
| D | 0 / 0 | 0 / 0 |
| E | 1 / 0 | 1 / 0 |
| F | 1 / 0 | 1 / 0 |
| G | 0 / 0 | 0 / 0 |
| H | 0 / 0 | 0 / 0 |

The November 11 Strategy completed two positions in three exit rows: gross +$4.3050000, commission $3.4014561, net +$0.9035439. The later C position included TP1 and a time close. These rows are part of the current loaded-history run and must not be added to the older 79-position sample.

## Source integrity

| Source | SHA-256 |
| --- | --- |
| `pine/indicator.pine` frozen baseline | `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` |
| `pine/strategy.pine` frozen baseline | `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` |
| `pine/experiments/indicator_signal_diagnostics.pine` | `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852` |
| `pine/experiments/strategy_signal_diagnostics.pine` | `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d` |

## Chart restoration

Chrome access resumed on November 13. After the fresh-ID export, the existing `Unnamed` layout was reloaded while Autosave remained off; no manual Save action was taken. The reloaded chart showed `FOREXCOM:XAUUSD` M5, UTC+7, the same five study titles and visibility states seen before the rerun (research Indicator visible; confirmation review, research Strategy, Asian Session Range and Nokor Traders CRT hidden). Pine Logs and the editor were closed. The chart then showed `All changes saved`. Autosave was switched back **on** and visually verified in Manage layouts. The individual study inputs and price-scale associations were not inspected after reload, so those aspects of restoration remain unverified.

The highest-priority research action after cleanup is the exact frozen-source prospective Strategy run with its Nov 6–20 admission window, source/settings copy-back and counted warm-up, followed through any carried positions. No parameter choice or win-rate claim is supported yet.
