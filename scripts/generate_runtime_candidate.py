"""Generate the runtime experiment from the frozen M15 research pair."""

from hashlib import sha256
from pathlib import Path
import sys
from textwrap import indent

PINE = Path(__file__).resolve().parents[1] / 'pine/experiments'
PARENTS = {
    'indicator': '3e61a715171967e3594278ef5d9ed1c496766488143e524596b11b2398769dae',
    'strategy': '7cb9707f32b545447de8ddd4fe0a18b6baf53fe47ac084d6f2e5146d897be4d8',
}


def generate(kind, expected):
    parent = PINE / f'{kind}_m15_alignment.pine'
    raw = parent.read_bytes()
    if sha256(raw).hexdigest() != expected:
        raise SystemExit(f'{parent.name}: frozen source changed')
    source = raw.decode()

    def replace(anchor, replacement):
        nonlocal source
        if source.count(anchor) != 1:
            raise SystemExit(f'Expected one {kind} anchor: {anchor[:85]}')
        source = source.replace(anchor, replacement, 1)

    replace('· M15 alignment research"', '· Runtime research"')

    # Capture headers are constant across bars. Only sequence, kind, and the
    # observations that follow the header have to be serialized per event.
    old_envelope = source.split('diagEnvelope(', 1)[1].split('\ndiagEmit(', 1)[0]
    signature, identity, body = old_envelope.splitlines()
    identity_prefix, _ = identity.split(' + str.tostring(diagnosticLedger.sequence)', 1)
    envelope_prefix, suffix = body.split(""" + ',"sequence":'""", 1)
    replace('diagEnvelope(' + old_envelope, '\n'.join((
        'var string diagnosticIdentityPrefix = ' + identity_prefix.split(' = ', 1)[1],
        'var string diagnosticEnvelopePrefix = ' + envelope_prefix.strip(),
        'diagEnvelope(' + signature,
        "    string sequence = str.tostring(diagnosticLedger.sequence)",
        "    string captureIdentity = diagnosticIdentityPrefix + sequence + ']'",
        '''    diagnosticEnvelopePrefix + ',"sequence":' + sequence''' +
        suffix.removeprefix(' + str.tostring(diagnosticLedger.sequence)'),
    )))

    replace("diagnosticLastBlock = array.new<string>(9, 'Not evaluated')",
            "diagnosticLastBlock = array.new<string>(9, 'Not evaluated on this bar')")
    replace("""diagStartBar() =>
    array.clear(diagnosticQualified)
    array.clear(diagnosticQualifiedModules)
    for index = 0 to array.size(diagnosticLastBlock) - 1
        array.set(diagnosticLastBlock, index, 'Not evaluated on this bar')
        array.set(diagnosticSelection, index, 'NOT_EVALUATED')
    if diagInside()
""", """diagResetBarState() =>
    array.clear(diagnosticQualified)
    array.clear(diagnosticQualifiedModules)
    array.fill(diagnosticLastBlock, 'Not evaluated on this bar')
    array.fill(diagnosticSelection, 'NOT_EVALUATED')
    0
diagStartBar() =>
    if diagInside()
        diagResetBarState()
""")
    # Reset once on the first confirmed bar past the range so the dashboard
    # keeps showing the current bar's status, even after the capture has ended.
    replace("        diagnosticLedger.ended := true\n    0",
            "        diagnosticLedger.ended := true\n        diagResetBarState()\n    0")
    for name in ['diagDetected', 'diagLifecycle']:
        start = source.index('\n' + name + '(') + 1
        end = source.index('\n    0\n', start)
        signature, body = source[start:end].split('\n', 1)
        replace(source[start:end], signature + '\n    if diagInside()\n' + indent(body, '    '))

    # Fixed targets have no dependency on the opposing structural level set.
    # Hybrid and Structure retain the original rounding and ordering rules.
    start = source.index('\ngetTargets(') + 1
    end = source.index('\n\noptionalLiquidity(', start)
    original_targets = source[start:end]
    signature, body = original_targets.split('\n', 1)
    level_collection, _ = body.split("    array.sort(opposing,", 1)
    replacements = '''    float targetOne = math.round_to_mintick(planned + direction * risk * r1)
    float targetTwo = math.round_to_mintick(planned + direction * risk * r2)
    float targetThree = math.round_to_mintick(planned + direction * risk * r3)
    string source = 'Fixed R projection'
    bool available = targetMode != 'Structure'
    if targetMode != 'Fixed R'
'''
    replacements += indent(level_collection, '    ')
    replacements += '''        if array.size(opposing) >= 3
            array.sort(opposing, direction == 1 ? order.ascending : order.descending)
            targetOne := array.get(opposing, 0)
            targetTwo := array.get(opposing, 1)
            targetThree := array.get(opposing, 2)
            source := 'Confirmed structure'
            available := true
        else if targetMode == 'Hybrid'
            source := 'Hybrid: fixed-R fallback'
    [targetOne, targetTwo, targetThree, source, available]'''
    replace(original_targets, signature + '\n' + replacements)
    return source


if __name__ == '__main__':
    for kind, expected in PARENTS.items():
        content = generate(kind, expected)
        output = PINE / f'{kind}_runtime.pine'
        if '--check' in sys.argv:
            if not output.exists() or output.read_text() != content:
                raise SystemExit(f'{output.name}: regenerate the runtime candidate')
        else:
            output.write_text(content)
        print(output.name, sha256(content.encode()).hexdigest())
