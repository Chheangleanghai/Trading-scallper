# Nov5 12:15 F-plan divergence — fresh native trace diagnosis

**Result: explained by execution-state-dependent candidate creation.** The fresh Indicator accepts the F BUY at `2026-11-05 12:15 UTC`; the fresh Strategy does not confirm its different frozen F trigger. This resolves the previously unverified Nov5 case in `PARITY_DIAGNOSIS.md`. It does not turn the paired plan stream into a parity pass.

## Evidence attribution

These are genuine native CSV captures of the isolated, read-only trace variants derived from the frozen confirmation-review parents. Each editor copy-back normalizes exactly to its trace source. Native compilation was observed by the parent investigator; this offline review verified the files and trace contents.

| Artifact | SHA-256 |
| --- | --- |
| `indicator-nov5-raw.csv` | `5eb96a6efd07471cef36594d1ef5fd44df8f1e880eb8ea7c1eb9596ba9761de9` |
| `strategy-nov5-raw.csv` | `11f38d7c58900aae873dec907d2d9668a62841aab2a75dcf5d476ead8aa3fe2a` |
| `pine/experiments/indicator_nov5_trace.pine` | `b8af2d0cc5c3f5453b6015e977b405f965081dee68f7933f4ddf50760fd23ddf` |
| `pine/experiments/strategy_nov5_trace.pine` | `ce4ca8ee7b1e10fc0920c43b457e2b0141bc1aa55fc1c6c854bc6cec9126504c` |

Embedded parent hashes are Indicator `0a19862b22973e13a31abb29e59a75a18f3e0b84bb76deb2154eae7fa4cd1ed3` and Strategy `bbabd036eea548177eaaa85c45d33da07ce2b1289748dc6b041327f48969609a`. The guarded generator and six focused reconstruction/parser tests were completed before native capture. No baseline or parent source was modified for this analysis.

The CSVs contain 800 Indicator and 1,064 Strategy JSON records. Each contains all 16 requested M5 bars at all three phases (`BEFORE_UPDATE`, `AFTER_UPDATE`, `AFTER_ARBITRATION`), with 48 engine and 48 F-candidate snapshots. The capture window is **bar opens 11:05–12:20 UTC inclusive**, hence payload **bar closes 11:10–12:25**. All times below are payload bar-close times unless stated otherwise. Raw CSV record positions count the header as row 1.

## Causal chain

| Bar close UTC | Indicator | Strategy | Raw CSV support |
| --- | --- | --- | --- |
| 11:10 | Previous F plan has closed; `active=false`, slot available. Creates F BUY with setup time 11:10, trigger **4129.135**, invalidation **4122.245**. | Previous emulator position remains busy in this calculation; `active=true`, `brokerBusy=true`, slot unavailable. No new F candidate. | Indicator records 313–341; Strategy 567–594. |
| 11:15 | Existing F becomes ready, but actual risk checks reject it with **Signal cooldown**. | Prior trade closure is now observed; slot available. Creates F BUY with setup time 11:15, trigger **4132.185**, same invalidation **4122.245**. It cannot confirm on its creation bar. | Indicator 344–371; Strategy 598–626. |
| 11:20, 11:25, 11:35, 11:45, 12:00 | F is ready; actual risk checks reject **Stop distance invalid**. | Same ready bars and actual stop-distance rejection. | Complete phase records in `nov5-f-trace-analysis.json`. |
| **12:15** | Same bullish candle opens **4128.31**, closes **4130.30**. Close exceeds its trigger **4129.135**; F ready=true. Checks pass and session plans increase 3→4. PLAN_AUDIT: Entry **4130.30**, SL **4121.69**, TP1 **4138.91**, TP2 **4147.52**, TP3 **4156.13**, quality80. | Close **4130.30 < 4132.185**; F ready=false. Its risk checks are not reached, and no plan is emitted. | Indicator engine/F records 714/721 and 726/733, PLAN_AUDIT736; Strategy 970/977 and 980/987. |
| 12:25 | The accepted Indicator plan remains active. | F stage becomes0 / `INVALIDATED`. EMA9 **4130.041734428736 < EMA21 4130.380777785198**, so the required bullish trend is no longer valid. | Strategy records 1020–1047. |

The previous shared plan has timestamp `1793876100000` (10:55 UTC). Indicator `TRADE_CLOSED` record313 reports `closeReason=TIME_EXIT`, `eventTimestamp=closedAt=1793877000000` (11:10). Strategy record598 reports `TIME_EXIT`, actual `closedAt=1793877000000` (11:10), but `eventTimestamp=1793877300000` (11:15). Thus the Strategy's delayed recognition of the same actual exit is directly present in these fresh captures; it is not inferred solely from missing signals.

## Data equality and source rules

At tolerance0, the 16 paired bars have **zero differences in all four OHLC fields**, `chartStructure`, EMA9/21/50, ATR, H1 trend, session and volatility flags (192 field comparisons). The two frozen triggers are therefore explained by different setup bars, rather than a market-data discrepancy within this captured window. At setup, the trigger is each bar's raw high; trace values retain sub-tick precision.

Frozen source pointers:

- `indicator_confirmation_review.pine:511` / `strategy_confirmation_review.pine:529`: B–H candidate processing occurs inside `idleForSetup = not active and not pending and not brokerBusy`.
- `indicator_confirmation_review.pine:577` / `strategy_confirmation_review.pine:595`: F confirms the existing frozen candidate before a replacement can be created. Lines588/606 freeze the setup candle high for a BUY trigger.
- Both parent files `:144` and `:379`: a later BUY confirmation requires `close > trigger` **and** `close > open`; a wick above the trigger is insufficient.
- `indicator_confirmation_review.pine:578` / `strategy_confirmation_review.pine:596`: bullish F trend needs chart structure1 and EMA9>EMA21, plus the optional EMA50 relation. Lines580/598 invalidate an existing F when this trend fails.
- `strategy_confirmation_review.pine:754` and `:767`: emulator fills/closed trades are synchronized when strategy calculations observe them. The timed `strategy.close(... immediately=false)` is at1158–1159.
- `indicator_confirmation_review.pine:839` / `strategy_confirmation_review.pine:929`: risk validation includes maximum stop distance, cooldown and quota. The loops at817/907 enter candidate risk checks only for `enabled and ready` candidates.

**Avoid a stale-reason error:** Strategy `rejectionReason='Stop distance invalid'` persists at12:15 even AFTER_ARBITRATION, but `ready=false` means no current risk evaluation occurred. Its current blocker is the unmet frozen trigger. `nov5-f-trace-analysis.json` retains the stored raw reason and separately marks `riskChecksEvaluatedThisBar=false`, `currentRiskRejection=null`, and `currentDecision=TRIGGER_NOT_CONFIRMED`.

## Limits

This is one resolved execution-state divergence for these frozen parents and native captures. It does not establish full stream parity, candle-by-candle Replay stability, profitability, or effectiveness of all A–H concepts. The separate Nov4 09:55 historical close/Entry change across reload remains outside this Nov5 window and is not explained by these observations. No trading rule, source input, raw evidence, alert, deployment or trade was changed. Reproduce the offline analysis with:

```bash
python3 reports/native-v080/recalculation-review-2026-11-05/analyze-nov5-f-traces.py
```
