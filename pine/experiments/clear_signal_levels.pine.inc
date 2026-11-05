// CLEAR_SIGNAL_DRAWINGS_BEGIN — presentation only; the qualified-plan engine is unchanged.
var int clearPlanTime = na
var string clearPlanSide = ''
var string clearPlanModule = ''
// Visible-range data controls label spacing only. It never feeds a trading predicate.
var float clearVisibleHigh = na
var float clearVisibleLow = na
if time >= chart.left_visible_bar_time and time <= chart.right_visible_bar_time
    clearVisibleHigh := na(clearVisibleHigh) ? high : math.max(clearVisibleHigh, high)
    clearVisibleLow := na(clearVisibleLow) ? low : math.min(clearVisibleLow, low)

type ClearSignalPlan
    array<line> priceLines
    array<line> connectors
    array<label> priceLabels
    array<float> prices
    box riskArea
    box rewardArea
    int startTime
    int endTime
    int direction
    bool isOpen
    string module
    string terminal

var array<ClearSignalPlan> clearPlans = array.new<ClearSignalPlan>()

method clearDelete(ClearSignalPlan view) =>
    for level in view.priceLines
        line.delete(level)
    for connector in view.connectors
        line.delete(connector)
    for tag in view.priceLabels
        label.delete(tag)
    box.delete(view.riskArea)
    box.delete(view.rewardArea)

method clearRender(ClearSignalPlan view, float visibleHigh, float visibleLow) =>
    int stepMs = int(timeframe.in_seconds() * 1000)
    float top = math.max(nz(visibleHigh, high), array.max(view.prices))
    float bottom = math.min(nz(visibleLow, low), array.min(view.prices))
    float gap = clearSpaceLabels ? math.max(syminfo.mintick * 2, (top - bottom) * 0.026) : 0
    array<float> placed = array.copy(view.prices)
    array<int> ascending = view.direction == 1 ? array.from(1, 0, 2, 3, 4) : array.from(4, 3, 2, 0, 1)
    float previousY = na
    for index in ascending
        float price = array.get(view.prices, index)
        float captionY = na(previousY) ? price : math.max(price, previousY + gap)
        array.set(placed, index, captionY)
        previousY := captionY
    // Center the spaced group around the original price range; connectors retain exact levels.
    float shift = (array.max(placed) - array.max(view.prices)) / 2
    array<string> names = array.from((view.direction == 1 ? 'BUY' : 'SELL') + ' Entry ', 'SL ', 'TP1 ', 'TP2 ', 'TP3 ')
    for index = 0 to 4
        line level = array.get(view.priceLines, index)
        line connector = array.get(view.connectors, index)
        label tag = array.get(view.priceLabels, index)
        float price = array.get(view.prices, index)
        float captionY = array.get(placed, index) - shift
        int labelTime = view.endTime + stepMs * 2
        line.set_x2(level, view.endTime)
        line.set_style(level, view.isOpen ? line.style_solid : line.style_dashed)
        line.set_xy1(connector, view.endTime, price)
        line.set_xy2(connector, labelTime, captionY)
        label.set_xy(tag, labelTime, captionY)
        string suffix = index == 0 and not view.isOpen ? ' · ' + view.terminal : ''
        label.set_text(tag, array.get(names, index) + priceText(price) + suffix)
    if not na(view.riskArea)
        box.set_right(view.riskArea, view.endTime)
        box.set_right(view.rewardArea, view.endTime)

// Freeze an ended plan instead of stretching yesterday's risk box to the current candle.
if barstate.isconfirmed and array.size(clearPlans) > 0
    ClearSignalPlan latestView = array.last(clearPlans)
    if latestView.isOpen
        int minimumEnd = latestView.startTime + int(timeframe.in_seconds() * 1000) * clearLevelBars
        latestView.endTime := math.max(minimumEnd, time_close)
        if newSignal or not (active or pending)
            latestView.isOpen := false
            bool cancelledPlan = not newSignal and (status == 'EXPIRED' or str.startswith(status, 'INVALIDATED'))
            latestView.terminal := cancelledPlan ? statusName(status) : 'ENDED'

if newSignal and showTrade and (active or pending or not useBroker)
    clearPlanTime := signalTime
    clearPlanSide := dir == 1 ? 'BUY' : 'SELL'
    clearPlanModule := selectedStrategy
    array<float> planPrices = array.from(entry, stop, tp1, tp2, tp3)
    array<bool> visiblePrices = array.from(showEntryLine, showSLLine, showTP1Line, showTP2Line, showTP3Line)
    array<line> planLines = array.new<line>()
    array<line> planConnectors = array.new<line>()
    array<label> planLabels = array.new<label>()
    int projectedEnd = time + int(timeframe.in_seconds() * 1000) * clearLevelBars
    box riskArea = na
    box rewardArea = na
    if showRiskReward
        riskArea := box.new(time, math.max(entry, stop), projectedEnd, math.min(entry, stop), xloc=xloc.bar_time, bgcolor=color.new(color.red, 88), border_color=color.new(color.red, 65))
        rewardArea := box.new(time, math.max(entry, tp3), projectedEnd, math.min(entry, tp3), xloc=xloc.bar_time, bgcolor=color.new(color.green, 88), border_color=color.new(color.green, 65))
    for index = 0 to 4
        float price = array.get(planPrices, index)
        color levelColor = index == 0 ? color.rgb(110, 116, 125) : index == 1 ? color.rgb(239, 68, 68) : color.rgb(47, 158, 68)
        bool visible = array.get(visiblePrices, index)
        array.push(planLines, line.new(time, price, projectedEnd, price, xloc=xloc.bar_time, color=visible ? levelColor : na, width=1))
        array.push(planConnectors, line.new(projectedEnd, price, projectedEnd, price, xloc=xloc.bar_time, color=visible ? levelColor : na))
        array.push(planLabels, label.new(projectedEnd, price, '', xloc=xloc.bar_time, style=label.style_label_left, color=visible ? levelColor : na, textcolor=visible ? color.white : na, size=chartText))
    array.push(clearPlans, ClearSignalPlan.new(planLines, planConnectors, planLabels, planPrices, riskArea, rewardArea, time, projectedEnd, dir, active or pending, selectedStrategy, 'ENDED'))
    if array.size(clearPlans) > clearPlanLimit
        ClearSignalPlan oldestView = array.shift(clearPlans)
        oldestView.clearDelete()

if barstate.islast or barstate.islastconfirmedhistory
    for view in clearPlans
        bool visiblePlan = view.isOpen or showLastPlan
        if visiblePlan
            view.clearRender(clearVisibleHigh, clearVisibleLow)
        else
            view.clearDelete()
// CLEAR_SIGNAL_DRAWINGS_END
