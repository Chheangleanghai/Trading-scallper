// REVIEW_BADGE_BEGIN — never creates plans, orders or alerts.
var table reviewBadge = table.new(position.top_right, 2, 12, frame_color=color.rgb(100, 116, 139), frame_width=1, bgcolor=color.rgb(42, 48, 60))
if barstate.islast or barstate.islastconfirmedhistory
    table.clear(reviewBadge, 0, 0, 1, 11)
    if clearShowPriceCard
        bool hasPlan = showTrade and not na(clearPlanTime) and (active or pending or showLastPlan)
        bool livePlan = hasPlan and (active or pending)
        bool closedPlan = hasPlan and not livePlan and reviewOutcome.planTime == clearPlanTime
        string planState = livePlan ? clearPlanSide + (pending ? ' · pending' : useBroker ? ' · simulated' : ' · estimate') : 'WAIT' + (hasPlan ? ' · previous ' + clearPlanSide : '')
        string closeCaption = closedPlan ? reviewCloseCaption(reviewOutcome.code, useBroker) + ' ' + str.format_time(reviewOutcome.closeTime, 'HH:mm', 'UTC') + ' UTC' : hasPlan and not livePlan ? 'Ended; reason unavailable' : 'No closed current plan'
        if closedPlan and useBroker and not na(reviewOutcome.net)
            closeCaption += ' · ' + (reviewOutcome.net >= 0 ? '+' : '') + str.tostring(reviewOutcome.net, '#.##') + ' ' + reviewOutcome.accountCurrency
        string execution = pending ? 'Awaiting fill · not executed' : useBroker ? 'Emulator' + (hasPlan ? ' fill ' + priceText(filledEntry) : '') : 'Indicator estimate · no broker fill'
        array<string> keys = array.from('SMART SCALPER · ' + timeframe.period + 'm', 'Why / last close', 'Concept / signal UTC', 'Entry planned', 'Initial SL', 'TP1', 'TP2', 'TP3', 'Target method', 'Last plan outcome', 'Execution model', 'Session / plans')
        array<string> values = array.from(planState, decisionReason, hasPlan ? reviewModuleName(clearPlanModule) + ' · ' + str.format_time(clearPlanTime, 'dd MMM HH:mm', 'UTC') : 'Waiting for a confirmed concept', hasPlan and showEntryLine ? priceText(entry) : '—', hasPlan and showSLLine ? priceText(stop) : '—', hasPlan and showTP1Line ? priceText(tp1) : '—', hasPlan and showTP2Line ? priceText(tp2) : '—', hasPlan and showTP3Line ? priceText(tp3) : '—', hasPlan ? targetSource : '—', closeCaption, execution, sessionPreset + (inSession ? ' open' : ' closed') + ' · ' + str.tostring(sessionTrades) + '/' + str.tostring(maxTrades))
        for row = 0 to 11
            color valueColor = not livePlan and row >= 3 and row <= 7 ? color.rgb(180, 190, 205) : row == 4 ? color.rgb(255, 130, 130) : row >= 5 and row <= 7 ? color.rgb(115, 225, 145) : color.white
            table.cell(reviewBadge, 0, row, array.get(keys, row), text_color=color.rgb(180, 190, 205), text_size=panelText, bgcolor=color.rgb(42, 48, 60), text_halign=text.align_left)
            table.cell(reviewBadge, 1, row, array.get(values, row), text_color=valueColor, text_size=panelText, bgcolor=row == 0 ? color.rgb(63, 71, 86) : color.rgb(42, 48, 60), text_halign=text.align_right)
// REVIEW_BADGE_END
