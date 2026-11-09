# Repainting safeguards and preserved evidence audit — 2026-11-09

This is a read-only source audit and reproduction of archived evidence. No browser actions, new native captures, source edits, or general non-repainting PASS are claimed by this audit.

## Current source safeguards

`static-audit.json` records line-level evidence and exact hashes for the current wrappers:

| Wrapper | SHA-256 | Main confirmed-bar engine |
| --- | --- | ---: |
| `indicator_signal_diagnostics.pine` | `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852` | line 868 |
| `strategy_signal_diagnostics.pine` | `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d` | line 891 |

- Each wrapper has five `request.security` calls. Every requested H1, M15, CRT, daily, and weekly expression uses its prior completed source value (`[1]`) with `lookahead_on`. The runtime guard disallows a CRT reference timeframe below the chart. Supported chart timeframes are M1/M3/M5/M15; H1/D/W requests are higher and M15 is equal or higher on those charts.
- Candidate lifecycle mutation, arbitration, plan confirmation, signal timestamps and entry notification calls occur in the confirmed-bar engine. Strategy `newSignal` is reset false each calculation and set only in that engine; order placement consumes it afterward. Strategy declares `calc_on_every_tick=false`, `calc_on_order_fills=false`, and `process_orders_on_close=false`.
- `ta.pivothigh/low` uses right-hand confirmation strength. Swing/QM state is stored on the confirmation bar; there is no negative plot offset that would present a later confirmation as an earlier entry. Setup detection reads already-known swings before the current bar's confirmed pivots are assigned.
- Current wrappers contain no `varip`, no chart-visible-range dependency, and no `volume` reference. `timenow` appears only in a comment and the capture-ID suffix. `last_bar_index` affects only bounded historical drawings; the current price-label spacing uses a trailing 100-bar range.
- Context EMA plots can move during an open candle. Such movement is distinct from a confirmed trading plan changing. Static inspection found no current future-data request or intrabar signal-admission path, but this is not an exhaustive proof of runtime behavior on every feed/history.

## Reproduced archived evidence

The existing strict comparator was run again against preserved files, with outputs written only here:

1. `archived-historical-repeat.json`: `probe-before-raw.csv` versus `probe-after-reload-raw.csv` from `native-v080/recalculation-review-2026-11-05`. All **11/11** captured OHLC/context/candidate/execution/plan/history-boundary snapshots match. All 11 have expected `lastBarIndex` metadata differences. Exit code **0**, status `DATA_AND_STATE_MATCH_METADATA_DIFFERS`. This confirms those archived rows, not current-wrapper live behavior.
2. `archived-live-repeat.json`: the clearly labeled `stable-live-unique-derived.log` and `stable-reload-unique-derived.log` from `native-v080/live-reload-2026-11-06`. Two common snapshots have matching OHLC, derived context, candidates, execution and plan state. One raw-context field differs: **volume 0 → null** on bar open `1793941500000`, close `1793941800000`. Exit code **1**, status `CHANGED_OR_MISSING_SNAPSHOTS`. That failure was retained; no missing value was filled and no tolerance was widened. The derivative files were originally produced only after verifying repeated same-close observations were data-identical; original raw CSVs remain unchanged in the prior directory.

The volume difference is a feed/runtime data availability observation, not evidence that the serializer maps every zero to null: the helpers test `na(value)` explicitly, and the current trading wrappers do not reference volume. It still prevents a strict all-raw-data equality claim. The observed live bar had no qualified entry while the London filter was closed, so matching `plan=null` does not verify the first appearance of a BUY/SELL plan.

The separate November 4 Entry **4044.77 → 4044.89** observation remains unresolved. Later matching captures did not reproduce it, and the earlier failed run lacks simultaneous full OHLC/HTF snapshots. Feed revision, dataset-start dependence and script behavior are not established causes. A new successful repeat must not erase that preserved failure.

No full test suite was repeated: there were no source changes, and the suite already passed earlier in this session. The two native-evidence comparator executions above and current-source safeguard assertions were run specifically for this audit.

## Native procedure for the current chart

1. Preserve exact editor copy-back, all actual inputs, source hashes, symbol/feed/timeframe, first loaded-bar time, study set, axis membership, and Autosave state before testing. The currently attached research Indicator is unsaved; a browser reload can remove it. Do not silently compare the restored saved parent to the temporary wrapper.
2. With current source/inputs unchanged, capture a bounded M5 diagnostic export. Cycle M5 → M3 → M5 to force current-wrapper recalculation while retaining the attachment, then export again. Compare every plan/candidate/state/price/time/blocker field. Exclude only new capture identity fields, report firstDataTime/bar-index changes explicitly, and retain any true mismatch. This establishes bounded historical recalculation stability, not live first appearance.
3. If native Replay is available on the account, start immediately before the chosen window (for the existing case, Nov 6 20:55 WIB), keep loaded warmup/history consistent, and advance one M5 candle per step. Record the 22:20/22:30 and 23:20/23:35 B setup/plan sequence and levels at first appearance, then compare the completed historical run. If an upgrade gate appears, preserve its screenshot and stop that feature; do not upgrade or use another account to evade it.
4. A live-to-reload entry check needs a **qualified live setup**, its initial confirmed plan and levels, matching raw OHLC/HTF/candidate/execution state, then a same-source reload/reapplication. The current `SIGNAL_DIAG` schema does not record `barstate.isrealtime/ishistory`, boot/update counters, or raw OHLC. Its complete historical export cannot by itself prove a live first-close observation. An isolated current-parent observational probe (or equivalent externally preserved first-close evidence) is needed for that claim. Existing `indicator_stable_live_snapshot.pine` demonstrates the measurement approach but has a different parent/hash.
5. Restore the original timeframe, inputs, study visibility, scale and Autosave. Treat persistence/saving separately from a temporary research run; do not overwrite the saved original layout without the applicable user authorization.

The current diagnostic wrapper's bounded native compile/source match is established by the separate November 9 installation evidence. Full general non-repainting and live plan first-appearance certification remain **UNVERIFIED** until the native steps supply sufficient evidence.
