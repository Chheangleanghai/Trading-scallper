# Native Indicator installation and diagnostic capture — 2026-11-09

The research Indicator is attached and running on the user's existing `FOREXCOM:XAUUSD` standard M5 chart, displayed in UTC+7. TradingView reported **Compiled** and **Added to chart** at **11:29:19 WIB** after the user pasted the source. Its editor text was then copied back and verified byte-for-byte against the local generated file. This closes the fresh Indicator copy-back gap identified in the November 8 review.

No Pine source or trading rule was changed for this check. The existing confirmation-review Indicator remains attached and hidden; the new research Indicator is visible. No Strategy is currently attached. The research script and working chart are **unsaved**, with **Autosave off**, preserving the saved layout. Persistence after saving/reloading was intentionally not tested because this is the authorized temporary research workflow.

## Source and input evidence

| Source | SHA-256 |
| --- | --- |
| Frozen `pine/indicator.pine` | `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` |
| Frozen `pine/strategy.pine` | `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` |
| Generated research Indicator and exact native editor copy-back | `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852` |
| Indicator clarity parent named by diagnostic payloads | `d4d4866086e13d95fb0e5162bee51050a6fe47a010f4be004bdc5d5c28aba69e` |

The copy-back has 142,217 characters, 142,425 UTF-8 bytes, and 1,940 newline-separated lines including the final empty line. Its declaration is `indicator(...)`, with `useBroker=false`. The embedded parent hash matches the actual local parent file.

Complete input accessibility snapshots were saved before capture, during capture, and after restoration. All **140 controls** match exactly between the initial and final snapshots. Only four controls changed for capture: qualified-plan/lifecycle logging false → true, diagnostics Off → Events, run tag, and capture ID. All trading and presentation values remained the same. In particular: all A–H enabled, London session, H1 filter enabled, quality 75, Close entry, structure SL, fixed 1/2/3 R targets, and 15-minute estimate holding time. The native scale menu showed **Pinned to right scale**, and the rendered chart showed candle and Indicator levels on the single right price axis.

Evidence: `indicator-editor-copy-back.pine`, `indicator-inputs-ax.txt`, `capture-inputs-ax.txt`, `final-inputs-ax.txt`, `input-restoration-check.json`, `scale-membership-ax.txt`, `scale-membership.png`, `autosave-off.png`, and `final-chart.png`.

## Fresh genuine Pine Logs capture

The native **Download logs** action exported `indicator-native-logs.csv` (795,815 bytes), SHA-256 `9ec927afd475e5a30e16996a3750a9e83e3e39245b598989b4d2943da5cffee3`. The download completed even though the browser download-event wait timed out; the actual downloaded file was located and copied unchanged. No substitute or synthetic log was used.

| Check | Result |
| --- | --- |
| Model / feed / timeframe | `INDICATOR_ESTIMATE` / `FOREXCOM:XAUUSD` / `5` |
| Run tag | `native-indicator-2026-11-09` |
| Capture ID | `indicator-xauusd-m5-20261109-01:1794199386573` |
| Historical window | Nov 6 14:00–17:00 UTC / 21:00–00:00 WIB |
| Diagnostic events | 452; sequence 1–452, continuous and unique |
| Boundary records | One `CAPTURE_START`, one `CAPTURE_END` |
| Covered bars | 36 consecutive M5 bars, indexes 5424–5459 |
| Internal budget | Complete; 0 dropped, 451 attempted plus end record |
| Parser / correlation / check invariants | PASS; no reported completeness problems or lifecycle gaps |
| Export classification | Structurally complete within the capture window; not cryptographically authenticated |

`CAPTURE_END budgetComplete=true` alone was not treated as proof of export completeness. The analyzer and separate evidence assertions checked start/end records, all sequences, unique event IDs, bar coverage, budget, and source/input restoration. Raw logs also include plan rows outside this window; bounded comparison uses `windowStart < timestamp <= windowEnd` explicitly.

Reproduce the analysis with:

```sh
node scripts/analyze-signal-diagnostics.mjs reports/native-v090/indicator-install-2026-11-09/indicator-native-logs.csv --chart-currency USD
```

## A–H observations and latency

| Module | Setup detections | Candidates with confirmation observations | Invalidated | Expired | Selected plans |
| --- | ---: | ---: | ---: | ---: | ---: |
| A — Sweep/MSS/FVG | 1 | 0 | 1 | 0 | 0 |
| B — CRT | 5 | 2 | 3 | 0 | 2 |
| C — Pivot false break | 1 | 0 | 1 | 0 | 0 |
| D — K-SNR | 0 | 0 | 0 | 0 | 0 |
| E — Supply/demand | 0 | 0 | 0 | 0 | 0 |
| F — Trend pullback | 2 | 2 | 0 | 1 | 0 |
| G — AMD range approximation | 2 | 0 | 1 | 0 | 0 |
| H — Quasimodo approximation | 0 | 0 | 0 | 0 | 0 |

These are observations inside a three-hour window. Zero is an observed zero in this complete window, not evidence that a module never triggers. Carried-in candidates can have confirmation/check observations without an in-window setup event; these columns are distinct lifecycle counts, not a funnel of identical populations.

F generated six confirmation/check-bar observations. Its first blocker was stop distance on four checks and H1 alignment on two. All failed checks across those observations were stop distance 6, entry distance 6, H1 alignment 2, cooldown 1, and quality 2. Repeated checks are not additional setup candidates. The blockers and `candidateRejection` consistency invariants passed the analyzer.

The two B plans took **2 and 3 M5 bars** from setup to confirmation, then qualified on the confirmation bar with zero additional qualification delay. Indicator events are estimates; authoritative order/fill/position/cost fields remain unavailable for this Indicator model.

## Bounded comparison with preserved native Strategy evidence

`comparison-to-prior-strategy.json` compares this fresh Indicator export with the preserved November 8 Strategy capture from `../tradingview-strategy-diagnostics-2026-11-08-repeat.csv`. Symbol, timeframe, diagnostic window, and first loaded-bar timestamp match. The selected candidate IDs and plan IDs match exactly.

| Plan time WIB, Nov 6 | Module / side | Entry | SL | TP1 | TP2 | TP3 | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 22:30 | B_CRT / SELL | 4049.56 | 4058.60 | 4040.52 | 4031.48 | 4022.44 | Exact planned-field match |
| 23:35 | B_CRT / SELL | 4059.76 | 4068.08 | 4051.44 | 4043.12 | 4034.80 | Exact planned-field match |

**Two plans per side, zero planned-field mismatches, tolerance 0.** Execution model fields differ as expected. Fresh Indicator diagnostic contents also match the November 8 Indicator repeat exactly after excluding only the run/capture/event identity fields; no numerical, decision, blocker, bar, or timestamp field was normalized away.

Nine detected candidate IDs are shared with Strategy. The Indicator-only B/F setups at 23:50 WIB have direct `ENGINE` evidence for **execution-state divergence**: its estimate closes on bar 5457 and frees the slot, while Strategy is still active/brokerBusy. Strategy observes the actual 23:50 exit on bar 5458, at the 23:55 close. Neither extra setup becomes a selected plan. This is not evidence of a changed trading rule.

The prior native Strategy capture supplies two completed B positions, two fills and two exit rows: gross **−$10.308**, commission **$3.4879192**, net **−$13.7959192**. Both are supported time exits by actual exit ID/comment/timing; there are no partial-target rows in that bounded sample. Those are preserved prior Strategy results, **not new broker fills from this Indicator run**. Slippage is already embedded in emulator prices; no extra slippage or commission was deducted.

## Verification status and remaining work

- **PASS:** Current native Indicator compile and attachment, exact source copy-back, full current Inputs capture, right-scale menu/visual check, complete bounded native export, diagnostic invariants, exact two-plan comparison, and restoration of all 140 input controls. Source baseline hashes remain unchanged.
- **PASS earlier in this session:** `npm run verify` — TypeScript typecheck, 27 test files / 238 tests, generated source checks, diagnostic hash checks, and 31 independent Pine parses. No source changed after that run, so the suite was not repeated here. Fresh capture analysis and restoration assertions were run for this evidence.
- **SKIP this turn:** Fresh Strategy compilation/fills, saved-layout reload/persistence, and Bar Replay. The previous account attempt blocked intraday Strategy Replay; this turn does not claim that restriction was retested.
- **UNVERIFIED:** Full-history Indicator/Strategy parity, source-and-all-Strategy-Properties provenance for a newly paired run, non-repainting, module efficacy, and chronological out-of-sample profitability. This small repeated historical sample cannot establish them.

Only this evidence directory was added. No live orders, live alerts, Telegram messages, or deployments were performed. The highest-value next native experiment is a fresh fully captured Strategy run paired with these exact Inputs and complete Strategy Properties, followed by a controlled historical reload/Replay comparison when available.
