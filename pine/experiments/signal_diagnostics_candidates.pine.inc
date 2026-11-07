diagState(string phase, bool cancelling) =>
    if diagInside()
        if phase == 'BEFORE_UPDATE'
            diagnosticLedger.detectionEvaluated := not active and not pending and not brokerBusy
            diagEmit('ENGINE', '', '', ',"phase":"BEFORE_UPDATE","active":' + diagBool(active) + ',"pending":' + diagBool(pending) + ',"brokerBusy":' + diagBool(brokerBusy) + ',"cancelling":' + diagBool(cancelling) + ',"slotAvailable":' + diagBool(planSlotAvailable(active, pending, brokerBusy, cancelling)) + ',"sessionPlans":' + str.tostring(sessionTrades) + ',"lastSignalBar":' + diagInt(lastSignal))
        for index = 0 to array.size(candidates) - 1
            Candidate c = array.get(candidates, index)
            if c.enabled
                bool a = index == 0
                int currentStage = a ? stage : c.stage
                int direction = a ? dir : c.direction
                int detected = a ? setupTime : c.setupTime
                int detectedBar = a ? setupBar : c.setupBar
                float trigger = a ? (stage == 1 ? breakLevel : direction == 1 ? gapTop : gapBottom) : c.mode == 'Breakout retest' or str.startswith(c.id, 'E_') or str.startswith(c.id, 'H_') ? (direction == 1 ? c.upper : c.lower) : c.trigger
                string cid = currentStage > 0 ? diagCandidateId(c.id, direction, detected) : ''
                bool slot = planSlotAvailable(active, pending, brokerBusy, cancelling)
                string next = currentStage == 0 ? 'Need setup' : c.ready ? 'Trigger passed; safety/arbitration checks' : a and currentStage == 1 ? 'Need later MSS plus displacement and FVG' : a or str.startswith(c.id, 'E_') or str.startswith(c.id, 'H_') or c.mode == 'Breakout retest' ? 'Need later directional retest' : str.startswith(c.id, 'G_') ? 'Need displaced range break' : 'Need later directional trigger close'
                if phase == 'AFTER_UPDATE' and c.ready
                    diagEmit('CONFIRMATION_PASSED', c.id, diagCandidateId(c.id, direction, detected), ',"setupBar":' + diagInt(detectedBar) + ',"setupTime":' + diagInt(detected) + ',"confirmationBar":' + str.tostring(bar_index))
                if phase == 'END_BAR'
                    bool checksEvaluated = array.get(diagnosticLastBlock, index) != 'Not evaluated on this bar'
                    string firstBlocker = checksEvaluated and array.get(diagnosticLastBlock, index) != 'All applicable checks passed' ? diagQ(array.get(diagnosticLastBlock, index)) : 'null'
                    string selection = array.get(diagnosticSelection, index)
                    string selectionBlocker = selection == 'OPPOSING_CONFLICT' ? diagQ('Opposing qualified directions') : selection == 'QUALIFIED_NOT_SELECTED' ? diagQ('Another qualified candidate selected') : 'null'
                    diagEmit('STATE', c.id, cid, ',"stage":' + str.tostring(currentStage) + ',"setupTime":' + diagInt(currentStage > 0 ? detected : na) + ',"setupBar":' + diagInt(currentStage > 0 ? detectedBar : na) + ',"direction":' + str.tostring(currentStage > 0 ? direction : 0) + ',"trigger":' + diagNum(currentStage > 0 ? trigger : na) + ',"invalidation":' + diagNum(currentStage > 0 ? (a ? extreme : c.invalidation) : na) + ',"expiryBarInclusive":' + diagInt(currentStage > 0 ? detectedBar + expiry : na) + ',"nextConfirmation":' + diagQ(next) + ',"active":' + diagBool(active) + ',"pending":' + diagBool(pending) + ',"slotAvailable":' + diagBool(slot) + ',"currentSlotBusy":' + diagBool(not slot) + ',"detectionEvaluated":' + diagBool(diagnosticLedger.detectionEvaluated) + ',"checksEvaluated":' + diagBool(checksEvaluated) + ',"firstBlocker":' + firstBlocker + ',"selectionOutcome":' + diagQ(selection) + ',"selectionBlocker":' + selectionBlocker + ',"lastPlanId":' + diagQ(array.get(diagnosticLastPlanIds, index)))
    0
diagArbitration(string winner, bool conflict) =>
    if diagInside() and array.size(diagnosticQualified) > 0
        for index = 0 to array.size(diagnosticQualified) - 1
            string module = array.get(diagnosticQualifiedModules, index)
            string cid = array.get(diagnosticQualified, index)
            string kind = conflict ? 'OPPOSING_CONFLICT' : module == winner ? 'SELECTED' : 'QUALIFIED_NOT_SELECTED'
            for candidateIndex = 0 to array.size(candidates) - 1
                if array.get(candidates, candidateIndex).id == module
                    array.set(diagnosticSelection, candidateIndex, kind)
                    if kind == 'SELECTED'
                        array.set(diagnosticLastPlanIds, candidateIndex, diagPlanId(module, time_close))
            if module == winner and not conflict
                diagnosticLedger.planCandidate := cid
                diagnosticLedger.plan := diagPlanId(module, time_close)
            diagEmit(kind, module, cid, ',"planId":' + diagQ(not conflict and module == winner ? diagPlanId(module, time_close) : ''))
        for c in candidates
            if not conflict and c.stage > 0 and c.id != winner
                diagEmit('CANDIDATE_CLEARED', c.id, diagCandidateId(c.id, c.direction, c.setupTime), ',"reason":"Another plan selected; not queued"')
    0
var table diagnosticTable = table.new(position.middle_left, 4, 11, bgcolor=color.new(color.white, 8))
if barstate.islast or barstate.islastconfirmedhistory
    table.clear(diagnosticTable, 0, 0, 3, 10)
    if diagMode == 'Events + dashboard'
        table.cell(diagnosticTable, 0, 0, 'RESEARCH ONLY', text_size=size.tiny)
        table.cell(diagnosticTable, 1, 0, diagnosticLedger.ended and diagnosticLedger.dropped == 0 ? 'Window ended; verify exported stream' : 'INCOMPLETE / window pending', text_size=size.tiny)
        for index = 0 to array.size(candidates) - 1
            Candidate c = array.get(candidates, index)
            int st = index == 0 ? stage : c.stage
            float trigger = st > 0 ? (index == 0 ? (stage == 1 ? breakLevel : dir == 1 ? gapTop : gapBottom) : c.trigger) : na
            float invalidation = st > 0 ? (index == 0 ? extreme : c.invalidation) : na
            table.cell(diagnosticTable, 0, index + 1, c.id, text_size=size.tiny)
            table.cell(diagnosticTable, 1, index + 1, not c.enabled ? 'OFF' : 'Stage ' + str.tostring(st) + ' / ' + (c.ready ? 'trigger passed' : 'not entry'), text_size=size.tiny)
            table.cell(diagnosticTable, 2, index + 1, st > 0 ? 'Trigger ' + diagNum(trigger) + ' / invalid ' + diagNum(invalidation) : 'No active candidate', text_size=size.tiny)
            table.cell(diagnosticTable, 3, index + 1, array.get(diagnosticLastBlock, index), text_size=size.tiny)
        table.cell(diagnosticTable, 0, 10, 'Events ' + str.tostring(diagnosticLedger.sequence), text_size=size.tiny)
        table.cell(diagnosticTable, 1, 10, 'Dropped ' + str.tostring(diagnosticLedger.dropped), text_size=size.tiny)
