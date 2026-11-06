"""Add bounded session/concept annotations while reconstructing frozen Jakarta parents."""
from hashlib import sha256
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PINE = ROOT / 'pine/experiments'
PARENTS = {
    'indicator': '2e2495d846d4e2f49f13c649e59aef45f203079786e358aa951ce31bb02a4e5f',
    'strategy': '4d3a4772e56fbbbbb91afeb8675ec66a43ba7eccdadc98dd6e6774b6f2ad9801',
}
INPUTS = """// SESSION_DISPLAY_INPUTS_BEGIN
showSessionBoundaryMarkers = input.bool(true, 'Show session boundary lines and names', group='Session annotations')
markAsianSession = input.bool(true, 'Asia / Tokyo (09:00–18:00 Tokyo)', group='Session annotations')
markLondonSession = input.bool(true, 'London (08:00–17:00 London)', group='Session annotations')
markNewYorkSession = input.bool(true, 'New York (08:00–17:00 New York)', group='Session annotations')
showSessionEndMarkers = input.bool(true, 'Show session closing boundaries', group='Session annotations')
sessionBoundaryLimit = input.int(18, 'Recent session boundaries to keep', minval=6, maxval=42, group='Session annotations')
showSelectedConceptLabel = input.bool(true, 'Name selected strategy on its confirmation candle', group='Concept review')
selectedConceptLabelLimit = input.int(8, 'Recent selected-strategy labels to keep', minval=1, maxval=20, group='Concept review')
// SESSION_DISPLAY_INPUTS_END
"""
OLD_CAPTION = "array<string> names = array.from((view.direction == 1 ? 'BUY' : 'SELL') + ' plan / Entry ', 'SL ', 'TP1 ', 'TP2 ', 'TP3 ')"
NEW_CAPTION = "array<string> names = array.from(reviewModuleName(view.module) + ' · ' + (view.direction == 1 ? 'BUY' : 'SELL') + ' / Entry ', 'SL ', 'TP1 ', 'TP2 ', 'TP3 ')"


def generate(kind):
    raw = (PINE / f'{kind}_jakarta_ladder.pine').read_bytes()
    assert sha256(raw).hexdigest() == PARENTS[kind], 'Frozen Jakarta parent changed'
    original = raw.decode()
    assert original.count(OLD_CAPTION) == 1
    assert original.count('// REVIEW_INPUTS_END\n') == 1
    source = original.replace('A-H Jakarta ladder"', 'A-H Sessions + concept labels"', 1)
    # Bounded new objects need headroom alongside historical/context drawings.
    source = source.replace('max_labels_count=200, max_lines_count=150', 'max_labels_count=300, max_lines_count=250', 1)
    source = source.replace('// REVIEW_INPUTS_END\n', '// REVIEW_INPUTS_END\n' + INPUTS, 1)
    source = source.replace(OLD_CAPTION, NEW_CAPTION, 1)
    annotations = (PINE / 'session_plan_labels.pine.inc').read_text()
    source += '\n' + annotations
    restored = source.removesuffix('\n' + annotations).replace(INPUTS, '', 1)
    restored = restored.replace(NEW_CAPTION, OLD_CAPTION, 1)
    restored = restored.replace('A-H Sessions + concept labels"', 'A-H Jakarta ladder"', 1)
    restored = restored.replace('max_labels_count=300, max_lines_count=250', 'max_labels_count=200, max_lines_count=150', 1)
    assert restored.encode() == raw, 'A change escaped the isolated presentation additions'
    assert 'chart.left_visible_bar_time' not in source and 'chart.right_visible_bar_time' not in source
    return source


if __name__ == '__main__':
    for kind in PARENTS:
        source = generate(kind)
        path = PINE / f'{kind}_session_labels.pine'
        if '--check' in sys.argv:
            assert path.read_text() == source, f'Regenerate {path.name}'
        else:
            path.write_text(source)
        print(path.name, sha256(source.encode()).hexdigest())
