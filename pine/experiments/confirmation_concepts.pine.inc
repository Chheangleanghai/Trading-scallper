// REVIEW_CONCEPT_VIEW_BEGIN — reads candidate state; never confirms or submits a trade.
reviewNeeded(Candidate c, int currentStage) =>
    str.startswith(c.id, 'A_') ? (currentStage == 1 ? 'Need later MSS + FVG' : 'Need later FVG retest') : str.startswith(c.id, 'G_') ? 'Need displaced range break' : str.startswith(c.id, 'E_') or str.startswith(c.id, 'H_') or (str.startswith(c.id, 'D_') and c.mode == 'Breakout retest') ? 'Need later directional retest' : 'Need later directional trigger close'
reviewShort(string value) => str.length(value) > 62 ? str.substring(value, 0, 59) + '…' : value
var array<box> reviewZones = array.new<box>()
var array<line> reviewTriggers = array.new<line>()
var array<line> reviewInvalidations = array.new<line>()
var array<label> reviewGuideTags = array.new<label>()
var array<line> reviewQmLines = array.new<line>()
if barstate.isfirst
    for index = 0 to 8
        array.push(reviewZones, box.new(time, close, time, close, xloc=xloc.bar_time, bgcolor=na, border_color=na))
        array.push(reviewTriggers, line.new(time, close, time, close, xloc=xloc.bar_time, color=na, style=line.style_dashed))
        array.push(reviewInvalidations, line.new(time, close, time, close, xloc=xloc.bar_time, color=na, style=line.style_dotted))
        array.push(reviewGuideTags, label.new(time, close, '', xloc=xloc.bar_time, style=label.style_label_left, color=na, textcolor=na, size=size.tiny))
    for index = 0 to 3
        array.push(reviewQmLines, line.new(bar_index, close, bar_index, close, color=na, style=line.style_dashed))

var table reviewBoard = table.new(position.bottom_right, 3, 10, frame_color=color.rgb(148, 163, 184), frame_width=1, bgcolor=color.new(color.white, 8))
var int reviewDecisionTime = na
if barstate.isconfirmed
    reviewDecisionTime := time_close
if barstate.islast or barstate.islastconfirmedhistory
    table.clear(reviewBoard, 0, 0, 2, 9)
    for index = 0 to array.size(candidates) - 1
        Candidate c = array.get(candidates, index)
        int currentStage = index == 0 ? stage : c.stage
        bool visibleGuide = reviewShowGuides and c.enabled and currentStage > 0 and not (active or pending or brokerBusy)
        float lower = index == 0 ? (stage == 1 ? math.min(extreme, breakLevel) : gapBottom) : c.lower
        float upper = index == 0 ? (stage == 1 ? math.max(extreme, breakLevel) : gapTop) : c.upper
        float trigger = index == 0 ? (stage == 1 ? breakLevel : dir == 1 ? gapTop : gapBottom) : c.trigger
        float invalidation = index == 0 ? extreme : c.invalidation
        int start = index == 0 ? setupTime : c.setupTime
        color guideColor = index == 0 ? color.teal : index == 1 ? color.orange : index == 2 ? color.purple : index == 3 ? color.blue : index == 4 or index == 5 ? color.rgb(30, 130, 115) : index == 6 ? color.rgb(80, 105, 190) : index == 7 ? color.rgb(130, 85, 170) : color.fuchsia
        box zone = array.get(reviewZones, index)
        line triggerLine = array.get(reviewTriggers, index)
        line invalidLine = array.get(reviewInvalidations, index)
        label guideTag = array.get(reviewGuideTags, index)
        bool knownGuide = visibleGuide and not na(start) and not na(lower) and not na(upper) and upper >= lower
        box.set_bgcolor(zone, knownGuide ? color.new(guideColor, 94) : na)
        box.set_border_color(zone, knownGuide ? color.new(guideColor, 65) : na)
        line.set_color(triggerLine, knownGuide and not na(trigger) ? color.new(guideColor, 20) : na)
        line.set_color(invalidLine, knownGuide and not na(invalidation) ? color.new(color.red, 55) : na)
        label.set_text(guideTag, knownGuide ? reviewModuleName(c.id) + ' · SETUP ONLY' : '')
        label.set_textcolor(guideTag, knownGuide ? guideColor : na)
        label.set_color(guideTag, knownGuide ? color.new(color.white, 18) : na)
        if knownGuide
            int right = time_close + int(timeframe.in_seconds() * 1000) * 8
            box.set_lefttop(zone, start, upper)
            box.set_rightbottom(zone, right, lower)
            line.set_xy1(triggerLine, start, trigger)
            line.set_xy2(triggerLine, right, trigger)
            line.set_xy1(invalidLine, start, invalidation)
            line.set_xy2(invalidLine, right, invalidation)
            label.set_xy(guideTag, right, upper)
    bool qmKnown = reviewShowGuides and array.size(reviewQmBars) == 5 and array.size(reviewQmPrices) == 5 and (candH.stage > 0 or ((active or pending) and selectedStrategy == 'H_QUASIMODO' and reviewQm.setupTime == signalSetupTime))
    if qmKnown
        qmKnown := bar_index - array.get(reviewQmBars, 0) <= 1000
    for index = 0 to 3
        line segment = array.get(reviewQmLines, index)
        line.set_color(segment, qmKnown ? color.new(color.fuchsia, 35) : na)
        if qmKnown
            // X coordinates are pivot confirmation bars, not backdated pivot candles.
            line.set_xy1(segment, array.get(reviewQmBars, index), array.get(reviewQmPrices, index))
            line.set_xy2(segment, array.get(reviewQmBars, index + 1), array.get(reviewQmPrices, index + 1))
    if reviewShowBoard
        array<string> headers = array.from('A–H · last closed bar', 'State', 'Next confirmation / block')
        for col = 0 to 2
            table.cell(reviewBoard, col, 0, array.get(headers, col), text_color=color.rgb(30, 41, 59), text_size=size.tiny, bgcolor=color.rgb(226, 232, 240), text_halign=text.align_left)
        for module = 0 to 7
            int index = module <= 4 ? module : module + 1
            Candidate c = array.get(candidates, index)
            if module == 4 and (candSupply.ready or (candSupply.stage > 0 and candDemand.stage == 0))
                c := candSupply
            int currentStage = module == 0 ? stage : c.stage
            bool selected = (active or pending or brokerBusy) and str.substring(selectedStrategy, 0, 1) == str.substring(c.id, 0, 1)
            bool checked = c.ready and c.confirmationTime == reviewDecisionTime
            string stateCaption = not c.enabled ? 'OFF' : selected ? (pending ? 'PLAN PENDING' : 'PLAN ACTIVE') : checked ? (c.rejectionReason == '' ? 'TRIGGER ✓' : 'BLOCKED') : currentStage > 0 ? 'SETUP' : 'WAIT'
            string detail = not c.enabled ? 'Disabled in inputs' : selected ? signalReason : checked ? (c.rejectionReason == '' ? 'Qualified directions need arbitration' : c.rejectionReason) : currentStage > 0 ? ((active or pending or brokerBusy) ? 'Plan slot occupied' : reviewNeeded(c, currentStage)) : c.status == 'EXPIRED' or c.status == 'INVALIDATED' ? 'Last setup ' + str.lower(c.status) : 'Need a new confirmed setup'
            color rowBackground = module % 2 == 0 ? color.rgb(250, 252, 255) : color.rgb(241, 245, 249)
            table.cell(reviewBoard, 0, module + 1, reviewModuleName(c.id), text_color=color.rgb(51, 65, 85), text_size=size.tiny, bgcolor=rowBackground, text_halign=text.align_left)
            table.cell(reviewBoard, 1, module + 1, stateCaption, text_color=selected ? color.rgb(21, 128, 61) : checked ? color.rgb(146, 64, 14) : color.rgb(71, 85, 105), text_size=size.tiny, bgcolor=rowBackground, text_halign=text.align_left)
            table.cell(reviewBoard, 2, module + 1, reviewShort(detail), text_color=color.rgb(71, 85, 105), text_size=size.tiny, bgcolor=rowBackground, text_halign=text.align_left)
        table.cell(reviewBoard, 0, 9, 'Context ≠ entry', text_color=color.rgb(71, 85, 105), text_size=size.tiny, bgcolor=color.rgb(226, 232, 240))
        table.cell(reviewBoard, 1, 9, 'H1 ' + (hTrend == 1 ? '↑' : hTrend == -1 ? '↓' : '—') + ' / M15 ' + (mTrend == 1 ? '↑' : mTrend == -1 ? '↓' : '—'), text_color=color.rgb(71, 85, 105), text_size=size.tiny, bgcolor=color.rgb(226, 232, 240))
        table.cell(reviewBoard, 2, 9, reviewShort(decisionReason), text_color=color.rgb(71, 85, 105), text_size=size.tiny, bgcolor=color.rgb(226, 232, 240), text_halign=text.align_left)
// REVIEW_CONCEPT_VIEW_END
