# A–H priced-plan candidates — actual verification, 2026-11-05

The requested interface is implemented and applied to the saved FOREXCOM:XAUUSD M5 chart. Every selected qualified plan uses a gray BUY/SELL Entry callout, red SL, green TP1–TP3 and risk/reward boxes. The two standalone BUY/SELL plotshapes are removed; alerts and entry decisions are retained. FVG, OB, swings, liquidity sweeps, BOS/CHoCH and the visual EMAs remain available and enabled as captured. A compact status/price card distinguishes WAIT, pending, Indicator estimates, Strategy emulator positions and ended plans.

These are isolated **v0.8.0 research candidates**. The verified baseline Indicator and Strategy are unchanged. They are not a v0.9.0/v1.0 release or a profitability certification.

## Source identity and native compilation

| File | SHA-256 | Observed native result |
| --- | --- | --- |
| `pine/experiments/indicator_professional.pine` | `050518694b7d83a112dc22e40e1072621f7884cc89b526b29995532131f0ad1b` | Compiled / Updated on chart, 9:41:27 PM Cambodia |
| `pine/experiments/strategy_professional.pine` | `eb601426b7a71779cd0aee0f56f987a6cf723cf48b23131aa29d9214913f4851` | Compiled / Updated on chart, 9:33:17 PM Cambodia |

Full editor copies are preserved separately in `indicator-final-editor-copy.pine` and `strategy-final-editor-copy.pine`. After CRLF normalization each exactly matches its local candidate. Native compile AX records and PNGs identify the same edited chart drafts. Earlier copies/compiles and the pre-card-correction raw captures are preserved separately.

The Indicator parent is baseline `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`. The Strategy parent is the previously verified quantity-units experiment `bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed`, incorporating its explicit whole-contract-unit partial allocation and exit telemetry. Baseline Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` was not modified. Parent-reconstruction tests reverse the explicit display/default changes and require full parent equality; no extra entry predicate, target rule or alert event was introduced.

Native testing found and fixed a real UI error in the shared card: an active Strategy was labeled as an Indicator estimate. The corrected native Strategy card visibly identifies the emulator. Pending orders are now described as awaiting a fill.

## Actual runtime and signal frequency

All **115 input values** were extracted from native settings captures for each candidate, with no defaults substituted; they match. See `indicator-runtime-inputs.json`, `strategy-runtime-inputs.json`, their original AX captures, and `runtime-input-comparison.json`. A–H were already enabled in the preceding user chart configuration; enabling them by default is a candidate convenience, not a newly measured increase versus that configuration.

Actual key settings: all A–H; Close entry; global quality 75; per-module threshold overrides off; H1 filter on; EMA filter off; London session on; five plans per session; cooldown five bars; holding time 15 minutes; 0.5% risk budget and 90% notional cap; fixed 1/2/3R targets; structural stop with 0.15 ATR buffer; partial targets on; break-even/trailing and optional confluence filters off. Research date restriction is **off**; its displayed inactive bounds are 2026-01-01 and 2027-01-01 UTC. These inactive values are not asserted to be the loaded backtest range.

The exact full loaded OHLC history/calculation start was not exported. Raw event spans and visible report ranges are recorded as observations, not invented run boundaries. The paired log captures were taken at different clock times on November 5; earlier comparisons and later screenshots are not silently merged into one snapshot.

A separate one-input experiment changed London to **All major sessions** while keeping the other trading inputs. On complete dates 2026-10-13 00:00 UTC through 2026-11-05 00:00 UTC:

| Native Indicator configuration | Selected plans | Trading dates with plans | Dates at the five-plan cap |
| --- | ---: | ---: | ---: |
| London | 65 | 17 | 8 |
| All major sessions | 84 | 17 | 16 |

That is 19 more plans (29.23%) in this inspected sample. Session selection also affects the existing session score and quota reset, so this is a configuration comparison, not proof of a universal frequency effect. No thresholds or quotas were relaxed. This Indicator-only experiment has no verified Strategy profitability result. Original CSVs are `indicator-final-london-raw.csv` and `indicator-all-major-raw.csv`; complete counts are in `frequency-comparison.json`. The ongoing capture day and first partial day are excluded from that frequency table.

**London was restored on the final chart.** The retained session cap explains the final card's `Session plan limit`; an ended plan remains visible and is explicitly marked ENDED. It is not presented as a fresh actionable setup. The signal engine still confirms on candle close and cannot promise continuous or intrabar signals. Only one unoccupied plan slot is used; qualified opposing directions reject, otherwise the highest score wins with deterministic tie order. Not every contemporaneous candidate becomes another trade.

## Genuine planned-signal comparison — still mismatched

The final source-attributed streams contain **74 Indicator plans and 75 Strategy plans**. At tolerance zero there are **72 common timestamps, 68 complete planned-field matches, four different common plans, five unpaired plans and 18 mismatch records**. All 72 common plans separately show the expected Indicator/emulator execution-model difference. This is `MULTI_PLAN_MISMATCH`, not `MULTI_PLAN_PASS`.

`final-paired-comparison.json` retains every mismatch:

| Plan close UTC | Field | Indicator | Strategy |
| --- | --- | --- | --- |
| 19 Oct 10:35 | Missing plan | Present | Absent |
| 22 Oct 15:40 | setupTimestamp | 1792682700000 | 1792683000000 |
| 03 Nov 08:40 | setupTimestamp | 1793694000000 | 1793694300000 |
| 04 Nov 09:55 | entry | 4044.89 | 4044.77 |
| 04 Nov 09:55 | tp1 | 4057.81 | 4057.57 |
| 04 Nov 09:55 | tp2 | 4070.73 | 4070.37 |
| 04 Nov 09:55 | tp3 | 4083.65 | 4083.17 |
| 04 Nov 10:20 | setupTimestamp | 1793787000000 | 1793787300000 |
| 04 Nov 10:20 | strategy | B_CRT | F_TREND_PULLBACK |
| 04 Nov 10:20 | quality | 90 | 80 |
| 04 Nov 10:20 | sl | 4040.39 | 4040.37 |
| 04 Nov 10:20 | tp1 | 4052.93 | 4052.95 |
| 04 Nov 10:20 | tp2 | 4059.2 | 4059.24 |
| 04 Nov 10:20 | tp3 | 4065.47 | 4065.53 |
| 05 Nov 12:15 | Missing plan | Present | Absent |
| 19 Oct 11:05 | Missing plan | Absent | Present |
| 22 Oct 08:35 | Missing plan | Absent | Present |
| 05 Nov 14:20 | Missing plan | Absent | Present |

The occupancy/quota histories can differ because an Indicator estimates closure and the broker emulator fills/exits on its own schedule. That supports a possible cause of setup/module/missing-plan differences, not a blanket explanation of every mismatch. In particular, the 4 November 09:55 UTC Close-mode plan is 4044.89 versus 4044.77 and lifecycle `signalPrice` differs too. The source sets planned Close entry from the chart close, while emulator fill is separate. **Fill slippage cannot explain this planned-price delta.** Bar-data snapshot differences remain a hypothesis; contemporaneous OHLC exports were not captured, so no data-revision cause or trading defect is declared confirmed. No rule was changed to hide the mismatch.

## Reload and visual verification

The final Indicator's before/after reload CSVs are **byte-for-byte equal**: 320 log records and 74 plans. `indicator-reload-comparison.json` reports zero timestamp/level mismatches. This is a real historical reload observation, not candle-by-candle Bar Replay or proof against every realtime repaint path. The log pane displayed a poor-connection warning during one export; identical captured files do not certify every future realtime event.

The final chart was saved/reloaded. The Indicator remains pinned to the candle chart's right price scale; the native menu says `Pin to scale (now right)`, only the shared right axis is visible, and prices/boxes remain aligned with candles. Right margin was increased to 80 bars so callouts persist within view after reload. Autosave was restored on and visibly verified. The temporary professional Strategy was removed by restoring the saved layout; the existing original Indicator and exit-audit study remain hidden as before. See `final-chart.png`, `restored-study-set.ax.txt`, `final-scale-menu.ax.txt` and `autosave-restored.png`.

Context labels can occasionally overlap callouts as prices and zoom change. The compact card remains a separate exact-price reference. No UI scale change is represented as a trading improvement.

## Actual emulator outcomes and sizing

For the final downloaded Strategy audit snapshot: **74 completed positions**, 31 winners and 43 losers; **107 exit rows belonging to completed positions**; gross before commissions **$40.366000**; commissions **$128.968272**; net **−$88.602272**; position-level profit factor **0.745150**. One additional B/CRT position is incomplete, with one observed TP1 partial exit of +$3.992274. That partial is kept separately; it is not counted as another complete winning position. Total observed closed-row net including that partial is −$84.609998. No complete group has a net/row-sum reconciliation discrepancy or a residual after all bracket exits in this sample.

| Module selected in combined run | Completed positions | Wins / losses | Net USD | Position profit factor |
| --- | ---: | ---: | ---: | --- |
| B_CRT | 44 | 16 / 28 | -92.71 | 0.570 |
| C_TURTLE_SOUP | 8 | 6 / 2 | +18.69 | 3.224 |
| D_SNR (K-SNR display) | 3 | 3 / 0 | +26.78 | No losing position in this tiny sample |
| E_DEMAND | 1 | 0 / 1 | -9.59 | 0.000 |
| E_SUPPLY | 4 | 1 / 3 | -5.58 | 0.776 |
| F_TREND_PULLBACK | 12 | 4 / 8 | -25.02 | 0.637 |
| H_QUASIMODO | 2 | 1 / 1 | -1.18 | 0.942 |

A and G had no selected plan here. This does not establish that they never qualify or work; candidates compete for one plan slot. Small positive subgroups do not justify cherry-picking modules, score thresholds or asserting an edge. This inspected, short, selected sample is not untouched OOS and does not establish future profitability.

Native properties show $10,000 USD capital, 0.01% commission, two ticks of slippage, 1x long/short leverage, bar-close script execution and one-tick order delay. No calibrated spread model was captured. The default order-size property does not replace explicit `qty` in `strategy.entry`. Audit records report point value 1, tick size 0.01 and minimum contract step 0.1. For the first completed plan, risk-based quantity is 17.3010380623 but the 90% notional cap limits it to 2.1563548977, floored to **2.1**. The partial-unit correction is inherited from its tested parent; bracket quantities sum to the initial order.

A later Strategy Tester pane screenshot shows −$77.19, 109 exit rows, factor 0.779 and $216.24 drawdown. **It is not reconciled with this earlier audit snapshot**: a later time/partial state and the report's unrecorded `Manage strategy` selection prevent treating it as the same verified candidate result. Both Strategy studies were temporarily present. The earlier commentary associating that pane directly with the new candidate was too strong; use the source-selected audit totals above. No drawdown figure is assigned to the new candidate from that pane. Preserve the screenshot as a separate UI observation.

## Telegram and validation result

The production path stays database-free. The formatter adds friendly concept names, including **K-SNR**, while retaining stable wire ID `D_SNR`, and includes Entry/SL/TP1–TP3. Existing authentication, validation, 8 KB request cap and bounded awaited Telegram delivery remain. Local mock HTTP tests cover the relay; no real message was sent.

On this account, selecting **Webhook URL** opens an upgrade dialog: current plan Basic, recommended Essential, URL input disabled. See `webhook-availability.png` and its AX text. No live alert was created, no upgrade or deployment was performed, and no public production relay URL was verified in this task. Automatic TradingView → Telegram delivery is therefore **not active**. TradingView also requires 2FA and has a three-second webhook request deadline; see its [official webhook instructions](https://www.tradingview.com/support/solutions/43000529348-how-to-configure-webhook-alerts/). Keep credentials in the backend. Stateless delivery cannot guarantee retries, persistent deduplication or exactly-once sends.

Final local checks: **178 tests across 19 files passed**, TypeScript passed, baseline generation check passed, **13 independent Pine parses passed**, production audit found **0 vulnerabilities**, production dependency tree is empty, and `git diff --check` passed. Independent parsing is not native compilation; both native candidates were compiled separately as recorded above.

The UI/default upgrade is implemented and tested within the recorded scope. General parity, controlled intraday Replay, untouched OOS, profitability and live Telegram delivery remain open. No real trades, real Telegram messages, deployment or account upgrades occurred. Project remains **v0.8.0**.

See [A–H rule review](CONCEPT_RULE_REVIEW.md), [machine-readable receipt](verification-receipt.json), [comparison details](final-paired-comparison.json), [actual emulator outcomes](strategy-final-outcomes.json), and [final chart](final-chart.png).
