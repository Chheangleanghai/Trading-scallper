"""Require observed realtime closes before comparing them with historical reload."""
from pathlib import Path
import csv
import importlib.util
import json
import hashlib
from decimal import Decimal

D = Path(__file__).resolve().parent
ROOT = D.parents[2]
spec = importlib.util.spec_from_file_location('snapshots', ROOT / 'scripts/compare-data-snapshots.py')
snapshots = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snapshots)


def phase_records(path):
    result = {}
    with path.open(newline='') as stream:
        rows = csv.DictReader(stream)
        if rows.fieldnames != ['Date', 'Message']:
            raise ValueError('Wrong CSV header')
        for line, row in enumerate(rows, 2):
            marker = 'SNAPSHOT_EXECUTION_AUDIT '
            if not row['Message'].startswith(marker):
                continue
            value = json.loads(row['Message'][len(marker):])
            if value['schema'] != 'snapshot-execution/v1':
                raise ValueError('Wrong execution metadata schema')
            for field in ('time', 'timeClose', 'observedAt'):
                if type(value[field]) is not int:
                    raise ValueError(f'Invalid {field}')
            for field in ('realtime', 'history', 'confirmed'):
                if type(value[field]) is not bool:
                    raise ValueError(f'Invalid {field}')
            if not value['confirmed'] or value['history'] == value['realtime']:
                raise ValueError('Not a classified confirmed execution')
            key = (value['time'], value['timeClose'])
            result.setdefault(key, []).append({'csvLine': line, 'displayPrefix': row['Date'], **value})
    return result


def canonical_capture(path, phases, derived_name):
    """Explicitly aggregate only byte-equivalent data observations; keep raw origins."""
    grouped = {}
    with path.open(newline='') as stream:
        for line, row in enumerate(csv.DictReader(stream), 2):
            marker = 'DATA_SNAPSHOT_AUDIT '
            if not row['Message'].startswith(marker):
                continue
            value = json.loads(row['Message'][len(marker):], parse_float=Decimal,
                               parse_constant=snapshots.invalid_constant,
                               object_pairs_hook=snapshots.pairs_no_duplicates)
            snapshots.validate_record(value, f'{path}:{line}')
            grouped.setdefault((value['time'], value['timeClose']), []).append((line, row['Message'], value))
    if set(grouped) != set(phases):
        raise ValueError('Missing/unpaired execution metadata')
    origins = []
    for key, values in grouped.items():
        if len(values) != len(phases[key]):
            raise ValueError('Data/phase observation count differs')
        for index, (line, message, value) in enumerate(values):
            phase = phases[key][index]
            if phase['csvLine'] <= line or (index + 1 < len(values) and phase['csvLine'] >= values[index + 1][0]):
                raise ValueError('Data/phase sequence is ambiguous')
            for field in ('parentSourceSha256', 'symbol', 'timeframe'):
                if value[field] != phase[field]:
                    raise ValueError(f'Execution context differs: {field}')
            if snapshots.differences(values[0][2], value, 'snapshot'):
                raise ValueError(f'NONIDENTICAL_CLOSE_UPDATES at {key}; refusing to select one observation')
        origins.append({'barOpen': key[0], 'barClose': key[1], 'rawObservationCount': len(values),
                        'rawDataCsvLines': [x[0] for x in values], 'rawPhaseCsvLines': [x['csvLine'] for x in phases[key]],
                        'allDataObservationsExactlyEqual': True})
    derived = D / derived_name
    if derived.resolve() == path.resolve():
        raise ValueError('Derived output cannot overwrite raw evidence')
    derived.write_text('\n'.join(values[0][1] for key, values in sorted(grouped.items())) + '\n')
    capture = snapshots.read_capture(derived)
    capture['rawOrigin'] = {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                            'method': 'Explicit per-bar aggregation only when every captured data snapshot is exactly equal; raw CSV and all execution metadata preserved.', 'groups': origins}
    return capture


def main():
    before_path, after_path = D / 'stable-live-final-raw.csv', D / 'stable-after-reload-raw.csv'
    a, b = phase_records(before_path), phase_records(after_path)
    before = canonical_capture(before_path, a, 'stable-live-unique-derived.log')
    after = canonical_capture(after_path, b, 'stable-reload-unique-derived.log')
    live_keys = [key for key, values in a.items() if all(v['realtime'] for v in values)]
    if not live_keys:
        raise ValueError('NO_REALTIME_EVIDENCE: no genuine realtime confirmed close captured')
    for key in live_keys:
        if key not in b or not all(v['history'] and not v['realtime'] for v in b[key]):
            raise ValueError('Realtime close lacks a historical reload counterpart')
    def subset(capture):
        return {**capture, 'records': {k: capture['records'][k] for k in live_keys},
                'locations': {k: capture['locations'][k] for k in live_keys}, 'snapshotCount': len(live_keys)}
    snapshots.TARGET_OPEN = live_keys[0][0]
    result = {
        'schema': 'live-closed-bar-reload-review/v1',
        'scope': 'Only these observed closed bars and logged fields; no valid-entry first-appearance, intrabar stability, general non-repainting or Bar Replay certification.',
        'realtimeCloseCount': len(live_keys),
        'executionTransitions': [{'barOpen': k[0], 'barClose': k[1], 'before': a[k], 'after': b[k]} for k in live_keys],
        'explicitDuplicateHandling': {'before': before['rawOrigin'], 'after': after['rawOrigin']},
        'liveCloseSnapshotComparison': snapshots.compare(subset(before), subset(after)),
        'allCapturedSnapshotComparison': snapshots.compare(before, after),
        'actualPlanCountOnLiveBars': sum(before['records'][k]['plan'] is not None for k in live_keys),
        'runtimeInputs': json.loads((D / 'indicator-stable-runtime-inputs.json').read_text()),
    }
    (D / 'live-reload-analysis.json').write_text(json.dumps(result, indent=2, default=lambda x: str(x) if isinstance(x, Decimal) else x) + '\n')
    print(json.dumps({'liveCloses': len(live_keys), 'dataAndStateEqual': result['liveCloseSnapshotComparison']['dataAndStateEqual'], 'differenceCounts': result['liveCloseSnapshotComparison']['differenceCounts'], 'qualifiedPlansOnLiveBars': result['actualPlanCountOnLiveBars']}, indent=2))


if __name__ == '__main__':
    main()
