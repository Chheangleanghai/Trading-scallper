// CLEAR_SIGNAL_BADGE_BEGIN — never creates plans, orders or alerts.
var table clearSignalBadge = table.new(position.top_right, 2, 10, frame_color=color.rgb(71, 85, 105), frame_width=1, bgcolor=color.rgb(42, 48, 60))
if barstate.islast or barstate.islastconfirmedhistory
    table.clear(clearSignalBadge, 0, 0, 1, 9)
    if clearShowPriceCard
        bool hasPlan = showTrade and not na(clearPlanTime) and (active or pending or showLastPlan)
        string planState = not hasPlan ? 'WAIT · no qualified plan' : pending ? clearPlanSide + ' READY · pending' : active ? clearPlanSide + (useBroker ? ' · simulated' : ' · estimate') : 'PREVIOUS ' + clearPlanSide + ' · ENDED'
        string executionCaption = pending ? 'Qualified plan · awaiting fill' : active ? (useBroker ? 'Strategy emulator position' : 'Indicator fill estimate') : decisionReason
        string context = (hTrend == 1 ? 'Bullish' : hTrend == -1 ? 'Bearish' : 'Neutral') + ' / ' + (mTrend == 1 ? 'Bullish' : mTrend == -1 ? 'Bearish' : 'Neutral')
        array<string> cardKeys = array.from('SMART SCALPER · ' + timeframe.period + 'm', 'Now', 'H1 / M15', 'Session', 'Signal close UTC', 'Entry planned', 'Stop loss', 'TP1', 'TP2', 'TP3')
        array<string> cardValues = array.from(planState, executionCaption, context, sessionPreset + (inSession ? ' · open' : ' · closed'), hasPlan ? str.substring(clearPlanModule, 0, 1) + ' · ' + str.format_time(clearPlanTime, 'dd MMM HH:mm', 'UTC') : 'Waiting for confirmation', hasPlan and showEntryLine ? priceText(entry) : '—', hasPlan and showSLLine ? priceText(stop) : '—', hasPlan and showTP1Line ? priceText(tp1) : '—', hasPlan and showTP2Line ? priceText(tp2) : '—', hasPlan and showTP3Line ? priceText(tp3) : '—')
        for row = 0 to 9
            color valueColor = row == 6 ? color.rgb(255, 112, 112) : row >= 7 ? color.rgb(100, 225, 130) : color.white
            table.cell(clearSignalBadge, 0, row, array.get(cardKeys, row), text_color=color.rgb(180, 190, 205), text_size=panelText, bgcolor=color.rgb(42, 48, 60), text_halign=text.align_left)
            table.cell(clearSignalBadge, 1, row, array.get(cardValues, row), text_color=valueColor, text_size=panelText, bgcolor=row == 0 ? color.rgb(63, 71, 86) : color.rgb(42, 48, 60), text_halign=text.align_right)
// CLEAR_SIGNAL_BADGE_END
