# TradingView diagnostics review — 2026-11-08

## Scope and evidence

This is a bounded native Strategy capture on `FOREXCOM:XAUUSD`, M5, chart display timezone UTC+7. The diagnostic window is 2026-11-06 21:00 through 2026-11-07 00:00 WIB (14:00–17:00 UTC). The downloaded raw Pine Logs CSV is `tradingview-strategy-signal-diag-2026-11-08.csv`, SHA-256 `3f305b2431c6bae0cbdd6acff5aea307441b2ccfea8973aaba564f99504f0e93`.

The analyzer accepted schema `signal-diagnostics/v2`, capture `capture-2026-11-07-01:1794130529225`, parent SHA `8461833b9f466380dd03d877e94215165544dfee038e407e6d130c840abac479`. That parent SHA matches the on-disk `pine/experiments/strategy_signal_clarity.pine`; the experimental Strategy source hash is `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d`.

The stream contains exactly 447 events, sequences 1–447, 36 consecutive M5 bars, one start and one end marker, zero duplicate IDs, zero sequence gaps, zero dropped events, and no completeness problems. `CAPTURE_END` reports a complete internal event budget. Analyzer status is `COMPLETE_WITHIN_CAPTURE_WINDOW` and export status is `STRUCTURALLY_COMPLETE_UNAUTHENTICATED`: this verifies internal structure and window coverage, not TradingView authorship or exact source identity.

## A–H lifecycle counts in this window

| Module | Setups | Confirmation passed | Qualified plans | Orders | Fills | Completed positions | Other observed lifecycle |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| A — Sweep/MSS/FVG | 1 | 0 | 0 | 0 | 0 | 0 | 1 invalidated at stage 1 |
| B — CRT | 4 | 2 | 2 | 2 | 2 | 2 | 2 invalidated; 6 bars globally had a busy plan slot |
| C — Pivot false break | 1 | 0 | 0 | 0 | 0 | 0 | 1 invalidated |
| D — K-SNR | 0 | 0 | 0 | 0 | 0 | 0 | No setup observed in this window |
| E — Supply/demand | 0 | 0 | 0 | 0 | 0 | 0 | No setup observed in this window |
| F — Trend pullback | 1 | 1 | 0 | 0 | 0 | 0 | 4 repeated confirmation-bar checks failed stop-distance and entry-distance; first blocker was stop distance; candidate expired |
| G — AMD range approximation | 2 | 0 | 0 | 0 | 0 | 0 | 1 invalidated; 1 new setup remained awaiting displaced range break at the capture boundary |
| H — Quasimodo approximation | 0 | 0 | 0 | 0 | 0 | 0 | No setup observed in this window |

The six busy-slot bar observations are shared engine-state observations, not six separately rejected setups per module. The F checks are four bar observations for the same candidate, not four distinct candidates. Counts apply only to this three-hour window.

## Completed Strategy positions and accounting

Both selected plans were B_CRT shorts. The fill records arrived on the next bar calculation, one bar after order submission; their actual entry timestamps equal the order-bar close/next-bar open timestamp. Each position closed 15 minutes after its actual fill. Both exit rows have `exitComment=TRADE_CLOSED` and `exitId=Close entry(s) order B_CRT`, and the diagnostic classifier reports `TIME_EXIT`. No partial TP exit rows were recorded for these positions.

| Position | Planned entry → actual fill | Qty | Exit (WIB) | Price movement gross | Commission | Net |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| B_CRT short | 4049.56 → 4049.54 at 22:30 | 2.2 | 22:45, 4050.56 | −$2.244 | $1.782022 | −$4.026022 |
| B_CRT short | 4059.76 → 4059.74 at 23:35 | 2.1 | 23:50, 4063.58 | −$8.064 | $1.7058972 | −$9.7698972 |
| **Total** |  | **4.3** |  | **−$10.308** | **$3.4879192** | **−$13.7959192** |

For a short, gross price P&L is `(entry − exit) × quantity`: `−1.02 × 2.2 = −2.244` and `−3.84 × 2.1 = −8.064`. At 0.01% commission per side, the first position fee is `(4049.54 × 2.2 + 4050.56 × 2.2) × 0.0001 = 1.782022`; the second is `(4059.74 × 2.1 + 4063.58 × 2.1) × 0.0001 = 1.7058972`. Net is gross minus those fees. These are two losing observations, not evidence of long-run profitability or expectancy.

Plan-to-confirm latency was 2 bars for the first B candidate and 3 bars for the second. Order-to-fill latency was one bar by bar index and zero elapsed milliseconds at the boundary timestamp. No other plan was submitted in this capture.

## Native validation limits

- The Strategy was attached to TradingView and produced native Pine Logs and broker-emulator closed-trade rows; that establishes that the TradingView instance compiled and ran sufficiently to execute this capture. No compiler-pane snapshot or compiled-token count was preserved, so token headroom is **not measured**.
- The capture's parent SHA matches `pine/experiments/strategy_signal_clarity.pine`, but the event payload does not contain the experimental source hash. No fresh paste-and-copy-back comparison was recorded. Exact editor-source attribution is **unverified**.
- The diagnostic Indicator log pane had no events available. There are no paired Indicator/Strategy candidate or plan exports from this run, so native parity is **not tested**.
- No controlled Bar Replay/reload or non-repainting test was performed in this capture. No complete Strategy Tester CSV export was available; the Free account exposed the visible List of Trades but the export route was unavailable. Do not interpret this bounded capture as the historical 77-position/115-row analysis.
- The actual Inputs dialog showed `Maximum holding minutes = 15`; exit IDs/comments and the 15-minute fill-to-exit intervals independently support the time-exit classification for these two positions. This is stronger evidence than labeling every `TRADE_CLOSED` row a time exit.

## Source preservation and local verification

Frozen v0.8.0 baseline hashes remain unchanged:

- `pine/indicator.pine`: `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`
- `pine/strategy.pine`: `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`

The existing diagnostic implementation/generator/analyzer/test changes remain experimental and separate from those baselines. `npm run verify` passed: TypeScript typecheck, 26 test files, 223 tests, generated-Pine check, and independent parse of all 31 Pine files. `npm audit --omit=dev` reported zero production vulnerabilities; `npm ls --omit=dev --depth=0` found no production dependencies. `git diff --check` passed. No localhost EPERM failure occurred in this run.

## TradingView chart state at hand-back

After the bounded capture, the two temporary diagnostics studies were removed from the active chart. The chart remains `FOREXCOM:XAUUSD`, M5, display timezone UTC+7, with the A–H confirmation-review study visible and Autosave on. Only one saved `Unnamed` layout was available. The previously recorded three-study set (confirmation review visible, exit-audit Strategy hidden, baseline Indicator hidden) was not present when this chart was inspected, so exact restoration of that earlier set is **not verified**. The current chart is clean of the temporary diagnostic Indicator and Strategy, but should not be described as an exact restoration of the earlier layout.

## Highest-value next evidence

Capture the diagnostic Indicator on the same FOREXCOM M5 feed with matching date range, inputs, history, and decision state as the saved Strategy capture. Verify the active editor source by copy-back and retain compiler/token evidence. Then compare common candidate and plan identities, classify execution-state differences, and run controlled Replay/reload. The existing Strategy capture alone cannot establish parity or non-repainting.
