"""Generate read-only parity traces in separate files; refuse drifting parents."""
from hashlib import sha256
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
HELPER = (ROOT / 'pine/experiments/candidate_trace.pine.inc').read_text()
PARENTS = [
    ('pine/indicator.pine', 'c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4', 'indicator_candidate_trace.pine', 'Indicator trace'),
    ('pine/experiments/strategy_exit_audit.pine', 'a8267588770637b4a75e50367267dac11a8ba6783cdd9084e7d9620ff3961623', 'strategy_legacy_candidate_trace.pine', 'Legacy Strategy trace'),
    ('pine/experiments/strategy_quantity_units.pine', 'bf6dd641c6af4970161822a1e55a2808148d6a5faa4213dff6d9e3d5549ad7ed', 'strategy_quantity_candidate_trace.pine', 'Quantity Strategy trace'),
]


def replace_once(source, old, new):
    if source.count(old) != 1:
        raise SystemExit(f'Expected one instrumentation anchor: {old!r}')
    return source.replace(old, new, 1)


def generate(path, expected, variant):
    raw = (ROOT / path).read_bytes()
    if sha256(raw).hexdigest() != expected:
        raise SystemExit(f'{path} changed; refusing to instrument an unknown parent.')
    source = raw.decode()
    # Only the display title, read-only helper and three snapshot calls differ.
    start = source.index('"') + 1
    end = source.index('"', start)
    title = source[start:end]
    source = source[:start] + title + ' · ' + variant + source[end:]
    definitions = f"const string TRACE_VARIANT = '{variant}'\nconst string TRACE_PARENT_SHA = '{expected}'\n"
    source = replace_once(source, '// Flags consumed by both the visual indicator and strategy adapter.\n', '// CANDIDATE_TRACE_HELPER_BEGIN\n' + definitions + HELPER + '// CANDIDATE_TRACE_HELPER_END\n// Flags consumed by both the visual indicator and strategy adapter.\n')
    source = replace_once(source, '    updateCandidates()\n', "    // CANDIDATE_TRACE_BEFORE_UPDATE\n    researchCandidateTrace('BEFORE_UPDATE', cancelOrder)\n    updateCandidates()\n    // CANDIDATE_TRACE_AFTER_UPDATE\n    researchCandidateTrace('AFTER_UPDATE', cancelOrder)\n")
    return replace_once(source, '    if enableA and stage == 1 and bar_index > setupBar\n', "    // CANDIDATE_TRACE_AFTER_ARBITRATION\n    researchCandidateTrace('AFTER_ARBITRATION', cancelOrder)\n    if enableA and stage == 1 and bar_index > setupBar\n")


if __name__ == '__main__':
    for parent, expected, name, variant in PARENTS:
        content = generate(parent, expected, variant)
        output = ROOT / 'pine/experiments' / name
        if '--check' in sys.argv:
            if not output.exists() or output.read_text() != content:
                raise SystemExit(f'{name} differs; run python3 scripts/generate_candidate_trace.py')
        else:
            output.write_text(content)
        print(f'{output.relative_to(ROOT)} sha256: {sha256(content.encode()).hexdigest()}')
