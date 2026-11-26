"""Build the research pair that can require confirmed M15 structure alignment."""

from hashlib import sha256
from pathlib import Path
import sys

PINE = Path(__file__).resolve().parents[1] / 'pine/experiments'
PARENTS = {
    'indicator': 'e416e2e5d12a14fc31cff480b6b114eb14192e76b5f07c2f8860061b2e6e8e62',
    'strategy': '45461801b5927138f7318a8e90a0cf947e9fae81c0efe0d71beca3400aadfda0',
}
BLOCKER = 'Confirmed M15 structure does not align'


def generate(kind, expected):
    parent = PINE / f'{kind}_execution_cost.pine'
    raw = parent.read_bytes()
    if sha256(raw).hexdigest() != expected:
        raise SystemExit(f'{parent.name}: frozen source changed')
    source = raw.decode()

    def replace(anchor, replacement):
        nonlocal source
        if source.count(anchor) != 1:
            raise SystemExit(f'Expected one {kind} anchor: {anchor[:85]}')
        source = source.replace(anchor, replacement, 1)

    replace('· Execution cost research"', '· M15 alignment research"')
    anchor = "trendFilter = input.bool(true, 'Require H1 alignment')"
    replace(anchor, anchor + """
m15Filter = input.bool(false, 'Require M15 confirmed structure alignment', group='Alignment research', tooltip='Uses the previous completed 15-minute candle. Neutral or opposite structure blocks a new plan.')""")
    replace('rrFeasible(int direction,', """m15StructurePass(bool required, int direction, int confirmedStructure) =>
    not required or ((direction == 1 or direction == -1) and nz(confirmedStructure, 0) == direction)

rrFeasible(int direction,""")
    anchor = "                bool safe = blocked == ''"
    replace(anchor, f"""                bool m15OK = m15StructurePass(m15Filter, direction, mTrend)
                if blocked == '' and not m15OK
                    blocked := '{BLOCKER}'
{anchor}""")
    anchor = '                    array<string> diagnosticFailed = array.new<string>()'
    replace(anchor, f"""                    if m15Filter
                        array.push(diagnosticChecks, m15OK)
                        array.push(diagnosticNames, 'M15_STRUCTURE')
                        array.push(diagnosticMessages, '{BLOCKER}')
{anchor}""")
    replace(' + diagnosticStop + diagnosticSnr + diagnosticCost)',
            """ + diagnosticStop + diagnosticSnr + diagnosticCost + ',"m15Structure":' + diagInt(nz(mTrend, 0)))""")
    capture = next(line for line in source.splitlines() if "diagEmit('CAPTURE_START'" in line)
    replace(capture, capture[:-1] + """ + ',"requireM15Structure":' + diagBool(m15Filter))""")
    return source


if __name__ == '__main__':
    for kind, expected in PARENTS.items():
        content = generate(kind, expected)
        output = PINE / f'{kind}_m15_alignment.pine'
        if '--check' in sys.argv:
            if not output.exists() or output.read_text() != content:
                raise SystemExit(f'{output.name}: regenerate M15 alignment candidate')
        else:
            output.write_text(content)
        print(output.name, sha256(content.encode()).hexdigest())
