"""Read-only Nov5 traces from exact confirmation-review parents; no input edits."""
from hashlib import sha256
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
HELPER = (ROOT / 'pine/experiments/nov5_candidate_trace.pine.inc').read_text()
PARENTS = [
    ('pine/experiments/indicator_confirmation_review.pine', '0a19862b22973e13a31abb29e59a75a18f3e0b84bb76deb2154eae7fa4cd1ed3', 'indicator_nov5_trace.pine', 'Nov5 Indicator trace'),
    ('pine/experiments/strategy_confirmation_review.pine', 'bbabd036eea548177eaaa85c45d33da07ce2b1289748dc6b041327f48969609a', 'strategy_nov5_trace.pine', 'Nov5 Strategy trace'),
]

def replace_once(source, old, new):
    if source.count(old) != 1:
        raise SystemExit(f'Expected one Nov5 instrumentation anchor: {old!r}')
    return source.replace(old, new, 1)

def generate(path, expected, variant):
    raw = (ROOT / path).read_bytes()
    if sha256(raw).hexdigest() != expected:
        raise SystemExit(f'{path} changed; refusing unknown Nov5 trace parent.')
    source = raw.decode()
    start = source.index('"') + 1
    end = source.index('"', start)
    source = source[:end] + ' · ' + variant + source[end:]
    definitions = f"const string TRACE_VARIANT = '{variant}'\nconst string TRACE_PARENT_SHA = '{expected}'\n"
    source = replace_once(source, '// Flags consumed by both the visual indicator and strategy adapter.\n', '// NOV5_TRACE_HELPER_BEGIN\n' + definitions + HELPER + '// NOV5_TRACE_HELPER_END\n// Flags consumed by both the visual indicator and strategy adapter.\n')
    source = replace_once(source, '    updateCandidates()\n', "    // NOV5_TRACE_BEFORE_UPDATE\n    researchNov5Trace('BEFORE_UPDATE', cancelOrder)\n    updateCandidates()\n    // NOV5_TRACE_AFTER_UPDATE\n    researchNov5Trace('AFTER_UPDATE', cancelOrder)\n")
    return replace_once(source, '    if enableA and stage == 1 and bar_index > setupBar\n', "    // NOV5_TRACE_AFTER_ARBITRATION\n    researchNov5Trace('AFTER_ARBITRATION', cancelOrder)\n    if enableA and stage == 1 and bar_index > setupBar\n")

if __name__ == '__main__':
    for parent, expected, name, variant in PARENTS:
        content = generate(parent, expected, variant)
        output = ROOT / 'pine/experiments' / name
        if '--check' in sys.argv:
            if not output.exists() or output.read_text() != content:
                raise SystemExit(f'{name} differs; regenerate Nov5 traces')
        else:
            output.write_text(content)
        print(f'{output.relative_to(ROOT)} sha256: {sha256(content.encode()).hexdigest()}')
