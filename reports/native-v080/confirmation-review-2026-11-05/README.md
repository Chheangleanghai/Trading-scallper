# A–H confirmation and closed-plan review — 2026-11-05

The smaller Indicator UI is implemented, compiled in TradingView, saved and inspected after reload on **FOREXCOM:XAUUSD M5**. The baseline remains v0.8.0. This is an isolated research candidate, with unchanged trading predicates, order calls, sizing, stops and targets relative to the previously verified professional candidates. It is not a profitability or non-repainting certification.

## The pictured BUY did not close at SL

The supplied screenshot's B/CRT plan has timestamp `1793886300000`, 5 November **13:45 UTC**. Its prices are Entry **4121.77**, SL **4112.59**, TP1 **4130.95**, TP2 **4140.13**, TP3 **4149.31**. Both the preserved parent export and this fresh Strategy export identify it independently.

The actual emulator entry was **4121.79**, size **2.1**. It exited all 2.1 units at **4125.83, 14:00 UTC**, with exit ID `Close entry(s) order B_CRT`, comment `TRADE_CLOSED`, and a 15-minute holding period. The parent's sole `strategy.close()` call is guarded by the configured holding-time condition; it uses `immediately=false`. This combination identifies the **time exit**, rather than a stop or target exit, for this emulator position. There were no partial exits in this position. The Indicator's outcome is separately labeled a close-bar estimate.

Exact arithmetic, in USD because the audit reports point value 1 and matching quote/account currencies:

```text
Gross price P&L = (4125.83 − 4121.79) × 2.1 = +8.4840000
Entry fee      = 4121.79 × 2.1 × 0.0001    =  0.8655759
Exit fee       = 4125.83 × 2.1 × 0.0001    =  0.8664243
Net P&L        = 8.484 − 1.7320002         = +6.7519998
```

The later chart fall through 4112.59 happened after this plan had closed. The old generic `ENDED` label and a minimum eight-bar box extension concealed that distinction. The new renderer freezes the ended box at its recorded closure time, mutes the old ladder, and labels **Time exit (est./sim.) 14:00 UTC**. The Indicator does not invent actual exit fills or realized P&L. The Strategy includes actual emulator exit time, last exit price and aggregate net result across any partial rows for that position.

The planned stop was below B's sweep invalidation **4113.26**, with the configured 0.15 ATR buffer producing **4112.59**. Planned risk was **9.18**; the three targets are its rounded 1/2/3R projections. These are internally ordered and consistent with the configured model, not a guarantee of a profitable trade. In particular, the 15-minute holding limit may close a plan before any projected target.

## What each module must confirm

All eight modules are enabled in both captured instances. **One individually qualified module can produce a plan**; eight-way agreement is not required. The existing single-plan slot, opposing-direction conflict check and highest-score arbitration remain. Seeing a display FVG, OB or swing alone is not the module's complete entry sequence.

| Module | Required sequence | Default structural stop anchor, before ATR buffer |
| --- | --- | --- |
| A | Confirmed-pivot sweep/reclaim → later displaced MSS + FVG → later directional gap retest | Sweep extreme |
| B · CRT | Previous completed reference-candle range → boundary sweep/reclaim → later break of frozen sweep-candle trigger | Sweep extreme |
| C | Aged confirmed-pivot false breakout/reclaim → later directional trigger close | False-break extreme |
| D · K-SNR | Repeated confirmed pivot cluster → displaced breakout and later retest, or rejection/failed breakout and later trigger | Breakout candle/zone boundary, or rejection extreme |
| E | Opposite candle → displaced break of a known swing → later zone retest within tested-bar cap | Full originating zone's far boundary |
| F | Confirmed structure + EMA9/21/optional50 trend → bounded pullback → later trigger close | More conservative of pullback extreme and known opposite swing |
| G | Compressed prior rolling range → sweep/reclaim → later displaced opposite-edge break | Sweep extreme |
| H | Five alternating confirmed pivots + qualified closing neckline break → later first-shoulder retest | Head extreme |

Each still passes direction/date controls, structural invalidation, target availability/order, optional location checks, volatility, pause, session, H1/optional EMA alignment, stop/entry distance, minimum TP2 RR, quality, cooldown, quota and an available slot. Close-mode planned Entry is the confirmed chart close; Limit uses the zone midpoint; Breakout uses one tick beyond the confirming candle. `getTargets()` retains Fixed R, Structure and Hybrid behavior, tick rounding and RR checks. No stop was tightened, target moved or confirmation removed to make the screenshot look successful.

The earlier [creator/source review](../professional-candidate-2026-11-05/CONCEPT_RULE_REVIEW.md) remains applicable. C is a confirmed-pivot false-breakout variant, not original 20-day Turtle Soup or body-break TBS. D retains the requested K-SNR display name; a specific canonical K-SNR rulebook has not been established. G/H remain bounded approximations. B's default fixed-R targets differ from a CRT opposite-range target. These are explicit research limitations; method names do not establish efficacy.

## Display and notification changes

- Tiny dashboard text and Small chart labels; giant study legends collapsed in the saved chart.
- A–H board shows OFF, WAIT, SETUP, BLOCKED or active/pending plan, and the next confirmation/rejection reason. It reads the last confirmed decision time, including while a new realtime candle forms.
- Current candidate zones, trigger/invalidation guides and small **SETUP ONLY** captions for every module. H can draw its frozen five-pivot geometry using confirmation-bar coordinates. These guides never generate entries. Not every module has a current setup on every bar.
- Existing FVG, OB, swings, liquidity sweeps, BOS/CHoCH and EMA context remains. Some labels can still overlap at particular zoom levels; the exact-price card provides a separate reference.
- Closed lifecycle JSON adds validated `closeReason` and `closedAt`. Emulator records additionally carry `exitPrice`, aggregate `realizedNet` and `realizedCurrency`. Planned prices and event observation time remain distinct. The Telegram formatter now explains the closure instead of displaying an unexplained generic end.

No entry rule, cooldown or session quota was relaxed. The observed **Session plan limit — 5/5 London** explains the lack of another accepted plan at the end of this run. Strength-three pivots on M5 require three later candles before they become known; later trigger/retest rules add latency. The UI reports progress sooner, but confirmed entries are not promised instantly or more frequently. More signals do not imply better expectancy.

## Source attribution and actual native results

| Candidate | SHA-256 | Native result, Cambodia time |
| --- | --- | --- |
| `indicator_confirmation_review.pine` | `0a19862b22973e13a31abb29e59a75a18f3e0b84bb76deb2154eae7fa4cd1ed3` | Compiled / Updated on chart **11:09:56 PM** |
| `strategy_confirmation_review.pine` | `bbabd036eea548177eaaa85c45d33da07ce2b1289748dc6b041327f48969609a` | Compiled / Updated on chart **11:01:14 PM** |

Each complete native editor copy-back matches its local candidate after line-ending normalization. Source was not edited between copy-back and compile. Original compile PNGs and AX records are retained. `generate_confirmation_candidate.py` guards the frozen professional parents; reconstruction tests restore each entire parent after reversing only explicit presentation/closure-metadata changes.

Both native input captures contain **117 actual inputs, with zero differences**. Relative to the preceding Indicator, the only input changes are the two new display controls, dashboard Small → Tiny, and chart labels Normal → Small. Audit logging is on; all A–H on; London preset; 08:00–17:00 Europe/London; H1 alignment on; threshold75; cooldown5; quota5; Close entry; 15-minute holding; Fixed R1/2/3; Structure stop with 0.15 ATR buffer; partials on; BE/trailing off. Research-window restriction is off; its displayed Jan2026–Jan2027 values are inactive. Strategy Properties show USD10,000, commission0.01%, slippage2ticks, one-tick order delay, bar-close calculations, pyramiding0 and 1x leverage. No spread model was calibrated. The exports' event coverage is Oct12–Nov5; a separate OHLC/warm-up history boundary was not exported.

### Plan comparisons and reload — unresolved differences retained

- New Strategy versus its saved parent: **75/75 exact plans**, zero tolerance, zero mismatches.
- New Indicator versus its saved parent: **74 common plans, 73 exact, one changed plan** (entry and three targets on Nov4 09:55UTC). This is not a full equality pass.
- New Indicator versus new Strategy: **74 vs75 plans; 72 common; 69 exact; three common plans differ; two Indicator-only and three Strategy-only plans**. There are **14 mismatch records** in the comparator. Execution-model differences are reported separately.
- Before versus after reload of the exact new Indicator: **320 rows each, 74 plans each; 73 exact plans and one changed plan**. Raw files differ. Nov4 09:55 entry changes **4044.77 → 4044.89**, with TP1 **4057.57 → 4057.81**, TP2 **4070.37 → 4070.73**, TP3 **4083.17 → 4083.65**; stop stays **4031.97**. The corresponding initial new-Indicator versus old-parent delta is the reverse.

**Reload price stability: NOT PASSED. General parity and non-repainting remain NOT VERIFIED.** The source sets Close-mode planned Entry from `close`, so emulator slippage cannot explain the planned-price delta. Contemporaneous OHLC snapshots for both calculations are missing; data/feed changes or another historical/realtime recalculation cause are unresolved. The cause was not labeled a confirmed engine defect or hidden by tolerance. Candle-by-candle intraday Replay was not completed. The saved UI, right price-scale pin and preservation of the original three-study set were independently observed after reload; those visual checks do not override the failed price comparison.

The earlier commentary claiming all74 Indicator plans matched its parent was too strong and was corrected during the task. Use the actual comparator files above.

### Emulator outcomes and closure diagnostics

Fresh source-attributed Strategy logs contain **75 completed positions**, **109 exit rows**, **32 winners /43 losers**, gross **+$53.509000**, commission **$130.7030565**, net **−$77.1940565**, position profit factor **0.777964**. No group has an observed bracket residual. The preceding snapshot had one incomplete position; this later export includes its completion. These are separate snapshots, not additional independent test samples.

All **75 new closure payloads** match their actual exit rows and complete-position audit groups: **zero exit-time, final-exit-price or aggregate-net mismatches**. Closure classifications are nine STOP and66 TIME_EXIT. Earlier partial TP rows can coexist with a final time/stop closure; these classifications are not counts of all exits or all wins/losses.

This selected M5 sample is negative after costs and is not untouched OOS. A/G have no selected plans in the combined sample, so their independent market effectiveness remains untested here. C/D positive subgroups are too small and selected by combined arbitration to establish an edge. No module or threshold was cherry-picked to force a positive report.

## Tests, restoration and remaining work

Local regression: **186 tests /21 files passed**, TypeScript passed, baseline generation check passed and **15 independent Pine parses passed**. Existing shared synthetic coverage includes206 assertions for pattern predicates/lifecycles/risk. Focused new tests cover parent continuity, actual closure classifiers and metadata validation/formatting. All75 genuine native Strategy closure records additionally passed the current backend validator and mocked Telegram delivery; **zero real network requests**. The production path remains stateless/database-free with authentication, payload limits and timeouts.

The new Indicator is on the saved M5 chart, on the shared right price scale. The temporary Strategy is no longer present; the original exit-audit Strategy and baseline Indicator remain hidden. Research panes were closed, legends collapsed and **Autosave restored ON**. Screenshots and raw files are preserved separately. No real orders, alert creation, Telegram sends, deployment, paid upgrade or account switch occurred.

Telegram delivery is **not active**: the prior native account check found the Free/Basic Webhook URL control disabled by an upgrade gate, and no authorized production relay deployment exists. This pass tested message handling locally; it did not bypass that limitation or claim end-to-end delivery.

Next isolated research should first capture identical OHLC data and warm-up ranges around Nov4 09:55, then compare all planned fields after reload; investigate remaining slot/lifecycle-dependent parity differences separately. Independently run A/G with fixed data/costs to establish coverage. Compare one management/target variant at a time, particularly the short15-minute exit versus longer projections and B range-target alternatives, using a frozen future OOS protocol. Faster or more frequent rule variants need measured costs and OOS evidence before adoption. Full intraday Replay, reproducible M1/M3/M15 matrices, spread sensitivity and OOS remain open. Keep v0.8.0.

Official behavior references: [TradingView strategy order processing and closed trades](https://www.tradingview.com/pine-script-docs/concepts/strategies/) and [Pine alert behavior](https://www.tradingview.com/pine-script-docs/concepts/alerts/). These document platform semantics, not this strategy's profitability.
