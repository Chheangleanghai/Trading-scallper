# Native research continuation — 2026-11-05

**Actual TradingView captures, not synthetic market results. Project remains v0.8.0; release remains blocked.**

## Quantity correction: full Strategy verification completed

The corrected experiment's full editor copy-back matches `pine/experiments/strategy_quantity_units.pine` exactly: SHA-256 `bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed`. The fresh all-module M5 export contains **728 records, 92 complete positions and 140 actual exit rows**. All 92 requested allocations conserve the entry quantity; every position closes its full quantity; every row-profit sum matches its position net delta. **No bracket residual is observed.**

The same-chart legacy trace contains 92 complete positions and 156 exit rows, with **14 bracket residuals**. All 14 have corresponding corrected positions, and all corresponding corrected bracket quantities cover the full position. See `matched-residual-controls.json`. This extends the earlier eight-case defect reproduction and 68-case native mechanics matrix to genuine Strategy signals.

The correction is an execution-quantity fix, not a profitability optimization. Over this all-module M5 capture, the corrected experiment's gross price P&L **+$76.322** less commission **$160.4372028** equals net **−$84.1152028**. The matched-context legacy experiment nets **−$74.7109936**. Different complete exits also change subsequent candidate histories. Do not call the correction a performance improvement from these results.

Raw exports: `corrected-strategy-native.csv`, `legacy-trace-native.csv`. Analyses: `corrected-exit-analysis.json`, `legacy-current-exit-analysis.json`, `corrected-quantity-reconciliation.json`.

The earlier A-only M5 loss investigation remains resolved in the separate exact-source exit-audit reproduction: Long 2.1, 4177.50 to 4171.83, gross **−$11.907**, commissions **$1.7533593**, net **−$13.6603593**. Its actual `TRADE_CLOSED` exit comment/market-close identifier confirmed the 15-minute time-exit path in that experiment, with no TP/SL partial fill. That prior finding is preserved in [`trade-exit-reconciliation-2026-11-03.md`](../trade-exit-reconciliation-2026-11-03.md); it was not rerun or promoted into a general profitability conclusion here.

## Genuine candidate histories and zero-tolerance comparisons

Three separate, exact-copy-back-verified trace drafts compiled successfully in TradingView:

| Draft | SHA-256 | Visible native compile success, Phnom Penh |
| --- | --- | --- |
| Indicator trace | `498cada5de4ee79311499bb073506d225fec6d5dbed202d663b8d0332885154d` | 7:45:06 AM |
| Legacy Strategy trace | `5b3d9a729f186652a47549077dd3c6c82bed1eba79087cfbe5410e36714029ae` | 7:53:11 AM |
| Quantity Strategy trace | `b1e3d34cec84b5fccf1c16fe65c351b56857dfe5877e29ab6c8980c44c92603a` | 7:49:32 AM |

Compile messages are preserved in their `.ax.txt` captures. These are native accessibility observations; no separate compile-success PNG was captured for these drafts. Each raw trace CSV contains **747 engine snapshots and 6,723 candidate snapshots**, covering exactly **249 common M5 bars**, three phases and all nine candidates per phase. Duplicate keys, missing phases and missing candidate rows are rejected by `analyze-captures.py`.

The code adds read-only snapshots before candidate updating, after updating and after arbitration. Structural tests reconstruct each unchanged parent exactly after removing the diagnostic additions and display-title suffix. The Indicator and quantity traces also reproduce every complete `PLAN_AUDIT` record from their non-trace captures exactly. All three trace runs have matching **115 actual input controls**, merged from overlapping views covering items 0–188. No settings were invented from fixture values.

| Comparison against 89 Indicator plans | Strategy plans | Common times | Exact common plans | Missing plans | Shared times with differences | Mismatch records |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Legacy experiment | 92 | 84 | 80 | 13 | 4 | 23 |
| Corrected quantity experiment | 92 | 85 | 82 | 11 | 3 | 20 |

Both comparisons **FAIL strict planned parity at tolerance zero**. They are not baseline release passes. Execution-model differences remain separate. Every field difference is retained in `native-trace-review.json`, `corrected-plan-comparison.json` and `legacy-current-plan-comparison.json`.

The corrected experiment's 14 distinct mismatch times now have native decision-state observations:

| Decision time, UTC | Native observation |
| --- | --- |
| Oct 8 08:35 and 09:15 | Indicator retains an older, unready B candidate; Strategy has a later B setup ready. |
| Oct 9 07:50 | Indicator B is invalidated; Strategy's later B candidate is ready. |
| Oct 9 08:05 | Strategy plan slot is occupied; Indicator F is ready. |
| Oct 9 08:15 | Indicator plan slot is occupied; Strategy's later F candidate is ready. |
| Oct 9 09:55 | Different frozen B setup histories; Indicator B is unready and Strategy B is ready. |
| Oct 9 11:30 and 12:30 | Strategy's session counter is already five; the current rejection explicitly says `Session plan limit`. |
| Oct 19 10:35 | Strategy was occupied when Indicator created F at 10:20; Strategy creates it at 10:25 and is not ready at 10:35. |
| Oct 19 11:05 | Indicator's counter is five and its current B rejection is `Session plan limit`. |
| Oct 22 08:35 | Indicator B is invalidated; Strategy's later B candidate is ready. |
| Oct 22 15:40 | Both F plans qualify, but Strategy was occupied at Indicator's 15:25 setup and begins F at 15:30. Prices match. |
| Nov 3 08:40 | The same F setup-time pattern occurs at 08:20 versus 08:25. Prices match. |
| Nov 4 10:20 | Indicator has B and F ready and selects B; Strategy missed B's 10:10 setup while occupied and selects the later F. Module, setup time, quality, SL and TP1–TP3 differ. |

Detailed engine flags, candidate states, contemporaneous rejection reasons and setup-time snapshots are in `quantity-candidate-investigation.json`; the legacy equivalent is also retained. Retained quality/rejection fields are not interpreted as current filter evaluations unless that candidate was actually evaluated on that bar. These bounded traces establish the observed decision-state differences, not the complete cause of every earlier state transition outside their capture windows. Strict parity is still a failed gate; expected execution coupling is not erased from the comparison.

## Fixed-window M1/M3/M5/M15 experiment research

The corrected quantity experiment was run on all four intervals with A–H enabled, threshold 75, H1/London filters on, Close entry, 15-minute hold, partial exits on, break-even/trailing off, risk 0.5%, notional cap 90%, USD 10,000, commission 0.01% per side, 2-tick slippage and one-tick order delay. Actual inputs and Properties are preserved in `matrix-window-final-*`. The research admission window is **Oct 30 00:00 UTC through Nov 5 00:00 UTC, end exclusive**. Loaded warm-up histories differ by interval; their exact earliest calculation bars are not authenticated by these logs.

| Interval | Complete positions | Actual closed rows | Gross price P&L | Commission | Net P&L | Tester max drawdown | Tester closed-row PF |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| M1 | 20 | 49 | +$78.730 | $35.5542758 | **+$43.1757242** | $33.00 | 1.863 |
| M3 | 19 | 30 | +$51.270 | $33.5790694 | **+$17.6909306** | $61.93 | 1.235 |
| M5 | 17 | 25 | +$90.052 | $30.2391690 | **+$59.8128310** | $27.06 | 1.998 |
| M15 | 6 | 6 | +$5.431 | $10.6829067 | **−$5.2519067** | $35.94 | 0.814 |

All plans lie inside the captured window; all positions have complete, quantity-reconciled exit rows; raw exit profits reconcile with native Tester net amounts. No residual was observed in these four runs. These are four separate short **in-sample** experiments, not a combined portfolio or baseline/OOS performance result. Partial rows are not independent positions. `fixed-window-matrix.json` separately reports position profit factors and closed-position drawdowns, which can differ from Tester row-based/intratrade measures.

There is no configured spread model. The JSON includes clearly assumed additional round-trip price-cost scenarios of 0.1/0.3/0.5 per closed unit; these are not broker-calibrated spreads. Full Strategy Tester CSV export remains plan-gated. The raw `matrix-m*-native.csv` files are genuine **Pine Logs** exports containing actual emulator exit telemetry, independently reconciled against captured Tester values.

Early `matrix-window-inputs-*` and `matrix-window-verified-inputs-*` captures show an endpoint edit that did not commit. They are preserved as unsuccessful UI attempts and were not used as the matrix context. Only the later **`matrix-window-final-*`** captures show both committed endpoints. The similarly timed duplicate Indicator-trace download in Downloads was not substituted for any Strategy export.

## Source preservation and chart restoration

Frozen baseline files and their accepted compile evidence are unchanged. The newly copied saved Indicator normalizes to the baseline plus **four trailing EOF spaces**, giving normalized hash `109593dc793ecd8b7a63485b6a7d4f4034e845bc02c6c18f560a121e3a924c63`; this is a whitespace-only runtime variant, not an exact baseline-hash copy-back. It was preserved rather than silently trimmed. The exact trace Indicator is independently copied back and compiled as recorded above. Prior baseline compile acceptance is not replaced by this new whitespace variant.

The original chart configuration was restored: **FOREXCOM:XAUUSD M15**, saved Indicator hidden, original exit-audit Strategy visible, research-window restriction off, original Jan 2026–Jan 2027 input values restored, A–H and audit logging on as originally observed, Pine Editor/log panes closed, Tester open, Replay off and **Autosave on**. All **115 input controls** on both restored studies match the original observed configuration, including fresh captures **after reload** (`restored-input-verification.json`). The restored Strategy copy-back exactly matches `a8267588…61623`.

Both native scale menus show **Pinned to right scale**, separately from **Pin to new right scale**. The price view was fitted after interval testing, saved and reloaded; `final-chart.png` and `final-chart.ax.txt` show the restored studies on one right price axis, current candles visible, editor closed and **All changes saved**. This display adjustment changed no trading calculations. The final chart's all-history legacy Tester result belongs to its restored source/window, not the fixed-window quantity matrix above. No saved script was overwritten or published.

The initial connection returned frozen images and failed inputs; `initial*`, `autosave-initial*` and `control-recovery-stale.png` are not proof of a current state. User foregrounding recovered control. Later restoration screenshots show advancing UTC clocks and are distinct from those stale captures. No account upgrade, alert, Telegram message, deployment or live trade occurred.

## Validation and remaining gates

Final `npm run verify`: **169 tests / 16 files passed**, TypeScript, frozen generation check and all ten independent Pine parses passed. The five trace-focused tests include exact parent reconstruction, read-only instrumentation and inclusive/exclusive capture-window checks. Production dependency audit: **0 vulnerabilities**; production dependency tree: **empty**. The production webhook remains database-free.

Reproduce the analysis from the preserved native CSVs:

```bash
python3 reports/native-v080/continuation-2026-11-05/analyze-captures.py
python3 reports/native-v080/continuation-2026-11-05/analyze-matrix.py
```

Remaining: baseline source-attributed multi-plan parity; a decision on whether strict engine parity requires an independently planned, separately approved design; candle-by-candle non-repainting evidence; and untouched OOS/walk-forward evaluation. The Free account's intraday Replay gate was not bypassed. Historical reload/candidate snapshots are not Replay proof. A future protocol is prepared separately, with no result claimed before its market-data window exists. **Keep v0.8.0.**

A separate local research ZIP is prepared using `scripts/package_share.py`; the older share ZIP is preserved. The new archive is a review snapshot, not a released version or an upload. Its independent verification receipt is stored alongside the ZIP in the parent project directory.
