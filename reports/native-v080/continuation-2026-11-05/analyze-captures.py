"""Reproduce this capture's comparisons from unmodified TradingView CSVs."""
from pathlib import Path
from hashlib import sha256
from datetime import datetime, timezone
import csv
import json
import re

ROOT = Path(__file__).resolve().parent
PHASES = ('BEFORE_UPDATE', 'AFTER_UPDATE', 'AFTER_ARBITRATION')
FIELDS = ('scriptVersion', 'setupTimestamp', 'direction', 'strategy', 'entryMode',
          'entry', 'sl', 'tp1', 'tp2', 'tp3', 'quality')
IDS = ('A_SWEEP_MSS_FVG', 'B_CRT', 'C_TURTLE_SOUP', 'D_SNR', 'E_DEMAND',
       'E_SUPPLY', 'F_TREND_PULLBACK', 'G_AMD', 'H_QUASIMODO')


def dump(name, value):
    (ROOT / name).write_text(json.dumps(value, indent=2) + '\n')


def read_capture(name):
    path = ROOT / name
    records = list(csv.DictReader(path.read_text(encoding='utf-8-sig').splitlines()))
    out = {'engines': {}, 'candidates': {}, 'plans': {}, 'records': len(records),
           'sha256': sha256(path.read_bytes()).hexdigest()}
    for row in records:
        message = row['Message']
        for marker, target in (('ENGINE_TRACE ', 'engines'),
                               ('CANDIDATE_TRACE ', 'candidates'), ('PLAN_AUDIT ', 'plans')):
            if not message.startswith(marker):
                continue
            value = json.loads(message[len(marker):])
            assert value['symbol'] == 'FOREXCOM:XAUUSD' and value['timeframe'] == '5'
            if target == 'plans':
                key = value['timestamp']
            else:
                assert value['phase'] in PHASES and value['barClose'] - value['barOpen'] == 300000
                key = (value['barClose'], value['phase'])
                if target == 'candidates':
                    assert value['id'] in IDS
                    key += (value['id'],)
            assert key not in out[target], (name, 'duplicate', key)
            out[target][key] = value
    if out['engines']:
        for time, phase in out['engines']:
            assert all((time, phase, module) in out['candidates'] for module in IDS)
        assert len(out['candidates']) == 9 * len(out['engines'])
        times = sorted(set(t for t, phase in out['engines']))
        assert all((t, phase) in out['engines'] for t in times for phase in PHASES)
    return out


def compare(left, right):
    times = sorted(left['plans'].keys() | right['plans'].keys())
    differences = []
    common = exact = 0
    for time in times:
        a, b = left['plans'].get(time), right['plans'].get(time)
        if a is None or b is None:
            differences.append({'timestamp': time, 'field': 'missing-plan',
                                'missingFrom': 'indicator' if a is None else 'strategy'})
            continue
        common += 1
        fields = [f for f in FIELDS if a[f] != b[f]]
        exact += not fields
        differences.extend({'timestamp': time, 'field': f, 'indicator': a[f],
                            'strategy': b[f]} for f in fields)
    return {'indicatorPlans': len(left['plans']), 'strategyPlans': len(right['plans']),
            'commonPlans': common, 'exactCommonPlans': exact, 'tolerance': 0,
            'parity': not differences, 'mismatches': differences}


def snapshot(capture, time, module):
    e = capture['engines'].get((time, 'BEFORE_UPDATE'))
    if e is None:
        return {'status': 'OUTSIDE_TRACE_WINDOWS'}
    ready = capture['candidates'][(time, 'AFTER_UPDATE', module)]
    after = capture['candidates'][(time, 'AFTER_ARBITRATION', module)]
    conditions = []
    if not e['planSlotAvailable']:
        conditions.append('SLOT_UNAVAILABLE')
    if e['sessionTrades'] >= e['quotaLimit']:
        conditions.append('SESSION_QUOTA')
    if e['lastSignalBar'] is not None and e['barIndex'] - e['lastSignalBar'] < e['cooldownBars']:
        conditions.append('COOLDOWN')
    if not ready['ready']:
        conditions.append('CANDIDATE_NOT_READY')
    evaluated = e['planSlotAvailable'] and ready['enabled'] and ready['ready']
    return {'engineBeforeUpdate': e, 'candidateAfterUpdate': ready,
            'candidateAfterArbitration': after, 'observedConditions': conditions,
            'evaluatedThisBar': evaluated,
            'currentRejection': after['rejectionReason'] if evaluated else None,
            'note': 'Retained quality/rejection fields are not current checks unless evaluatedThisBar is true.'}


def investigate(left, right, comparison):
    results = []
    for time in sorted(set(m['timestamp'] for m in comparison['mismatches'])):
        plans = {'indicator': left['plans'].get(time), 'strategy': right['plans'].get(time)}
        modules = sorted(set(v['strategy'] for v in plans.values() if v))
        item = {'timestamp': time, 'utc': datetime.fromtimestamp(time / 1000, timezone.utc).isoformat(),
                'plans': plans, 'modules': {}}
        for module in modules:
            item['modules'][module] = {name: snapshot(cap, time, module)
                                       for name, cap in (('indicator', left), ('strategy', right))}
        setups = sorted(set(v['setupTimestamp'] for v in plans.values() if v))
        item['atSelectedSetupTimes'] = {
            str(t): {module: {name: snapshot(cap, t, module)
                              for name, cap in (('indicator', left), ('strategy', right))}
                     for module in modules} for t in setups}
        results.append(item)
    return results


def controls(file):
    text = (ROOT / file).read_text()
    text = text[text.index('container (showing'):]
    text = text[:text.index('pop up button Defaults')]
    return [re.sub(r'^\s*\d+ ', '', line).strip() for line in text.splitlines()
            if re.search(r'\d+ (?:checkbox|text field|combo box)', line)]


def merge_controls(prefix):
    result = controls(prefix + '-top.ax.txt')
    for part in ('middle', 'bottom'):
        values = controls(prefix + '-' + part + '.ax.txt')
        overlap = next((n for n in range(min(len(result), len(values)), 0, -1)
                        if result[-n:] == values[:n]), 0)
        assert overlap >= 5, (prefix, part, 'insufficient overlap')
        result.extend(values[overlap:])
    return result


if __name__ == '__main__':
    captures = {name: read_capture(name + '-trace-native.csv')
                for name in ('indicator', 'legacy', 'quantity')}
    assert captures['indicator']['engines'].keys() == captures['legacy']['engines'].keys()
    assert captures['indicator']['engines'].keys() == captures['quantity']['engines'].keys()
    inputs = {name: merge_controls(name + '-trace-inputs') for name in captures}
    assert inputs['indicator'] == inputs['legacy'] == inputs['quantity']
    assert len(inputs['indicator']) == 115
    for parent, name in (('indicator-native.csv', 'indicator'),
                         ('corrected-strategy-native.csv', 'quantity')):
        assert captures[name]['plans'] == read_capture(parent)['plans'], (name, 'trace altered plans')
    summary = {'status': 'GENUINE_NATIVE_EXPERIMENT_TRACES', 'matchedInputControls': 115,
               'traceBars': len(captures['indicator']['engines']) // 3,
               'completePhasesPerBar': list(PHASES), 'captures': {}, 'comparisons': {},
               'limits': ['Experiments, not frozen baseline release gates.',
                          'Bounded historical snapshots do not establish Replay/non-repainting.',
                          'Matching source labels in payloads alone do not authenticate a draft.']}
    for name, cap in captures.items():
        summary['captures'][name] = {k: cap[k] for k in ('records', 'sha256')}
        summary['captures'][name].update(engineRecords=len(cap['engines']),
                                         candidateRecords=len(cap['candidates']), plans=len(cap['plans']))
    for name in ('legacy', 'quantity'):
        comparison = compare(captures['indicator'], captures[name])
        summary['comparisons'][name] = comparison
        dump(name + '-candidate-investigation.json', investigate(captures['indicator'], captures[name], comparison))
    dump('native-trace-review.json', summary)
    print(json.dumps({name: {k: v for k, v in c.items() if k != 'mismatches'}
                      for name, c in summary['comparisons'].items()}, indent=2))
