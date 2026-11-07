# Signal diagnostics capture — 2026-11-07

## Capture identity

- Source: `pine/experiments/indicator_signal_diagnostics.pine`
- Experimental source SHA-256: `0931720f236cd4c4faa9b350674d950a6582c84dbac5ed89d65a8e08bd964161`
- Frozen parent SHA-256 embedded in the run: `d4d4866086e13d95fb0e5162bee51050a6fe47a010f4be004bdc5d5c28aba69e`
- Baseline Indicator SHA-256: `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`
- Baseline Strategy SHA-256: `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`
- Platform context in payload: `FOREXCOM:XAUUSD`, M5, `INDICATOR_ESTIMATE`
- Run tag: `research-1`
- Bounded research window: 2026-11-06 21:00 through 2026-11-07 00:00 WIB (start inclusive, end exclusive)
- Native UI observation: Pine Editor showed `Compiled.` and `Updated on chart.` for the pasted experimental Indicator. The full post-paste editor buffer was not copied back, so this is not an exact-hash native provenance claim.
- All A–H module enable flags were true in the diagnostic payload.

## Preserved artifacts

- Raw Pine Logs CSV: `indicator-run-research-1.csv`
- Raw CSV SHA-256: `b2408cfebec8a5a40846e3791e98d1448628f480eaa22e6e8377154be83ed715`
- Analyzer output: `indicator-run-research-1.analysis.json`
- Compile screenshot: `indicator-native-compiled.png`
- Screenshot SHA-256: `c632520068d062481460cdb132bdf00f11298af5c6ca752af2d90529de93a72c`
- The raw Pine Logs download was copied byte-for-byte into this folder; retained original download at the user Downloads path during the capture.

## Observed results

- 452 diagnostic events across 36 consecutive M5 bars (bar indices 5424–5459).
- Capture status: `COMPLETE_WITHIN_CAPTURE_WINDOW`; no dropped events were reported. This means complete only for the configured three-hour window, not for full chart history.
- Event totals: 11 setup detections, 11 stage transitions, 8 confirmation-pass records, 2 selected plans, 2 qualified plan records, 2 estimated fills and 2 estimated closures.
- Both selected plans were module B (`B_CRT`). Setup-to-confirmation delays were 2 and 3 M5 bars. These are indicator estimates, not broker-emulator orders or actual fills.
- A: 1 setup, invalidated before plan.
- B: 5 setups; 2 passed confirmation and were selected; 3 invalidated.
- C: 1 setup, invalidated before plan.
- D, E and H: no setup observed inside this capture window.
- F: 2 setups; failed-check observations included `STOP_DISTANCE` 6, `ENTRY_DISTANCE` 6, `H1_ALIGNMENT` 2, `COOLDOWN` 1 and `QUALITY` 2; one candidate expired.
- G: 2 setups; one invalidated and no displacement confirmation recorded within the window.
- Four slot-busy bar observations were counted across module state rows. Per-module event counts should not be summed to infer unique market setups because multiple modules can observe the same bar.

## Limits

This is one bounded Indicator diagnostic capture. It does not compare Indicator to Strategy, report Strategy Tester executions, establish broker fill/exit reasons, prove non-repainting, or establish profitability. Zero module events mean none were observed within this bounded capture only. Runtime settings beyond fields embedded in the raw payload were not independently captured as a complete settings manifest. Native compile was visually observed, but exact editor-buffer copy-back was not performed.

The frozen baseline Pine sources were not modified for this experiment. The generated diagnostic Strategy has not yet been run natively. Do not treat the indicator's estimated fills/closures as executed positions.
