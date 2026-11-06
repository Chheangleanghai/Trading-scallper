# Native recalculation and missing-signal investigation

Capture began November 5 and continued November 6, 2026 (Asia/Phnom_Penh). Historical market times below are UTC. Project remains **v0.8.0**. This investigation collected new native evidence; it did not change baseline or confirmation-review trading rules.

## Results

| Check | Actual result |
| --- | --- |
| Local regression | `npm run verify` passed: TypeScript, **199 tests / 24 files**, baseline generation consistency, **18 independent Pine parses**. [Full output](local-full-verification.txt). Local parsing does not certify native execution. |
| Native diagnostic sources | All three isolated probes had full normalized editor copy-backs matching their local files and observed successful native compilation. They add logging, retain the parent inputs and trading statements, and were not saved into the chart layout. |
| Nov4 snapshot repeat | **11/11 captured M5 bars match** in OHLC, requested/derived context, candidate state, execution state and plan fields after M5→M3→M5 and after reload/reapplication. `lastBarIndex` changes are reported separately. |
| Full fresh Indicator plan repeat | **74/74 PLAN_AUDIT records match in every field**, with no missing plans, after both recalculations. This is same-Indicator historical repeatability, not paired Indicator/Strategy parity. [Exact comparison](probe-full-plan-comparison.json). |
| Earlier 4044.77→4044.89 change | **Not reproduced; original discrepancy remains unresolved.** Keep the previous failed capture. New matches do not erase it or pass the general non-repainting gate. |
| Nov5 12:15 missing Strategy BUY | **Cause established in the captured window:** execution-dependent setup timing froze a different F trigger. Both traces have identical OHLC and market context across 16 bars. [Diagnosis](NOV5_F_TRACE_DIAGNOSIS.md). |
| Full independent plan-stream parity | **Still not passed.** The earlier current-parent comparison has 74 Indicator plans, 75 Strategy plans, 72 common timestamps, 69 exact common plans, three differing common plans and five unpaired plans. Explaining these divergences does not make the streams equal. |
| Actual runtime controls | **117 inputs captured for each inspected study; zero differences.** Strategy trace inputs and restored saved Indicator inputs were read from native controls. No defaults were substituted. [Comparison](runtime-input-comparison.json). |
| Restoration | Saved confirmation-review Indicator visible on FOREXCOM:XAUUSD M5; original exit-audit Strategy and baseline Indicator preserved hidden; three studies total. Right price scale verified, legends collapsed, editor/log panels closed, **Autosave restored ON**. [Final chart](final-chart.png), [Autosave proof](autosave-restored.png). |

## Nov4 reload investigation

The isolated `indicator_data_snapshot.pine` appends read-only `DATA_SNAPSHOT_AUDIT` logging to the frozen confirmation-review Indicator. Its fixed window is bar opens **Nov4 09:30–10:20 inclusive**, 11 M5 bars. It records raw chart OHLC, prior-completed higher-timeframe context, indicators, candidates, plan fields and the loaded-history boundary. No input, trigger, order, alert predicate or quantity is changed.

Three genuine Pine Logs downloads are preserved unchanged:

| Raw CSV | Records | Snapshot rows | PLAN_AUDIT rows |
| --- | ---: | ---: | ---: |
| [Before](probe-before-raw.csv) | 331 | 11 | 74 |
| [After interval cycle](probe-timeframe-cycle-raw.csv) | 331 | 11 | 74 |
| [After reload and probe reapplication](probe-after-reload-raw.csv) | 331 | 11 | 74 |

Reload restored the saved Indicator rather than automatically reattaching the unsaved probe. The exact same probe was reapplied to that study before the third capture; this distinction is part of the procedure, not an uninterrupted active-probe reload claim.

For the disputed decision close **Nov4 09:55**, all three fresh captures show the 09:50 bar as:

- O **4043.58**, H **4045.30**, L **4043.335**, C **4044.89**.
- F BUY Entry **4044.89**, SL **4031.97**, TP1 **4057.81**, TP2 **4070.73**, TP3 **4083.65**, quality **80**.
- First loaded bar `1791756000000`, target `barIndex=4822`, unchanged. `lastBarIndex` advances from 5184 to 5255 and 5257 as newer bars exist; the comparison reports that metadata difference explicitly.

The earlier record used Entry4044.77 and the corresponding fixed-R projections. Its raw OHLC was not captured. The fresh evidence proves Entry equals chart close in these new runs, but cannot identify what changed in that earlier run. TradingView documents historical feed revisions and dataset-start differences as possible sources of recalculation differences; those are **hypotheses here, not an established cause**. See [TradingView's repainting discussion](https://www.tradingview.com/pine-script-docs/concepts/repainting/) and [refresh-result guidance](https://www.tradingview.com/support/solutions/43000478429-script-or-strategy-gives-different-results-after-refreshing-the-page-repainting/).

The snapshot comparator uses exact decimal values and rejects malformed, duplicate or incomplete records. It reports data/state and metadata differences separately. Synthetic intake tests validate that tool, not market behavior. Reproduce either comparison with a new output path:

```bash
python3 scripts/compare-data-snapshots.py \
  reports/native-v080/recalculation-review-2026-11-05/probe-before-raw.csv \
  reports/native-v080/recalculation-review-2026-11-05/probe-after-reload-raw.csv \
  --output /tmp/xauusd-snapshot-review.json
```

## Nov5 missing BUY: frozen triggers, not different price data

Fresh native traces cover bar opens **11:05–12:20 inclusive**, hence closes **11:10–12:25**. Each export contains 48 engine and 432 candidate snapshots (three phases ×16 bars ×nine candidate objects). Indicator raw export has 800 total records; Strategy has 1,064.

| Decision close UTC | Indicator | Strategy |
| --- | --- | --- |
| 11:10 | Previous timed estimate closes; creates F BUY with frozen trigger **4129.135**. | Prior emulator position is still occupied in this calculation; no new F setup. |
| 11:15 | Existing candidate can confirm but cooldown blocks its plan. | Observes the previous actual exit at11:10; creates F with trigger **4132.185**. |
| 12:15 | Same close **4130.30** exceeds its frozen trigger; accepts BUY Entry4130.30, SL4121.69, TP1/2/3 **4138.91 / 4147.52 / 4156.13**. | Close4130.30 is below its trigger4132.185; no confirmation and no current risk evaluation. |

Across those16 bars, all12 traced market/context fields match exactly: **192 comparisons, zero differences**. The earlier slot release therefore explains this trigger divergence within the captured window. The stored Strategy text `Stop distance invalid` at12:15 is stale from a preceding ready bar; it is not the current blocker. The detailed analysis explicitly distinguishes stored reasons from risk checks evaluated on that bar. The confirmation board also gates current risk explanations on readiness and decision time; no display or trading change was needed for this finding.

The same execution-state mechanism can affect module arbitration and later session quota. [PARITY_DIAGNOSIS.md](PARITY_DIAGNOSIS.md) records the remaining historical cases, separating fresh lifecycle evidence from older-parent candidate traces. Its previously open Nov5 case is superseded specifically by [the fresh Nov5 diagnosis](NOV5_F_TRACE_DIAGNOSIS.md). Other cases supported by archived traces must retain that attribution limit.

## Source, settings and compile attribution

| Temporary source | SHA-256 | Native success observed (Phnom Penh) |
| --- | --- | --- |
| `indicator_data_snapshot.pine` | `1e814d428b20b24375951d169ef209d75b6e02afd4dc653be53eb1710bd2fdf0` | Nov5 23:59:24; reapplied Nov6 07:05:11 |
| `indicator_nov5_trace.pine` | `b8af2d0cc5c3f5453b6015e977b405f965081dee68f7933f4ddf50760fd23ddf` | Nov6 07:08:58 |
| `strategy_nov5_trace.pine` | `ce4ca8ee7b1e10fc0920c43b457e2b0141bc1aa55fc1c6c854bc6cec9126504c` | Nov6 07:14:46 |

Copy-backs and native compile AX/PNG artifacts are retained alongside the CSVs. For Strategy success use `strategy-nov5-compiled-success.*`; the earlier `strategy-nov5-compile.*` captured compilation still in progress and is preserved as such. Embedded parent hashes alone would not establish native provenance; the full copy-backs and observed compile/update sequence supply that link.

The actual inspected controls have all A–H enabled, audit logging on, Close entry, London session, H1 alignment, quality75, cooldown5, maximum5 plans/session, holding15 minutes, Fixed R1/2/3, Structure stop, buffer0.15ATR, maximum3ATR stop, maximum1.5ATR entry distance. Research date-window restriction is **off**; visible start/end are Jan1 2026/Jan1 2027. Those dates must not be described as an enforced research admission window. Captured historical plans span Oct12–Nov5, with loaded data beginning earlier.

Strategy Properties show USD10,000 capital, 0.01% commission, two ticks slippage, on-bar-close calculations, one-tick order delay, default four-tick bar detail and1x leverage. Default order size100% is overridden by explicit `qty` in this source. No spread assumption or new profitability/OOS result is inferred from these traces. See `strategy-nov5-properties.ax.txt` and the two runtime-input JSONs.

The Indicator controls were captured after restoring the saved parent; Strategy controls were captured on its trace. During temporary source replacements no inputs were edited. The trace generators add no inputs, and captured values match both each other and the prior parent controls. This is recorded UI continuity, not settings authenticated by the CSV format itself.

## What remains open

The earlier historical Entry change still lacks simultaneous before/after OHLC from the failed run. Full execution-coupled plan streams still differ; a shared virtual planner would be a separate state-model experiment requiring fresh validation. Controlled candle-by-candle Bar Replay, untouched OOS/walk-forward and live delivery are not established. The current Free account's chart-data download displayed an upgrade gate; no upgrade or workaround was used. Existing intraday Replay/webhook limits remain, and Telegram is not active.

The next useful work is prospective raw snapshot capture if the historical drift recurs, or an isolated design for a shared planning clock while keeping actual broker execution separate. Repeating successful tests or enlarging parity tolerance cannot close these gaps. No real alert, Telegram message, deployment or trade was made. Baseline sources, both frozen parent candidates, the database-free production path and project version remain unchanged.
