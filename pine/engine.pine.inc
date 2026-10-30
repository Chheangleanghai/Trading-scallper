// Shared source: edit this file, then npm run pine:generate.
enableA = input.bool(true, 'A: Sweep + MSS + FVG', group='Strategies')
enableB = input.bool(false, 'B: CRT', group='Strategies')
enableC = input.bool(false, 'C: Confirmed-pivot Turtle Soup', group='Strategies')
enableD = input.bool(false, 'D: Confirmed support/resistance', group='Strategies')
enableE = input.bool(false, 'E: Supply/demand', group='Strategies')
enableF = input.bool(false, 'F: Structural trend pullback', group='Strategies')
enableG = input.bool(false, 'G: AMD range approximation', group='Strategies')
enableH = input.bool(false, 'H: Confirmed Quasimodo approximation', group='Strategies')
crtTF = input.timeframe('15', 'CRT reference timeframe', group='Modules')
turtleAge = input.int(3, 'Turtle Soup minimum bars since pivot confirmation', minval=1, group='Modules')
levelTolerance = input.float(0.15, 'Level/zone tolerance ATR', minval=0.01, group='Modules')
maxZoneTests = input.int(2, 'S/D maximum tested bars', minval=1, maxval=10, group='Modules')
useEMA50 = input.bool(true, 'Trend pullback: require EMA50', group='Modules')
pullbackDepth = input.float(0.3, 'Trend pullback: maximum EMA21 overshoot ATR', minval=0, group='Modules')
accumulationBars = input.int(12, 'AMD prior accumulation bars', minval=4, maxval=100, group='Modules')
accumulationWidth = input.float(3, 'AMD maximum prior range ATR', minval=0.5, group='Modules')
strategyThresholds = input.bool(false, 'Use strategy-specific quality thresholds', group='Quality')
thresholdA = input.int(75, 'A quality threshold', minval=0, maxval=100, group='Quality')
thresholdB = input.int(75, 'B quality threshold', minval=0, maxval=100, group='Quality')
thresholdC = input.int(75, 'C quality threshold', minval=0, maxval=100, group='Quality')
thresholdD = input.int(75, 'D quality threshold', minval=0, maxval=100, group='Quality')
thresholdE = input.int(75, 'E quality threshold', minval=0, maxval=100, group='Quality')
thresholdF = input.int(75, 'F quality threshold', minval=0, maxval=100, group='Quality')
thresholdG = input.int(75, 'G quality threshold', minval=0, maxval=100, group='Quality')
thresholdH = input.int(75, 'H quality threshold', minval=0, maxval=100, group='Quality')
swing = input.int(3, 'Confirmed pivot strength', minval=2, maxval=20)
expiry = input.int(20, 'Setup expiry bars', minval=3)
threshold = input.int(75, 'Minimum heuristic quality', minval=0, maxval=100)
cooldown = input.int(5, 'Signal cooldown bars', minval=1)
maxTrades = input.int(5, 'Maximum entries per session', minval=1)
maxExposurePct = input.float(90, 'Maximum simulated notional / equity % (align with margin properties)', minval=1, maxval=10000, group='Risk')
riskPct = input.float(0.5, 'Simulation risk %', minval=0.01, maxval=5)
buffer = input.float(0.15, 'ATR stop buffer', minval=0)
maxStop = input.float(3, 'Maximum stop ATR', minval=0.1)
maxDistance = input.float(1.5, 'Maximum entry distance from FVG ATR', minval=0.1)
minRR = input.float(2, 'Minimum TP2 reward/risk', minval=0.1)
r1 = input.float(1, 'TP1 fixed R projection', minval=0.1)
r2 = input.float(2, 'TP2 fixed R projection', minval=0.2)
r3 = input.float(3, 'TP3 fixed R projection', minval=0.3)
minDisp = input.float(0.7, 'MSS body minimum ATR', minval=0.1)
trendFilter = input.bool(true, 'Require H1 alignment')
emaFilter = input.bool(false, 'Require EMA 9/21 alignment')
useSession = input.bool(true, 'Session filter')
sessionPreset = input.string('London', 'Session preset', options=['Custom', 'Asian', 'London', 'New York', 'London/New York overlap', 'All major sessions'])
sessionHours = input.session('0800-1700', 'Trading session')
sessionZone = input.string('Europe/London', 'IANA session timezone (handles DST)')
manualPause = input.bool(false, 'Manual news pause')
newsStart = input.time(0, 'Manual exclusion start')
newsEnd = input.time(0, 'Manual exclusion end')
entryMode = input.string('Close', 'Entry mode', options=['Close', 'Limit', 'Breakout'])
pendingBars = input.int(3, 'Pending entry expiry bars', minval=1)
timeExit = input.int(15, 'Maximum holding minutes (0 disables)', minval=0)
targetMode = input.string('Fixed R', 'Target mode', options=['Fixed R', 'Structure', 'Hybrid'], group='Risk')
stopMode = input.string('Structure', 'Stop mode', options=['Structure', 'Sweep extreme', 'Swing', 'ATR', 'Order Block'], group='Risk')
atrStop = input.float(1.5, 'ATR stop multiplier', minval=0.1, group='Risk')
breakEven = input.bool(false, 'Move stop to filled entry after trigger R', group='Management')
breakEvenR = input.float(1, 'Break-even trigger R', minval=0.1, group='Management')
trailing = input.bool(false, 'ATR trailing stop after trigger R', group='Management')
trailingStartR = input.float(2, 'Trailing activation R', minval=0.1, group='Management')
trailingATR = input.float(1.5, 'Trailing ATR distance', minval=0.1, group='Management')
confluenceLiquidity = input.bool(false, 'Score optional liquidity (category cap 20)', group='Confluence')
confluenceFib = input.bool(false, 'Require optional 50–61.8% swing retracement', group='Confluence')
confluencePD = input.bool(false, 'Require optional premium/discount location', group='Confluence')
showDaily = input.bool(false, 'Show previous day/week levels', group='Context visuals')
showSessionLevels = input.bool(false, 'Show session high/low', group='Context visuals')
showFibonacci = input.bool(false, 'Show confirmed swing Fibonacci', group='Context visuals')
showPremiumDiscount = input.bool(false, 'Show confirmed swing midpoint', group='Context visuals')
showBreakers = input.bool(false, 'Show breaker-level heuristics', group='Context visuals')
showWyckoff = input.bool(false, 'Show spring/upthrust candidates', group='Context visuals')
partial = input.bool(true, 'Partial TP: 33% / 33% / 34% (strategy)')
showEMA = input.bool(true, 'Show EMAs')
showZones = input.bool(true, 'Show latest FVG')
showTrade = input.bool(true, 'Show latest trade levels and boxes')
showEntryLine = input.bool(true, 'Entry line/price', group='Trade visuals')
showSLLine = input.bool(true, 'SL line/price', group='Trade visuals')
showTP1Line = input.bool(true, 'TP1 line/price', group='Trade visuals')
showTP2Line = input.bool(true, 'TP2 line/price', group='Trade visuals')
showTP3Line = input.bool(true, 'TP3 line/price', group='Trade visuals')
showRiskReward = input.bool(true, 'Risk/reward boxes', group='Trade visuals')
showOB = input.bool(true, 'Show latest displacement order block heuristic')
showStructure = input.bool(true, 'Show structure and sweeps')
if barstate.isfirst and (not chart.is_standard or not timeframe.isminutes or (timeframe.multiplier != 1 and timeframe.multiplier != 3 and timeframe.multiplier != 5 and timeframe.multiplier != 15) or (enableB and timeframe.in_seconds(crtTF) < timeframe.in_seconds()) or r1 >= r2 or r2 >= r3)
    runtime.error('Use standard M1/M3/M5/M15 candles and ascending R targets.')
atr = ta.atr(14)
atrMean = ta.sma(atr, 50)
ema9 = ta.ema(close, 9)
ema21 = ta.ema(close, 21)
[hClose, hEMA] = request.security(syminfo.tickerid, '60', [close[1], ta.ema(close, 50)[1]], lookahead=barmerge.lookahead_on)
structureContext() =>
    float pHigh = ta.pivothigh(high, swing, swing)
    float pLow = ta.pivotlow(low, swing, swing)
    var float lastHigh = na
    var float lastLow = na
    var int trend = 0
    if not na(lastHigh) and close > lastHigh
        trend := 1
    if not na(lastLow) and close < lastLow
        trend := -1
    if not na(pHigh)
        lastHigh := pHigh
    if not na(pLow)
        lastLow := pLow
    trend
mTrend = request.security(syminfo.tickerid, '15', structureContext()[1], lookahead=barmerge.lookahead_on)
hTrend = na(hClose) or na(hEMA) ? 0 : hClose > hEMA ? 1 : -1
customSession = not na(time(timeframe.period, sessionHours, sessionZone))
asianSession = not na(time(timeframe.period, '0900-1800', 'Asia/Tokyo'))
londonSession = not na(time(timeframe.period, '0800-1700', 'Europe/London'))
newYorkSession = not na(time(timeframe.period, '0800-1700', 'America/New_York'))
inSession = sessionPreset == 'Asian' ? asianSession : sessionPreset == 'London' ? londonSession : sessionPreset == 'New York' ? newYorkSession : sessionPreset == 'London/New York overlap' ? londonSession and newYorkSession : sessionPreset == 'All major sessions' ? asianSession or londonSession or newYorkSession : customSession
sessionDay = time('1D', '0000-0000', sessionZone)
newSession = inSession and (not inSession[1] or (sessionPreset == 'Custom' and sessionHours == '0000-0000' and sessionDay != sessionDay[1]))
volOK = atr > atrMean * 0.5 and atr < atrMean * 2.5
pause = manualPause or (newsEnd > newsStart and time_close >= newsStart and time < newsEnd)
ph = ta.pivothigh(high, swing, swing)
pl = ta.pivotlow(low, swing, swing)
var float sh = na
var float slw = na
var int shBar = na
var int slBar = na
var int usedLow = na
var int usedHigh = na
var int stage = 0
var int dir = 0
var int setupBar = na
var int setupTime = na
var float extreme = na
var float breakLevel = na
var float gapTop = na
var float gapBottom = na
var int gapBar = na
var float entry = na
var float stop = na
var float tp1 = na
var float tp2 = na
var float tp3 = na
var int quality = 0
var string status = 'IDLE'
var string selectedStrategy = 'A_SWEEP_MSS_FVG'
var int lastSignal = na
var int signalTime = na
var int signalBar = na
var int fillTime = na
var bool active = false
var bool pending = false
var bool hit1 = false
var bool hit2 = false
var int sessionTrades = 0
var int totalPlans = 0
var int rejectedSizes = 0
var int chartStructure = 0
var box obBox = na
var box fvgBox = na
var box riskBox = na
var box rewardBox = na
var array<line> levels = array.new<line>()
var array<label> tags = array.new<label>()
// INCLUDE_PREDICATES
// INCLUDE_MODULE_CANDIDATES
// INCLUDE_CONTEXT_DEFINITIONS
// INCLUDE_MODULE_FUNCTIONS
roundPrice(float p) => math.round_to_mintick(p)
jsonEscape(string s) => str.replace_all(str.replace_all(str.replace_all(s, '\\', '\\\\'), '"', '\\"'), '\n', ' ')
event(string kind) =>
    string id = syminfo.tickerid + ':' + timeframe.period + ':' + str.tostring(signalTime) + ':' + str.tostring(dir) + ':' + selectedStrategy + ':' + kind
    '{"eventId":"' + jsonEscape(id) + '","eventType":"' + kind + '","symbol":"' + jsonEscape(syminfo.tickerid) + '","timeframe":"' + timeframe.period + '","direction":"' + (dir == 1 ? 'BUY' : 'SELL') + '","strategy":"' + selectedStrategy + '","entry":' + str.tostring(entry, format.mintick) + ',"sl":' + str.tostring(stop, format.mintick) + ',"tp1":' + str.tostring(tp1, format.mintick) + ',"tp2":' + str.tostring(tp2, format.mintick) + ',"tp3":' + str.tostring(tp3, format.mintick) + ',"quality":' + str.tostring(quality) + ',"timestamp":' + str.tostring(signalTime) + ',"h1Trend":"' + signalTrend + '","targetSource":"' + targetSource + '","setupTimestamp":' + str.tostring(signalSetupTime) + ',"invalidation":' + str.tostring(signalInvalidation, format.mintick) + ',"eventTimestamp":' + str.tostring(time_close) + ',"status":"' + status + '","entryMode":"' + entryMode + '","managedSl":' + str.tostring(managedStop, format.mintick) + ',"signalPrice":' + str.tostring(signalPrice, format.mintick) + ',"executionModel":"' + (useBroker ? 'STRATEGY_EMULATOR' : 'INDICATOR_ESTIMATE') + '","filledEntry":' + (na(filledEntry) ? 'null' : str.tostring(filledEntry, format.mintick)) + '}'
// Flags consumed by both the visual indicator and strategy adapter.
bool newSignal = false
bool entryTriggered = false
bool cancelOrder = false
if barstate.isconfirmed
    // INCLUDE_CONTEXT_UPDATE
    // BROKER_SYNC
    if newSession
        sessionTrades := 0
    // Manage existing plans before detecting new ones. Never evaluate fills on signal bar.
    if pending and bar_index > signalBar
        bool invalid = dir == 1 ? low <= stop : high >= stop
        bool expired = bar_index - signalBar > pendingBars
        bool touched = not useBroker and (entryMode == 'Limit' ? (dir == 1 ? low <= entry : high >= entry) : (dir == 1 ? high >= entry : low <= entry))
        if invalid or expired or pause or (useSession and not inSession)
            pending := false
            cancelOrder := true
            status := expired ? 'EXPIRED' : 'INVALIDATED'
            alert(event('SIGNAL_INVALIDATED'), alert.freq_all)
        else if touched
            pending := false
            active := true
            fillTime := time_close
            fillBar := bar_index
            filledEntry := entryMode == 'Limit' ? (dir == 1 ? math.min(open, entry) : math.max(open, entry)) : (dir == 1 ? math.max(open, entry) : math.min(open, entry))
            entryTriggered := true
            status := 'ENTRY_TRIGGERED'
            alert(event(dir == 1 ? 'BUY_SIGNAL' : 'SELL_SIGNAL'), alert.freq_once_per_bar_close)
            alert(event('ENTRY_TRIGGERED'), alert.freq_all)
    if active and not entryTriggered and bar_index > fillBar
        bool stopped = dir == 1 ? low <= managedStop : high >= managedStop
        bool third = dir == 1 ? high >= tp3 : low <= tp3
        bool timed = timeExit > 0 and time_close - fillTime >= timeExit * 60000
        if not useBroker
            // Conservative stop-first convention for indicator-only touch estimates.
            if stopped or third or timed
                status := 'CLOSED'
            if stopped
                alert(event('STOP_LOSS_HIT'), alert.freq_all)
            else
                if not hit1 and (dir == 1 ? high >= tp1 : low <= tp1)
                    hit1 := true
                    alert(event('TP1_HIT'), alert.freq_all)
                if not hit2 and (dir == 1 ? high >= tp2 : low <= tp2)
                    hit2 := true
                    alert(event('TP2_HIT'), alert.freq_all)
                if third
                    alert(event('TP3_HIT'), alert.freq_all)
            if stopped or third or timed
                active := false
                alert(event('TRADE_CLOSED'), alert.freq_all)
        if active
            float originalRisk = math.abs(filledEntry - stop)
            float favorableR = originalRisk > 0 ? dir * (close - filledEntry) / originalRisk : 0
            float tightened = managedStop
            if breakEven and favorableR >= breakEvenR
                tightened := tightenStop(dir, tightened, filledEntry)
            if trailing and favorableR >= trailingStartR
                float trailPrice = roundPrice(close - dir * atr * trailingATR)
                tightened := tightenStop(dir, tightened, trailPrice)
            managedStop := roundPrice(tightened)
    if stage > 0 and (bar_index - setupBar > expiry or (dir == 1 ? low < extreme : high > extreme))
        stage := 0
        status := 'EXPIRED / INVALIDATED'
    if stage == 2 and (dir == 1 ? close < gapBottom : close > gapTop)
        stage := 0
        status := 'INVALIDATED FVG'
    updateCandidates()
    // Safety is applied per candidate before deterministic, conflict-aware arbitration.
    Candidate best = na
    int bestScore = -1
    int eligibleDirection = 0
    bool conflict = false
    float bestEntry = na
    float bestStop = na
    float best1 = na
    float best2 = na
    float best3 = na
    string bestTargetSource = ''
    if not active and not pending and not brokerBusy
        for c in candidates
            if c.enabled and c.ready
                int direction = c.direction
                bool aligned = hTrend == direction
                bool emaOK = direction == 1 ? ema9 > ema21 : ema9 < ema21
                float anchor = (c.upper + c.lower) / 2
                float planned = roundPrice(entryMode == 'Close' ? close : entryMode == 'Limit' ? anchor : direction == 1 ? high + syminfo.mintick : low - syminfo.mintick)
                float baseStop = stopMode == 'Swing' ? (direction == 1 ? slw : sh) : stopMode == 'ATR' ? planned - direction * atr * atrStop : stopMode == 'Order Block' ? (direction == 1 ? bullOBLow : bearOBHigh) : stopMode == 'Sweep extreme' ? (c.liquidityPoints > 0 ? c.invalidation : na) : c.invalidation
                float proposedStop = roundPrice(baseStop - direction * atr * buffer)
                float risk = direction * (planned - proposedStop)
                [t1, t2, t3, source, targetsAvailable] = getTargets(direction, planned, risk)
                bool validTargets = orderedPrices(direction, planned, proposedStop, t1, t2, t3)
                float riskTicks = math.round(risk / syminfo.mintick)
                bool rrOK = rrFeasible(direction, planned, proposedStop, t2, minRR, syminfo.mintick)
                int liquidityScore = confluenceLiquidity and optionalLiquidity(direction) ? math.max(c.liquidityPoints, 20) : c.liquidityPoints
                int score = qualityScore(c.structurePoints, liquidityScore, aligned, rrOK, volOK, inSession)
                int moduleThreshold = str.startswith(c.id, 'A_') ? thresholdA : str.startswith(c.id, 'B_') ? thresholdB : str.startswith(c.id, 'C_') ? thresholdC : str.startswith(c.id, 'D_') ? thresholdD : str.startswith(c.id, 'E_') ? thresholdE : str.startswith(c.id, 'F_') ? thresholdF : str.startswith(c.id, 'G_') ? thresholdG : thresholdH
                float swingRange = sh - slw
                float retracement = swingRange > 0 ? (direction == 1 ? (sh - planned) / swingRange : (planned - slw) / swingRange) : na
                bool fibOK = not confluenceFib or (retracement >= 0.5 and retracement <= 0.618)
                bool pdOK = not confluencePD or (swingRange > 0 and (direction == 1 ? planned <= (sh + slw) / 2 : planned >= (sh + slw) / 2))
                bool safe = not na(c.invalidation) and c.invalidation > 0 and targetsAvailable and fibOK and pdOK and volOK and not pause and (not useSession or inSession) and (not trendFilter or aligned) and (not emaFilter or emaOK) and riskTicks >= 2 and risk <= atr * maxStop and math.abs(planned - anchor) <= atr * maxDistance and rrOK and validTargets and math.min(proposedStop, t3) > 0 and sessionTrades < maxTrades and (na(lastSignal) or bar_index - lastSignal >= cooldown)
                c.targetSource := source
                c.entryMode := entryMode
                c.plannedEntry := planned
                c.suggestedStop := proposedStop
                c.target1 := t1
                c.target2 := t2
                c.target3 := t3
                c.quality := score
                c.confirmationTime := time_close
                if safe and score >= (strategyThresholds ? moduleThreshold : threshold)
                    c.status := 'CONFIRMED'
                    if eligibleDirection != 0 and eligibleDirection != direction
                        conflict := true
                    eligibleDirection := direction
                    if score > bestScore
                        best := c
                        bestScore := score
                        bestEntry := planned
                        bestStop := proposedStop
                        best1 := t1
                        best2 := t2
                        best3 := t3
                        bestTargetSource := source
        if conflict
            status := 'REJECTED: OPPOSING CANDIDATES'
        else if not na(best)
            dir := best.direction
            selectedStrategy := best.id
            setupTime := best.setupTime
            entry := bestEntry
            stop := bestStop
            tp1 := best1
            tp2 := best2
            tp3 := best3
            quality := bestScore
            managedStop := bestStop
            targetSource := bestTargetSource
            signalTrend := hTrend == 1 ? 'Bullish' : hTrend == -1 ? 'Bearish' : 'Neutral'
            signalSetupTime := best.setupTime
            signalInvalidation := best.invalidation
            signalPrice := close
            filledEntry := not useBroker and entryMode == 'Close' ? entry : na
            fillBar := not useBroker and entryMode == 'Close' ? bar_index : na
            signalTime := time_close
            signalBar := bar_index
            lastSignal := bar_index
            sessionTrades += 1
            totalPlans += 1
            newSignal := true
            hit1 := false
            hit2 := false
            pending := useBroker or entryMode != 'Close'
            active := not pending
            fillTime := active ? time_close : na
            entryTriggered := active
            status := pending ? 'ENTRY_PENDING' : 'ENTRY_TRIGGERED'
            stage := 0
            for c in candidates
                c.stage := 0
                c.ready := false
                c.status := c.id == selectedStrategy ? status : 'IDLE'
            if active
                alert(event(dir == 1 ? 'BUY_SIGNAL' : 'SELL_SIGNAL'), alert.freq_once_per_bar_close)
                alert(event('ENTRY_TRIGGERED'), alert.freq_all)
    if enableA and stage == 1 and bar_index > setupBar
        bool mss = dir == 1 ? close > breakLevel and close > open : close < breakLevel and close < open
        bool fvg = dir == 1 ? low > high[2] : high < low[2]
        if mss and fvg and math.abs(close - open) >= atr * minDisp
            gapTop := dir == 1 ? low : low[2]
            gapBottom := dir == 1 ? high[2] : high
            gapBar := bar_index
            stage := 2
            status := 'WAITING_CONFIRMATION'
            if showZones
                box.delete(fvgBox)
                fvgBox := box.new(bar_index, gapTop, bar_index + expiry, gapBottom, bgcolor=color.new(color.orange, 85), border_color=color.orange, text='FVG / MSS')
            if showOB
                for offset = 1 to 5
                    bool opposite = dir == 1 ? close[offset] < open[offset] : close[offset] > open[offset]
                    if opposite
                        box.delete(obBox)
                        obBox := box.new(bar_index, high[offset], bar_index + expiry, low[offset], bgcolor=color.new(color.purple, 88), border_color=color.purple, text='OB heuristic')
                        break
            if showStructure
                label.new(bar_index, close, 'MSS', color=color.new(color.blue, 60), textcolor=color.white, size=size.tiny)
    // Use only levels known before this bar; pivots are updated below.
    bool bullSweep = not na(slw) and not na(sh) and low < slw and close > slw and close < sh and (na(usedLow) or slBar != usedLow)
    bool bearSweep = not na(sh) and not na(slw) and high > sh and close < sh and close > slw and (na(usedHigh) or shBar != usedHigh)
    if enableA and stage == 0 and not active and not pending and not brokerBusy and bullSweep != bearSweep
        if bullSweep or bearSweep
            dir := bullSweep ? 1 : -1
            extreme := bullSweep ? low : high
            breakLevel := bullSweep ? sh : slw
            setupBar := bar_index
            setupTime := time_close
            stage := 1
            status := 'DETECTED'
            if bullSweep
                usedLow := slBar
            else
                usedHigh := shBar
            if showStructure
                label.new(bar_index, extreme, 'Sweep', color=color.new(color.purple, 50), textcolor=color.white, size=size.tiny)
    bool upBreak = not na(sh) and close > sh and close[1] <= sh
    bool downBreak = not na(slw) and close < slw and close[1] >= slw
    if upBreak or downBreak
        int nextStructure = upBreak ? 1 : -1
        if showStructure
            label.new(bar_index, close, chartStructure != 0 and chartStructure != nextStructure ? 'CHoCH' : 'BOS', color=color.new(color.blue, 70), textcolor=color.white, size=size.tiny)
        chartStructure := nextStructure
    // INCLUDE_PIVOT_CONTEXT
    if not na(ph)
        if showStructure and not na(sh)
            label.new(bar_index, ph, math.abs(ph - sh) <= atr * 0.1 ? 'EQH' : ph > sh ? 'HH' : 'LH', color=color.new(color.gray, 80), textcolor=color.white, size=size.tiny)
        sh := ph
        shBar := bar_index
    if not na(pl)
        if showStructure and not na(slw)
            label.new(bar_index, pl, math.abs(pl - slw) <= atr * 0.1 ? 'EQL' : pl > slw ? 'HL' : 'LL', color=color.new(color.gray, 80), textcolor=color.white, size=size.tiny)
        slw := pl
        slBar := bar_index
if newSignal and showTrade
    for ln in levels
        line.delete(ln)
    for tag in tags
        label.delete(tag)
    array.clear(levels)
    array.clear(tags)
    box.delete(riskBox)
    box.delete(rewardBox)
    if showRiskReward
        riskBox := box.new(bar_index, math.max(entry, stop), bar_index + 20, math.min(entry, stop), bgcolor=color.new(color.red, 88), border_color=color.new(color.red, 60))
        rewardBox := box.new(bar_index, math.max(entry, tp3), bar_index + 20, math.min(entry, tp3), bgcolor=color.new(color.green, 88), border_color=color.new(color.green, 60))
    prices = array.from(entry, stop, tp1, tp2, tp3)
    names = array.from(dir == 1 ? 'BUY plan / Entry ' : 'SELL plan / Entry ', 'SL ', 'TP1 ', 'TP2 ', 'TP3 ')
    for i = 0 to 4
        float price = array.get(prices, i)
        color c = i == 0 ? color.gray : i == 1 ? color.red : color.green
        bool visible = i == 0 ? showEntryLine : i == 1 ? showSLLine : i == 2 ? showTP1Line : i == 3 ? showTP2Line : showTP3Line
        if visible
            array.push(levels, line.new(bar_index, price, bar_index + 20, price, color=c))
            array.push(tags, label.new(bar_index + 20, price, array.get(names, i) + str.tostring(price, format.mintick), style=label.style_label_left, color=c, textcolor=color.white))
if showTrade and (active or pending)
    if showRiskReward and not na(riskBox)
        box.set_right(riskBox, bar_index + 20)
        box.set_right(rewardBox, bar_index + 20)
    for ln in levels
        line.set_x2(ln, bar_index + 20)
    for tag in tags
        label.set_x(tag, bar_index + 20)
plot(showEMA ? ema9 : na, 'EMA9', color=color.aqua)
plot(showEMA ? ema21 : na, 'EMA21', color=color.orange)
plot(showEMA and useEMA50 ? ema50 : na, 'EMA50', color=color.blue)
plotshape(entryTriggered and dir == 1, 'BUY confirmed', shape.labelup, location.belowbar, color.green, text='BUY', textcolor=color.white)
plotshape(entryTriggered and dir == -1, 'SELL confirmed', shape.labeldown, location.abovebar, color.red, text='SELL', textcolor=color.white)
plot(showDaily ? pdh : na, 'Previous day high', color=color.new(color.green, 35), style=plot.style_stepline)
plot(showDaily ? pdl : na, 'Previous day low', color=color.new(color.red, 35), style=plot.style_stepline)
plot(showDaily ? pwh : na, 'Previous week high', color=color.new(color.green, 65), style=plot.style_stepline)
plot(showDaily ? pwl : na, 'Previous week low', color=color.new(color.red, 65), style=plot.style_stepline)
plot(showSessionLevels ? sessionHigh : na, 'Session high', color=color.new(color.blue, 50))
plot(showSessionLevels ? sessionLow : na, 'Session low', color=color.new(color.blue, 50))
plot(showFibonacci and sh > slw ? sh - (sh - slw) * 0.618 : na, 'Bullish 61.8%', color=color.new(color.orange, 50))
plot(showFibonacci and sh > slw ? slw + (sh - slw) * 0.618 : na, 'Bearish 61.8%', color=color.new(color.orange, 50))
plot(showPremiumDiscount or showFibonacci ? (sh + slw) / 2 : na, 'Premium/discount midpoint 50%', color=color.new(color.gray, 50))
plot(showBreakers ? bullBreaker : na, 'Bullish breaker level', color=color.new(color.green, 35), style=plot.style_circles)
plot(showBreakers ? bearBreaker : na, 'Bearish breaker level', color=color.new(color.red, 35), style=plot.style_circles)
plotshape(showWyckoff and barstate.isconfirmed and bullSpring, 'Spring candidate', shape.triangleup, location.belowbar, color.purple, size=size.tiny)
plotshape(showWyckoff and barstate.isconfirmed and bearUpthrust, 'Upthrust candidate', shape.triangledown, location.abovebar, color.purple, size=size.tiny)
plot(active ? managedStop : na, 'Managed SL (next bar)', color=color.red, style=plot.style_linebr)
var table dash = table.new(position.top_right, 2, 19, bgcolor=color.new(color.black, 15))
if barstate.islast or barstate.islastconfirmedhistory
    string displayStrategy = selectedStrategy
    string displayStatus = status
    string displayQuality = str.tostring(quality)
    int displayDirection = dir
    float displayEntry = entry
    float displaySL = stop
    float display1 = tp1
    float display2 = tp2
    float display3 = tp3
    float displayFill = filledEntry
    float displayManaged = managedStop
    string displaySource = targetSource
    if not active and not pending and not brokerBusy and not newSignal and not str.startswith(status, 'REJECTED')
        for c in candidates
            if c.enabled and c.stage > 0
                displayStrategy := c.id
                displayStatus := c.status
                displayQuality := c.ready ? str.tostring(c.quality) : '—'
                displayDirection := c.direction
                displayEntry := c.plannedEntry
                displaySL := c.suggestedStop
                display1 := c.target1
                display2 := c.target2
                display3 := c.target3
                displayFill := na
                displayManaged := na
                displaySource := c.targetSource == '' ? 'Not planned' : c.targetSource
                break
    keys = array.from('SMART SCALPER PRO', 'Chart / execution', 'H1 confirmed trend', 'M15 structure', 'Setup TF', 'Strategy', 'Status', 'Direction', 'Quality (heuristic)', 'Session / ATR', 'Entry planned', 'SL', 'TP1', 'TP2', 'TP3', 'TP2 R / risk %', 'Targets', 'Filled entry (model)', 'Managed SL')
    vals = array.from(syminfo.ticker, timeframe.period, hTrend == 1 ? 'Bullish' : hTrend == -1 ? 'Bearish' : 'Neutral', mTrend == 1 ? 'Bullish' : mTrend == -1 ? 'Bearish' : 'Neutral', timeframe.period, displayStrategy, displayStatus, displayDirection == 1 ? 'BUY' : displayDirection == -1 ? 'SELL' : '—', displayQuality, (inSession ? sessionPreset : 'Outside') + (volOK ? ' / Normal' : ' / Filtered'), str.tostring(displayEntry, format.mintick), str.tostring(displaySL, format.mintick), str.tostring(display1, format.mintick), str.tostring(display2, format.mintick), str.tostring(display3, format.mintick), str.tostring(math.abs(display2 - displayEntry) / math.abs(displayEntry - displaySL), '#.##') + ' / ' + str.tostring(riskPct), displaySource, str.tostring(displayFill, format.mintick), str.tostring(displayManaged, format.mintick))
    for i = 0 to 18
        table.cell(dash, 0, i, array.get(keys, i), text_color=color.silver, text_size=size.small)
        table.cell(dash, 1, i, array.get(vals, i), text_color=color.white, text_size=size.small)
