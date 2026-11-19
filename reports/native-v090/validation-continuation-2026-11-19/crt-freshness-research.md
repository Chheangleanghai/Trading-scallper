# B/CRT signal-timing investigation — 2026-11-19

**Native follow-up completed.** The original and experimental Strategies compiled and ran on the same TradingView chart with matching settings. Net loss fell from $39.26 to $36.52, with two more positions and a lower position win rate. See the [matched native run and raw evidence](crt-freshness-native/README.md).

The experimental Indicator also compiled and ran. Strict Indicator/Strategy parity failed on three plan timestamps, each involving the F trend pullback. TradingView Basic blocked five-minute Replay. The [Indicator comparison](crt-freshness-native/indicator-replay.md) records the differences, chart restoration, and the planned test on unseen data.

## Finding and decision

The current historical Strategy capture does **not** establish a reliable or profitable new signal rule. It does show a testable B/CRT timing weakness: an unconfirmed B setup remains eligible for the general 20-bar expiry after the completed M15 reference candle changes. The original B setup/reclaim and later directional break are defined in the [existing module audit](../../V090_MODULE_AUDIT.md) and source. The reference-freshness restriction is therefore an **isolated research hypothesis**, not a defect fix or production upgrade.

The source reads the *previous completed* M15 candle with `[high[1], low[1], time[1]]` and `lookahead_on`, following TradingView's pattern for requesting confirmed higher-timeframe data. B stores the sweep candle's trigger, then confirms on a later M5 directional close. The existing candidate expiry checks age and invalidation, and allows confirmation after `crtTime` changes. The experimental guard expires a still-pending B candidate when the completed reference differs from the value stored at setup. The guard runs only on standard `FOREXCOM:XAUUSD` M5 with a 15-minute CRT setting. [TradingView higher-timeframe requests](https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#avoiding-repainting)

## Actual evidence and exact accounting

The unchanged [native Pine Logs capture](strategy-quantity-units-pine-logs.csv) was decoded and reconciled at the position level; [full capture review](README.md) records the exact copied source, Inputs/Properties observations, and chart restoration. This **retrospective** November 6–19 sample contains 31 completed positions and 49 partial/final exit rows. Gross price P&L was +$15.620000, commission $54.883055, and net **−$39.263055**. Commission is already in net; two-tick slippage is embedded in emulator fills and was not deducted again. Position results were grouped by actual entry and module, so TP legs are not counted as separate positions.

| Module | Completed positions | Net P&L (USD) | Interpretation |
| --- | ---: | ---: | --- |
| A · Sweep/MSS/FVG | 0 | — | No outcome sample here; strict later-bar sequence. |
| B · CRT range reclaim | 21 | −68.806340 | Largest observed loss and the timing hypothesis below. |
| C · Confirmed-pivot false break | 6 | +49.078488 | Small, selected sample; not proof of superiority. |
| D · K-SNR confirmed levels | 0 | — | No outcome sample here. |
| E · Supply/demand departure | 1 | +7.369256 | Too sparse for efficacy. |
| F · Structural EMA pullback | 1 | +5.502603 | Too sparse for efficacy. |
| G · Compressed-range sweep | 2 | −32.407063 | Too sparse for efficacy. |
| H · Five-pivot Quasimodo | 0 | — | No outcome sample here. |

The B-only [machine-readable split](crt-freshness-observational.json) joins each of its 21 completed positions to its exact `PLAN_AUDIT` setup time. Because the frozen logs did not include `crtTime`, the split infers a M15 rollover from standard UTC-aligned M5 bar opens; this is not a direct captured `crtTime` comparison.

| B observed cohort | Positions | Winners | Gross price P&L | Commission | Net P&L |
| --- | ---: | ---: | ---: | ---: | ---: |
| All B | 21 | 9 | −$31.653000 | $37.153340 | −$68.806340 |
| Same M15 reference at setup/plan | 11 | 5 | −$1.085000 | $19.448237 | −$20.533237 |
| Reference rolled before plan | 10 | 4 | −$30.568000 | $17.705103 | −$48.273103 |

These rows are **observations**, not results of running the new rule. Removing any one B plan can change later plan selection, position occupancy, session quota and equity. The rolled-reference group includes four winners. It would be incorrect to subtract its losses from the old net or claim that the candidate raises win rate. B has an observed gross price loss even before commission in this sample; both entry timing and exit/cost behavior need controlled testing.

### Check against the earlier non-overlapping capture

The same analyzer reconciles 55 B positions from October 5 through November 4. The archived Strategy source was the same frozen quantity experiment, and its captured controls show a 15-minute CRT reference. The earlier capture has separate history and equity state. Its totals stay separate from the November run. [Native run and provenance](../../native-v080/continuation-2026-11-05/README.md) · [CRT input capture](../../native-v080/continuation-2026-11-05/corrected-strategy-inputs-top.ax.txt) · [Earlier cohort JSON](crt-freshness-earlier-observational.json)

| Earlier B cohort | Positions | Winners | Gross price P&L | Commission | Net P&L | Net per position |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Same M15 reference | 30 | 11 | −$1.871000 | $52.296828 | −$54.167828 | −$1.81 |
| Reference rolled | 25 | 9 | −$3.190000 | $43.531560 | −$46.721560 | −$1.87 |

The earlier gap was about $0.06 per position versus $2.96 in November. The earlier period does not reproduce the large difference that motivated the experiment. This lowers confidence in reference rollover as a useful filter and leaves it a research candidate. Position state and selections could change when the rule actually runs.

For the complete 31-position sample, 26 final exits carried `TRADE_CLOSED`, four carried `STOP_LOSS_HIT`, and one carried `TP3_HIT`. The 26 `TRADE_CLOSED` positions held exactly 15 minutes by emulator entry/exit timestamps; the frozen source's only `strategy.close` is the elapsed-time path. Those 26 positions netted +$0.177901 after $46.027099 commission. This supports time-exit attribution for the captured rows but does not establish that a longer hold improves results. Four final stops include three B and one G; a stop hit is a realized outcome, not by itself proof of misplaced SL. Existing TP1/TP2 fills are accounted for once within their positions.

## Isolated implementation and verification

- [Generator](../../../scripts/generate_crt_freshness_candidate.py) pins the exact `indicator_professional.pine` parent SHA-256 `050518694b7d83a112dc22e40e1072621f7884cc89b526b29995532131f0ad1b` and `strategy_professional.pine` parent `eb601426b7a71779cd0aee0f56f987a6cf723cf48b23131aa29d9214913f4851` before producing the research pair.
- The [Indicator candidate](../../../pine/experiments/indicator_crt_freshness.pine) hashes to `895baef9c0bf4d3eff5938d408eb117c8d684d27e6e7c74bb92fcd6362d67daf`. The [Strategy candidate](../../../pine/experiments/strategy_crt_freshness.pine) hashes to `f53c0a101164217398434c8e3894624149e1848b3fa8bef9e1f02c461f262457`. With research window and audit logging both enabled, each expiry caused by the freshness guard emits one `CRT_FRESHNESS_AUDIT` event with the actual setup and current completed M15 reference times. An expiry record identifies a candidate removed at that bar. It does not identify a trade the old rule would have selected later.
- [Analyzer](../../../scripts/analyze-crt-freshness.mjs) rejects wrong feed/timeframe, malformed M5 timestamps and incomplete position captures. It reconciles gross less commission to net. [Focused tests](../../../tests/crt-freshness-experiment.test.mjs) check M15 boundary timing, native cohort sums, and regeneration from pinned parents. Both candidates passed the independent Pine parser and compiled and ran in TradingView. Controlled Replay and evaluation on unseen data remain open.
- Local verification initially passed across 28 test files and 242 tests, typecheck, both generator checks in `npm run verify`, 33 independent Pine parses, and `git diff --check`. The focused CRT tests also check exact regeneration. The comparison addition raised the local total to 245 tests.
- Frozen baseline SHA-256 remains Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`, Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`. No existing chart, alerts, Telegram routing or live orders were changed.

## Native comparison procedure

Run the parent and experimental Strategy on the **same** FOREXCOM:XAUUSD M5 history with identical Inputs/Properties and verified exact source copy-backs. Export native `PLAN_AUDIT`, full partial-exit/group logs and Tester results for both. Check whether B plans actually change when `crtTime` rolls, whether other modules take their slots, and whether gross, commission, net and drawdown improve outside the inspected sample. Pair the experimental Indicator under the same conditions and examine every parity difference. Keep later, genuinely unseen bars separate from this inspected historical period. The current candidate is **not ready to replace the saved Indicator or Strategy**.

### Compare the two Strategy exports

Use `strategy_professional.pine` for the original run and `strategy_crt_freshness.pine` for the experimental run. Enable the same research window and audit logging in both. Preserve the Pine Logs CSVs, the editor copy-backs, and the Inputs, Properties, and Tester captures. If a strategy has no positions, preserve its Tester result and settings because missing log rows alone cannot establish zero trades.

Run the [comparison tool](../../../scripts/compare-crt-freshness-runs.mjs) on the decoded `Message` text from the two CSVs:

```bash
node scripts/compare-crt-freshness-runs.mjs original-messages.txt experiment-messages.txt
```

The tool reconciles partial exit legs into positions, then reports results by module, all plan differences at zero tolerance, and valid reference-expiry events. It rejects duplicate captures, incomplete position totals, and an experimental capture that selects a setup on or after its recorded expiry. Review both runs' source, chart history, settings, and date range before interpreting the net difference. The tool reports an empty expiry stream explicitly because missing rows alone cannot establish zero expiries. TradingView's Tester remains the evidence for intratrade drawdown.

The comparison tool passed three focused tests using archived captures and simulated audit events. The full local suite then passed 245 tests across 29 files, plus 33 Pine parses. The subsequently captured native exports also reconcile in the tool.

Browser control interrupted an earlier attempt after Autosave was paused. The follow-up reconnected the original chart, closed the leftover Pine Editor and visually verified Autosave on. The Free/Basic chart-data export and intraday Bar Replay restrictions seen on the account remain relevant. Strict full-history Indicator/Strategy parity is still open, and the archived captures record unresolved differences.
