# Diagnostic and research-package hardening — 2026-11-08

## Scope and decision

This continuation fixes demonstrated evidence-intake, message-attribution, and packaging defects. It preserves all Pine trading decisions and both frozen v0.8.0 source hashes. Existing diagnostic Pine drafts are reused; no duplicate v0.9.0 trading engine is created. The result is a local research snapshot toward v0.9.0, not a released or live-ready version.

## Confirmed defects and corrections

1. The diagnostic analyzer could call a stream complete when its `CAPTURE_END` preceded the configured window end. It now checks the end boundary/reason, event window membership, observation chronology, and each event's association with its `BAR` record. An intact internal logging budget remains distinct from structural export completeness and provenance.
2. Quantity and timing validation for orders/fills was previously inside the qualified-plan loop. Records whose plan creation fell outside the bounded capture could bypass it. Validation now applies to every broker order and fill, while valid missing prior lifecycle stages remain explicit coverage gaps.
3. Invalid or contradictory execution evidence could be pooled: mixed account currencies, broker records in an Indicator estimate stream, reversed exit-bar chronology, or exit-cause labels inconsistent with final-row comments/IDs. These contradictions are rejected. Exit cause remains instrumentation-reported; actual configured holding time and source identity still need separate evidence.
4. Schema v2 could omit an unambiguous capture identifier while still constructing a matching JSON event key. Capture ID, run tag, symbol, and timeframe must now be nonempty strings.
5. Telegram formatting treated an accepted legacy payload without `executionModel` as an Indicator estimate. It now says `Execution model not reported` and retains any reported fill without inventing its execution model. The payload contract and explicit known-model wording remain compatible. All delivery tests use mocks.
6. The existing ZIP verifier skipped credential-pattern checks for `.pine.inc` and unknown file suffixes. It now checks included contents regardless of filename suffix. The first real-project ZIP attempt failed safely on a token-shaped byte sequence inside a JPEG Huffman table; this structural-data false positive was investigated without displaying any matched value. The corrected scan exempts validated JPEG Huffman-table bytes, while image metadata, source text and appended text remain checked. This is not image OCR or a guarantee against arbitrary secret encodings. The separate research packager reuses this verifier, pins every member's SHA-256/size plus baseline/parent/raw-capture identities, refuses overwrite, and emits an independently checkable receipt.
7. Every target exit row was previously counted as a partial target, including a full-position TP3 exit when partial management was disabled. Total target rows and partial target rows now have distinct counts; unknown initial position quantity leaves partial counts unavailable instead of fabricating zero.

## Files

- `scripts/analyze-signal-diagnostics.mjs`, `tests/signal-diagnostics.test.mjs`: evidence integrity and lifecycle/accounting regressions.
- `src/telegram.ts`, `tests/telegram.test.ts`: accurate legacy execution-model attribution.
- `scripts/package_share.py`, `tests/share-package.test.ts`: credential-pattern scan coverage.
- `scripts/package_research.py`, `tests/research-package.test.ts`, `RESEARCH_PACKAGE.md`: immutable research snapshot and verification.
- `package.json`: diagnostic generation consistency is now part of `npm run verify`; added `diagnostics:check` and `package:research` commands. `README.md` points to current research evidence and the snapshot instructions while retaining historical release records.
- `reports/native-v090/reproduce-evidence.mjs`: reruns the existing analyzers over preserved raw evidence, records analysis-tool hashes, and associates archived mismatches with the earlier reviewed cases only when the original planned values still match. Optional output uses a new directory and refuses to overwrite an existing one.

The earlier compact Strategy/generator edits remain experimental. This continuation adds no Pine rule, entry, SL, TP, sizing, session, or time-exit change.

## Reproduced genuine evidence

The existing November 8 Strategy stream remains 447 sequential diagnostic events over 36 M5 bars, with two selected B_CRT plans, two submitted orders, two fills and two completed positions. Gross −$10.308 minus commission $3.4879192 equals net −$13.7959192. The preserved older Indicator stream remains 452 events within its configured window. These sources have different capture/source contexts and do not form current-source native parity.

The archived November 6 run independently reproduces 77 completed positions, 113 actual exit rows, 33 wins, 44 losses, gross +$51.898, commission $134.1201774, net −$82.2221774, and net position profit factor approximately 0.77345. Its final exits are 68 timed closes supported by its asserted archived source/settings context and nine stops. Costs are counted once; fills already include configured modeled slippage. These are inspected historical observations, not untouched out-of-sample performance.

The archived pair remains 76 Indicator plans versus 77 Strategy plans: 74 common timestamps, 71 exact common matches, three differing common plans, two Indicator-only plans and three Strategy-only plans. All eight differing keys retain their original differences. Five cases match the earlier evidence-supported execution-state explanations, two have established quota blocks, and the November 5 12:15 Indicator-only F case retains an unverified exact candidate cause. Earlier trace experiments support these classifications; they are not relabeled as newly captured traces. The separate November 4 09:55 reload change in chart close/Entry remains unresolved.

## Verification and native limits

| Check | Result |
| --- | --- |
| Focused diagnostics regressions | PASS — 29/29 |
| Telegram/webhook/closure regression group | PASS — 43/43, network mocked |
| Research/share packaging regressions | PASS — 6/6 |
| `npm run verify` | PASS — typecheck, 27 test files / 238 tests, frozen and diagnostic generation checks, 31 independent Pine parses |
| `npm audit --omit=dev` | PASS — zero reported vulnerabilities |
| `npm ls --omit=dev --depth=0` | PASS — empty production dependency tree |
| `git diff --check` | PASS |
| New native compile/source copy-back/parity/Replay/OOS | NOT RUN — source-transfer policy block remains |

No test failed or was skipped in the local full suite. The prior localhost EPERM integration error did not recur in this unrestricted local environment. Test success does not authenticate native execution or non-repainting.

Machine-readable [final verification output with tested-source hashes](local-hardening-final-evidence-2026-11-08/verification.json), [reproduction receipt](local-hardening-final-evidence-2026-11-08/receipt.json), [native Strategy diagnostic analysis](local-hardening-final-evidence-2026-11-08/diagnostic.json), [older Indicator diagnostic analysis](local-hardening-final-evidence-2026-11-08/indicatorDiagnostic.json), [archived position analysis](local-hardening-final-evidence-2026-11-08/archived.json), and [retained parity classifications](local-hardening-final-evidence-2026-11-08/parity.json) accompany this report. The earlier pre-fix verification/analysis set is preserved separately; use the final set for the current analyzer.

Reproduce the preserved evidence without changing it:

```sh
node reports/native-v090/reproduce-evidence.mjs
```

To retain another analysis set, add `--output-dir <new-directory>`; the directory must not already exist. Use `RESEARCH_PACKAGE.md` for safe snapshot installation, packaging, and verification commands.

Current source SHA-256 values:

| Source | SHA-256 |
| --- | --- |
| Frozen Indicator | `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` |
| Frozen Strategy | `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` |
| Diagnostic Indicator | `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852` |
| Compact diagnostic Strategy | `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d` |

No TradingView compile, editor copy-back, paired native comparison, Replay/reload, new Strategy Tester export, or out-of-sample run was performed during this local continuation. The prior explicit browser-security denial of local-file navigation remains the source-transfer blocker; no alternate route was attempted. No chart settings were changed in this continuation.

The research ZIP's manifest explicitly records native source attribution/parity as blocked, Replay/non-repainting as unverified, performance as inconclusive, and live readiness as not approved. The packager records that it does not itself run tests; local test evidence is supplied separately.

No real orders, live alerts, Telegram messages, deployment, or account changes were performed.
