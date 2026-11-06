"""Compare two genuine native exports without rewriting either raw file."""
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

D = Path(__file__).resolve().parent
ROOT = D.parents[2]
EXPECTED = {
    'indicator-before-reload-raw.csv': '49c7a0f93d26ecd0feccd10f0c4a38870b5eee19a2fe84b5ad97fb5a7503b3b7',
    'indicator-after-reload-raw.csv': 'e2504a6e35844078ab46bd2d9406c8a752518b29475f1b97ebf4525a1a1fd015',
}


def read(path):
    with path.open(newline='') as stream:
        reader = csv.DictReader(stream)
        assert reader.fieldnames == ['Date', 'Message']
        rows = list(reader)
    plans = {}
    for line, row in enumerate(rows, 2):
        if row['Message'].startswith('PLAN_AUDIT '):
            plan = json.loads(row['Message'][11:])
            key = (plan['symbol'], plan['timeframe'], plan['timestamp'])
            assert key not in plans, ('duplicate plan', line, key)
            plans[key] = {'csvLine': line, 'displayPrefix': row['Date'], 'plan': plan}
    return rows, plans


artifacts = []
for name, expected in EXPECTED.items():
    actual = hashlib.sha256((D / name).read_bytes()).hexdigest()
    assert actual == expected, (name, actual)
    artifacts.append({'path': name, 'sha256': actual})
before, bp = read(D / 'indicator-before-reload-raw.csv')
after, ap = read(D / 'indicator-after-reload-raw.csv')
assert len(before) == len(after) == 324
assert len(bp) == len(ap) == 75
assert bp.keys() == ap.keys()
mismatches = [{'key': key, 'before': bp[key], 'after': ap[key]}
              for key in bp if bp[key]['plan'] != ap[key]['plan']]
messages_equal = [r['Message'] for r in before] == [r['Message'] for r in after]
prefix_instants_equal = [datetime.fromisoformat(r['Date']) for r in before] == [datetime.fromisoformat(r['Date']) for r in after]
assert messages_equal and prefix_instants_equal and not mismatches
target = ('FOREXCOM:XAUUSD', '5', 1793964000000)
assert target in bp
plan = bp[target]['plan']
assert plan == {
    'scriptVersion': '0.8.0', 'symbol': 'FOREXCOM:XAUUSD', 'timeframe': '5',
    'strategy': 'C_TURTLE_SOUP', 'timestamp': 1793964000000,
    'setupTimestamp': 1793963100000, 'direction': 1, 'entryMode': 'Close',
    'entry': 4066.0, 'sl': 4062.66, 'tp1': 4069.34, 'tp2': 4072.68,
    'tp3': 4076.02, 'quality': 90, 'executionAccepted': True,
    'executionModel': 'INDICATOR_ESTIMATE',
}
lifecycle = []
for line, row in enumerate(before, 2):
    if row['Message'].startswith('{'):
        value = json.loads(row['Message'])
        if value.get('timestamp') == target[2]:
            lifecycle.append({'csvLine': line, 'displayPrefix': row['Date'], 'payload': value})
assert [r['payload']['eventType'] for r in lifecycle] == ['BUY_SIGNAL', 'ENTRY_TRIGGERED', 'TP1_HIT']
_, old = read(ROOT / 'reports/native-v080/live-reload-2026-11-06/stable-indicator-raw.csv')
old_changes = [key for key in old if key not in bp or old[key]['plan'] != bp[key]['plan']]
assert len(old) == 74 and not old_changes and set(bp) - set(old) == {target}
result = {
    'status': 'SAME_INDICATOR_RELOAD_MATCH_LIMITED_SCOPE', 'priceTolerance': 0,
    'artifacts': artifacts, 'beforeRecords': len(before), 'afterRecords': len(after),
    'plansEach': len(bp), 'plannedFieldMismatches': mismatches,
    'allExportedMessageStringsIdentical': messages_equal,
    'allDisplayPrefixesRepresentIdenticalInstants': prefix_instants_equal,
    'target': {'before': bp[target], 'after': ap[target],
               'planTimeUTC': datetime.fromtimestamp(target[2] / 1000, timezone.utc).isoformat(),
               'beforeLifecycle': lifecycle},
    'earlierStableIndicatorComparison': {'previousPlans': 74, 'unchangedPreviousPlans': 74,
                                       'newPlans': 1, 'oldPlanChanges': old_changes},
    'sourceAttribution': {
        'visibleSavedStudy': 'XAUUSD SMART SCALPER PRO · A-H Confirmation review',
        'priorVerifiedLocalSource': 'pine/experiments/indicator_confirmation_review.pine',
        'priorVerifiedSHA256': '0a19862b22973e13a31abb29e59a75a18f3e0b84bb76deb2154eae7fa4cd1ed3',
        'method': 'Existing saved study retained through reload; no source update or compile in this capture. Raw payloads do not authenticate a full source hash.',
        'freshFullCopybackPerformed': False,
    },
    'limitations': [
        'Same-Indicator reload comparison, not Indicator/Strategy execution or stream parity.',
        'The plan was already visible when observation resumed; first appearance was not observed.',
        'No embedded bar-state/full-market snapshot; cannot certify live-close first appearance or general non-repainting.',
        'TP1_HIT is an Indicator OHLC-touch estimate, not an actual broker/emulator partial fill.',
        'The final screenshot shows Time exit (est.) at11:35UTC, after these exports; it is not an actual realized-PnL record.',
        'No Strategy trade export, realized PnL, spread-calibrated result or OOS conclusion for this new plan.',
    ],
}
(D / 'reload-analysis.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ('status', 'plansEach', 'plannedFieldMismatches',
    'allExportedMessageStringsIdentical', 'allDisplayPrefixesRepresentIdenticalInstants')}, indent=2))
