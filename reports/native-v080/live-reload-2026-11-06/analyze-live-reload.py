"""Require observed realtime closes before comparing them with historical reload."""
from pathlib import Path
import csv
import importlib.util
import json
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
            if key in result:
                raise ValueError('Duplicate execution metadata')
            result[key] = {'csvLine': line, 'displayPrefix': row['Date'], **value}
    return result


def main():
    before_path, after_path = D / 'live-final-raw.csv', D / 'after-reload-raw.csv'
    before, after = snapshots.read_capture(before_path), snapshots.read_capture(after_path)
    a, b = phase_records(before_path), phase_records(after_path)
    for capture, phases in ((before, a), (after, b)):
        if set(capture['records']) != set(phases):
            raise ValueError('Missing/unpaired execution metadata')
        for key, phase in phases.items():
            for field in ('parentSourceSha256', 'symbol', 'timeframe'):
                if phase[field] != capture['records'][key][field]:
                    raise ValueError(f'Execution context differs: {field}')
    live_keys = [key for key, value in a.items() if value['realtime']]
    if not live_keys:
        raise ValueError('NO_REALTIME_EVIDENCE: no genuine realtime confirmed close captured')
    for key in live_keys:
        if key not in b or not b[key]['history'] or b[key]['realtime']:
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
        'liveCloseSnapshotComparison': snapshots.compare(subset(before), subset(after)),
        'allCapturedSnapshotComparison': snapshots.compare(before, after),
        'actualPlanCountOnLiveBars': sum(before['records'][k]['plan'] is not None for k in live_keys),
        'runtimeInputs': json.loads((D / 'indicator-runtime-inputs.json').read_text()),
    }
    (D / 'live-reload-analysis.json').write_text(json.dumps(result, indent=2, default=lambda x: str(x) if isinstance(x, Decimal) else x) + '\n')
    print(json.dumps({'liveCloses': len(live_keys), 'dataAndStateEqual': result['liveCloseSnapshotComparison']['dataAndStateEqual'], 'differenceCounts': result['liveCloseSnapshotComparison']['differenceCounts'], 'qualifiedPlansOnLiveBars': result['actualPlanCountOnLiveBars']}, indent=2))


if __name__ == '__main__':
    main()
