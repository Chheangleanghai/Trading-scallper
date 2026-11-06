# Nov4 historical close discrepancy — preserved-evidence investigation

**The discrepancy is real in the retained records, but its external cause remains unresolved.** More original information can be recovered than a planned Entry alone: the old lifecycle records preserve `signalPrice=4044.77`, and actual emulator rows preserve entry4044.79. The later native Strategy capture now also reports planned/signal price4044.89 and actual entry4044.91. A full old OHLC/HTF/dataset-start snapshot cannot be recovered from the retained files reviewed here.

This investigation read preserved artifacts only. It did not run TradingView, repeat the Indicator/Strategy parity comparison, change a source or edit existing evidence. `drift-evidence.json` contains extracted original records, CSV hashes and a reproducible inventory; `extract-drift-evidence.py` recreates it.

## Target and recovered observations

The common plan is F BUY, `timestamp=1793786100000`, **2026-11-04 09:55 UTC**; its historical M5 bar opens09:50. Setup timestamp is09:45. The date prefix of a historical Pine log is a bar timestamp, **not the time the CSV was exported**.

| Field | Old confirmation Strategy CSV | Later Nov5-trace Strategy CSV |
| --- | ---: | ---: |
| Planned Entry / lifecycle signalPrice | 4044.77 | 4044.89 |
| Actual emulator entry | 4044.79 | 4044.91 |
| SL | 4031.97 | 4031.97 |
| TP1 / TP2 / TP3 | 4057.57 /4070.37 /4083.17 | 4057.81 /4070.73 /4083.65 |
| Planned risk per unit | 12.80 | 12.92 |
| Initial/final-sized quantity | 2.2 | 2.2 |
| Sizing equity | 9928.6634736 | 9928.6634736 |
| Entry / exit bar index | 4823 /4826 | 4823 /4826 |
| Actual exit price | 4044.56 | 4044.56 |
| Entry / exit time UTC | 09:55 /10:10 | 09:55 /10:10 |
| Position net USD | −2.285657 | −2.5496834 |

Original support: `confirmation-review-2026-11-05/strategy-native-raw.csv` records527–532 and `recalculation-review-2026-11-05/strategy-nov5-raw.csv` records527–532. CSV record numbers include the header. The latter native trace was compiled Nov6 07:14:46 Cambodia and its complete source copy-back matched, per `recalculation-review-2026-11-05/verification-receipt.json`.

The price discrepancy reaches actual emulator entry and risk sizing, rather than only a callout label. The same quantity and exit price produce a USD0.2640264 net difference (gross entry effect0.12×2.2=0.264 plus entry commission0.0000264). These are alternate recalculations of the same historical position, not additional independent trades.

The retained old Indicator CSV independently has `signalPrice=4044.77`; its post-reload CSV has4044.89 (`confirmation-review-2026-11-05/indicator-native-raw.csv` and `indicator-reload-raw.csv`, records289–292). Thus the historical old value is corroborated by both models. Several older artifact families also contain4044.77, but their counts must not be treated as new independent market observations.

## What the price changes establish

In `pine/experiments/indicator_confirmation_review.pine:824`, Close-mode planned Entry is `roundPrice(close)`. It is accepted at874; `signalPrice := close` is assigned at887; plan time is `time_close` at890. The lifecycle serializer renders `signalPrice` with `format.mintick`. Equivalent unchanged assignments exist in `indicator_professional.pine:770` and833. Consequently the old4044.77 is recoverable as a **tick-formatted chart-close proxy**, not an unrounded OHLC snapshot. The12-tick change cannot be explained just by sub-tick rounding.

With the same stop, Entry +0.12 increases fixed-R risk by0.12. The resulting TP1/2/3 changes +0.24/+0.36/+0.48 are the expected1R/2R/3R arithmetic. This does not identify a target-projection defect. Execution occupancy can explain which setup is selected; it does not by itself change the built-in chart `close` at an unchanged Close-mode plan timestamp. Fill slippage does not explain a planned Entry or `signalPrice` change.

## Recoverable context and missing context

- Older native candidate traces do preserve F setup state. At09:45 setup and09:55 confirmation, rounded trigger4044.21, invalidation4032.72 and frozen EMA band4037.17–4042.61 agree with the newer full snapshot **after rounding**. They do not preserve old exact EMA/ATR values or OHLC. Example: `continuation-2026-11-05/indicator-trace-native.csv` records7209/7269 and `quantity-trace-native.csv` records7534/7594. These traces have different frozen parents and must not be relabeled current-parent captures.
- Older trace plan bar index is6202; the later full snapshot uses4822. Yet the old confirmation Strategy and later Nov5 Strategy both use entry index4823 while reporting the different prices above. Index/start differences occur in the archive, but no retained old `firstLoadedBarTime` pins the disputed dataset. Different index values alone do not establish this cause, and identical indexes do not prove the historical prices were identical.
- New full data snapshots (`recalculation-review-2026-11-05/probe-*-raw.csv`, record296) preserve O4043.58/H4045.30/L4043.335/C4044.89, target bar index4822, first-loaded time1791756000000, exact EMA/ATR/HTF context and F state. At09:55, EMA9=4043.2187954562, EMA21=4038.4026843703, EMA50=4021.6348215891, ATR=4.9440548808, completed H1 close4034.065 and H1 EMA50=3949.1804348711. These newer snapshots are stable in the existing three captured recalculations; they do not supply the old side of the discrepancy.
- All **206 saved AX text files** under `reports/native-v080/` were searched for4044.77,4044.89 and1793786100000: **zero hits**. Inspected compilation/reload screenshots show later Nov5 charts, not the Nov4 target. In particular, the confirmation final image's09:50 crosshair is **Nov5**, with prices around4127, not Nov4. No original target OHLC was recovered from those images.
- The inventory found23 CSV artifacts containing this plan. Three clear-levels CSVs are byte-identical; the professional final-London/after-reload pair is also byte-identical. Their preserved names are useful provenance, but aliases must not be counted as independent captures. Full hashes and alias groups are in `drift-evidence.json`.

## Explicit native chronology anchors

These are **compiler or screenshot clock observations**, not CSV export timestamps. Nov5/Nov6 dates and Cambodia timezone come from the relevant verification receipts; no filesystem creation/modification time is used as a native capture time.

| Saved evidence | Explicit native anchor |
| --- | --- |
| `professional-candidate-2026-11-05/indicator-reload.png` | Chart clock14:00:58UTC. |
| `professional-candidate-2026-11-05/indicator-final-compile.ax.txt:411` and PNG | Compile21:41:09→21:41:27 Cambodia (14:41UTC); PNG chart clock14:44:17UTC. |
| `confirmation-review-2026-11-05/indicator-compile.ax.txt:458` and PNG | Compile23:09:36→23:09:56 Cambodia (16:09UTC); PNG clock16:10:53UTC. |
| `confirmation-review-2026-11-05/final-chart.png` | Chart clock16:26:39UTC; crosshair Nov5, not target Nov4. |
| `recalculation-review-2026-11-05/probe-compile.ax.txt:230` and PNG | Compile23:59:04→23:59:24 Cambodia (16:59UTC Nov5); PNG clock17:00:52UTC. |
| `recalculation-review-2026-11-05/probe-after-reload-compile.ax.txt:400` | Compile07:05:10→07:05:11 Cambodia on Nov6. |

The professional `indicator-reload.png` is earlier than its final-compile image. Its filename cannot establish that it observes a reload after the final source compile. The separate receipt's byte-equal raw-log claim remains a recorded claim about those artifacts; that screenshot alone supplies no later final-source chronology.

The artifact families also retain alternating historical values: the professional Indicator has4044.89, then the confirmation Indicator's initial capture has4044.77 before returning to4044.89 after reload. Without exact CSV export timestamps and contemporaneous raw data, this cannot be described as a single, proven one-way feed correction at a known clock time.

## Conclusion and smallest useful next experiment

No preserved evidence proves a feed revision, stale chart/cache, wrong selected log instance, dataset-start effect or engine defect as the root cause. Source reasoning and multiple records narrow it to an upstream historical close/provenance discrepancy; **root cause remains UNRESOLVED**, and the failed price-stability observation remains retained.

Another stable4044.89 reload would add repeatability evidence without recovering the missing old state. If4044.77 reappears, capture the existing snapshot probe **before any reload**, together with the exact source copy-back, active log/study identity, actual inputs, chart URL/symbol/timeframe, visible capture clock and first-loaded history. Then reload and export the same probe immediately. This yields the paired OHLC/context evidence currently missing. Until then, preserve both historical outcomes and keep the general non-repainting/release gate open.
