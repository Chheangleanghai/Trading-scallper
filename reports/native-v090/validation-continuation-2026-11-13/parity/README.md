# Direct native mismatch review — 2026-11-13

Three previously unresolved full-history mismatch mechanisms are now established from the preserved October 19 and October 22 morning native diagnostic streams. Strict plan equality continues to fail. The mismatches remain in every comparator result at tolerance 0.

## Evidence checks

The original November 9 CSV exports and native input snapshots were read in place. Both source copy-backs match the current on-disk wrappers exactly. Each pair has the same `FOREXCOM:XAUUSD`, M5, diagnostic bounds and `firstDataTime=1791756000000`. All **69 reviewed trading input variables** match within each pair, with zero missing values. The native CRT reference input is 15 minutes, maximum session plans is 5, and the global trading research admission window is disabled.

| Capture | Native diagnostic events | Window bars | Analyzer status |
| --- | ---: | ---: | --- |
| Indicator October 19 | 412 | 30 | COMPLETE_WITHIN_CAPTURE_WINDOW |
| Strategy October 19 | 417 | 30 | COMPLETE_WITHIN_CAPTURE_WINDOW |
| Indicator October 22 morning | 156 | 12 | COMPLETE_WITHIN_CAPTURE_WINDOW |
| Strategy October 22 morning | 165 | 12 | COMPLETE_WITHIN_CAPTURE_WINDOW |

All four streams pass start/end, event identity, sequence continuity, BAR coverage and zero-dropped-budget checks. The analyzer retains `STRUCTURALLY_COMPLETE_UNAUTHENTICATED` export status because no independently authenticated export envelope accompanies these native files. This review performed no new browser actions.

| Current wrapper | SHA-256 of source and preserved copy-back |
| --- | --- |
| Indicator diagnostics | `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852` |
| Strategy diagnostics | `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d` |

## October 19 10:35 UTC, Indicator-only F

The plan key is `FOREXCOM:XAUUSD|5|1792406100000`.

| Time UTC | Indicator event sequence and fact | Strategy event sequence and fact |
| --- | --- | --- |
| 10:20 | 208 estimated prior F closure, 209 engine slot free, 210 detects short F with trigger 4167.785 | 212 engine remains active and broker-busy, slot unavailable |
| 10:25 | 224 confirms that F but fails only COOLDOWN | 224 observes prior position closure, whose actual exit time is 10:20, 226 detects later short F with trigger 4164.96 |
| 10:35 | 250 passes every check at planned close entry 4166.48, 251 selects F | 258 retains later F at stage 1 with checks unevaluated and next directional trigger still pending |
| 10:50 | Earlier selected F has estimated closure at sequence 287 | 299 finally confirms later F but fails STOP_DISTANCE and ENTRY_DISTANCE |
| 11:05 | — | 336 invalidates later F after its extreme is breached |

The Indicator candidate is `FOREXCOM:XAUUSD:5:F_TREND_PULLBACK:-1:1792405200000`. The Strategy candidate is `FOREXCOM:XAUUSD:5:F_TREND_PULLBACK:-1:1792405500000`.

**Classification — execution-state and frozen-trigger divergence established.** The close 4166.48 is below the Indicator's short trigger and above the Strategy's short trigger. The native state records show the resulting confirmation split. The later rejected Strategy confirmation also explains why its retained F candidate never becomes an accepted plan during this episode.

The Indicator's first confirmation is 1 bar after setup. COOLDOWN blocks that bar. Selection occurs 2 bars after first confirmation, 3 bars after setup. The Strategy's differently frozen trigger produces a separate candidate lifecycle.

## October 19 11:05 UTC, Strategy-only B

The plan key is `FOREXCOM:XAUUSD|5|1792407900000`. Both models detect the identical B candidate at 10:50, `FOREXCOM:XAUUSD:5:B_CRT:1:1792407000000`.

- Indicator ENGINE sequence 329 records 5 session plans. CHECKS sequence 332 at 11:05 confirms the candidate and fails only `QUOTA`.
- Strategy ENGINE sequence 334 records 4 session plans. CHECKS sequence 338 at 11:05 has no failed checks, followed by SELECTED sequence 339.
- The extra Indicator F selected at 10:35 accounts for the one-plan difference. Both had 4 session plans before that selection.

**Classification — quota rejection established by actual CHECKS.** The first blocker and full failed-check list agree. Earlier 10:55 confirmation was blocked by H1 alignment in both models. Selection latency in Strategy is 1 bar from setup to first confirmation, 2 bars from first confirmation to order, and 1 bar index from submission to fill. Submission at a bar close and the following bar's opening fill share the same UNIX boundary timestamp in these historical records, producing 0 elapsed milliseconds across that one-bar-index transition.

## October 22 08:35 UTC, Strategy-only B

The plan key is `FOREXCOM:XAUUSD|5|1792658100000`.

| Time UTC | Indicator event sequence and fact | Strategy event sequence and fact |
| --- | --- | --- |
| 08:25 | 59 closes its prior estimate, 60 engine slot free, 61 detects short B with trigger 4088.695 and invalidation 4093.25 | 60 engine remains active and broker-busy, slot unavailable |
| 08:30 | 77 invalidates that B, with `Invalidation breached` | 72 observes actual prior exit at 08:25, 73 engine slot free, 74 detects a new short B with trigger 4090.045 and invalidation 4094.165 |
| 08:35 | 92 B state has stage 0, empty candidate ID and checks unevaluated | 92 CHECKS has no failed checks at entry 4087.67, 93 selects B |

The Indicator candidate is `FOREXCOM:XAUUSD:5:B_CRT:-1:1792657500000`. The Strategy candidate is `FOREXCOM:XAUUSD:5:B_CRT:-1:1792657800000`.

**Classification — execution-state, candidate invalidation and completed-reference consumption divergence established.** Native events establish the different setup origins, invalidation and selection directly. The reference-consumption explanation is derived from the source and actual inputs. `referenceUnused()` rejects reused reference timestamps, and `memory.crtUsed := crtTime` consumes a completed reference when a B setup begins. The two setup bars open at 08:20 and 08:25, within the same M15 segment. The `[high[1], low[1], time[1]]` completed-reference request therefore supplies the same 08:00 reference. Indicator consumes it at 08:25 and cannot reuse it after 08:30 invalidation. Strategy was occupied at 08:25 and can use it when free at 08:30. The diagnostic stream does not separately log `memory.crtUsed`.

Relevant current source locations are Indicator lines 168, 527 and 622–631, and Strategy lines 132, 491 and 604–613. No trading-rule change was required to explain these observations.

## Module observations in the target windows

Each cell is detected setups / selected plans. Confirmation pass events may recur on later bars, so they are kept separately in the machine-readable analyses.

| Module | Oct 19 Indicator | Oct 19 Strategy | Oct 22 morning Indicator | Oct 22 morning Strategy |
| --- | ---: | ---: | ---: | ---: |
| A | 2 / 0 | 3 / 0 | 1 / 0 | 1 / 0 |
| B | 5 / 1 | 6 / 2 | 2 / 1 | 2 / 2 |
| C | 2 / 0 | 3 / 0 | 0 / 0 | 0 / 0 |
| D | 1 / 0 | 1 / 0 | 0 / 0 | 0 / 0 |
| E | 0 / 0 | 1 / 0 | 0 / 0 | 0 / 0 |
| F | 3 / 2 | 3 / 1 | 2 / 0 | 2 / 0 |
| G | 1 / 0 | 1 / 0 | 0 / 0 | 0 / 0 |
| H | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

The October 19 comparison has 3 plans per model, 2 common exact plans and the 2 exclusive keys described above. October 22 morning has 1 Indicator plan and 2 Strategy plans, with the 1 common plan exact. Actual execution-model differences remain visible in comparator output.

## Captured Strategy position accounting

| Window | Completed positions | Exit rows | Gross USD | Commission USD | Net USD | Final position exit categories |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| October 19 | 3 | 5 | -0.4200000 | 5.2547166 | -5.6747166 | 1 STOP, 2 TIME_EXIT |
| October 22 morning | 2 | 2 | -22.8060000 | 3.4340628 | -26.2400628 | 2 TIME_EXIT |

The October 19 STOP is one 2.1-unit B position with three exit legs. Its net is -8.6815974 USD. The two time exits are F -3.3254193 USD and B +6.3323001 USD. October 22's B time exits are -17.3825358 and -8.8575270 USD. No target rows occur in these two windows. Position quantities and fees are aggregated once, and modeled slippage remains embedded in actual fills. The analyzer checked exit comments, identifiers and position totals using the current source's sole time-close call. These are historical broker-emulator observations within selected diagnostic windows.

## Reproduction and remaining evidence

Run from the repository root.

```sh
node reports/native-v090/validation-continuation-2026-11-13/parity/analyze-october-captures.mjs
```

The script reuses the existing diagnostic analyzer and strict plan comparator. It asserts matched input/context/source identities and the exact causal events before writing four analysis JSONs and `october-causal-review.json`. Every raw CSV and input snapshot stays under its original November 9 path. No Pine source, source baseline or old report was edited.

The three findings above plus the two established November 5 mechanisms classify 5 of the 8 original mismatch keys under the original loaded history. Fresh October 22 afternoon, November 3 and November 4 reproductions below add direct evidence for the remaining three keys under the current matched history. Controlled Replay, broader historical repeatability and genuine frozen OOS efficacy retain their separate validation requirements.

## Fresh October 22 afternoon reproduction

The November 13 Indicator and Strategy captures contain 213 and 212 structurally complete events across 16 M5 bars, with zero dropped events. All 69 actual trading input variables match. Both runtime source copy-backs equal the local wrappers after CRLF-to-LF normalization only. The original raw copy-back bytes remain preserved.

The current pair shares `firstDataTime=1792360800000`, October 18 22:00 UTC. The original pair began at `1791756000000`, October 11 22:00 UTC. These differ. Each model's 2 target-window plans nevertheless repeats its original November 9 target-window planned fields exactly at tolerance 0. This supports observed target reproduction while preserving the loaded-history difference.

For key `FOREXCOM:XAUUSD|5|1792683600000`, Indicator sequences 91/92 show its estimated prior B closure and free slot at 15:25. F setup sequence 95 freezes trigger 4053.725 with setup timestamp `1792682700000`. Strategy ENGINE sequence 92 remains broker-busy at 15:25. POSITION_CLOSED sequence 104 observes the actual 15:25 exit at 15:30, followed by F setup sequence 106 with trigger 4051.675 and setup timestamp `1792683000000`. Both candidates use invalidation 4064.93.

Indicator's earlier 15:30 confirmation fails only COOLDOWN at sequence 112. At 15:40, Indicator CHECKS/SELECTED sequences 138/139 and Strategy sequences 135/136 pass every check and select the same F plan. Both planned entries are 4050.67. The strict pair comparison preserves its sole differing field, `setupTimestamp`.

**Classification — different F setup origin caused by closure-observation timing established in the current matched history.** The candidate identities are `FOREXCOM:XAUUSD:5:F_TREND_PULLBACK:-1:1792682700000` and `FOREXCOM:XAUUSD:5:F_TREND_PULLBACK:-1:1792683000000`.

Current-window observed setup/selection counts are Indicator B 3/1, F 2/1, G 1/0 and H 1/0, and Strategy B 2/1, F 2/1, G 1/0 and H 1/0. A, C, D and E have zero detected setups in this window. Two Strategy positions complete through two TIME_EXIT rows. Gross is -6.9510000 USD, commission is 3.4061811 USD, and net is -10.3571811 USD.

Run `node reports/native-v090/validation-continuation-2026-11-13/parity/analyze-new-native-captures.mjs` to reproduce the fresh pair. `fresh-native-causal-review.json` retains original-window comparisons, current context, exact events and any unavailable pairs explicitly. Its per-model analysis JSONs retain lifecycle, latency, cost and position details.

## Fresh November 3 reproduction

The recovery captures contain 258 Indicator and 262 Strategy events, with matching M5 bounds, current loaded history and 69 actual trading inputs. Both are structurally complete. Each model's 2 plans repeats its original November 9 same-window planned fields exactly, while the loaded-history difference described above remains.

For key `FOREXCOM:XAUUSD|5|1793695200000`, Indicator estimated B closure sequence 122 and ENGINE sequence 123 free the slot at 08:20. F setup sequence 124 creates `FOREXCOM:XAUUSD:5:F_TREND_PULLBACK:-1:1793694000000` with short trigger 3907.715. Strategy ENGINE sequence 123 remains broker-busy then. POSITION_CLOSED sequence 135 observes the actual 08:20 exit at 08:25. F setup sequence 137 creates `FOREXCOM:XAUUSD:5:F_TREND_PULLBACK:-1:1793694300000` with short trigger 3908.215. Both invalidations are 3914.22.

Both F candidates first confirm at 08:40. CHECKS sequences 171 Indicator and 173 Strategy have empty failed-check lists. SELECTED sequences 172/174 produce the same F plan with entry 3906.84. The strict comparison retains the sole `setupTimestamp` difference. Setup-to-confirmation latency is 4 bars for Indicator and 3 for Strategy. Strategy submits on confirmation and fills at the next bar index.

**Classification — different F setup origin caused by closure-observation timing established in the current matched history.** B has 2 detected setups and 1 selected plan, and F has 3 detected setups and 1 selected plan, in each model. The other six modules have zero detected setups in the window.

The Strategy closes 2 positions through 3 exit rows, with gross 10.2190000 USD, commission 3.4364253 USD and net 6.7825747 USD. The F position demonstrates conserved partial quantities. EXIT_ROW sequence 199 records TP1 of 0.7 units, gross 5.5160000 USD, commission 0.5464032 USD and net 4.9695968 USD. Sequence 222 records the remaining 1.5 units through the source-attributed time-close order, gross 12.6450000 USD, commission 1.1707815 USD and net 11.4742185 USD. POSITION_CLOSED sequence 223 sums 2.2 units, 2 rows, gross 18.1610000 USD, commission 1.7171847 USD and net 16.4438153 USD. Its final exit category is TIME_EXIT, with the earlier TP1 execution preserved separately.

## Fresh November 4, 10 and 11 reproductions

All three native pairs use `FOREXCOM:XAUUSD` M5, the same loaded-history start within each pair, and 69 matching trading inputs. Each diagnostic window has a start record, end record, continuous sequence, complete BAR coverage and zero dropped events. This is structural capture completeness; the CSV exports do not have an independently authenticated export envelope. The exact runtime Indicator and Strategy copy-backs match their current on-disk wrappers after line-ending normalization. No frozen baseline source was changed.

| Window | Indicator / Strategy events | Window plan comparison at tolerance 0 | Established mechanism |
| --- | ---: | --- | --- |
| Nov 4 | 211 / 204 | One common plan with different selected modules and planned levels | Indicator observes earlier F close and has B quality 90 plus F quality 80; Strategy still occupied then and selects later F quality 80. |
| Nov 10 | 178 / 173 | One extra Indicator F plan | Earlier Indicator estimate closure freezes a different short F trigger. The 11:55 close passes Indicator trigger 4071.75, but not Strategy trigger 4070.935. |
| Nov 11 | 328 / 326 | One common exact B plan, then Indicator-only B and Strategy-only C | Earlier close observation leaves different B candidate states; the Strategy retains an H1-blocked long B while Indicator arms and selects a short B. Both detect the same C setup, but Indicator clears it when B is selected. |

For Nov 4, the 10:20 UTC Indicator B and F both pass checks; highest-score selection chooses B. The Strategy F passes checks and is selected. Their common entry is 4046.66, but the different structural invalidation produces the 0.02 stop difference and 0.02/0.04/0.06 target differences. Native ENGINE, candidate, CHECKS and arbitration records establish the mechanism in `fresh-native-causal-review.json`.

For Nov 11, both models select B at 10:20 UTC. The Indicator closes its estimated B at 10:35 (sequence 80) and detects later short B at 11:30 (sequence 225). The Strategy remains broker-busy at 10:35, observes the actual prior exit at 10:40 (sequence 93) and starts a long B (sequence 95). That long B fails H1 alignment and entry distance at 11:20 (sequence 202) but remains stage 1 at 11:30 (sequence 228), preventing a new short B setup in that module. At 11:35 the Indicator's short B passes every check and is selected (sequences 242–243). Both models detect the identical short C candidate at 11:35; Indicator clears it (sequence 245), while Strategy confirms/selects it at 11:40 (sequences 251–253). The Strategy submits, fills and closes that C position with one partial TP1 row and one time-close row. This mechanism is asserted in the reproducible analyzer and preserves both missing-plan mismatches.

The November 11 Strategy window has **2 complete positions and 3 exit rows**: gross +4.3050000 USD, commission 3.4014561 USD, net +0.9035439 USD. The C position contributes gross +6.6570000, commission 1.7007795 and net +4.9562205 across its two rows. These are window observations and do not establish module profitability. November 4 has 2 completed positions, gross −9.2400000, commission 3.5593756, net −12.7993756. November 10 has 1 completed position, gross −1.8690000, commission 1.7108847, net −3.5798847. The windows overlap the full-history run and must not be summed into a separate performance sample.

The current loaded-history full comparison has **77 Indicator and 77 Strategy plans, 73 common and 70 exact common plans**. Eleven plan keys are affected, with 17 field or missing-plan differences. All 11 keys have native or previously preserved causal classifications; strict full-history planned-field parity is **FAIL**. The original November 9 loaded-history comparison is retained separately at 78/79 plans, 76 common, 73 exact, and 8 affected keys. Current history begins October 18; original history began October 11. Matching local target windows does not erase that history difference.

To reproduce these assertions from preserved CSVs, run `node reports/native-v090/validation-continuation-2026-11-13/parity/analyze-new-native-captures.mjs`. The machine-readable results are `fresh-native-causal-review.json` and `current-full-history-comparison.json`.
