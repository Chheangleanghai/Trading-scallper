"""Separate stale-plan clarity revision, with exhaustive frozen-parent reconstruction."""
from hashlib import sha256
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PINE = ROOT / 'pine/experiments'
HASHES = {
    'indicator': '134c6abb04c7805b4e02dcaebe612784aa5faaedf50382c17cef679735940717',
    'strategy': '07485e16498af756ff5846d71111b5a24978c7e088be9d0fb2e73f6a8eac5340',
}
INPUTS = """// CLARITY_INPUTS_BEGIN
closedPlanDisplay = input.string('Faded', 'Closed plan prices', options=['Faded', 'Hide'], group='Clear signal display')
showSetupWatch = input.bool(true, 'Show next setup and required confirmation price', group='Clear signal display')
// CLARITY_INPUTS_END
"""
WATCH = """        string watchCaption = 'No developing concept on last closed bar'
        string triggerCaption = 'Wait for a new setup; no entry yet'
        if livePlan
            watchCaption := reviewModuleName(clearPlanModule) + (pending ? ' · order pending' : ' · active model plan')
            triggerCaption := pending ? 'Await fill; do not treat pending as executed' : 'Manage existing plan; no additional entry'
        else if showSetupWatch
            for c in candidates
                int watchStage = str.startswith(c.id, 'A_') ? stage : c.stage
                if c.enabled and watchStage > 0
                    int watchDirection = str.startswith(c.id, 'A_') ? dir : c.direction
                    float watchTrigger = str.startswith(c.id, 'A_') ? (watchStage == 1 ? breakLevel : watchDirection == 1 ? gapTop : gapBottom) : str.startswith(c.id, 'E_') or str.startswith(c.id, 'H_') or (str.startswith(c.id, 'D_') and c.mode == 'Breakout retest') ? (watchDirection == 1 ? c.upper : c.lower) : c.trigger
                    watchCaption := reviewModuleName(c.id) + (watchDirection == 1 ? ' · potential BUY' : ' · potential SELL') + ' · NOT ENTRY'
                    bool triggerChecked = c.ready and c.confirmationTime == (barstate.isconfirmed ? time_close : time_close[1])
                    triggerCaption := triggerChecked ? (c.rejectionReason != '' ? 'Trigger confirmed; BLOCKED: ' + c.rejectionReason : 'Trigger checked; ' + decisionReason) : clarityNext(c, watchStage) + (na(watchTrigger) ? '' : (watchDirection == 1 ? ' above ' : ' below ') + priceText(watchTrigger)) + '; then risk checks'
                    break
        if not showSetupWatch
            watchCaption := 'Setup watch disabled'
            triggerCaption := 'See A–H confirmation board'
"""


def generate(kind):
    raw = (PINE / f'{kind}_session_labels.pine').read_bytes()
    assert sha256(raw).hexdigest() == HASHES[kind], 'Frozen session-label parent changed'
    source = raw.decode()
    replacements = []

    def change(old, new):
        nonlocal source
        assert source.count(old) == 1, old[:100]
        source = source.replace(old, new, 1)
        replacements.append((old, new))

    change('A-H Sessions + concept labels"', 'A-H Clear decisions"')
    change('// SESSION_DISPLAY_INPUTS_END\n', '// SESSION_DISPLAY_INPUTS_END\n' + INPUTS)
    helper = (PINE / 'clarity_helpers.pine.inc').read_text()
    change('// REVIEW_DRAWINGS_BEGIN', helper + '\n// REVIEW_DRAWINGS_BEGIN')
    change('line.set_style(level, line.style_solid)', 'line.set_style(level, view.isOpen ? line.style_solid : line.style_dashed)')
    change('color levelColor = index == 0 ? color.rgb(110, 116, 125) : index == 1 ? color.rgb(239, 68, 68) : color.rgb(76, 175, 80)\n        line.set_color', 'color levelColor = clarityPlanHue(view.isOpen, index)\n        line.set_color')
    change("string suffix = index == 0 and not view.isOpen ? ' · CLOSED' : ''", "string suffix = index == 0 ? clarityPlanEnding(view.isOpen, view.terminal) : not view.isOpen ? ' · previous' : ''")
    change('box.set_bgcolor(view.riskArea, color.new(color.rgb(239, 68, 68), 88))', 'box.set_bgcolor(view.riskArea, view.isOpen ? color.new(color.rgb(239, 68, 68), 88) : color.new(color.gray, 97))')
    change('box.set_bgcolor(view.rewardArea, color.new(color.rgb(76, 175, 80), 90))', 'box.set_bgcolor(view.rewardArea, view.isOpen ? color.new(color.rgb(76, 175, 80), 90) : color.new(color.gray, 97))')
    change('box.set_border_color(view.riskArea, color.new(color.rgb(239, 68, 68), 55))', 'box.set_border_color(view.riskArea, view.isOpen ? color.new(color.rgb(239, 68, 68), 55) : color.new(color.gray, 85))')
    change('box.set_border_color(view.rewardArea, color.new(color.rgb(76, 175, 80), 60))', 'box.set_border_color(view.rewardArea, view.isOpen ? color.new(color.rgb(76, 175, 80), 60) : color.new(color.gray, 85))')
    change('bool visiblePlan = view.isOpen or showLastPlan', "bool visiblePlan = view.isOpen or (showLastPlan and closedPlanDisplay == 'Faded')")
    change("var table reviewBadge = table.new(position.top_right, 2, 12,", "var table reviewBadge = table.new(position.top_right, 2, 14,")
    change('table.clear(reviewBadge, 0, 0, 1, 11)', 'table.clear(reviewBadge, 0, 0, 1, 13)')
    change(": 'WAIT' + (hasPlan ? ' · previous ' + clearPlanSide : '')", ": 'NO ACTIVE ENTRY' + (hasPlan ? ' · previous ' + clearPlanSide + ' closed' : '')")
    change("        array<string> keys = array.from('SMART SCALPER · '", WATCH + "        array<string> keys = array.from('SMART SCALPER · '")
    change("'Execution model', 'Session / plans')", "'Execution model', 'Session / plans', 'Developing setup', 'Next confirmation')")
    change("'/' + str.tostring(maxTrades))\n        for row = 0 to 11", "'/' + str.tostring(maxTrades), watchCaption, triggerCaption)\n        for row = 0 to 13")
    change('color valueColor = row == 4 ?', 'color valueColor = not livePlan and row >= 3 and row <= 8 ? color.rgb(153, 163, 178) : row == 4 ?')
    change('table.cell(reviewBadge, 0, row, array.get(keys, row),', "table.cell(reviewBadge, 0, row, (not livePlan and hasPlan and row >= 3 and row <= 7 ? 'Previous ' : '') + array.get(keys, row),")
    # Historical concept labels must not present old confirmations as current entry instructions.
    change("reviewModuleName(selectedStrategy) + ' · ' + (dir == 1 ? 'BUY' : 'SELL') + planStateCaption", "reviewModuleName(selectedStrategy) + ' · ' + (dir == 1 ? 'BUY' : 'SELL') + ' plan recorded'")
    restored = source
    for old, new in reversed(replacements):
        assert restored.count(new) == 1, new[:100]
        restored = restored.replace(new, old, 1)
    assert restored.encode() == raw, 'Non-presentation parent changed'
    assert 'chart.left_visible_bar_time' not in source and 'chart.right_visible_bar_time' not in source
    return source


if __name__ == '__main__':
    for kind in HASHES:
        source = generate(kind)
        path = PINE / f'{kind}_signal_clarity.pine'
        if '--check' in sys.argv:
            assert path.read_text() == source, f'Regenerate {path.name}'
        else:
            path.write_text(source)
        print(path.name, sha256(source.encode()).hexdigest())
