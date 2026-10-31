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
useResearchWindow = input.bool(false, 'Restrict new plans to date window', group='Research')
researchStart = input.time(timestamp('01 Jan 2026 00:00 +0000'), 'Window start (inclusive)', group='Research')
researchEnd = input.time(timestamp('01 Jan 2027 00:00 +0000'), 'Window end (exclusive)', group='Research')
tradeSide = input.string('Both', 'Allowed direction', options=['Both', 'BUY only', 'SELL only'], group='Research')
auditLog = input.bool(false, 'Log qualified plans and lifecycle events (research only)', group='Research')
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
visualLayout = input.string('Reference', 'Chart layout', options=['Reference', 'Dashboard'], group='Chart style')
historyMode = input.string('Off', 'Historical plan drawings', options=['Off', 'Recent plans', 'Full bounded'], group='Historical view')
historyPlanLimit = input.int(8, 'Maximum historical plans', minval=1, maxval=10, group='Historical view')
historyLookback = input.int(3000, 'Full history lookback bars', minval=100, maxval=20000, group='Historical view')
showConceptPanel = input.bool(true, 'Show compact analysis context', group='Chart style')
showSwingLevels = input.bool(true, 'Show confirmed swing levels and right labels', group='Chart style')
showSupportResistance = input.bool(true, 'Show confirmed support/resistance zones', group='Chart style')
showCRTSweeps = input.bool(false, 'Show completed-reference CRT sweeps (context only)', group='Chart style')
showContextSweeps = input.bool(true, 'Show confirmed-pivot liquidity sweeps (context only)', group='Chart style')
showEMA55 = input.bool(true, 'Show visual EMA 55 (does not change strategy EMA 50)', group='Chart style')
contextHistory = input.string('Latest only', 'Context annotation history', options=['Latest only', 'Recent history'], group='Chart style')
contextZoneBars = input.int(60, 'Maximum context zone age bars', minval=5, maxval=500, group='Chart style')
contextZoneDistance = input.float(8, 'Maximum context zone distance ATR', minval=1, group='Chart style')
contextLabelGap = input.int(8, 'Minimum bars between same-side sweep labels', minval=1, maxval=50, group='Chart style')
zoneExtension = input.int(12, 'Zone / right-label extension bars', minval=3, maxval=50, group='Chart style')
dashboardSize = input.string('Small', 'Dashboard text size', options=['Tiny', 'Small', 'Normal', 'Large'], group='Readability')
chartLabelSize = input.string('Small', 'Chart label text size', options=['Tiny', 'Small', 'Normal', 'Large'], group='Readability')
showDashboard = input.bool(true, 'Show signal dashboard', group='Readability')
showPerformance = input.bool(true, 'Show backtest results table', group='Readability')
showUnusedModules = input.bool(false, 'Show strategies with no completed trades', group='Readability')
showSwingLabels = input.bool(false, 'Show detailed swing labels', group='Readability')
maxStructureLabels = input.int(15, 'Maximum recent structure labels', minval=5, maxval=100, group='Readability')
showLastPlan = input.bool(false, 'Show previous trade prices when no current plan', group='Readability')
contextTransparency = input.int(82, 'Context label background transparency', minval=0, maxval=95, group='Readability')
panelText = dashboardSize == 'Tiny' ? size.tiny : dashboardSize == 'Large' ? size.large : dashboardSize == 'Small' ? size.small : size.normal
chartText = chartLabelSize == 'Tiny' ? size.tiny : chartLabelSize == 'Large' ? size.large : chartLabelSize == 'Small' ? size.small : size.normal
panelBackground = color.rgb(250, 252, 255)
panelAlternate = color.rgb(241, 245, 249)
panelHeader = color.rgb(226, 232, 240)
panelMuted = color.rgb(71, 85, 105)
panelValue = color.rgb(15, 23, 42)
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
// INCLUDE_PREDICATES
structureContext() =>
    float pHigh = ta.pivothigh(high, swing, swing)
    float pLow = ta.pivotlow(low, swing, swing)
    var float lastHigh = na
    var float lastLow = na
    var int trend = 0
    var int highId = na
    var int lowId = na
    var int consumedHigh = na
    var int consumedLow = na
    bool up = freshStructureBreak(1, lastHigh, highId, consumedHigh, close[1], close)
    bool down = freshStructureBreak(-1, lastLow, lowId, consumedLow, close[1], close)
    int next = uniqueStructureDirection(up, down)
    if next != 0
        trend := next
        if next == 1
            consumedHigh := highId
        else
            consumedLow := lowId
    if not na(pHigh)
        lastHigh := pHigh
        highId := bar_index
    if not na(pLow)
        lastLow := pLow
        lowId := bar_index
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
var int brokenHighPivot = na
var int brokenLowPivot = na
var array<int> bullBreakPivots = array.new<int>()
var array<int> bullBreakBars = array.new<int>()
var array<int> bearBreakPivots = array.new<int>()
var array<int> bearBreakBars = array.new<int>()
var string contextStructureCaption = 'No confirmed break yet'
var string signalReason = ''
var string signalAlignment = 'NEUTRAL'
var string validationReason = 'Waiting for a qualified setup'
var string decisionState = 'WAIT'
var string decisionReason = 'Waiting for a qualified setup'
var string decisionProgress = 'Sweep … → MSS + FVG … → Retest … → Checks …'
var box obBox = na
var box fvgBox = na
var box riskBox = na
var box rewardBox = na
var array<line> levels = array.new<line>()
var array<label> tags = array.new<label>()
// INCLUDE_MODULE_CANDIDATES
// INCLUDE_CONTEXT_DEFINITIONS
// INCLUDE_MODULE_FUNCTIONS
strategyName(string id) =>
    str.startswith(id, 'A_') ? 'A · Sweep + reversal + gap' : str.startswith(id, 'B_') ? 'B · Candle range reversal' : str.startswith(id, 'C_') ? 'C · False breakout reversal' : str.startswith(id, 'D_') ? 'D · Support / resistance' : str.startswith(id, 'E_') ? 'E · Supply / demand' : str.startswith(id, 'F_') ? 'F · Trend pullback' : str.startswith(id, 'G_') ? 'G · Range sweep continuation' : str.startswith(id, 'H_') ? 'H · Quasimodo retest' : 'No strategy selected'
setupExplanation(string id) =>
    str.startswith(id, 'A_') ? 'Sweep reclaimed; MSS + FVG; later retest confirmed' : str.startswith(id, 'B_') ? 'Completed range reclaimed; later reversal close' : str.startswith(id, 'C_') ? 'Confirmed-pivot false breakout; reversal close' : str.startswith(id, 'D_') ? 'Confirmed SNR level; retest/rejection trigger' : str.startswith(id, 'E_') ? 'Impulsive departure; zone retest confirmed' : str.startswith(id, 'F_') ? 'Structure + EMA pullback; later trigger close' : str.startswith(id, 'G_') ? 'Compressed range swept; later displacement' : 'Five confirmed pivots; closing neckline break; later retest'
statusName(string raw) =>
    raw == 'IDLE' ? 'Waiting for a setup' : raw == 'DETECTED' ? 'Setup found · not an entry' : raw == 'WAITING_CONFIRMATION' ? 'Waiting for confirmation' : raw == 'CONFIRMED' ? 'Setup confirmed' : raw == 'ENTRY_PENDING' ? 'Order pending · not filled' : raw == 'ENTRY_TRIGGERED' ? 'Entry triggered (simulated)' : raw == 'CLOSED' ? 'Previous trade closed' : raw == 'EXPIRED' ? 'Setup expired' : raw == 'INVALIDATED' ? 'Setup no longer valid' : raw == 'EXPIRED / INVALIDATED' ? 'Setup expired / invalid' : raw == 'INVALIDATED FVG' ? 'Price gap invalidated' : str.startswith(raw, 'REJECTED') ? 'Rejected: ' + str.lower(str.replace_all(raw, 'REJECTED: ', '')) : str.replace_all(raw, '_', ' ')
priceText(float value) => na(value) ? '—' : str.tostring(value, format.mintick)
var array<label> structureTags = array.new<label>()
var array<string> structureKinds = array.new<string>()
structureTag(float price, string caption, color background) =>
    string kind = str.contains(caption, 'SWEEP') ? (str.contains(caption, 'HIGH') ? 'sweep-high' : 'sweep-low') : (str.contains(caption, 'BOS') or str.contains(caption, 'CHoCH') or str.contains(caption, 'MSS') ? 'structure' : 'swing')
    if contextHistory == 'Latest only' and array.size(structureTags) > 0
        for i = array.size(structureTags) - 1 to 0
            if array.get(structureKinds, i) == kind
                label.delete(array.remove(structureTags, i))
                array.remove(structureKinds, i)
    bool above = str.contains(caption, 'Bullish') ? false : str.contains(caption, 'Bearish') ? true : price >= close
    float offset = atr * (0.5 + 0.35 * (bar_index % 3))
    float labelPrice = above ? math.max(price, high) + offset : math.min(price, low) - offset
    label tag = label.new(bar_index, labelPrice, caption, style=above ? label.style_label_down : label.style_label_up, color=color.new(background, contextTransparency), textcolor=panelValue, size=chartText)
    array.push(structureTags, tag)
    array.push(structureKinds, kind)
    if array.size(structureTags) > maxStructureLabels
        label.delete(array.shift(structureTags))
        array.shift(structureKinds)
    tag
roundPrice(float p) => math.round_to_mintick(p)
jsonEscape(string s) => str.replace_all(str.replace_all(str.replace_all(s, '\\', '\\\\'), '"', '\\"'), '\n', ' ')
event(string kind) =>
    string id = syminfo.tickerid + ':' + timeframe.period + ':' + str.tostring(signalTime) + ':' + str.tostring(dir) + ':' + selectedStrategy + ':' + kind
    '{"eventId":"' + jsonEscape(id) + '","eventType":"' + kind + '","symbol":"' + jsonEscape(syminfo.tickerid) + '","timeframe":"' + timeframe.period + '","direction":"' + (dir == 1 ? 'BUY' : 'SELL') + '","strategy":"' + selectedStrategy + '","entry":' + str.tostring(entry, format.mintick) + ',"sl":' + str.tostring(stop, format.mintick) + ',"tp1":' + str.tostring(tp1, format.mintick) + ',"tp2":' + str.tostring(tp2, format.mintick) + ',"tp3":' + str.tostring(tp3, format.mintick) + ',"reason":"' + jsonEscape(signalReason) + '","setupProgress":"' + jsonEscape(statusName(status)) + '","alignment":"' + signalAlignment + '","scriptVersion":"0.6.0","quality":' + str.tostring(quality) + ',"timestamp":' + str.tostring(signalTime) + ',"h1Trend":"' + signalTrend + '","targetSource":"' + targetSource + '","setupTimestamp":' + str.tostring(signalSetupTime) + ',"invalidation":' + str.tostring(signalInvalidation, format.mintick) + ',"eventTimestamp":' + str.tostring(time_close) + ',"status":"' + status + '","entryMode":"' + entryMode + '","managedSl":' + str.tostring(managedStop, format.mintick) + ',"signalPrice":' + str.tostring(signalPrice, format.mintick) + ',"executionModel":"' + (useBroker ? 'STRATEGY_EMULATOR' : 'INDICATOR_ESTIMATE') + '","filledEntry":' + (na(filledEntry) ? 'null' : str.tostring(filledEntry, format.mintick)) + '}'
notifyEntry(string kind) =>
    string payload = event(kind)
    if auditLog
        log.info(payload)
    alert(payload, alert.freq_once_per_bar_close)
notifyLifecycle(string kind) =>
    string payload = event(kind)
    if auditLog
        log.info(payload)
    alert(payload, alert.freq_all)
// Flags consumed by both the visual indicator and strategy adapter.
bool newSignal = false
bool entryTriggered = false
bool cancelOrder = false
if barstate.isfirst and useResearchWindow and researchEnd <= researchStart
    runtime.error('Research window end must be later than start')
if barstate.isconfirmed
    validationReason := 'Waiting for entry confirmation'
    // INCLUDE_CONTEXT_UPDATE
    // BROKER_SYNC
    if newSession
        sessionTrades := 0
    // Manage existing plans before detecting new ones. Never evaluate fills on signal bar.
    if pending and bar_index > signalBar
        bool invalid = dir == 1 ? low <= stop : high >= stop
        bool expired = bar_index - signalBar > pendingBars
        bool touched = not useBroker and (entryMode == 'Limit' ? (dir == 1 ? low <= entry : high >= entry) : (dir == 1 ? high >= entry : low <= entry))
        if invalid or expired or pause or (useSession and not inSession) or not researchBarAllowed(useResearchWindow, researchStart, researchEnd, time, time_close)
            pending := false
            cancelOrder := true
            status := expired ? 'EXPIRED' : 'INVALIDATED'
            notifyLifecycle('SIGNAL_INVALIDATED')
        else if touched
            pending := false
            active := true
            fillTime := time_close
            fillBar := bar_index
            filledEntry := entryMode == 'Limit' ? (dir == 1 ? math.min(open, entry) : math.max(open, entry)) : (dir == 1 ? math.max(open, entry) : math.min(open, entry))
            entryTriggered := true
            status := 'ENTRY_TRIGGERED'
            notifyEntry(dir == 1 ? 'BUY_SIGNAL' : 'SELL_SIGNAL')
            notifyLifecycle('ENTRY_TRIGGERED')
    if active and not entryTriggered and bar_index > fillBar
        bool stopped = dir == 1 ? low <= managedStop : high >= managedStop
        bool third = dir == 1 ? high >= tp3 : low <= tp3
        bool timed = timeExit > 0 and time_close - fillTime >= timeExit * 60000
        if not useBroker
            // Conservative stop-first convention for indicator-only touch estimates.
            if stopped or third or timed
                status := 'CLOSED'
            if stopped
                notifyLifecycle('STOP_LOSS_HIT')
            else
                if not hit1 and (dir == 1 ? high >= tp1 : low <= tp1)
                    hit1 := true
                    notifyLifecycle('TP1_HIT')
                if not hit2 and (dir == 1 ? high >= tp2 : low <= tp2)
                    hit2 := true
                    notifyLifecycle('TP2_HIT')
                if third
                    notifyLifecycle('TP3_HIT')
            if stopped or third or timed
                active := false
                notifyLifecycle('TRADE_CLOSED')
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
    // A cancellation belongs to the old order ID. Do not replace it on this bar.
    if planSlotAvailable(active, pending, brokerBusy, cancelOrder)
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
                string blocked = candidateRejection(researchBarAllowed(useResearchWindow, researchStart, researchEnd, time, time_close), directionAllowed(tradeSide, direction), not na(c.invalidation) and c.invalidation > 0, targetsAvailable, fibOK, pdOK, volOK, pause, not useSession or inSession, not trendFilter or aligned, not emaFilter or emaOK, riskTicks >= 2 and risk <= atr * maxStop, math.abs(planned - anchor) <= atr * maxDistance, rrOK, validTargets and math.min(proposedStop, t3) > 0, sessionTrades < maxTrades, na(lastSignal) or bar_index - lastSignal >= cooldown, score, strategyThresholds ? moduleThreshold : threshold)
                bool safe = blocked == ''
                c.rejectionReason := blocked
                if blocked != ''
                    validationReason := strategyName(c.id) + ': ' + blocked
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
            validationReason := 'Opposing qualified directions; no trade'
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
            signalAlignment := hTrend == 0 ? 'NEUTRAL' : hTrend == dir ? 'ALIGNED' : 'COUNTER_TREND'
            signalReason := setupExplanation(selectedStrategy) + ' | H1 ' + (signalAlignment == 'ALIGNED' ? 'aligned' : signalAlignment == 'COUNTER_TREND' ? 'counter-trend' : 'neutral') + ' | TP2 ' + str.tostring(math.abs(best2 - bestEntry) / math.abs(bestEntry - bestStop), '#.##') + 'R | Quality ' + str.tostring(bestScore) + '/100'
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
                notifyEntry(dir == 1 ? 'BUY_SIGNAL' : 'SELL_SIGNAL')
                notifyLifecycle('ENTRY_TRIGGERED')
    if enableA and stage == 1 and bar_index > setupBar
        bool mss = dir == 1 ? close > breakLevel and close > open : close < breakLevel and close < open
        bool fvg = dir == 1 ? low > high[2] : high < low[2]
        if mss and fvg and math.abs(close - open) >= atr * minDisp
            gapTop := dir == 1 ? low : low[2]
            gapBottom := dir == 1 ? high[2] : high
            gapBar := bar_index
            stage := 2
            status := 'WAITING_CONFIRMATION'
            if showZones and visualLayout != 'Reference'
                box.delete(fvgBox)
                fvgBox := box.new(bar_index, gapTop, bar_index + expiry, gapBottom, bgcolor=color.new(color.orange, 85), border_color=color.orange, text='Price gap · reversal', text_color=color.rgb(124, 45, 18), text_size=chartText)
            if showOB and visualLayout != 'Reference'
                for offset = 1 to 5
                    bool opposite = dir == 1 ? close[offset] < open[offset] : close[offset] > open[offset]
                    if opposite
                        box.delete(obBox)
                        obBox := box.new(bar_index, high[offset], bar_index + expiry, low[offset], bgcolor=color.new(color.purple, 88), border_color=color.purple, text='Order block (estimated)', text_color=color.rgb(107, 33, 168), text_size=chartText)
                        break
            if showStructure and visualLayout != 'Reference'
                structureTag(close, dir == 1 ? 'Bullish MSS' : 'Bearish MSS', dir == 1 ? color.rgb(44, 153, 124) : color.rgb(220, 73, 83))
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
            if showStructure and visualLayout != 'Reference'
                structureTag(extreme, dir == 1 ? 'LOW LIQUIDITY SWEEP' : 'HIGH LIQUIDITY SWEEP', color.rgb(130, 135, 142))
    bool upBreak = freshStructureBreak(1, sh, shBar, brokenHighPivot, close[1], close)
    bool downBreak = freshStructureBreak(-1, slw, slBar, brokenLowPivot, close[1], close)
    int nextStructure = uniqueStructureDirection(upBreak, downBreak)
    if nextStructure != 0
        if nextStructure == 1
            brokenHighPivot := shBar
            array.push(bullBreakPivots, shBar)
            array.push(bullBreakBars, bar_index)
            if array.size(bullBreakPivots) > 6
                array.shift(bullBreakPivots)
                array.shift(bullBreakBars)
        else
            brokenLowPivot := slBar
            array.push(bearBreakPivots, slBar)
            array.push(bearBreakBars, bar_index)
            if array.size(bearBreakPivots) > 6
                array.shift(bearBreakPivots)
                array.shift(bearBreakBars)
        contextStructureCaption := (nextStructure == 1 ? 'Bullish ' : 'Bearish ') + (chartStructure != 0 and chartStructure != nextStructure ? 'CHoCH' : 'BOS')
        if showStructure
            string annotation = contextStructureCaption + (hTrend != 0 and hTrend != nextStructure ? ' · Counter H1' : '')
            structureTag(close, annotation, nextStructure == 1 ? color.rgb(44, 153, 124) : color.rgb(220, 73, 83))
        chartStructure := nextStructure
    // INCLUDE_PIVOT_CONTEXT
    if not na(ph)
        if showStructure and showSwingLabels and not na(sh)
            structureTag(ph, math.abs(ph - sh) <= atr * 0.1 ? 'Equal highs' : ph > sh ? 'Higher high' : 'Lower high', color.rgb(71, 85, 105))
        sh := ph
        shBar := bar_index
    if not na(pl)
        if showStructure and showSwingLabels and not na(slw)
            structureTag(pl, math.abs(pl - slw) <= atr * 0.1 ? 'Equal lows' : pl > slw ? 'Higher low' : 'Lower low', color.rgb(71, 85, 105))
        slw := pl
        slBar := bar_index
// STRATEGY_ORDER_ADAPTER
if newSignal and showTrade and (active or pending or not useBroker)
    for ln in levels
        line.delete(ln)
    for tag in tags
        label.delete(tag)
    array.clear(levels)
    array.clear(tags)
    box.delete(riskBox)
    box.delete(rewardBox)
    if showRiskReward
        riskBox := box.new(bar_index, math.max(entry, stop), bar_index + 20, math.min(entry, stop), bgcolor=color.new(color.red, 94), border_color=color.new(color.red, 75))
        rewardBox := box.new(bar_index, math.max(entry, tp3), bar_index + 20, math.min(entry, tp3), bgcolor=color.new(color.green, 94), border_color=color.new(color.green, 75))
    prices = array.from(entry, stop, tp1, tp2, tp3)
    names = array.from(dir == 1 ? 'BUY · Planned entry ' : 'SELL · Planned entry ', 'Stop loss ', 'Target 1 ', 'Target 2 ', 'Target 3 ')
    for i = 0 to 4
        float price = array.get(prices, i)
        color c = i == 0 ? color.rgb(51, 65, 85) : i == 1 ? color.rgb(185, 28, 28) : color.rgb(21, 128, 61)
        bool visible = i == 0 ? showEntryLine : i == 1 ? showSLLine : i == 2 ? showTP1Line : i == 3 ? showTP2Line : showTP3Line
        if visible
            array.push(levels, line.new(bar_index, price, bar_index + 20, price, color=c))
            array.push(tags, label.new(bar_index + 20, price, array.get(names, i) + str.tostring(price, format.mintick), style=label.style_label_left, color=color.new(c, contextTransparency), textcolor=panelValue, size=chartText))
// Remove old drawings when the plan ends; historical entry markers remain at their true bars.
if not active and not pending and (not newSignal or useBroker) and not showLastPlan
    for ln in levels
        line.delete(ln)
    for tag in tags
        label.delete(tag)
    array.clear(levels)
    array.clear(tags)
    box.delete(riskBox)
    box.delete(rewardBox)
if showTrade and (active or pending)
    if showRiskReward and not na(riskBox)
        box.set_right(riskBox, bar_index + 20)
        box.set_right(rewardBox, bar_index + 20)
    for ln in levels
        line.set_x2(ln, bar_index + 20)
    for tag in tags
        label.set_x(tag, bar_index + 20)
plot(showEMA and visualLayout == 'Dashboard' ? ema9 : na, 'EMA 9', color=color.aqua)
plot(showEMA ? ema21 : na, 'EMA 21', color=color.rgb(228, 163, 46), linewidth=1)
plot(showEMA and useEMA50 and visualLayout == 'Dashboard' ? ema50 : na, 'Strategy EMA 50', color=color.blue)
plotshape(entryTriggered and dir == 1, 'BUY confirmed', shape.labelup, location.belowbar, color.rgb(21, 128, 61), text='BUY', textcolor=color.white, size=size.small)
plotshape(entryTriggered and dir == -1, 'SELL confirmed', shape.labeldown, location.abovebar, color.rgb(185, 28, 28), text='SELL', textcolor=color.white, size=size.small)
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
// INCLUDE_DECISION_VIEW
// INCLUDE_REFERENCE_VISUALS
var table dash = table.new(position.top_right, 2, 19, bgcolor=panelBackground, frame_color=color.rgb(71, 85, 105), frame_width=1)
if barstate.islast or barstate.islastconfirmedhistory
    table.clear(dash, 0, 0, 1, 18)
    bool currentPlan = active or pending or brokerBusy
    string displayStrategy = currentPlan or showLastPlan ? strategyName(selectedStrategy) : 'Waiting for a setup'
    string displayStatus = statusName(status)
    string displayQuality = currentPlan or showLastPlan ? str.tostring(quality) + ' / 100' : 'Not scored yet'
    int displayDirection = currentPlan or showLastPlan ? dir : 0
    float displayEntry = currentPlan or showLastPlan ? entry : na
    float displaySL = currentPlan or showLastPlan ? stop : na
    float display1 = currentPlan or showLastPlan ? tp1 : na
    float display2 = currentPlan or showLastPlan ? tp2 : na
    float display3 = currentPlan or showLastPlan ? tp3 : na
    float displayFill = currentPlan or showLastPlan ? filledEntry : na
    float displayManaged = currentPlan or showLastPlan ? managedStop : na
    string displaySource = currentPlan or showLastPlan ? targetSource : 'No current trade plan'
    if not currentPlan and not str.startswith(status, 'REJECTED')
        for c in candidates
            if c.enabled and c.stage > 0
                displayStrategy := strategyName(c.id)
                displayStatus := statusName(c.status)
                displayQuality := c.ready ? str.tostring(c.quality) + ' / 100' : 'Not scored yet'
                displayDirection := c.direction
                displayEntry := na
                displaySL := na
                display1 := na
                display2 := na
                display3 := na
                displayFill := na
                displayManaged := na
                displaySource := c.ready and c.confirmationTime == time_close and c.targetSource != '' ? c.targetSource : 'Targets not calculated yet'
                break
    if not currentPlan and displayStrategy == 'Waiting for a setup' and enableA and stage > 0
        displayStrategy := strategyName('A_')
        displayStatus := stage == 1 ? 'Sweep found · waiting for reversal' : 'Reversal found · waiting for entry'
        displayDirection := dir
    string planCaption = currentPlan ? (pending ? 'CURRENT · ORDER PENDING' : 'CURRENT · SIMULATED TRADE') : showLastPlan ? 'PREVIOUS PLAN / NEW SETUP' : 'NO CURRENT TRADE'
    float displayRisk = math.abs(displayEntry - displaySL)
    string rrText = not na(displayRisk) and displayRisk > 0 ? str.tostring(math.abs(display2 - displayEntry) / displayRisk, '#.##') + 'R  |  ' + str.tostring(riskPct) + '% risk' : '—'
    keys = array.from('SMART SCALPER PRO', 'Chart / execution', '1-hour trend', '15-minute structure', 'Plan information', 'Strategy', 'Setup status', 'Direction', 'Setup score · not win %', 'Session / volatility', 'Planned entry', 'Initial stop loss', 'Take profit 1', 'Take profit 2', 'Take profit 3', 'Target 2 / planned risk', 'Target method', 'Simulated fill price', 'Current stop loss')
    vals = array.from(syminfo.ticker, timeframe.period + ' min', hTrend == 1 ? 'UPTREND' : hTrend == -1 ? 'DOWNTREND' : 'NEUTRAL', mTrend == 1 ? 'UPTREND' : mTrend == -1 ? 'DOWNTREND' : 'NEUTRAL', planCaption, displayStrategy, displayStatus, displayDirection == 1 ? (currentPlan ? 'BUY' : 'Potential BUY · not an entry') : displayDirection == -1 ? (currentPlan ? 'SELL' : 'Potential SELL · not an entry') : 'No entry', displayQuality, (inSession ? sessionPreset : 'Outside trading hours') + (volOK ? ' / Normal' : ' / Filtered'), priceText(displayEntry), priceText(displaySL), priceText(display1), priceText(display2), priceText(display3), rrText, displaySource, priceText(displayFill), priceText(displayManaged))
    if showDashboard and visualLayout == 'Dashboard'
        for i = 0 to 18
            color rowBackground = i == 0 ? panelHeader : i % 2 == 0 ? panelAlternate : panelBackground
            color valueColor = i == 7 and displayDirection != 0 ? (displayDirection == 1 ? color.rgb(21, 128, 61) : color.rgb(185, 28, 28)) : i == 4 ? color.rgb(146, 64, 14) : panelValue
            table.cell(dash, 0, i, array.get(keys, i), text_color=panelMuted, text_size=panelText, text_halign=text.align_left, bgcolor=rowBackground)
            table.cell(dash, 1, i, array.get(vals, i), text_color=valueColor, text_size=panelText, text_halign=text.align_left, bgcolor=rowBackground)

if auditLog and newSignal
    log.info('PLAN_AUDIT ' + '{"strategy":"' + selectedStrategy + '","timestamp":' + str.tostring(signalTime) + ',"setupTimestamp":' + str.tostring(signalSetupTime) + ',"direction":' + str.tostring(dir) + ',"entryMode":"' + entryMode + '","entry":' + str.tostring(entry, format.mintick) + ',"sl":' + str.tostring(stop, format.mintick) + ',"tp1":' + str.tostring(tp1, format.mintick) + ',"tp2":' + str.tostring(tp2, format.mintick) + ',"tp3":' + str.tostring(tp3, format.mintick) + ',"quality":' + str.tostring(quality) + ',"executionAccepted":' + (active or pending ? 'true' : 'false') + ',"executionModel":"' + (useBroker ? 'STRATEGY_EMULATOR' : 'INDICATOR_ESTIMATE') + '"}')
