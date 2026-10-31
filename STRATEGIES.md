# Operational strategy definitions

These are explicit price-action approximations, not evidence of institutional orders or reliable prediction. A is enabled by default; B–H are independently selectable and default off. All use confirmed active-chart candles and previously confirmed pivots. Enable one module at a time for isolated evaluation, then evaluate combinations. H1 trend and all common safety filters still apply unless their inputs explicitly disable an optional filter.

## Shared candidate lifecycle

A persistent `Candidate` stores strategy ID, direction, detection bar/time, confirmation time, zone boundaries, trigger, invalidation, entry mode, planned entry, suggested SL, three targets, heuristic score, tested-bar count, ready flag and status. Functions mutate candidate objects only inside the confirmed-bar call. An initial detection never submits an order. A later confirmation makes the candidate eligible for common validation. Candidates expire after the configured setup lifetime and invalidate if a subsequent wick crosses their frozen structural invalidation. Invalidated candidates cannot confirm on that bar.

Each eligible candidate receives its own tick-rounded plan, stop, target feasibility, distance checks and score. Opposing eligible directions on the same bar reject the whole batch. Otherwise the highest score wins; exact ties use A, B, C, D, E demand, E supply, F, G, H order. Agreement is not required and does not add extra score. One selected plan resets competing candidates; pending and active trades prevent new detections. Existing candidates still expire/invalidate while a plan is busy. There is no pyramiding.

The global quality threshold is default 75. Enabling strategy-specific thresholds selects each module's independent threshold instead. Categories retain caps of structure20, liquidity20, entry20, H1 alignment15, feasible TP2 R10, volatility10, session5.

## A — Sweep + MSS + FVG

A pivot is confirmed after `swing` right-hand bars and is only available to sweep detection from the next chart bar. Bullish sequence:

1. Sweep latest known pivot low, close above it and below latest known pivot high. Freeze sweep low and opposite high. Reject simultaneous opposite sweep.
2. Later close above frozen high with bullish body >= minimum displacement ATR and bullish FVG (`low > high[2]`) on that same MSS bar. Freeze gap `[high[2], low]`.
3. Still later: low touches gap top, bullish close above gap top. A close below gap bottom or wick below sweep low invalidates first.

Bearish rules mirror. Each pivot can initiate one A setup. Structure20 + liquidity20; later rejection earns entry20. Base structural stop is the sweep extreme.

## B — CRT

Reference is the **previous fully completed candle** on configurable CRT timeframe, default M15. Reference timeframe cannot be below the execution chart. Bullish detection sweeps reference low and closes strictly inside the reference high/low range. Freeze that reference range, sweep extreme and sweep-candle high. A **later** bullish candle must close above the sweep-candle high. Bearish inverts. One setup per reference candle, frozen even when the next source candle closes. Lifetime expiry still applies.

Structure10 reflects the reference-range transition, not a claim of confirmed pivot structure; liquidity20 reflects sweep/reclaim. Base stop is sweep extreme. Close mode enters the confirmation close; limit mode uses reference midpoint; breakout mode uses one tick beyond the confirmation bar.

## C — Turtle Soup, confirmed-pivot intraday variant

This is **not** the original multi-day/lookback formulation. The latest confirmed pivot must be at least the configured number of bars old **since its confirmation**, default3. Bullish false breakout trades below that low and closes above it; bearish trades above high and closes below. Reject bars satisfying both directions. On a **later** directional candle, require close beyond the sweep candle's opposite end. Freeze sweep extreme as structural stop and a rejection range from swept pivot to sweep-candle opposite end. One setup per pivot per direction. Structure10, liquidity20, later entry20.

## D — Confirmed support/resistance

A significant horizontal level requires at least two confirmed same-side pivots within `levelTolerance × ATR` of the frozen first level. A new pivot outside the tolerance replaces that side's level and resets its touch count.

- Breakout/role reversal: directional displaced close beyond the level's tolerance band, previous close on the unbroken side. Freeze band. A **later** touch of the band followed by a directional close beyond its outer boundary confirms the retest. Stop invalidation is the more conservative breakout-candle extreme or far band boundary.
- Rejection: wick touches the tolerance band and directional close rejects beyond it. A **later** directional close beyond the rejection candle's extreme confirms.
- Failed breakout: rejection candle also crosses the far band boundary before reclaim. Uses the same later confirmation, with liquidity credit.

Structure20 for repeated confirmed level; liquidity0 for ordinary rejection/breakout, liquidity20 for failed breakout. The same rejection event is not counted twice in the liquidity category.

## E — Supply/demand

Demand origin is the full range of the immediately preceding bearish candle. A bullish displacement must close through a previously known confirmed swing high, with previous close not already above that high. Supply inverts. Freeze zone and its far edge as structural invalidation. Maintain demand and supply independently.

No entry on departure. On later bars count each OHLC bar intersecting the zone (not separate tick visits). First is a fresh test; subsequent bars are tested. Confirm only a directional close beyond the near boundary after intersection. More than the configured number of tested bars, default2, expires the zone. Wicks through the far edge invalidate conservatively. This is intentionally stricter than close-only invalidation. Structure20 for the confirmed swing break, liquidity0. No liquidity points simply for calling a candle a zone.

## F — Structural trend pullback

Bullish: latest chart BOS/CHoCH direction is up, EMA9 > EMA21, and optional EMA21 > EMA50. Pullback low must reach EMA9 without exceeding the configurable EMA21 overshoot, and close must hold above EMA21. Freeze EMA band, pullback-candle high and the lower of pullback low/latest confirmed swing low. A **later** bullish candle closes above frozen pullback high. Trend alignment must still hold at confirmation. Bearish mirrors.

Structure20, liquidity0. Volatility is mandatory in common validation. EMA crossover alone is never a detection or confirmation.

## G — AMD / Power of Three approximation

Use highest high/lowest low of prior `accumulationBars` candles (excludes current candle). Require nonzero width <= configurable ATR multiple. A current wick sweeps one boundary and closes strictly back inside. Freeze range and sweep extreme. A **later** directional displaced close beyond the **opposite** frozen boundary confirms continuation. Do not start another G setup within the accumulation lookback of the previous detection.

Structure20 reflects completed range expansion, liquidity20 the earlier sweep. These labels do not establish accumulation or manipulation by any institution.

## H — Quasimodo / RTM-inspired approximation

Maintain only confirmed, alternating pivot types. Consecutive same-side pivots replace the last point only when more extreme. Simultaneously confirmed high/low bars are omitted from the sequence. Five most recent pivot confirmation points must form:

- Bullish: low L0, high H1, lower low L2 < L0, higher high H3 > H1, low L4 > L2, with current close above L0.
- Bearish: high H0, low L1, higher high H2 > H0, lower low L3 < L1, high H4 < H2, with current close below H0.

A recorded closing break of the matching neckline pivot must follow head confirmation and occur no later than right-shoulder confirmation; a wick-only higher high/lower low is insufficient. Freeze first shoulder L0/H0 with tolerance band and head L2/H2 as invalidation. A **later** retest with directional close beyond the band confirms. One setup per final pivot confirmation key. Structure20 for neckline break and confirmed alternating sequence, liquidity20 for head extending past shoulder. Pivot labels and entries are never backdated. This is one specified approximation, not comprehensive discretionary RTM.

## Optional context

Previous completed daily/weekly levels, current/previous selected-session extrema, equal-pivot levels, swing Fibonacci (50–61.8%), premium/discount midpoint, displaced opposite-candle OBs, confirmed OB-breaker levels, and spring/upthrust candle candidates are available. No Elliott Wave or economic-news feed is present.

Optional liquidity scoring can grant **at most** the liquidity category's 20 points for equal/day/week sweep or spring/upthrust at confirmation; it never stacks beyond existing liquidity20. Optional Fibonacci and premium/discount inputs explicitly turn those location checks into user-selected filters; they are off by default. OB/breaker labels are heuristic context, not independent trading strategies. Their levels expire/invalidate as described in the code; they do not create extra score categories.

## Stop/target modes

Structural uses module invalidation. Sweep-extreme requires a candidate with sweep liquidity evidence; other candidates are rejected in that mode. Swing uses latest confirmed opposite swing. ATR uses planned entry ± configurable ATR multiple. OB uses current valid opposite-candle OB far edge; no available OB means reject. All modes add the optional outward ATR buffer and must satisfy direction and maximum-distance checks.

Fixed R projects configured multiples. Structure mode needs **three distinct** known opposing levels: confirmed pivots/SNR, completed day/week and previous-session extrema, equal levels, and an active opposing supply/demand zone boundary. Levels are tick-rounded, deduplicated and sorted nearest-first. Fewer than three rejects the candidate. Hybrid uses the same three-level plan if available, otherwise **all three fixed-R projections**, explicitly labeled `Hybrid: fixed-R fallback`. Minimum R applies to actual rounded TP2. A nearby structure target can therefore reject a trade even when a 2R mathematical projection exists.

## Trade management and fills

Initial SL remains immutable in the plan and payload. `managedSl` starts there and can only tighten. Break-even and trailing use the **confirmed close's favorable R** from simulated fill to initial SL, not intrabar favorable excursions. Changes apply to subsequent bars. Break-even moves to fill price and does not cover fees. ATR trailing activates after its configured R trigger. None of these prevent gap losses.

Indicator estimates skip exit tests on the modeled fill bar and use stop-first on ambiguous later OHLC bars. Strategy fills/exits come from broker-emulator records; it can fill and exit on one bar. Strategy partial orders use frozen original quantities with minimum-unit rounding, never percentages repeatedly recalculated from a shrinking position. Small positions can skip TP1/TP2 fractions and put residual units at TP3. Initial capital, currency, costs and slippage remain Strategy Properties. Notification events never confirm real broker execution.

## Corrected simulation sizing and R comparisons

Risk-based units are capped by `Maximum simulated notional / equity %`, default90%, then rounded down to feed minimum units. The default avoids submitting positions requiring leverage under the emulator's default 1× margin setting; it is not a broker contract or leverage assumption. Actual planned risk can therefore be below the risk-percent ceiling. Align any higher notional cap with Strategy Properties and actual contract/account details before interpreting a levered simulation. Gaps, costs and conversion can still exceed planned risk.

Minimum risk distance and TP2 R use rounded **tick counts**. For example, decimal subtraction can turn an exact 2R ladder into 1.99999999998; the corrected filter compares integer reward ticks to the rounded-up required tick count. A one-tick shortfall still fails. Regression cases cover both directions, zero risk and fractional required rewards. Candidates with missing structural invalidation are rejected even when another stop mode is selected, preventing invalid optional JSON metadata.

## v0.5.0 structure and QM corrections

Chart and M15 structure require a fresh confirmed close across a known swing, and consume that pivot identity once. A later recross of the same consumed pivot does not emit another BOS/CHoCH. A newly confirmed pivot at the same price has a new identity and can break. Simultaneous upward/downward qualifications are ignored as ambiguous. Structure direction is the last unique closing break; it does not flip simply because price revisits an old consumed level.

Module H additionally looks up a recorded closing break of the specific neckline pivot (the second of its five pivots). The break must be later than head confirmation and no later than right-shoulder confirmation. Wick-only geometry is insufficient. Break records are bounded to the six most recent identities per direction; fast pre-confirmation breaks and older records can therefore be omitted. The pivot pattern and a later retest/entry confirmation remain mandatory. This is a deliberately conservative operational variant, not a universal definition of Quasimodo.
