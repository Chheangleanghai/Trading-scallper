// Presentation-only context. None of these objects or flags feed the trading candidates.
type HistoricalPlan
    array<line> priceLines
    array<label> priceLabels
    bool isOpen
var array<HistoricalPlan> historicalPlans = array.new<HistoricalPlan>()

createHistoricalPlan(int direction, string strategyId, float planned, float stopPrice, float targetOne, float targetTwo, float targetThree, int keepPlans) =>
    array<line> planLines = array.new<line>()
    array<label> planLabels = array.new<label>()
    array<float> planPrices = array.from(planned, stopPrice, targetOne, targetTwo, targetThree)
    array<string> planNames = array.from((direction == 1 ? 'BUY ' : 'SELL ') + str.substring(strategyId, 0, 1) + ' ', 'SL ', 'T1 ', 'T2 ', 'T3 ')
    array<color> planColors = array.from(color.rgb(71, 85, 105), color.rgb(185, 28, 28), color.rgb(21, 128, 61), color.rgb(21, 128, 61), color.rgb(21, 128, 61))
    for i = 0 to 4
        float level = array.get(planPrices, i)
        color levelColor = array.get(planColors, i)
        int labelBar = bar_index + 2 + i * 12
        array.push(planLines, line.new(bar_index, level, labelBar, level, color=color.new(levelColor, 15), width=i == 0 ? 2 : 1))
        array.push(planLabels, label.new(labelBar, level, array.get(planNames, i) + priceText(level), style=label.style_label_left, color=color.new(levelColor, contextTransparency), textcolor=panelValue, size=size.tiny))
    array.push(historicalPlans, HistoricalPlan.new(planLines, planLabels, true))
    if array.size(historicalPlans) > keepPlans
        HistoricalPlan oldest = array.shift(historicalPlans)
        for oldLine in oldest.priceLines
            line.delete(oldLine)
        for oldLabel in oldest.priceLabels
            label.delete(oldLabel)
    0

updateHistoricalPlans(bool planActive) =>
    if array.size(historicalPlans) > 0
        for index = 0 to array.size(historicalPlans) - 1
            HistoricalPlan view = array.get(historicalPlans, index)
            if view.isOpen
                bool latest = index == array.size(historicalPlans) - 1
                bool stillActive = latest and planActive
                int endBar = stillActive ? bar_index + 1 : bar_index
                for lineIndex = 0 to array.size(view.priceLines) - 1
                    line planLine = array.get(view.priceLines, lineIndex)
                    int labelBar = endBar + 2 + lineIndex * 12
                    line.set_x2(planLine, labelBar)
                for labelIndex = 0 to array.size(view.priceLabels) - 1
                    label planLabel = array.get(view.priceLabels, labelIndex)
                    if labelIndex < 5
                        label.set_x(planLabel, endBar + 2 + labelIndex * 12)
                if not stillActive
                    label entryTag = array.get(view.priceLabels, 0)
                    string terminal = status == 'CLOSED' ? 'CLOSED' : status == 'EXPIRED' ? 'EXPIRED' : str.startswith(status, 'INVALIDATED') ? 'INVALID' : statusName(status)
                    label.set_text(entryTag, label.get_text(entryTag) + ' · ' + terminal)
                    view.isOpen := false
                    array.set(historicalPlans, index, view)

bool referenceView = visualLayout == 'Reference'
color bullColor = color.rgb(44, 153, 124)
color bearColor = color.rgb(220, 73, 83)
color sweepColor = color.rgb(130, 135, 142)
float visualEMA55 = ta.ema(close, 55)
plot(referenceView and showEMA and showEMA55 ? visualEMA55 : na, 'Visual EMA 55', color=color.rgb(54, 88, 214), linewidth=2)
// Pivots step only on their confirmation bars; no negative offsets.
plot(referenceView and showSwingLevels and (na(brokenHighPivot) or shBar != brokenHighPivot) ? sh : na, 'Confirmed swing high', color=color.new(bearColor, 65), style=plot.style_stepline)
plot(referenceView and showSwingLevels and (na(brokenLowPivot) or slBar != brokenLowPivot) ? slw : na, 'Confirmed swing low', color=color.new(bullColor, 65), style=plot.style_stepline)

rightTag(label previous, int x, float price, string caption, color background) =>
    label result = previous
    if na(price)
        if not na(result)
            label.delete(result)
        result := na
    else if na(result)
        result := label.new(x, price, caption, style=label.style_label_left, color=color.new(background, contextTransparency), textcolor=panelValue, size=chartText)
    else
        label.set_xy(result, x, price)
        label.set_text(result, caption)
        label.set_color(result, color.new(background, contextTransparency))
        label.set_textcolor(result, panelValue)
        label.set_size(result, chartText)
    result

var label highTag = na
var label lowTag = na
var label fastTag = na
var label slowTag = na
var box supportArea = na
var box resistanceArea = na
var box demandOB = na
var box supplyOB = na
var box bullGap = na
var box bearGap = na
var float drawnSupport = na
var float drawnResistance = na
var int supportTouches = 0
var int resistanceTouches = 0
var float drawnBullOB = na
var float drawnBearOB = na
var int bullGapBar = na
var int bearGapBar = na
var int sweptHighPivot = na
var int sweptLowPivot = na
var int sweptCRTHigh = na
var int sweptCRTLow = na
var string recentContextPattern = 'Waiting for a confirmed pattern'
var int recentContextTime = na
var int lastHighCaption = na
var int lastLowCaption = na

if barstate.isconfirmed and referenceView
    // Use the pivot levels known before this candle, independently of strategy enablement.
    bool highSweep = showContextSweeps and not na(sh[1]) and not na(slw[1]) and rangeSweep(-1, slw[1], sh[1], high, low, close) and (na(sweptHighPivot) or sweptHighPivot != shBar[1])
    bool lowSweep = showContextSweeps and not na(sh[1]) and not na(slw[1]) and rangeSweep(1, slw[1], sh[1], high, low, close) and (na(sweptLowPivot) or sweptLowPivot != slBar[1])
    bool crtSupported = timeframe.in_seconds(crtTF) >= timeframe.in_seconds()
    bool crtHighSweep = showCRTSweeps and crtSupported and rangeSweep(-1, crtLow, crtHigh, high, low, close) and (na(sweptCRTHigh) or sweptCRTHigh != crtTime)
    bool crtLowSweep = showCRTSweeps and crtSupported and rangeSweep(1, crtLow, crtHigh, high, low, close) and (na(sweptCRTLow) or sweptCRTLow != crtTime)
    if highSweep or crtHighSweep
        string caption = highSweep and crtHighSweep ? 'HIGH LIQUIDITY SWEEP\nCRT HIGH SWEEP' : highSweep ? 'HIGH LIQUIDITY SWEEP' : 'CRT HIGH SWEEP'
        if showStructure and (na(lastHighCaption) or bar_index - lastHighCaption >= contextLabelGap)
            structureTag(high, caption, sweepColor)
            lastHighCaption := bar_index
        recentContextPattern := highSweep and crtHighSweep ? 'High sweep + CRT reclaim' : highSweep ? 'High liquidity sweep' : 'CRT high sweep'
        recentContextTime := time_close
    if lowSweep or crtLowSweep
        string caption = lowSweep and crtLowSweep ? 'LOW LIQUIDITY SWEEP\nCRT LOW SWEEP' : lowSweep ? 'LOW LIQUIDITY SWEEP' : 'CRT LOW SWEEP'
        if showStructure and (na(lastLowCaption) or bar_index - lastLowCaption >= contextLabelGap)
            structureTag(low, caption, sweepColor)
            lastLowCaption := bar_index
        recentContextPattern := highSweep or crtHighSweep ? 'Both sides swept · ambiguous' : lowSweep and crtLowSweep ? 'Low sweep + CRT reclaim' : lowSweep ? 'Low liquidity sweep' : 'CRT low sweep'
        recentContextTime := time_close
    if highSweep
        sweptHighPivot := shBar[1]
    if lowSweep
        sweptLowPivot := slBar[1]
    if crtHighSweep
        sweptCRTHigh := crtTime
    if crtLowSweep
        sweptCRTLow := crtTime

    // Repeated confirmed pivot clusters, with frozen ATR width at recognition.
    if showSupportResistance
        if not na(srLow) and srLowTouches >= 2 and close >= srLow - atr * levelTolerance and (na(drawnSupport) or srLow != drawnSupport or srLowTouches > supportTouches)
            box.delete(supportArea)
            supportArea := box.new(bar_index, srLow + atr * levelTolerance, bar_index + zoneExtension, srLow - atr * levelTolerance, border_color=color.new(bullColor, 35), bgcolor=color.new(bullColor, 92), text='SNR SUPPORT', text_color=bullColor, text_size=chartText, text_halign=text.align_right)
            drawnSupport := srLow
            supportTouches := srLowTouches
        if not na(srHigh) and srHighTouches >= 2 and close <= srHigh + atr * levelTolerance and (na(drawnResistance) or srHigh != drawnResistance or srHighTouches > resistanceTouches)
            box.delete(resistanceArea)
            resistanceArea := box.new(bar_index, srHigh + atr * levelTolerance, bar_index + zoneExtension, srHigh - atr * levelTolerance, border_color=color.new(bearColor, 35), bgcolor=color.new(bearColor, 92), text='SNR RESISTANCE', text_color=bearColor, text_size=chartText, text_halign=text.align_right)
            drawnResistance := srHigh
            resistanceTouches := srHighTouches
        if not na(supportArea)
            if close < box.get_bottom(supportArea)
                box.delete(supportArea)
                supportArea := na
            else
                box.set_right(supportArea, bar_index + zoneExtension)
        if not na(resistanceArea)
            if close > box.get_top(resistanceArea)
                box.delete(resistanceArea)
                resistanceArea := na
            else
                box.set_right(resistanceArea, bar_index + zoneExtension)

    // Existing displacement/previous-opposite-candle OB heuristic; two live zones maximum.
    if showOB
        if na(bullOBLow)
            box.delete(demandOB)
            demandOB := na
            drawnBullOB := na
        else if na(drawnBullOB) or bullOBLow != drawnBullOB or (not na(demandOB) and bullOBHigh != box.get_top(demandOB))
            box.delete(demandOB)
            demandOB := box.new(bar_index, bullOBHigh, bar_index + zoneExtension, bullOBLow, border_color=color.new(color.teal, 25), bgcolor=color.new(color.teal, 93), text='BULL OB · candidate', text_color=color.teal, text_size=chartText, text_halign=text.align_right)
            drawnBullOB := bullOBLow
        if na(bearOBHigh)
            box.delete(supplyOB)
            supplyOB := na
            drawnBearOB := na
        else if na(drawnBearOB) or bearOBHigh != drawnBearOB or (not na(supplyOB) and bearOBLow != box.get_bottom(supplyOB))
            box.delete(supplyOB)
            supplyOB := box.new(bar_index, bearOBHigh, bar_index + zoneExtension, bearOBLow, border_color=color.new(bearColor, 25), bgcolor=color.new(bearColor, 93), text='BEAR OB · candidate', text_color=bearColor, text_size=chartText, text_halign=text.align_right)
            drawnBearOB := bearOBHigh
        if not na(demandOB)
            box.set_right(demandOB, bar_index + zoneExtension)
        if not na(supplyOB)
            box.set_right(supplyOB, bar_index + zoneExtension)

    // Displacement FVG context, identified now, never backdated to the first candle.
    if showZones
        bool bullishGap = low > high[2] and close[1] > open[1] and math.abs(close[1] - open[1]) >= atr[1] * minDisp
        bool bearishGap = high < low[2] and close[1] < open[1] and math.abs(close[1] - open[1]) >= atr[1] * minDisp
        if bullishGap
            box.delete(bullGap)
            bullGap := box.new(bar_index, low, bar_index + zoneExtension, high[2], border_color=color.new(bullColor, 45), bgcolor=color.new(bullColor, 94), text='BULL FVG', text_color=bullColor, text_size=chartText, text_halign=text.align_right)
            bullGapBar := bar_index
        if bearishGap
            box.delete(bearGap)
            bearGap := box.new(bar_index, low[2], bar_index + zoneExtension, high, border_color=color.new(bearColor, 45), bgcolor=color.new(bearColor, 94), text='BEAR FVG', text_color=bearColor, text_size=chartText, text_halign=text.align_right)
            bearGapBar := bar_index
        if not na(bullGap)
            if bar_index > bullGapBar and low <= box.get_bottom(bullGap)
                box.delete(bullGap)
                bullGap := na
            else
                box.set_right(bullGap, bar_index + zoneExtension)
        if not na(bearGap)
            if bar_index > bearGapBar and high >= box.get_top(bearGap)
                box.delete(bearGap)
                bearGap := na
            else
                box.set_right(bearGap, bar_index + zoneExtension)

trimContextBox(box area) =>
    box result = area
    if not na(area)
        bool staleArea = bar_index - box.get_left(area) > contextZoneBars
        bool distantArea = math.abs((box.get_top(area) + box.get_bottom(area)) / 2 - close) > atr * contextZoneDistance
        if staleArea or distantArea
            box.delete(area)
            result := na
    result
if barstate.isconfirmed and referenceView
    supportArea := trimContextBox(supportArea)
    resistanceArea := trimContextBox(resistanceArea)
    demandOB := trimContextBox(demandOB)
    supplyOB := trimContextBox(supplyOB)
    bullGap := trimContextBox(bullGap)
    bearGap := trimContextBox(bearGap)
var table conceptPanel = table.new(position.middle_right, 2, 9, frame_color=color.new(color.gray, 65), frame_width=1, bgcolor=color.new(color.white, 8))
if barstate.islast or barstate.islastconfirmedhistory
    highTag := rightTag(highTag, bar_index + zoneExtension + 14, referenceView and showSwingLevels and (na(brokenHighPivot) or shBar != brokenHighPivot) ? sh : na, 'SWING HIGH  ' + priceText(sh), bearColor)
    lowTag := rightTag(lowTag, bar_index + zoneExtension + 14, referenceView and showSwingLevels and (na(brokenLowPivot) or slBar != brokenLowPivot) ? slw : na, 'SWING LOW  ' + priceText(slw), bullColor)
    fastTag := rightTag(fastTag, bar_index + zoneExtension, referenceView and showEMA ? ema21 : na, 'EMA 21', color.rgb(228, 163, 46))
    slowTag := rightTag(slowTag, bar_index + zoneExtension + 6, referenceView and showEMA and showEMA55 ? visualEMA55 : na, 'EMA 55', color.rgb(54, 88, 214))
    table.clear(conceptPanel, 0, 0, 1, 8)
    if referenceView and showConceptPanel
        string zoneNames = (not na(supportArea) or not na(resistanceArea) ? 'SNR ' : '') + (not na(demandOB) or not na(supplyOB) ? 'OB ' : '') + (not na(bullGap) or not na(bearGap) ? 'FVG' : '')
        string alignmentCaption = pending or active or brokerBusy ? signalAlignment : hTrend != 0 and chartStructure != 0 and chartStructure != hTrend ? 'Chart counter H1 · not an entry' : 'Chart aligned / neutral · not an entry'
        array<string> captions = array.from('GOLD EMPIRE · ANALYSIS', 'Decision · last closed bar', 'Why WAIT / READY', 'Setup progress', 'H1 / M15 direction', 'Chart structure', 'Alignment context', 'Context zones (display)', 'Price levels')
        array<string> descriptions = array.from('CONTEXT ≠ BUY / SELL', decisionState, str.replace_all(decisionReason, ' | ', '\n'), decisionProgress, (hTrend == 1 ? 'Bullish' : hTrend == -1 ? 'Bearish' : 'Neutral') + ' / ' + (mTrend == 1 ? 'Bullish' : mTrend == -1 ? 'Bearish' : 'Neutral'), contextStructureCaption, alignmentCaption, zoneNames == '' ? 'No fresh nearby display zones' : zoneNames, pending or active or brokerBusy ? 'Qualified plan only · see chart' : 'Hidden until a plan passes all checks')
        for row = 0 to 8
            color rowColor = row == 0 ? color.rgb(235, 240, 244) : color.new(color.white, 8)
            table.cell(conceptPanel, 0, row, array.get(captions, row), text_color=color.rgb(71, 85, 105), text_size=panelText, text_halign=text.align_left, bgcolor=rowColor)
            table.cell(conceptPanel, 1, row, array.get(descriptions, row), text_color=color.rgb(30, 41, 59), text_size=panelText, text_halign=text.align_left, bgcolor=rowColor)

// Plan history is a read-only overlay. It starts at the confirmed plan bar and never submits orders or alerts.
bool inHistoryWindow = historyMode != 'Full bounded' or bar_index >= last_bar_index - historyLookback
if barstate.isconfirmed and newSignal and historyMode != 'Off' and inHistoryWindow and (active or pending or not useBroker)
    createHistoricalPlan(dir, selectedStrategy, entry, stop, tp1, tp2, tp3, historyPlanLimit)
if barstate.isconfirmed and array.size(historicalPlans) > 0
    updateHistoricalPlans(active or pending or brokerBusy)
