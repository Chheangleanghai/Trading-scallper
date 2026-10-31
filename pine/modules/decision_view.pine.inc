// Read-only explanation of the most recent confirmed-bar decision. Never opens orders.
if barstate.isconfirmed
    decisionState := readinessState(dir, pending, active or brokerBusy, entryTriggered)
    if pending or active or brokerBusy
        decisionReason := pending ? 'Qualified plan; waiting for ' + (entryMode == 'Limit' ? 'limit fill' : entryMode == 'Breakout' ? 'breakout fill' : 'emulator market fill') + ' · not executed yet' : signalReason
        decisionProgress := pending ? 'Setup ✓ → Confirmation ✓ → Risk ✓ → Fill …' : 'Setup ✓ → Confirmation ✓ → Risk ✓ → Entry triggered (sim.)'
    else
        string commonBlock = newSignal and status == 'REJECTED: INVALID UNIT SIZE' ? 'Simulation quantity below feed minimum / invalid conversion' : not (enableA or enableB or enableC or enableD or enableE or enableF or enableG or enableH) ? 'All strategies disabled' : cancelOrder ? 'Previous order cancelled; reevaluate on a later bar' : pause ? 'Manual news pause' : not researchBarAllowed(useResearchWindow, researchStart, researchEnd, time, time_close) ? 'Outside research date window' : useSession and not inSession ? 'Outside selected session' : not volOK ? 'ATR filtered / warming up' : sessionTrades >= maxTrades ? 'Session plan limit' : not na(lastSignal) and bar_index - lastSignal < cooldown ? 'Signal cooldown' : ''
        string effectiveBlock = commonBlock != '' ? commonBlock : validationReason == 'Opposing qualified directions; no trade' ? validationReason : ''
        decisionReason := effectiveBlock != '' ? effectiveBlock : validationReason
        decisionProgress := 'No qualified setup → WAIT'
        if enableA and stage > 0
            decisionProgress := stage == 1 ? 'Sweep ✓ → MSS … + FVG … → Retest … → Risk …' : 'Sweep ✓ → MSS ✓ + FVG ✓ → Retest … → Risk …'
            if effectiveBlock == ''
                decisionReason := stage == 1 ? 'Need a later displaced MSS candle with FVG' : candA.ready ? validationReason : 'Need a later FVG retest and directional close'
        else
            for candidate in candidates
                if candidate.enabled and candidate.stage > 0
                    decisionProgress := strategyName(candidate.id) + ' → ' + (candidate.ready ? 'Trigger ✓ → risk checks' : 'Setup ✓ → later confirmation …')
                    if effectiveBlock == ''
                        decisionReason := candidate.ready ? candidate.rejectionReason : 'Waiting for later setup-specific confirmation'
                    break
    if newSignal and useBroker and not pending and not active and status == 'REJECTED: INVALID UNIT SIZE'
        decisionProgress := 'Setup ✓ → Confirmation ✓ → Execution quantity rejected'
