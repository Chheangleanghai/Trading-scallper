updateCandidates() =>
    // Called once at chart close. This file is inlined inside the confirmed-bar block.
    for c in candidates
        c.maintain(bar_index, low, high, expiry)

    // A exposes the existing sweep/MSS/FVG state without changing its sequence.
    candA.stage := stage
    candA.direction := dir
    candA.setupBar := setupBar
    candA.setupTime := setupTime
    candA.lower := gapBottom
    candA.upper := gapTop
    candA.invalidation := extreme
    candA.structurePoints := 20
    candA.liquidityPoints := 20
    candA.status := status
    candA.ready := enableA and stage == 2 and bar_index > gapBar and retestConfirmed(dir, gapBottom, gapTop, high, low, open, close)

    bool idleForSetup = not active and not pending and not brokerBusy
    if idleForSetup
        // B: previous completed reference candle; frozen sweep -> later break of sweep candle.
        candB.confirmBreak(bar_index, time_close, open, close)
        if enableB and candB.stage == 0 and (na(memory.crtUsed) or memory.crtUsed != crtTime)
            bool bull = rangeSweep(1, crtLow, crtHigh, high, low, close)
            bool bear = rangeSweep(-1, crtLow, crtHigh, high, low, close)
            if bull != bear
                candB.begin(bar_index, time_close, bull ? 1 : -1, crtLow, crtHigh, bull ? low : high, bull ? high : low, 10, 20, 'Reference sweep')
                memory.crtUsed := crtTime

        // C: confirmed-pivot false breakout, not the original 20-day Turtle Soup variant.
        candC.confirmBreak(bar_index, time_close, open, close)
        if enableC and candC.stage == 0
            bool bull = not na(slw) and bar_index - slBar >= turtleAge and (na(memory.turtleUsedLow) or memory.turtleUsedLow != slBar) and pivotSweep(1, slw, high, low, close)
            bool bear = not na(sh) and bar_index - shBar >= turtleAge and (na(memory.turtleUsedHigh) or memory.turtleUsedHigh != shBar) and pivotSweep(-1, sh, high, low, close)
            if bull != bear
                candC.begin(bar_index, time_close, bull ? 1 : -1, bull ? slw : low, bull ? high : sh, bull ? low : high, bull ? high : low, 10, 20, 'Pivot false breakout')
                if bull
                    memory.turtleUsedLow := slBar
                else
                    memory.turtleUsedHigh := shBar

        // D: repeated confirmed horizontal pivots; displaced breakout/retest or failed breakout/rejection.
        if candD.mode == 'Breakout retest'
            candD.confirmRetest(bar_index, time_close, high, low, open, close)
        else
            candD.confirmBreak(bar_index, time_close, open, close)
        if enableD and candD.stage == 0
            float tolerance = atr * levelTolerance
            bool up = snrBreakout(1, srHigh, tolerance, srHighTouches, close[1], open, close, bodyDisplacement)
            bool down = snrBreakout(-1, srLow, tolerance, srLowTouches, close[1], open, close, bodyDisplacement)
            bool rejectLow = snrRejection(1, srLow, tolerance, srLowTouches, high, low, open, close)
            bool rejectHigh = snrRejection(-1, srHigh, tolerance, srHighTouches, high, low, open, close)
            if up != down and (up or down)
                float level = up ? srHigh : srLow
                candD.begin(bar_index, time_close, up ? 1 : -1, level - tolerance, level + tolerance, up ? math.min(low, level - tolerance) : math.max(high, level + tolerance), level, 20, 0, 'Breakout retest')
            else if rejectLow != rejectHigh
                float level = rejectLow ? srLow : srHigh
                bool swept = rejectLow ? low < srLow - tolerance : high > srHigh + tolerance
                candD.begin(bar_index, time_close, rejectLow ? 1 : -1, level - tolerance, level + tolerance, rejectLow ? low : high, rejectLow ? high : low, 20, swept ? 20 : 0, swept ? 'Failed breakout' : 'Rejection')

        // E: opposite-candle zone followed by impulsive break of a known confirmed swing.
        // Existing zones are processed before creating replacements; tested bars are counted explicitly.
        for c in array.from(candDemand, candSupply)
            if c.stage > 0 and bar_index > c.setupBar
                bool touch = high >= c.lower and low <= c.upper
                if touch
                    c.tests += 1
                    c.status := c.tests == 1 ? 'FRESH_TEST' : 'TESTED'
                if c.tests > maxZoneTests
                    c.stage := 0
                    c.status := 'EXPIRED'
                else
                    c.confirmRetest(bar_index, time_close, high, low, open, close)
        bool demandDeparture = not na(sh) and zoneDeparture(1, sh, close[1], open[1], open, close, bodyDisplacement)
        bool supplyDeparture = not na(slw) and zoneDeparture(-1, slw, close[1], open[1], open, close, bodyDisplacement)
        if enableE and candDemand.stage == 0 and demandDeparture and (na(memory.demandUsed) or memory.demandUsed != time[1])
            candDemand.begin(bar_index, time_close, 1, low[1], high[1], low[1], high[1], 20, 0, 'Demand departure')
            memory.demandUsed := time[1]
        if enableE and candSupply.stage == 0 and supplyDeparture and (na(memory.supplyUsed) or memory.supplyUsed != time[1])
            candSupply.begin(bar_index, time_close, -1, low[1], high[1], high[1], low[1], 20, 0, 'Supply departure')
            memory.supplyUsed := time[1]

        // F: structural trend + pullback into EMA9/21 band, then later rejection of frozen pullback high/low.
        candF.confirmBreak(bar_index, time_close, open, close)
        bool bullTrend = chartStructure == 1 and ema9 > ema21 and (not useEMA50 or ema21 > ema50)
        bool bearTrend = chartStructure == -1 and ema9 < ema21 and (not useEMA50 or ema21 < ema50)
        if candF.stage > 0 and not (candF.direction == 1 ? bullTrend : bearTrend)
            candF.stage := 0
            candF.ready := false
            candF.status := 'INVALIDATED'
        if enableF and candF.stage == 0
            bool bull = trendPullback(1, bullTrend, ema9, ema21, high, low, close, atr, pullbackDepth)
            bool bear = trendPullback(-1, bearTrend, ema9, ema21, high, low, close, atr, pullbackDepth)
            if bull != bear
                candF.begin(bar_index, time_close, bull ? 1 : -1, math.min(ema9, ema21), math.max(ema9, ema21), bull ? math.min(low, slw) : math.max(high, sh), bull ? high : low, 20, 0, 'EMA structural pullback')

        // G: compressed prior rolling range -> sweep/reclaim -> later displacement out of frozen range.
        candG.confirmBreak(bar_index, time_close, open, close)
        if candG.ready and not bodyDisplacement
            candG.ready := false
        if enableG and candG.stage == 0 and compressedRange(accHigh, accLow, atr, accumulationWidth) and (na(memory.amdUsed) or bar_index - memory.amdUsed > accumulationBars)
            bool bull = rangeSweep(1, accLow, accHigh, high, low, close)
            bool bear = rangeSweep(-1, accLow, accHigh, high, low, close)
            if bull != bear
                candG.begin(bar_index, time_close, bull ? 1 : -1, accLow, accHigh, bull ? low : high, bull ? accHigh : accLow, 20, 20, 'Compression sweep')
                memory.amdUsed := bar_index

        // H: five alternating confirmed pivots form shoulder/head/neckline break, then level retest.
        candH.confirmRetest(bar_index, time_close, high, low, open, close)
        if enableH and candH.stage == 0 and array.size(pivotPrices) == 5
            float p0 = array.get(pivotPrices, 0)
            float p1 = array.get(pivotPrices, 1)
            float p2 = array.get(pivotPrices, 2)
            float p3 = array.get(pivotPrices, 3)
            float p4 = array.get(pivotPrices, 4)
            int patternKey = array.get(pivotTimes, 4)
            int necklinePivot = array.get(pivotTimes, 1)
            int headConfirmed = array.get(pivotTimes, 2)
            int shoulderConfirmed = array.get(pivotTimes, 4)
            int bullNecklineBar = structureBreakTime(bullBreakPivots, bullBreakBars, necklinePivot)
            int bearNecklineBar = structureBreakTime(bearBreakPivots, bearBreakBars, necklinePivot)
            bool bull = qmQualified(qmPattern(1, array.get(pivotDirs, 0), p0, p1, p2, p3, p4, close), bullNecklineBar, headConfirmed, shoulderConfirmed)
            bool bear = qmQualified(qmPattern(-1, array.get(pivotDirs, 0), p0, p1, p2, p3, p4, close), bearNecklineBar, headConfirmed, shoulderConfirmed)
            if (bull != bear) and (na(memory.qmUsed) or memory.qmUsed != patternKey)
                float tolerance = atr * levelTolerance
                candH.begin(bar_index, time_close, bull ? 1 : -1, p0 - tolerance, p0 + tolerance, p2, p0, 20, 20, 'Confirmed 5-pivot QM')
                memory.qmUsed := patternKey
    0
