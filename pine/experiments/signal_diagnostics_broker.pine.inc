// Reuse the actual closedtrades rows; no inferred OHLC fills and no new orders.
var array<int> diagnosticSeenRows = array.new<int>()
diagReadExit(int row) =>
    if diagInside() and not array.includes(diagnosticSeenRows, row)
        if array.size(diagnosticSeenRows) < diagBudget
            array.push(diagnosticSeenRows, row)
        string module = strategy.closedtrades.entry_id(row)
        int entered = strategy.closedtrades.entry_time(row)
        string pid = diagPlanId(module, signalTime)
        float net = strategy.closedtrades.profit(row)
        float fee = strategy.closedtrades.commission(row)
        float size = strategy.closedtrades.size(row)
        float ep = strategy.closedtrades.entry_price(row)
        float xp = strategy.closedtrades.exit_price(row)
        diagEmit('EXIT_ROW', module, diagCandidateId(module, dir, signalSetupTime), ',"planId":' + diagQ(pid) + ',"positionId":' + diagQ(pid + ':' + str.tostring(entered)) + ',"rowIndex":' + str.tostring(row) + ',"entryTime":' + str.tostring(entered) + ',"entryBar":' + str.tostring(strategy.closedtrades.entry_bar_index(row)) + ',"exitTime":' + str.tostring(strategy.closedtrades.exit_time(row)) + ',"historicalBackfill":' + diagBool(strategy.closedtrades.exit_time(row) < diagStart) + ',"exitBar":' + str.tostring(strategy.closedtrades.exit_bar_index(row)) + ',"entryPrice":' + diagNum(ep) + ',"exitPrice":' + diagNum(xp) + ',"signedQuantity":' + diagNum(size) + ',"net":' + diagNum(net) + ',"commission":' + diagNum(fee) + ',"grossAccount":' + diagNum(net + fee) + ',"grossChart":' + diagNum((xp - ep) * size * syminfo.pointvalue) + ',"pointValue":' + diagNum(syminfo.pointvalue) + ',"tickSize":' + diagNum(syminfo.mintick) + ',"accountCurrency":' + diagQ(strategy.account_currency) + ',"chartCurrency":' + diagQ(syminfo.currency) + ',"exitId":' + diagQ(strategy.closedtrades.exit_id(row)) + ',"exitComment":' + diagQ(strategy.closedtrades.exit_comment(row)))
    0
diagClosedPosition() =>
    if diagInside() and strategy.closedtrades > 0
        int last = strategy.closedtrades - 1
        int entered = strategy.closedtrades.entry_time(last)
        string module = strategy.closedtrades.entry_id(last)
        float net = 0
        float fee = 0
        float qty = 0
        int rows = 0
        for row = last to 0
            if strategy.closedtrades.entry_time(row) != entered or strategy.closedtrades.entry_id(row) != module
                break
            diagReadExit(row)
            net += strategy.closedtrades.profit(row)
            fee += strategy.closedtrades.commission(row)
            qty += math.abs(strategy.closedtrades.size(row))
            rows += 1
        string pid = diagPlanId(module, signalTime)
        float initialRisk = diagnosticLedger.plannedCashRisk
        string comment = strategy.closedtrades.exit_comment(last)
        int exited = strategy.closedtrades.exit_time(last)
        bool timed = comment == 'TRADE_CLOSED' and str.startswith(strategy.closedtrades.exit_id(last), 'Close entry(s) order') and timeExit > 0 and exited - entered >= timeExit * 60000
        string cause = comment == 'STOP_LOSS_HIT' ? 'STOP' : timed ? 'TIME_EXIT' : str.startswith(comment, 'TP') ? 'TARGET' : 'UNCLASSIFIED'
        diagEmit('POSITION_CLOSED', module, diagCandidateId(module, dir, signalSetupTime), ',"planId":' + diagQ(pid) + ',"positionId":' + diagQ(pid + ':' + str.tostring(entered)) + ',"entryTime":' + str.tostring(entered) + ',"exitTime":' + str.tostring(exited) + ',"initialQuantity":' + diagNum(initialQty) + ',"closedQuantity":' + diagNum(qty) + ',"exitRows":' + str.tostring(rows) + ',"grossAccount":' + diagNum(net + fee) + ',"commission":' + diagNum(fee) + ',"net":' + diagNum(net) + ',"initialPlannedCashRisk":' + diagNum(initialRisk) + ',"realizedRToPlannedRisk":' + diagNum(initialRisk > 0 ? net / initialRisk : na) + ',"cause":' + diagQ(cause) + ',"accountCurrency":' + diagQ(strategy.account_currency))
    0
