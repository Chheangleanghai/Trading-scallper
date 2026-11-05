# Quantity correction and native research — 2026-11-04

**Completed:** isolated integer-unit exit allocation, local regression, exact native editor copy-backs, native compilation, and a 68-case broker-emulator quantity matrix. **Release remains v0.8.0; parity, Replay and unseen OOS gates are open.**

## Implemented correction

`pine/experiments/strategy_quantity_units.pine` is generated from the preserved exit-audit experiment. It replaces `initialQty - q1 - q2` with an allocation in integer minimum-contract units, then converts each leg to quantity once. The shared helper is `pine/experiments/exit_quantity_units.pine.inc`; generator: `scripts/generate_quantity_experiment.py`. It also logs requested quantities as `QUANTITY_AUDIT`.

The experimental title, helper, allocation and diagnostic log are the only changes relative to the existing exit-audit Strategy. Entry predicates, candidate rules, stop/target prices, order calls, time exit, costs and version are preserved. A structural regression removes these changes and reconstructs the original experiment exactly. Neither frozen baseline file was edited.

| Source | SHA-256 |
| --- | --- |
| Frozen Indicator | `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` |
| Frozen Strategy | `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` |
| Preserved exit-audit experiment | `a8267588770637b4a75e50367267dac11a8ba6783cdd9084e7d9620ff3961623` |
| Quantity Strategy experiment | `bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed` |
| Quantity matrix | `f955a8b06b36cc123f41e2c1b2e475c3db005e625238256b5e8279215c7607ff` |

## Genuine native matrix result

On FOREXCOM:XAUUSD M5, the matrix compiled at the editor's displayed **9:15:51 PM / 9:15:52 PM** and completed **68/68 cases**. The complete editor copy-back matches the matrix hash above. `matrix-native-result.png` visibly shows zero residual cases, zero entry mismatches and zero failures. This was a historical synthetic order-mechanics test inside TradingView, not a signal or profitability backtest.

The matrix covers 17 integer lot counts (`1,2,3,4,5,7,10,13,20,21,22,23,30,43,64,99,125`), both directions, and partial exits on/off, with minimum contract 0.1. Cases start at the October 6, 2026 historical test window. Small allocations correctly skip zero-sized early legs.

Actual **Download logs** CSV: `matrix-native.csv`, SHA-256 `8d51a6e83a4239674130328734800be94880ea9453d19d4daecaa88719bb9388`. Its 329 records contain 68 requests, 68 actual allocations, 124 bracket fills, 68 flat-position observations and one completion record. Every entry matches the requested size; every case's bracket fills sum to its full position; no cleanup close was needed. Per-case reconciliation: `matrix-native-cases.json`; summary: `matrix-native-analysis.json`.

This extends the earlier eight-case reproduction, where all four legacy allocations left 0.1 and all four integer controls closed fully. It validates the tested quantities and symbol settings, not every possible symbol, lot size or broker-emulator path.

## Corrected full Strategy run

A separate unsaved draft was copied back in full as `quantity-strategy-editor-copy.pine` and matches the experimental hash exactly. TextEdit accessibility exposes only the visible portion of a large document until all text is selected; the complete selected-document capture is `quantity-strategy-copy-back-selected.ax.txt`. The earlier partial capture is retained and is not source-equality evidence.

Native editor messages show successful compilation at **9:23:37 PM**. The first application encountered the Free account's study cap; that compile message alone does not prove the study ran. The completed matrix and original exit-audit study were temporarily removed under the user's testing/restoration authorization. Applying the verified new draft then showed **9:28:27 PM Compiling… / 9:28:29 PM Compiled. / Added to chart.** The actual applied title and M5 report were subsequently observed through native accessibility.

The new instance initially reproduced the A-only report's one losing row, net −$13.66. A–H and research logging were then enabled for a separate all-module run. Captured input views cover items 2–188; A was observed enabled before these changes and was not toggled. A complete post-change 0–188 capture is still needed for a formal paired manifest. Properties were captured: USD 10,000, pyramiding 0, default size 100% equity (explicit `qty` remains controlling), commission 0.01%, slippage 2 ticks, long/short leverage 1x, bar-close calculation and one-tick delay. No spread model is configured.

The corrected all-module **M5 UI observation** for **Oct 5–Nov 4, 2026** is net **−$84.12**, max drawdown **$216.24 (2.15%)**, **58 positive closed rows / 140 closed rows (41.43%)**, profit factor **0.794**. This is not 140 independent positions. Raw corrected-Strategy exit logs were not successfully downloaded before screen/control problems returned, so complete-position counts, residual coverage, exact net reconciliation and a fresh paired-plan result are **not established** for this run. No performance improvement is claimed; earlier captures have different live endpoints and allocation behavior.

## Parity and chronological analysis

The previous genuine 84-Indicator / 87-experiment plan comparison was not rerun or altered. `parity-triage.json` analyzes its existing 16 mismatch records: six have direct evidence of another engine's active position, cooldown or exhausted session quota; seven missing plans still need candidate history; three shared-time field differences remain flagged for candidate tracing. Two setup-time differences align with preceding closure observations one bar apart. These observations support execution-coupled candidate histories, not a cleared parity gate.

`chronological-and-cost-review.json` analyzes the already available 87 exit-audit position groups, preserving their original source attribution. A retrospective Oct 26 entry-time split gives 61 earlier groups, net −$95.2918889, and 26 later groups, net +$7.8702127. It is **not unseen OOS or walk-forward validation**: the full dataset was already inspected, and equity/state were continuous. Additional assumed round-trip price costs of 0.1/0.3/0.5 per closed unit reduce the original net to −$105.9716762 / −$143.0716762 / −$180.1716762. These are transparent scenarios, not measured broker spreads. Closed-position equity drawdowns in that JSON are distinct from Strategy Tester's intratrade maximum drawdown.

## Local checks and remaining native work

After implementation, four focused tests passed and the full `npm run verify` passed **164 tests / 15 files**, TypeScript, frozen-source generation consistency and the independent parser, including both new Pine scripts. Tests execute the actual Pine helper and cover conservation over 1,500 size/step combinations. No further code changes followed that full run. `source-preservation-and-copyback.json` independently records frozen-source preservation and exact experimental copy-backs.

Remaining: raw corrected-Strategy logs with complete matching runtime context; a new zero-tolerance paired comparison and investigation of every difference; available interval research; candle-by-candle Replay; and a genuinely untouched chronological evaluation. The Free account's intraday Replay/report-export gates remain in force. Existing historical reload equality does not prove candle-by-candle non-repainting.

## UI preservation and capture limitations

The original chart at this session's start was **M15**, with the Indicator hidden, exit-audit Strategy visible, Pine Editor closed and Strategy Tester open. Autosave ON was observed, then OFF was visibly verified at 14:08:35 UTC before testing. Temporary source drafts were not intentionally saved or published. The baseline source files and old raw evidence are preserved.

Later screenshots froze while accessibility values continued changing; those frozen PNGs are not used to prove the state named by their filenames. In particular, the later quantity-Strategy/report/Autosave PNGs require the accompanying accessibility limitations above. Native capture returned intermittent ScreenCaptureKit errors and Chrome switched to other windows. The matrix result screenshot and raw CSV remain independently usable.

**Restoration status: pending final verification.** A Chrome Reload control was invoked to restore the saved original chart. The following accessibility read contained the browser shell while the chart was loading. Do not claim the original studies, M15, Autosave ON or price-scale membership have been restored until a fresh final state is recorded. No alert, Telegram message, deployment, subscription or live trade was created.
