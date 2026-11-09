# TradingView visible trade-list analysis — 2026-11-08

## Scope and evidence quality

This supplements [the Strategy Tester session report](tradingview-tester-session-2026-11-08.md). I read the TradingView **FOREXCOM:XAUUSD, M5** Strategy Tester list for **Oct 12–Nov 7, 2026** by scrolling the visible table. The displayed row numbers were verified as a continuous set from **1 through 115**, with no missing row numbers. TradingView's CSV download is plan-gated, so this is a UI transcription of rounded values, **not a raw CSV export**. The evidence is useful for grouping rows and classifying displayed exit signals, but it cannot reproduce full precision or expose exit order IDs.

The temporary research Strategy was then removed with TradingView Undo. The original A–H Indicator remains on the chart; the chart is still FOREXCOM XAUUSD M5 and displays UTC+7. The temporary chart was not saved.

## Rows versus positions

I grouped rows by entry module, direction, entry timestamp, and entry price. With pyramiding set to zero in the observed Strategy Properties, this yields **79 apparent completed positions**:

| Exit rows per apparent position | Positions |
| ---: | ---: |
| 1 | 54 |
| 2 | 14 |
| 3 | 11 |
| **Total** | **79** |

There are **25 multi-row positions**. A row is an exit leg; it is not necessarily a separate entry. Across the grouped display, 33 positions have positive displayed net, 46 have negative displayed net, and none is exactly zero: a rounded position win rate of **41.77%**. This is descriptive of this in-sample run and does not establish future performance.

The sum of the displayed row Net P&L values is **−$96.06**. The Strategy Tester headline shown in TradingView is **−$96.02**, a **$0.04 discrepancy** consistent with summing per-row values rounded to cents. The headline also showed gross profit **$282.25**, gross loss **$378.27**, profit factor **0.746**, and 50 profitable rows out of 115. Those are TradingView's displayed row-level summary metrics; they should not be presented as de-duplicated position metrics.

Using the rounded entry and exit prices visible in the table and the displayed quantities gives a rough combined price-move P&L of **+$41.59**. Its difference from the rounded row-net sum is approximately **$137.65**. The table does not show a commission column or full-precision fills, so this is not an exact commission reconciliation. The Strategy Properties showed 0.01% commission and two-tick slippage. Do not deduct slippage again from emulator fill prices, and do not call the $137.65 an exact fee total.

## Displayed outcomes by selected module

| Module | Rows | Apparent positions | Positive / negative | Displayed net sum | Stop-labelled positions | `TRADE_CLOSED` at 15 min |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Sweep/MSS/FVG | 0 | 0 | 0 / 0 | $0.00 | 0 | 0 |
| B — CRT | 71 | 48 | 17 / 31 | −$110.13 | 6 | 42 |
| C — Pivot false breakout | 12 | 9 | 7 / 2 | +$28.91 | 0 | 9 |
| D — K-SNR | 4 | 3 | 3 / 0 | +$26.78 | 0 | 3 |
| E — Supply/demand | 10 | 5 | 1 / 4 | −$15.16 | 2 | 3 |
| F — Trend pullback | 13 | 12 | 4 / 8 | −$25.28 | 0 | 12 |
| G — AMD range approximation | 0 | 0 | 0 / 0 | $0.00 | 0 | 0 |
| H — Quasimodo approximation | 5 | 2 | 1 / 1 | −$1.18 | 1 | 1 |
| **Total** | **115** | **79** | **33 / 46** | **−$96.06** | **9** | **70** |

These are outcomes of the shared A–H selection/arbitration engine. They are not isolated module tests: modules that were selected faced different opportunities and states. In particular, B's larger count and loss total do not by themselves show that its rules are worse, while A and G having zero selected positions does not show that they never detected a setup.

## Exit and partial-target evidence

- The table labels **70 positions** with final signal `TRADE_CLOSED`, and each displayed entry-to-exit interval is 15 minutes. The active input was 15 minutes. The Strategy source declares `timeExit = input.int(15, ...)` at line 67 and calls `strategy.close(..., comment='TRADE_CLOSED', immediately=false)` at line 1440. This is strong consistency with the time-exit path, but this table does not expose the actual exit order IDs or comments needed for an order-ID-level confirmation.
- **Nine positions** contain stop-loss-labelled exit rows and finish with stop-loss-labelled exits. The Strategy's TP1/TP2/TP3 exits also carry stop comments, so these may be several exit legs from one position. Count them as positions above, not as nine extra orders or standalone BUY/SELL signals.
- **16 positions** contain a TP1-labelled partial; **2** contain a TP2-labelled partial; **0** contain a TP3-labelled row. These target counts can overlap because a position can reach both TP1 and TP2.
- The explicit exit orders are at lines 1429–1433 in the experimental Strategy. This explains why one position can yield multiple Tester rows. The UI does not provide enough precision to recompute every leg's exact gross result or commission.

## What this adds and what remains open

This improves on the earlier “unique-position count unknown” note by providing a manually grouped **79-position estimate** and module/exit breakdown from all 115 visible rows. It does **not** replace a machine-readable export, verify exact commissions, certify each time exit by order ID, or make this sample out of sample. The two-plan native Indicator/Strategy comparison remains the separate bounded result in `tradingview-native-paired-review-2026-11-08-repeat.md`; this full Tester table is not a 115-plan parity capture.

Frozen baseline source hashes were checked again and remain:

| Source | SHA-256 |
| --- | --- |
| `pine/indicator.pine` | `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` |
| `pine/strategy.pine` | `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` |

No trading rule, baseline source, or alert behavior was changed for this review. The next evidence that would resolve the main accounting uncertainty is a full-precision Strategy Tester trade export, if available under the current plan; otherwise retain these figures as rounded UI estimates.
