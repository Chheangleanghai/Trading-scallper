// SESSION_PLAN_LABELS_BEGIN — presentation only; no candidate/order/alert mutations.
var array<line> sessionBoundaryLines = array.new<line>()
var array<label> sessionBoundaryTags = array.new<label>()
var array<label> selectedConceptTags = array.new<label>()

drawSessionBoundary(int boundaryTime, string caption, string localZone, color hue) =>
    line marker = line.new(boundaryTime, low, boundaryTime, high, xloc=xloc.bar_time, extend=extend.both, color=color.new(hue, 72), style=line.style_dotted)
    string clock = str.format_time(boundaryTime, 'HH:mm', LADDER_DISPLAY_ZONE) + ' WIB'
    label tag = label.new(boundaryTime, high + nz(atr, high - low) * 1.8, caption + '\n' + clock, xloc=xloc.bar_time, style=label.style_label_down, color=color.new(hue, 88), textcolor=hue, size=size.tiny)
    label.set_tooltip(tag, caption + '\n' + str.format_time(boundaryTime, 'dd MMM yyyy HH:mm', localZone) + ' ' + localZone + '\n' + clock + '\nSession context only; does not enable a trading session or confirm a signal.')
    array.push(sessionBoundaryLines, marker)
    array.push(sessionBoundaryTags, tag)
    if array.size(sessionBoundaryLines) > sessionBoundaryLimit
        line.delete(array.shift(sessionBoundaryLines))
        label.delete(array.shift(sessionBoundaryTags))
    0

drawSessionClocks(bool inside, string caption, string localZone, int openHour, int closeHour, color hue) =>
    // Only actual boundary candles are marked. Do not turn a data gap into a false session open.
    bool opens = inside and hour(time, localZone) == openHour and minute(time, localZone) == 0
    // Draw the close at the last inside candle's close, including the final Friday candle.
    bool closes = inside and hour(time_close, localZone) == closeHour and minute(time_close, localZone) == 0
    if opens
        drawSessionBoundary(time, caption + ' OPEN', localZone, hue)
    if showSessionEndMarkers and closes
        drawSessionBoundary(time_close, caption + ' CLOSE', localZone, hue)
    0

if barstate.isconfirmed and showSessionBoundaryMarkers
    if markAsianSession
        drawSessionClocks(asianSession, 'ASIA / TOKYO', 'Asia/Tokyo', 9, 18, color.rgb(126, 87, 194))
    if markLondonSession
        drawSessionClocks(londonSession, 'LONDON', 'Europe/London', 8, 17, color.rgb(30, 115, 190))
    if markNewYorkSession
        drawSessionClocks(newYorkSession, 'NEW YORK', 'America/New_York', 8, 17, color.rgb(184, 112, 20))

// Label only the selected, risk-checked plan. SETUP/trigger-only candidates are not entry signals.
if barstate.isconfirmed and showSelectedConceptLabel and showTrade and newSignal and (active or pending or not useBroker)
    color conceptHue = dir == 1 ? color.rgb(21, 128, 61) : color.rgb(185, 28, 28)
    string planStateCaption = pending ? ' plan pending' : ' plan confirmed'
    string conceptText = reviewModuleName(selectedStrategy) + ' · ' + (dir == 1 ? 'BUY' : 'SELL') + planStateCaption
    string planClock = str.format_time(signalTime, 'HH:mm', LADDER_DISPLAY_ZONE) + ' WIB'
    float conceptY = dir == 1 ? low - nz(atr, high - low) * 0.6 : high + nz(atr, high - low) * 0.6
    label conceptTag = label.new(time, conceptY, conceptText + '\n' + timeframe.period + 'm · ' + planClock, xloc=xloc.bar_time, style=dir == 1 ? label.style_label_up : label.style_label_down, color=color.new(conceptHue, 88), textcolor=conceptHue, size=size.tiny)
    label.set_tooltip(conceptTag, selectedStrategy + '\n' + signalReason + '\nPlan confirmed at ' + str.format_time(signalTime, 'dd MMM yyyy HH:mm', LADDER_DISPLAY_ZONE) + ' WIB\nEntry ' + priceText(entry) + ' | SL ' + priceText(stop) + '\nTP1 ' + priceText(tp1) + ' | TP2 ' + priceText(tp2) + ' | TP3 ' + priceText(tp3) + '\nQualified plan; broker execution is a separate event.')
    array.push(selectedConceptTags, conceptTag)
    if array.size(selectedConceptTags) > selectedConceptLabelLimit
        label.delete(array.shift(selectedConceptTags))
// SESSION_PLAN_LABELS_END
