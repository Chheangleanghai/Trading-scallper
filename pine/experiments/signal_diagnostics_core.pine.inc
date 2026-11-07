// Diagnostic state is separate from every trading Candidate and broker state.
diagMode = input.string('Off', 'Research diagnostics', options=['Off', 'Events', 'Events + dashboard'], group='Research diagnostics')
diagRunTag = input.string('research-1', 'Run tag', group='Research diagnostics')
diagCaptureInput = input.string('capture-2026-11-07-01', 'Unique capture ID (change for every run)', group='Research diagnostics')
diagStart = input.time(timestamp('06 Nov 2026 14:00 +0000'), 'Diagnostic window start (bar open, inclusive)', group='Research diagnostics')
diagEnd = input.time(timestamp('06 Nov 2026 17:00 +0000'), 'Diagnostic window end (bar open, exclusive)', group='Research diagnostics')
diagBudget = input.int(4000, 'Maximum diagnostic events (plus end record)', minval=100, maxval=6000, group='Research diagnostics')
diagEscape(string value) => str.replace_all(str.replace_all(str.replace_all(value, '\\', '\\\\'), '"', '\\"'), '\n', ' ')
diagNum(float value) => na(value) ? 'null' : str.tostring(value, '#.################')
diagInt(int value) => na(value) ? 'null' : str.tostring(value)
diagBool(bool value) => value ? 'true' : 'false'
diagQ(string value) => '"' + diagEscape(value) + '"'
diagInside() => diagMode != 'Off' and barstate.isconfirmed and diagEnd > diagStart and time >= diagStart and time < diagEnd
diagCandidateId(string module, int direction, int detected) => na(detected) ? '' : syminfo.tickerid + ':' + timeframe.period + ':' + module + ':' + str.tostring(direction) + ':' + str.tostring(detected)
diagPlanId(string module, int planned) => na(planned) ? '' : syminfo.tickerid + ':' + timeframe.period + ':' + module + ':' + str.tostring(planned)
type DiagnosticLedger
    int sequence = 0
    int dropped = 0
    int attempted = 0
    int bars = 0
    int firstBar = na
    int lastBar = na
    bool started = false
    bool ended = false
    bool detectionEvaluated = false
    string planCandidate = ''
    string plan = ''
    string position = ''
    float plannedCashRisk = na
    float closedQty = 0
    float net = 0
    float commission = 0
    int rows = 0
var DiagnosticLedger diagnosticLedger = DiagnosticLedger.new()
// timenow differentiates separate script executions; the explicit capture input distinguishes
// simultaneous instances started in the same millisecond with otherwise identical settings.
var string diagnosticCaptureId = diagCaptureInput + ':' + str.tostring(timenow)
var int diagnosticFirstDataTime = time
var array<string> diagnosticQualified = array.new<string>()
var array<string> diagnosticQualifiedModules = array.new<string>()
var array<string> diagnosticLastBlock = array.new<string>(9, 'Not evaluated')
var array<string> diagnosticSelection = array.new<string>(9, 'NOT_EVALUATED')
var array<string> diagnosticLastPlanIds = array.new<string>(9, '')
diagEnvelope(string kind, string module, string candidate, string body) =>
    string captureIdentity = '["signal-diagnostics/v2",' + diagQ(diagnosticCaptureId) + ',' + diagQ(syminfo.tickerid) + ',' + diagQ(timeframe.period) + ',' + diagQ(DIAGNOSTIC_PARENT_SHA) + ',' + diagQ(diagRunTag) + ',' + str.tostring(diagnosticLedger.sequence) + ']'
    '{"schema":"signal-diagnostics/v2","runTag":' + diagQ(diagRunTag) + ',"captureId":' + diagQ(diagnosticCaptureId) + ',"parentSha256":' + diagQ(DIAGNOSTIC_PARENT_SHA) + ',"model":' + diagQ(useBroker ? 'STRATEGY_EMULATOR' : 'INDICATOR_ESTIMATE') + ',"symbol":' + diagQ(syminfo.tickerid) + ',"timeframe":' + diagQ(timeframe.period) + ',"windowStart":' + str.tostring(diagStart) + ',"windowEnd":' + str.tostring(diagEnd) + ',"firstDataTime":' + str.tostring(diagnosticFirstDataTime) + ',"sequence":' + str.tostring(diagnosticLedger.sequence) + ',"eventId":' + diagQ(captureIdentity) + ',"kind":' + diagQ(kind) + ',"module":' + diagQ(module) + ',"candidateId":' + diagQ(candidate) + ',"bar":' + str.tostring(bar_index) + ',"barOpen":' + str.tostring(time) + ',"observedAt":' + str.tostring(time_close) + body + '}'
diagEmit(string kind, string module, string candidate, string body) =>
    if diagInside() and diagnosticLedger.started and not diagnosticLedger.ended
        diagnosticLedger.attempted += 1
        if diagnosticLedger.sequence < diagBudget
            diagnosticLedger.sequence += 1
            log.info('SIGNAL_DIAG ' + diagEnvelope(kind, module, candidate, body))
        else
            diagnosticLedger.dropped += 1
    0
diagStartBar() =>
    array.clear(diagnosticQualified)
    array.clear(diagnosticQualifiedModules)
    for index = 0 to array.size(diagnosticLastBlock) - 1
        array.set(diagnosticLastBlock, index, 'Not evaluated on this bar')
        array.set(diagnosticSelection, index, 'NOT_EVALUATED')
    if diagInside()
        if not diagnosticLedger.started
            diagnosticLedger.started := true
            diagnosticLedger.firstBar := bar_index
            diagEmit('CAPTURE_START', '', '', ',"budget":' + str.tostring(diagBudget) + ',"enabled":[' + diagBool(enableA) + ',' + diagBool(enableB) + ',' + diagBool(enableC) + ',' + diagBool(enableD) + ',' + diagBool(enableE) + ',' + diagBool(enableF) + ',' + diagBool(enableG) + ',' + diagBool(enableH) + ']')
        diagnosticLedger.bars += 1
        diagnosticLedger.lastBar := bar_index
        diagEmit('BAR', '', '', '')
    0
diagFinish() =>
    if diagMode != 'Off' and barstate.isconfirmed and diagnosticLedger.started and not diagnosticLedger.ended and time >= diagEnd
        diagnosticLedger.sequence += 1
        log.info('SIGNAL_DIAG ' + diagEnvelope('CAPTURE_END', '', '', ',"budgetComplete":' + diagBool(diagnosticLedger.dropped == 0) + ',"dropped":' + str.tostring(diagnosticLedger.dropped) + ',"attempted":' + str.tostring(diagnosticLedger.attempted) + ',"observedBars":' + str.tostring(diagnosticLedger.bars) + ',"firstBar":' + diagInt(diagnosticLedger.firstBar) + ',"lastBar":' + diagInt(diagnosticLedger.lastBar) + ',"endReason":"WINDOW_END"'))
        diagnosticLedger.ended := true
    0
diagDetected(string module, int direction, int detected, int detectedBar, float trigger, float invalidation) =>
    string cid = diagCandidateId(module, direction, detected)
    string body = ',"setupTime":' + diagInt(detected) + ',"setupBar":' + diagInt(detectedBar) + ',"direction":' + str.tostring(direction) + ',"trigger":' + diagNum(trigger) + ',"invalidation":' + diagNum(invalidation)
    diagEmit('SETUP_DETECTED', module, cid, body)
    diagEmit('STAGE_REACHED', module, cid, ',"stage":1')
    0
diagLifecycle(string kind, string module, int planned, int setup, int direction, float price, int actualTime, int actualBar, float quantity) =>
    string cid = diagCandidateId(module, direction, setup)
    string pid = diagPlanId(module, planned)
    diagEmit(kind, module, cid, ',"planId":' + diagQ(pid) + ',"orderId":' + diagQ(pid + ':ENTRY') + ',"actualTime":' + diagInt(actualTime) + ',"actualBar":' + diagInt(actualBar) + ',"price":' + diagNum(price) + ',"quantity":' + diagNum(quantity) + ',"positionId":' + diagQ(kind == 'FILLED' or kind == 'ESTIMATE_FILLED' ? pid + ':' + diagInt(actualTime) : ''))
    0
