# TradingView Indicator log excerpt review — 2026-11-08

## Evidence received

The user supplied the final four `SIGNAL_DIAG` records from a new Indicator capture. The excerpt identifies:

- Feed/timeframe: `FOREXCOM:XAUUSD`, M5.
- Run tag: `native-pair-2026-11-08`.
- Capture ID: `indicator-xauusd-m5-20261108-01:1794148251701`.
- Parent SHA-256: `d4d4866086e13d95fb0e5162bee51050a6fe47a010f4be004bdc5d5c28aba69e`, matching the on-disk `pine/experiments/indicator_signal_clarity.pine`.
- Experimental diagnostics Indicator SHA-256 on disk: `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852`. The event payload contains the parent hash, not this full wrapper hash.
- Window: 2026-11-06 21:00 through 2026-11-07 00:00 WIB (14:00–17:00 UTC), 36 five-minute bars.

The event stream demonstrates that a Pine script ran far enough in TradingView to emit the diagnostic records and end marker. The supplied excerpt alone does not authenticate the entire raw export or prove which exact wrapper text was active.

## Tail interpretation

| Sequence | Event | Finding |
| ---: | --- | --- |
| 449 | F `STATE` | A bullish F trend-pullback candidate was still at stage 1. Its setup time is 23:50 WIB; on the 23:55 bar its trigger had passed, but the first blocker was `Setup opposes H1 trend`. It was blocked, not a qualified plan or entry. |
| 450 | G `STATE` | A bearish G AMD candidate was at stage 1 and waiting for a displaced break. Checks were not evaluated yet, so this is setup-only, not a SELL signal. |
| 451 | H `STATE` | No active H candidate was reported. |
| 452 | `CAPTURE_END` | The script reports 451 attempted events, 452 sequence values including the end record, 36 observed bars, no dropped events, and `WINDOW_END`. The end marker is emitted at the 00:00 WIB boundary. |

## Comparison with the saved Strategy capture

The saved Strategy capture uses the same feed, timeframe, window, and first-data timestamp, but a separate capture ID and the Strategy parent source. Its G AMD candidate `FOREXCOM:XAUUSD:5:G_AMD:-1:1793984400000` matches the Indicator tail exactly: same setup timestamp/direction, trigger `4053.85`, invalidation `4068.485`, and stage 1. The Strategy stream records this as setup/stage events at sequence 436–437 and a state at sequence 445.

The F candidate in the Indicator tail (`...F_TREND_PULLBACK:1:1793983800000`, setup at 23:50 WIB) has no matching candidate ID in the saved Strategy stream. The Strategy stream instead records an F candidate at 23:35 WIB (`...:1793982900000`, trigger `4063.825`, invalidation `4044.495`) and clears it when the B plan is selected. The Indicator's 23:50 candidate has trigger `4064.365` and the same invalidation. This is an unresolved candidate-timing/state difference; the bounded excerpt cannot establish its exact cause or show whether earlier Indicator events explain the path.

The exact G candidate match is useful evidence, but it does not establish full plan parity, order/fill parity, or exit parity.

## Completeness limits and next evidence

The end record reports that the Indicator's internal diagnostic budget completed, with zero dropped events and the expected window boundary. Only sequences 449–452 were supplied, so sequence continuity and duplicate IDs for 1–448, the full A–H lifecycle counts, all `CHECKS` records, and the full set of candidate/plan matches cannot be verified from this excerpt. The prior schema-v1 Indicator analysis is a separate capture and is not substituted for this schema-v2 capture.

Next evidence: attach the complete raw `Date,Message` Pine Logs CSV for this exact Indicator capture. Analyze all 452 sequence records against the saved Strategy stream before classifying the F difference. No trading rule changes are recommended from this bounded excerpt.
