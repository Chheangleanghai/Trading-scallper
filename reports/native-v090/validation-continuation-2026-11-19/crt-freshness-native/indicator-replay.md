# Experimental Indicator parity and Replay — November 19, 2026

The [experimental Indicator](../../../../pine/experiments/indicator_crt_freshness.pine) compiled and ran in TradingView. Its full editor copy-back matched SHA-256 `895baef9c0bf4d3eff5938d408eb117c8d684d27e6e7c74bb92fcd6362d67daf`. Pine Editor displayed `Compiled.` and `Added to chart.` at 19:50:45 UTC+7. The Indicator was pinned to the right price scale. With the research window and audit logging enabled, its 110 visible Input controls matched the previous experimental Strategy. The normalized Inputs snapshot hash was `357130e0f71171e756d261be64465379b2732182963d53104d37c3459b595ec9`. Both runs used standard `FOREXCOM:XAUUSD` M5, with the research window from November 6 at 00:00 UTC to November 19 at 00:00 UTC, end exclusive. The underlying full bar series was unavailable for an independent checksum.

## Plan comparison

The [Indicator Pine Logs export](indicator.csv) contains 345 records, including 33 `PLAN_AUDIT` records and 194 reference-expiry records. CSV SHA-256 `b8f59f6cc2e55e5b0d144206bd7c105ff830b2ca1917f99f36af90a54b43628b`. The independent [comparison](indicator-strategy-parity.json) accepts unique XAUUSD M5 plan timestamps within the window and measures planned fields at zero price tolerance. The Strategy produced 33 plans and 192 expiry records.

| Result | Count |
| --- | ---: |
| Shared plan timestamps | 32 |
| Exact matches across all planned fields | 31 |
| Shared plan with a different setup timestamp | 1 |
| Indicator-only plans | 1 |
| Strategy-only plans | 1 |

Strict full-window parity failed. All 32 shared plans agreed on direction, module, planned entry, stop loss, take-profit levels, quality and entry mode. The differences all involve F, the structural EMA pullback, while the experiment's rule change applies to B/CRT.

| Signal time (UTC) | Difference | Recorded evidence |
| --- | --- | --- |
| November 9, 14:20 | Both F BUY plans agree on prices. The Indicator setup is 14:10 and the Strategy setup is 14:15. | Both selected the preceding B plan at 13:55. The Indicator reported that plan closed at 14:10. The Strategy's exit fill was also at 14:10, with its closure observed in its 14:15 lifecycle event. The F setup times align with the two closure observations. |
| November 10, 11:55 | F SELL appears only in the Indicator. | The prior B plan was selected at 11:30 in both. The Indicator closed at 11:45 and recorded the F setup on that candle. The Strategy recorded a fill exit at 11:45 but observed closure at 11:50. This timing can prevent the Strategy from recording the same F setup. Candidate-level rejection logs were unavailable for that candle. |
| November 10, 15:50 | F SELL appears only in the Strategy. | The Indicator already used five entries in the London session, including its 11:55 plan. The Strategy had used four. The Indicator had reached the configured five-entry limit. |

The code checks that no plan or broker position occupies the slot before it detects a new F setup. The recorded timing and entry counts explain why comparing planned fields alone cannot establish identical trading state. They support an execution-state explanation for these differences without proving general parity.

## Replay attempt and restoration

On the same M5 chart, Replay was requested at November 18, 20:40 UTC+7, before an archived B/CRT signal at 21:00 UTC+7. TradingView opened the paid-plan prompt for intraday Replay and showed the account was on Basic. The prompt was closed and Replay was exited. This leaves candle-by-candle non-repainting unverified.

The last unsaved editor draft was copied back before the test and restored afterward. The restored copy matched its previous `bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed` hash before the saved layout was reloaded. The original five studies, closed editor, Replay off, “All changes saved” and Autosave on were verified afterward. During source transfer, VS Code briefly overwrote the generated local experimental Strategy. It was regenerated from the pinned parent and restored byte for byte before continuing. The original baseline source hashes still match. All 245 local tests and 33 independent Pine parses passed.

## Future comparison window

Recorded locally on November 19, 2026 at 12:55 UTC, before these bars existed. Compare the same exact original and experimental Strategy hashes from the [matched historical run](README.md) on November 20, 2026 00:00 UTC through December 18, 2026 00:00 UTC (07:00 UTC+7 on each endpoint), end exclusive. Keep XAUUSD M5, Inputs and Strategy Properties fixed apart from these date bounds, with at least 1,000 prior calculation bars in both runs. Include any position admitted before the endpoint through its final exit. Preserve the Pine Logs, settings, exact editor copy-backs and Tester reports from both runs.

Use after-commission net P&L for the primary comparison. Record absolute P&L, gross P&L, commission, maximum drawdown, position count and module outcomes alongside it. A single four-week result has limited power. This is a local plan recorded before the window, with no independent registration. It becomes evidence only after both runs are captured and reconciled.
