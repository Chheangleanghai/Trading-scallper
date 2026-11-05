"""Generate a presentation-only Indicator variant; refuse a drifting baseline."""
from pathlib import Path
from hashlib import sha256
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = 'c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4'
INPUTS = """// CLEAR_SIGNAL_INPUTS_BEGIN
clearSignalView = input.string('Clear levels', 'Signal display', options=['Clear levels', 'Context + levels'], group='Clear signal display')
clearLevelBars = input.int(16, 'Level / box extension bars', minval=5, maxval=50, group='Clear signal display')
clearPlanLimit = input.int(3, 'Recent signal plans to keep', minval=1, maxval=3, group='Clear signal display')
clearSpaceLabels = input.bool(true, 'Separate overlapping price labels with connectors', group='Clear signal display')
clearShowPriceCard = input.bool(true, 'Show compact status and price card', group='Clear signal display')
bool clearOnly = clearSignalView == 'Clear levels'
// CLEAR_SIGNAL_INPUTS_END
"""


def generate():
    raw = (ROOT / 'pine/indicator.pine').read_bytes()
    if sha256(raw).hexdigest() != EXPECTED:
        raise SystemExit('Indicator baseline changed; refusing an unknown parent.')
    source = raw.decode().replace('indicator("XAUUSD SMART SCALPER PRO",', 'indicator("XAUUSD SMART SCALPER PRO · Clear levels experiment",', 1)
    source = source.replace('// Shared source: edit this file, then npm run pine:generate.\n', '// Shared source: edit this file, then npm run pine:generate.\n' + INPUTS, 1)
    source = source.replace("showLastPlan = input.bool(false,", "showLastPlan = input.bool(true,", 1)
    source = source.replace("chartLabelSize = input.string('Small',", "chartLabelSize = input.string('Normal',", 1)
    start = source.index('if newSignal and showTrade and (active or pending or not useBroker)\n')
    end = source.index("plot(showEMA and visualLayout == 'Dashboard' ? ema9", start)
    source = source[:start] + (ROOT / 'pine/experiments/clear_signal_levels.pine.inc').read_text() + source[end:]
    # Gate only context rendering; all market calculations and module filters remain unchanged.
    source = source.replace('if showStructure', 'if showStructure and not clearOnly')
    source = source.replace('if showZones and visualLayout', 'if showZones and not clearOnly and visualLayout')
    source = source.replace('if showOB and visualLayout', 'if showOB and not clearOnly and visualLayout')
    source = source.replace("bool referenceView = visualLayout == 'Reference'", "bool referenceView = visualLayout == 'Reference' and not clearOnly", 1)
    source = source.replace("if showDashboard and visualLayout == 'Dashboard'", "if showDashboard and visualLayout == 'Dashboard' and not clearOnly", 1)
    return source + '\n' + (ROOT / 'pine/experiments/clear_signal_badge.pine.inc').read_text()


if __name__ == '__main__':
    content = generate()
    output = ROOT / 'pine/experiments/indicator_clear_levels.pine'
    if '--check' in sys.argv:
        if not output.exists() or output.read_text() != content:
            raise SystemExit('Clear-levels variant differs; run python3 scripts/generate_clear_signal_indicator.py')
    else:
        output.write_text(content)
    print('Clear-levels Indicator SHA-256:', sha256(content.encode()).hexdigest())
