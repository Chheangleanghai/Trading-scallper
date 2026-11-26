"""Build isolated Indicator and Strategy candidates with a modeled execution-cost gate."""

from hashlib import sha256
from pathlib import Path
import sys

PINE = Path(__file__).resolve().parents[1] / 'pine/experiments'
PARENTS = {
    'indicator': ('indicator_time_exit_timing.pine', '7356a5ff27de9db7fd56e638ff0917502e8cdae163e8997cba62c5a30d3f3b08'),
    'strategy': ('strategy_signal_diagnostics.pine', '0268050018e688454874306c77fa353fddcf1c5f0455b671b805dcb5a5b7b6d1'),
}
BLOCKER = 'Modeled costs exceed stop-risk limit'
INPUTS = '''
executionCostLimitPct = input.float(0, 'Maximum modeled costs (% of initial stop risk, 0 disables)', minval=0, step=0.5, group='Execution cost research')
executionCommissionPct = input.float(0.01, 'Modeled commission per side (%)', minval=0, step=0.001, group='Execution cost research')
executionSlippageTicks = input.int(2, 'Modeled slippage per market or stop fill (ticks)', minval=0, group='Execution cost research')
executionSpreadTicks = input.float(0, 'Additional round-trip spread (ticks)', minval=0, step=0.5, group='Execution cost research')'''
PREDICATES = '''// Price units per position unit. Limit entries have no modeled entry slippage.
modeledCostRiskPct(int direction, float planned, float stopPrice, float tick, float commissionPct, int slippageTicks, float spreadTicks, bool limitEntry) =>
    float risk = direction * (planned - stopPrice)
    bool valid = (direction == 1 or direction == -1) and planned > 0 and stopPrice > 0 and tick > 0 and not na(risk) and risk > 0
    float commission = (planned + stopPrice) * commissionPct / 100
    float friction = (spreadTicks + slippageTicks * (limitEntry ? 1 : 2)) * tick
    valid ? 100 * (commission + friction) / risk : na

executionCostPass(float limitPct, float costPct) =>
    limitPct == 0 or (not na(costPct) and costPct <= limitPct + 0.000000001)

'''


def generate(kind):
    parent, expected = PARENTS[kind]
    raw = (PINE / parent).read_bytes()
    if sha256(raw).hexdigest() != expected:
        raise SystemExit(f'{parent}: frozen source changed')
    source = raw.decode()

    def replace(anchor, replacement):
        nonlocal source
        if source.count(anchor) != 1:
            raise SystemExit(f'Expected one {kind} anchor: {anchor[:85]}')
        source = source.replace(anchor, replacement, 1)

    title = 'Time exit timing research' if kind == 'indicator' else 'A-H Research diagnostics'
    replace(f'· {title}"', '· Execution cost research"')
    anchor = "riskPct = input.float(0.5, 'Simulation risk %', minval=0.01, maxval=5)"
    replace(anchor, anchor + INPUTS)
    replace('rrFeasible(int direction,', PREDICATES + 'rrFeasible(int direction,')
    replace("                bool safe = blocked == ''", f"""                float costShare = executionCostLimitPct > 0 ? modeledCostRiskPct(direction, planned, proposedStop, syminfo.mintick, executionCommissionPct, executionSlippageTicks, executionSpreadTicks, entryMode == 'Limit') : na
                bool costOK = executionCostPass(executionCostLimitPct, costShare)
                if blocked == '' and not costOK
                    blocked := '{BLOCKER}'
                bool safe = blocked == ''""")
    anchor = '                    array<string> diagnosticFailed = array.new<string>()'
    replace(anchor, f'''                    if executionCostLimitPct > 0
                        array.push(diagnosticChecks, costOK)
                        array.push(diagnosticNames, 'EXECUTION_COST')
                        array.push(diagnosticMessages, '{BLOCKER}')
{anchor}''')
    anchor = "                    diagEmit('CHECKS', c.id, diagnosticCid,"
    replace(anchor, '''                    string diagnosticCost = executionCostLimitPct > 0 ? ',"executionCostPctOfRisk":' + diagNum(costShare) : ''
''' + anchor)
    replace(' + diagnosticStop + diagnosticSnr)', ' + diagnosticStop + diagnosticSnr + diagnosticCost)')
    capture = next(line.rstrip() for line in source.splitlines() if "diagEmit('CAPTURE_START'" in line)
    replace(capture, capture[:-1] + ''' + (executionCostLimitPct > 0 ? ',"executionCostModel":{"limitPct":' + diagNum(executionCostLimitPct) + ',"commissionPctPerSide":' + diagNum(executionCommissionPct) + ',"slippageTicks":' + diagInt(executionSlippageTicks) + ',"additionalSpreadTicks":' + diagNum(executionSpreadTicks) + '}' : ''))''')
    replace("            managedStop := bestStop\n", '''            if executionCostLimitPct > 0
                float selectedCost = modeledCostRiskPct(dir, bestEntry, bestStop, syminfo.mintick, executionCommissionPct, executionSlippageTicks, executionSpreadTicks, entryMode == 'Limit')
                signalReason += ' | Modeled costs ' + str.tostring(selectedCost, '#.##') + '% of initial risk'
            managedStop := bestStop
''')
    return source


if __name__ == '__main__':
    for kind in PARENTS:
        content = generate(kind)
        output = PINE / f'{kind}_execution_cost.pine'
        if '--check' in sys.argv:
            if not output.exists() or output.read_text() != content:
                raise SystemExit(f'{output.name}: regenerate execution-cost candidate')
        else:
            output.write_text(content)
        print(output.name, sha256(content.encode()).hexdigest())
