// Read-only snapshots for the existing M5 mismatch windows; no candidate mutation.
traceInteger(int value) => na(value) ? 'null' : str.tostring(value)
tracePrice(float value) => na(value) ? 'null' : str.tostring(value, format.mintick)
traceBoolean(bool value) => value ? 'true' : 'false'
// Capture boundaries below are UTC epoch milliseconds.
traceWindow(int barOpen) =>
    bool octoberEight = barOpen >= 1791441000000 and barOpen < 1791451800000
    bool octoberNine = barOpen >= 1791529200000 and barOpen < 1791550800000
    bool octoberNineteen = barOpen >= 1792402200000 and barOpen < 1792409400000
    bool octoberTwentyOne = barOpen >= 1792573200000 and barOpen < 1792589400000
    bool octoberTwentyTwo = (barOpen >= 1792655100000 and barOpen < 1792659600000) or (barOpen >= 1792681200000 and barOpen < 1792684800000)
    bool novemberThree = barOpen >= 1793692800000 and barOpen < 1793696400000
    octoberEight or octoberNine or octoberNineteen or octoberTwentyOne or octoberTwentyTwo or novemberThree

researchCandidateTrace(string phase, bool cancelling) =>
    if auditLog and timeframe.isminutes and timeframe.multiplier == 5 and barstate.isconfirmed and traceWindow(time)
        string prefix = '{"traceVersion":"1","variant":"' + TRACE_VARIANT + '","parentSha256":"' + TRACE_PARENT_SHA + '","symbol":"' + jsonEscape(syminfo.tickerid) + '","timeframe":"' + timeframe.period + '","barOpen":' + str.tostring(time) + ',"barClose":' + str.tostring(time_close) + ',"barIndex":' + str.tostring(bar_index) + ',"phase":"' + phase + '"'
        log.info('ENGINE_TRACE ' + prefix + ',"useBroker":' + traceBoolean(useBroker) + ',"active":' + traceBoolean(active) + ',"pending":' + traceBoolean(pending) + ',"brokerBusy":' + traceBoolean(brokerBusy) + ',"cancelling":' + traceBoolean(cancelling) + ',"planSlotAvailable":' + traceBoolean(planSlotAvailable(active, pending, brokerBusy, cancelling)) + ',"sessionTrades":' + str.tostring(sessionTrades) + ',"quotaLimit":' + str.tostring(maxTrades) + ',"lastSignalBar":' + traceInteger(lastSignal) + ',"cooldownBars":' + str.tostring(cooldown) + ',"status":"' + jsonEscape(status) + '","validationReason":"' + jsonEscape(validationReason) + '","aStage":' + str.tostring(stage) + ',"direction":' + str.tostring(dir) + ',"selectedStrategy":"' + selectedStrategy + '","crtUsed":' + traceInteger(memory.crtUsed) + ',"turtleUsedLow":' + traceInteger(memory.turtleUsedLow) + ',"turtleUsedHigh":' + traceInteger(memory.turtleUsedHigh) + ',"swingHighBar":' + traceInteger(shBar) + ',"swingLowBar":' + traceInteger(slBar) + '}')
        for candidate in candidates
            log.info('CANDIDATE_TRACE ' + prefix + ',"id":"' + candidate.id + '","enabled":' + traceBoolean(candidate.enabled) + ',"stage":' + str.tostring(candidate.stage) + ',"direction":' + str.tostring(candidate.direction) + ',"setupBar":' + traceInteger(candidate.setupBar) + ',"setupTimestamp":' + traceInteger(candidate.setupTime) + ',"confirmationTimestamp":' + traceInteger(candidate.confirmationTime) + ',"readyBar":' + traceInteger(candidate.readyBar) + ',"ready":' + traceBoolean(candidate.ready) + ',"status":"' + jsonEscape(candidate.status) + '","mode":"' + jsonEscape(candidate.mode) + '","lower":' + tracePrice(candidate.lower) + ',"upper":' + tracePrice(candidate.upper) + ',"trigger":' + tracePrice(candidate.trigger) + ',"invalidation":' + tracePrice(candidate.invalidation) + ',"tests":' + str.tostring(candidate.tests) + ',"quality":' + str.tostring(candidate.quality) + ',"rejectionReason":"' + jsonEscape(candidate.rejectionReason) + '"}')
    0
