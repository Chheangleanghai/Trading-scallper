"""Generate isolated A-H candidates from frozen, explicitly identified parents."""
from pathlib import Path
from hashlib import sha256
import sys
from generate_clear_signal_indicator import INPUTS

ROOT = Path(__file__).resolve().parents[1]
PARENTS = {
    'indicator': ('pine/indicator.pine', 'c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4'),
    'strategy': ('pine/experiments/strategy_quantity_units.pine', 'bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed'),
}
RENAMES = {
    "'D: Confirmed support/resistance'": "'D: K-SNR (confirmed support/resistance)'",
    "'D · Support / resistance'": "'D · K-SNR'",
    "'Confirmed SNR level; retest/rejection trigger'": "'Confirmed K-SNR level; retest/rejection trigger'",
    "'SNR SUPPORT'": "'K-SNR SUPPORT'",
    "'SNR RESISTANCE'": "'K-SNR RESISTANCE'",
    "? 'SNR ' : ''": "? 'K-SNR ' : ''",
}


def generate(kind):
    parent, expected = PARENTS[kind]
    raw = (ROOT / parent).read_bytes()
    if sha256(raw).hexdigest() != expected:
        raise SystemExit(f'{parent}: unknown parent; refusing generation')
    source = raw.decode()
    old_title = 'XAUUSD SMART SCALPER PRO' if kind == 'indicator' else 'XAUUSD SMART SCALPER PRO Backtest · Quantity units experiment'
    new_title = 'XAUUSD SMART SCALPER PRO · A-H Plan candidate' if kind == 'indicator' else 'XAUUSD SMART SCALPER PRO Backtest · A-H Plan candidate'
    assert old_title in source
    source = source.replace('"' + old_title + '"', '"' + new_title + '"', 1)
    inputs = INPUTS.replace("input.string('Clear levels',", "input.string('Context + levels',", 1).replace('clearLevelBars = input.int(16,', 'clearLevelBars = input.int(8,', 1).replace('clearPlanLimit = input.int(3,', 'clearPlanLimit = input.int(1,', 1).replace('clearSpaceLabels = input.bool(true,', 'clearSpaceLabels = input.bool(false,', 1)
    anchor = '// Shared source: edit this file, then npm run pine:generate.\n'
    assert source.count(anchor) == 1
    source = source.replace(anchor, anchor + inputs, 1)
    for module in 'BCDEFGH':
        source = source.replace(f'enable{module} = input.bool(false,', f'enable{module} = input.bool(true,', 1)
    for name in ('showConceptPanel', 'showDashboard'):
        source = source.replace(f'{name} = input.bool(true,', f'{name} = input.bool(false,', 1)
    source = source.replace('showLastPlan = input.bool(false,', 'showLastPlan = input.bool(true,', 1)
    source = source.replace("chartLabelSize = input.string('Small',", "chartLabelSize = input.string('Normal',", 1)
    start = source.index('if newSignal and showTrade and (active or pending or not useBroker)\n')
    end = source.index("plot(showEMA and visualLayout == 'Dashboard' ? ema9", start)
    source = source[:start] + (ROOT / 'pine/experiments/clear_signal_levels.pine.inc').read_text() + source[end:]
    # Only the two standalone entry badges are removed. Alerts, audit and context remain.
    source = '\n'.join(line for line in source.split('\n') if not line.startswith('plotshape(entryTriggered and dir == '))
    for before, after in RENAMES.items():
        assert before in source, before
        source = source.replace(before, after)
    return source + '\n' + (ROOT / 'pine/experiments/clear_signal_badge.pine.inc').read_text()


if __name__ == '__main__':
    for kind in PARENTS:
        content = generate(kind)
        output = ROOT / f'pine/experiments/{kind}_professional.pine'
        if '--check' in sys.argv:
            if not output.exists() or output.read_text() != content:
                raise SystemExit(f'{output.name}: regenerate professional candidates')
        else:
            output.write_text(content)
        print(output.name, sha256(content.encode()).hexdigest())
