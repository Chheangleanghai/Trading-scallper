"""Reference ladder and Jakarta display times; frozen engines stay byte-identical."""
from pathlib import Path
from hashlib import sha256
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPERIMENTS = ROOT / 'pine/experiments'
PARENTS = {
    'indicator': '267920fe769cd46f70269457d6194ba4b40d70819d8188bedc86d45b8bb9b680',
    'strategy': 'ce6c1256bd9d29387f194be4ac715e479bf98f14bdcc0e9c697e5f4110f2aae9',
}


def once(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old, new, 1)


def region(text, start, end):
    first = text.index(start)
    last = text.index(end, first) + len(end)
    return first, last, text[first:last]


def generate(kind):
    raw = (EXPERIMENTS / f'{kind}_stable_display.pine').read_bytes()
    assert sha256(raw).hexdigest() == PARENTS[kind], 'Unknown frozen display parent'
    source = raw.decode()
    source = once(source, 'A-H Stable display review"', 'A-H Jakarta ladder"')
    start, end, drawing = region(source, '// REVIEW_DRAWINGS_BEGIN', '// REVIEW_DRAWINGS_END')
    drawing = once(drawing, 'var int clearPlanTime = na', "// Jakarta display formatting only; session and UNIX event timestamps are unchanged.\nconst string LADDER_DISPLAY_ZONE = 'Asia/Jakarta'\nvar int clearPlanTime = na")
    drawing = once(drawing, "(view.direction == 1 ? 'BUY' : 'SELL') + ' ' + str.substring(view.module, 0, 1) + ' Entry '", "(view.direction == 1 ? 'BUY' : 'SELL') + ' plan / Entry '")
    drawing = once(drawing, 'int labelTime = view.endTime + stepMs * 2', 'int labelTime = view.endTime')
    drawing = once(drawing, 'line.set_style(level, view.isOpen ? line.style_solid : line.style_dashed)', 'line.set_style(level, line.style_solid)')
    drawing = once(drawing, "color levelColor = view.isOpen ? (index == 0 ? color.rgb(110, 116, 125) : index == 1 ? color.rgb(239, 68, 68) : color.rgb(47, 158, 68)) : color.rgb(135, 143, 155)", "color levelColor = index == 0 ? color.rgb(110, 116, 125) : index == 1 ? color.rgb(239, 68, 68) : color.rgb(76, 175, 80)")
    assert drawing.count('visible ? color.new(levelColor, view.isOpen ? 0 : 35) : na') == 2
    drawing = drawing.replace('visible ? color.new(levelColor, view.isOpen ? 0 : 35) : na', 'visible ? levelColor : na')
    drawing = once(drawing, 'visible ? color.new(levelColor, view.isOpen ? 0 : 20) : na', 'visible ? levelColor : na')
    drawing = once(drawing, "string suffix = index == 0 and not view.isOpen ? '\\n' + view.terminal : ''", "string suffix = index == 0 and not view.isOpen ? ' · CLOSED' : ''")
    drawing = once(drawing, '''        if not view.isOpen
            box.set_bgcolor(view.riskArea, color.new(color.gray, 96))
            box.set_bgcolor(view.rewardArea, color.new(color.gray, 96))
            box.set_border_color(view.riskArea, color.new(color.gray, 80))
            box.set_border_color(view.rewardArea, color.new(color.gray, 80))''', '''        // Keep the reference colors; CLOSED and the outcome card identify past plans.
        box.set_bgcolor(view.riskArea, color.new(color.rgb(239, 68, 68), 88))
        box.set_bgcolor(view.rewardArea, color.new(color.rgb(76, 175, 80), 90))
        box.set_border_color(view.riskArea, color.new(color.rgb(239, 68, 68), 55))
        box.set_border_color(view.rewardArea, color.new(color.rgb(76, 175, 80), 60))''')
    drawing = once(drawing, 'latestView.endTime := knownClose ? reviewOutcome.closeTime : time_close', '''// Minimum display width is not holding duration; actual closure stays in the card.
            latestView.endTime := math.max(minimumEnd, knownClose ? reviewOutcome.closeTime : time_close)''')
    drawing = once(drawing, "str.format_time(reviewOutcome.closeTime, 'HH:mm', 'UTC') + ' UTC'", "str.format_time(reviewOutcome.closeTime, 'HH:mm', LADDER_DISPLAY_ZONE) + ' WIB'")
    drawing = once(drawing, 'color.rgb(47, 158, 68)', 'color.rgb(76, 175, 80)')
    source = source[:start] + drawing + source[end:]
    start, end, badge = region(source, '// REVIEW_BADGE_BEGIN', '// REVIEW_BADGE_END')
    badge = once(badge, "str.format_time(reviewOutcome.closeTime, 'HH:mm', 'UTC') + ' UTC'", "str.format_time(reviewOutcome.closeTime, 'HH:mm', LADDER_DISPLAY_ZONE) + ' WIB'")
    badge = once(badge, "'Concept / signal UTC'", "'Concept / signal WIB'")
    badge = once(badge, "str.format_time(clearPlanTime, 'dd MMM HH:mm', 'UTC')", "str.format_time(clearPlanTime, 'dd MMM HH:mm', LADDER_DISPLAY_ZONE)")
    badge = once(badge, 'not livePlan and row >= 3 and row <= 7 ? color.rgb(180, 190, 205) : ', '')
    source = source[:start] + badge + source[end:]
    # Structural guard: only declaration title and these two presentation regions may differ.
    restored = source.replace('A-H Jakarta ladder"', 'A-H Stable display review"', 1)
    for begin, finish in [('// REVIEW_DRAWINGS_BEGIN', '// REVIEW_DRAWINGS_END'), ('// REVIEW_BADGE_BEGIN', '// REVIEW_BADGE_END')]:
        a, b, _ = region(restored, begin, finish)
        _, _, original = region(raw.decode(), begin, finish)
        restored = restored[:a] + original + restored[b:]
    assert restored.encode() == raw, 'Change escaped the two presentation regions'
    assert 'chart.left_visible_bar_time' not in source and 'chart.right_visible_bar_time' not in source
    return source


if __name__ == '__main__':
    for kind in PARENTS:
        source = generate(kind)
        path = EXPERIMENTS / f'{kind}_jakarta_ladder.pine'
        if '--check' in sys.argv:
            assert path.read_text() == source, f'Regenerate {path.name}'
        else:
            path.write_text(source)
        print(path.name, sha256(source.encode()).hexdigest())
