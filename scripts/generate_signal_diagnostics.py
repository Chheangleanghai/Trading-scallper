"""Add observer-only diagnostics to frozen clarity parents, with exact reconstruction."""
from hashlib import sha256
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PINE = ROOT / 'pine/experiments'
PARENTS = {'indicator': 'd4d4866086e13d95fb0e5162bee51050a6fe47a010f4be004bdc5d5c28aba69e',
           'strategy': '8461833b9f466380dd03d877e94215165544dfee038e407e6d130c840abac479'}
CHECK_NAMES = ['WINDOW', 'DIRECTION', 'INVALIDATION', 'TARGETS', 'FIBONACCI', 'PREMIUM_DISCOUNT',
               'VOLATILITY', 'NEWS_PAUSE', 'SESSION', 'H1_ALIGNMENT', 'EMA_ALIGNMENT', 'STOP_DISTANCE',
               'ENTRY_DISTANCE', 'RR', 'PRICE_ORDER', 'QUOTA', 'COOLDOWN', 'QUALITY']
REJECTION_MESSAGES = ['Outside research date window', 'Direction disabled', 'Missing structural invalidation',
                      'Insufficient structure targets', 'Fibonacci location filter', 'Premium/discount filter',
                      'ATR volatility filter', 'Manual news pause', 'Outside selected session',
                      'Setup opposes H1 trend', 'EMA alignment filter', 'Stop distance invalid',
                      'Entry too far from setup', 'Minimum reward/risk not met', 'Invalid Entry/SL/TP order',
                      'Session plan limit', 'Signal cooldown', 'Quality below threshold']


def generate(kind):
    raw = (PINE / f'{kind}_signal_clarity.pine').read_bytes()
    assert sha256(raw).hexdigest() == PARENTS[kind], 'Unknown frozen clarity parent'
    source = raw.decode()
    edits = []

    def change(old, new, count=1):
        nonlocal source
        assert source.count(old) == count, old[:120]
        source = source.replace(old, new, count)
        edits.append((old, new, count))

    def hook(anchor, code, before=False, repeat=False):
        indent = re.match(r' *', anchor)[0]
        body = '\n'.join(indent + s if s else '' for s in code.splitlines())
        block = indent + '// SIGNAL_DIAGNOSTIC_HOOK_BEGIN\n' + body + '\n' + indent + '// SIGNAL_DIAGNOSTIC_HOOK_END\n'
        count = source.count('\n' + anchor) if repeat else 1
        change('\n' + anchor, '\n' + (block + anchor if before else anchor + block), count)

    change('A-H Clear decisions"', 'A-H Research diagnostics"')
    core = f"const string DIAGNOSTIC_PARENT_SHA = '{PARENTS[kind]}'\n" + (PINE / 'signal_diagnostics_core.pine.inc').read_text()
    change('type Candidate\n', '// SIGNAL_DIAGNOSTIC_CORE_BEGIN\n' + core + '// SIGNAL_DIAGNOSTIC_CORE_END\ntype Candidate\n')
    hook("    c.rejectionReason := 'Waiting for entry confirmation'\n", 'diagDetected(c.id, direction, currentTime, currentBar, trigger, invalidation)')
    hook("            c.status := invalid ? 'INVALIDATED' : 'EXPIRED'\n", "if c.id != 'A_SWEEP_MSS_FVG'\n    diagEmit(invalid ? 'INVALIDATED' : 'EXPIRED', c.id, diagCandidateId(c.id, c.direction, c.setupTime), ',\"reason\":' + diagQ(invalid ? 'Invalidation breached' : not c.enabled ? 'Disabled' : 'Setup age exceeded'))")
    hook("                    c.status := 'EXPIRED'\n", "diagEmit('EXPIRED', c.id, diagCandidateId(c.id, c.direction, c.setupTime), ',\"reason\":\"Zone test limit exceeded\"')")
    hook("            candF.status := 'INVALIDATED'\n", "diagEmit('INVALIDATED', candF.id, diagCandidateId(candF.id, candF.direction, candF.setupTime), ',\"reason\":\"Structural EMA trend no longer valid\"')")
    hook('    validationReason := \'Waiting for entry confirmation\'\n', 'diagStartBar()', before=True)
    hook('    updateCandidates()\n', "diagState('AFTER_UPDATE', cancelOrder)")
    hook('    updateCandidates()\n', "diagState('BEFORE_UPDATE', cancelOrder)", before=True)
    hook("    if stage > 0 and (bar_index - setupBar > expiry or (dir == 1 ? low < extreme : high > extreme))\n", "    diagEmit(bar_index - setupBar > expiry ? 'EXPIRED' : 'INVALIDATED', candA.id, diagCandidateId(candA.id, dir, setupTime), ',\"reason\":\"A age or extreme invalidation\"')")
    hook("    if stage == 2 and (dir == 1 ? close < gapBottom : close > gapTop)\n", "    diagEmit('INVALIDATED', candA.id, diagCandidateId(candA.id, dir, setupTime), ',\"reason\":\"FVG closing boundary invalidated\"')")
    hook("            gapBar := bar_index\n", "diagEmit('STAGE_REACHED', candA.id, diagCandidateId(candA.id, dir, setupTime), ',\"stage\":2')")
    hook("            setupTime := time_close\n            stage := 1\n", "diagDetected(candA.id, dir, setupTime, setupBar, breakLevel, extreme)")

    # Take the exact expressions passed to the production first-failure predicate.
    args = re.search(r'                string blocked = candidateRejection\(([^\n]+)\)\n', source)[1]
    parts = []; start = depth = 0
    for i, char in enumerate(args):
        depth += (char == '(') - (char == ')')
        if char == ',' and depth == 0:
            parts.append(args[start:i].strip()); start = i + 1
    parts.append(args[start:].strip())
    assert len(parts) == 19
    bools = parts[:17]; bools[7] = 'not (' + bools[7] + ')'
    bools.append(parts[17] + ' >= (' + parts[18] + ')')
    names = ', '.join("'" + k + "'" for k in CHECK_NAMES)
    messages = ', '.join("'" + k.replace("'", "\\'") + "'" for k in REJECTION_MESSAGES)
    check_code = f'''if diagInside()
    array<bool> diagnosticChecks = array.from({', '.join(bools)})
    array<string> diagnosticNames = array.from({names})
    array<string> diagnosticMessages = array.from({messages})
    array<string> diagnosticFailed = array.new<string>()
    string diagnosticExpectedMessage = ''
    for diagnosticIndex = 0 to array.size(diagnosticChecks) - 1
        if not array.get(diagnosticChecks, diagnosticIndex)
            if array.size(diagnosticFailed) == 0
                diagnosticExpectedMessage := array.get(diagnosticMessages, diagnosticIndex)
            array.push(diagnosticFailed, diagQ(array.get(diagnosticNames, diagnosticIndex)))
    string diagnosticFirst = array.size(diagnosticFailed) > 0 ? array.get(diagnosticFailed, 0) : 'null'
    bool diagnosticDecisionConsistent = blocked == diagnosticExpectedMessage
    string diagnosticCid = diagCandidateId(c.id, c.direction, c.setupTime)
    for diagnosticIndex = 0 to array.size(candidates) - 1
        if array.get(candidates, diagnosticIndex).id == c.id
            array.set(diagnosticLastBlock, diagnosticIndex, blocked == '' ? 'All applicable checks passed' : blocked)
    diagEmit('CHECKS', c.id, diagnosticCid, ',"checksEvaluated":true,"decisionConsistent":' + diagBool(diagnosticDecisionConsistent) + ',"firstBlocker":' + diagnosticFirst + ',"firstBlockerMessage":' + diagQ(blocked) + ',"failedChecks":[' + array.join(diagnosticFailed, ',') + '],"quality":' + str.tostring(score) + ',"plannedEntry":' + diagNum(planned) + ',"sl":' + diagNum(proposedStop) + ',"tp1":' + diagNum(t1) + ',"tp2":' + diagNum(t2) + ',"tp3":' + diagNum(t3))
    if safe
        array.push(diagnosticQualified, diagnosticCid)
        array.push(diagnosticQualifiedModules, c.id)'''
    hook("                bool safe = blocked == ''\n", check_code)
    hook("        if conflict\n", "    diagArbitration('', true)")
    hook("        else if not na(best)\n", "    diagArbitration(best.id, false)")
    # Existing alert calls and payloads are untouched; these are additional research logs.
    lines = source.splitlines(keepends=True)
    for event in ['ENTRY_TRIGGERED', 'SIGNAL_INVALIDATED', 'TP1_HIT', 'TP2_HIT', 'TP3_HIT', 'STOP_LOSS_HIT', 'TRADE_CLOSED']:
        anchors = [line for line in lines if line.strip() == f"notifyLifecycle('{event}')"]
        for anchor in dict.fromkeys(anchors):
            if event == 'ENTRY_TRIGGERED':
                call = "diagLifecycle(useBroker ? 'FILLED' : 'ESTIMATE_FILLED', selectedStrategy, signalTime, signalSetupTime, dir, filledEntry, fillTime, fillBar, initialQty)"
            elif event == 'SIGNAL_INVALIDATED':
                call = "diagEmit('ORDER_CANCELLED', selectedStrategy, diagCandidateId(selectedStrategy, dir, signalSetupTime), ',\"planId\":' + diagQ(diagPlanId(selectedStrategy, signalTime)) + ',\"status\":' + diagQ(status))"
            else:
                call = f"if not useBroker\n    diagEmit('ESTIMATE_{event}', selectedStrategy, diagCandidateId(selectedStrategy, dir, signalSetupTime), ',\"planId\":' + diagQ(diagPlanId(selectedStrategy, signalTime)))"
            hook(anchor, call, repeat=True)
    helpers = (PINE / 'signal_diagnostics_candidates.pine.inc').read_text()
    funcs, dashboard = helpers.split('var table diagnosticTable', 1)
    if kind == 'strategy':
        funcs += (PINE / 'signal_diagnostics_broker.pine.inc').read_text()
        hook("        strategy.entry(selectedStrategy, dir == 1 ? strategy.long : strategy.short, qty=qty, limit=entryMode == 'Limit' ? entry : na, stop=entryMode == 'Breakout' ? entry : na)\n", "diagnosticLedger.plannedCashRisk := accountRisk * qty\ndiagLifecycle('ORDER_SUBMITTED', selectedStrategy, signalTime, signalSetupTime, dir, entry, time_close, bar_index, qty)")
        hook("            string reason = strategy.closedtrades.exit_comment(trade)\n", 'diagReadExit(trade)')
        hook("        if strategy.position_size == 0\n", '    diagClosedPosition()')
    change('// Flags consumed by both the visual indicator and strategy adapter.\n', '// SIGNAL_DIAGNOSTIC_FUNCTIONS_BEGIN\n' + funcs + '// SIGNAL_DIAGNOSTIC_FUNCTIONS_END\n// Flags consumed by both the visual indicator and strategy adapter.\n')
    tail = '''if barstate.isconfirmed
    if newSignal
        diagEmit('QUALIFIED_PLAN', selectedStrategy, diagCandidateId(selectedStrategy, dir, signalSetupTime), ',"planId":' + diagQ(diagPlanId(selectedStrategy, signalTime)) + ',"executionAccepted":' + diagBool(active or pending) + ',"status":' + diagQ(status))
    diagState('END_BAR', cancelOrder)
    diagFinish()
'''
    tail += 'var table diagnosticTable' + dashboard
    # Append as an explicit reversible change, not a replacement of a repeated newline.
    source += '\n// SIGNAL_DIAGNOSTIC_TAIL_BEGIN\n' + tail + '// SIGNAL_DIAGNOSTIC_TAIL_END\n'
    restored = source.removesuffix('\n// SIGNAL_DIAGNOSTIC_TAIL_BEGIN\n' + tail + '// SIGNAL_DIAGNOSTIC_TAIL_END\n')
    for old, new, count in reversed(edits):
        assert restored.count(new) == count, new[:120]
        restored = restored.replace(new, old, count)
    assert restored.encode() == raw, 'Instrumentation escaped observer-only additions'
    return source


if __name__ == '__main__':
    for kind in PARENTS:
        source = generate(kind)
        path = PINE / f'{kind}_signal_diagnostics.pine'
        if '--check' in sys.argv:
            assert path.read_text() == source, f'Regenerate {path.name}'
        else:
            path.write_text(source)
        print(path.name, sha256(source.encode()).hexdigest())
