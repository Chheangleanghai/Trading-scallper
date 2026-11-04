"""Generate isolated quantity research files without editing either frozen baseline."""
from hashlib import sha256
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'pine/experiments/strategy_exit_audit.pine'
EXPECTED = 'a8267588770637b4a75e50367267dac11a8ba6783cdd9084e7d9620ff3961623'
HELPER = (ROOT / 'pine/experiments/exit_quantity_units.pine.inc').read_text()
OLD = '''    float q1 = partial ? math.floor(initialQty * 0.33 / syminfo.mincontract) * syminfo.mincontract : 0
    float q2 = partial ? math.floor(initialQty * 0.33 / syminfo.mincontract) * syminfo.mincontract : 0
    float q3 = initialQty - q1 - q2
'''
NEW = '''    // QUANTITY_UNITS_ALLOCATION_BEGIN
    [q1, q2, q3] = exitQuantityUnits(initialQty, syminfo.mincontract, partial)
    if auditLog and newSignal
        log.info('QUANTITY_AUDIT ' + '{"experiment":"QTY_UNITS_1","timestamp":' + str.tostring(signalTime) + ',"module":"' + selectedStrategy + '","initialQty":' + str.tostring(initialQty, '0.0000000000000000') + ',"step":' + str.tostring(syminfo.mincontract, '0.0000000000000000') + ',"partial":' + (partial ? 'true' : 'false') + ',"q1":' + str.tostring(q1, '0.0000000000000000') + ',"q2":' + str.tostring(q2, '0.0000000000000000') + ',"q3":' + str.tostring(q3, '0.0000000000000000') + '}')
    // QUANTITY_UNITS_ALLOCATION_END
'''


def generate_strategy():
    raw = BASE.read_bytes()
    if sha256(raw).hexdigest() != EXPECTED:
        raise SystemExit('Exit-audit source changed; refusing to alter the frozen experiment.')
    source = raw.decode()
    title = 'Backtest · Exit audit experiment'
    if source.count(title) != 1 or source.count(OLD) != 1:
        raise SystemExit('Expected one experiment title and one original allocation block.')
    source = source.replace(title, 'Backtest · Quantity units experiment', 1)
    anchor = '// Submit a plan once. No stop widening or exit level recalculation after confirmation.\n'
    if source.count(anchor) != 1:
        raise SystemExit('Expected one order adapter anchor.')
    source = source.replace(anchor, '// QUANTITY_UNITS_HELPER_BEGIN\n' + HELPER + '// QUANTITY_UNITS_HELPER_END\n' + anchor, 1)
    return source.replace(OLD, NEW, 1)


def main():
    outputs = {
        'strategy_quantity_units.pine': generate_strategy(),
        'quantity_units_matrix.pine': (ROOT / 'pine/experiments/quantity_units_matrix.pine.in').read_text().replace('// INCLUDE_QUANTITY_UNITS', HELPER.rstrip()),
    }
    for name, content in outputs.items():
        path = ROOT / 'pine/experiments' / name
        if '--check' in sys.argv:
            if not path.exists() or path.read_text() != content:
                raise SystemExit(f'{name} differs; run python3 scripts/generate_quantity_experiment.py')
        else:
            path.write_text(content)
        print(f'{path.relative_to(ROOT)} sha256: {sha256(content.encode()).hexdigest()}')


if __name__ == '__main__':
    main()
