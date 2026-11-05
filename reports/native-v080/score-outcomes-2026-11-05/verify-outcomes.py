"""Independent reconciliation from preserved native CSVs, without the JS analyzer."""
from pathlib import Path
from hashlib import sha256
import csv
import json

HERE = Path(__file__).resolve().parent
CAPTURES = HERE.parent / 'continuation-2026-11-05'
receipt = json.loads((CAPTURES / 'verification-receipt.json').read_text())
checks = []
for stem, result_name in [('corrected-strategy', 'corrected'), ('legacy-trace', 'legacy')]:
    path = CAPTURES / (stem + '-native.csv')
    digest = sha256(path.read_bytes()).hexdigest()
    assert digest == receipt['nativeCsvArtifacts'][path.name]['sha256']
    plans, groups, exits = {}, {}, []
    key = lambda r, group=False: (r['symbol'], r['timeframe'], r['planTimestamp' if group else 'timestamp'], r['module' if group else 'strategy'])
    for row in csv.DictReader(path.read_text(encoding='utf-8-sig').splitlines()):
        message = row['Message']
        if message.startswith('PLAN_AUDIT '):
            plan = json.loads(message[len('PLAN_AUDIT '):])
            assert key(plan) not in plans
            plans[key(plan)] = plan
        elif message.startswith('TRADE_GROUP_AUDIT '):
            group = json.loads(message[len('TRADE_GROUP_AUDIT '):])
            assert key(group, True) not in groups
            groups[key(group, True)] = group
        elif message.startswith('TRADE_EXIT_AUDIT '):
            exits.append(json.loads(message[len('TRADE_EXIT_AUDIT '):]))
    result = json.loads((HERE / (result_name + '-outcomes.json')).read_text())
    assert len(plans) == len(groups) == result['counts']['completedPositions'] == 92
    assert len(exits) == result['overall']['actualExitRows']
    independently_joined = []
    for identity, group in groups.items():
        plan = plans[identity]
        rows = [r for r in exits if key(r, True) == identity and r['entryTime'] == group['entryTime']]
        assert rows
        assert abs(sum(abs(r['size']) for r in rows) - group['initialQty']) < 1e-8
        assert abs(sum(r['profit'] for r in rows) - group['netProfitDelta']) < 1e-7
        independently_joined.append({'module': plan['strategy'], 'quality': plan['quality'],
            'net': group['netProfitDelta'], 'commission': sum(r['commission'] for r in rows),
            'netR': group['netProfitDelta'] / (group['initialQty'] * group['accountRiskPerUnit'])})
    for score in sorted({p['quality'] for p in independently_joined}):
        selected = [p for p in independently_joined if p['quality'] == score]
        actual = result['byScore'][str(score)]
        assert actual['completePositions'] == len(selected)
        assert actual['wins'] == sum(p['net'] > 0 for p in selected)
        assert abs(actual['net'] - sum(p['net'] for p in selected)) < 1e-8
        assert abs(actual['commission'] - sum(p['commission'] for p in selected)) < 1e-8
        assert abs(actual['meanNetRToPlannedInitialCashRisk'] - sum(p['netR'] for p in selected) / len(selected)) < 1e-9
    for module in {p['module'] for p in independently_joined}:
        scores = sorted({p['quality'] for p in independently_joined if p['module'] == module})
        assert scores == result['scoreSupportByModule'][module]
    assert abs(result['overall']['net'] - sum(p['net'] for p in independently_joined)) < 1e-8
    checks.append({'capture': str(path.relative_to(HERE.parents[2])), 'sha256': digest,
        'positions': len(groups), 'exitRows': len(exits), 'independentScoreAndNetRReconciliation': True})
output = {'status': 'PASSED', 'method': 'Independent Python raw-CSV join and arithmetic; not native execution or OOS.', 'captures': checks}
(HERE / 'independent-verification.json').write_text(json.dumps(output, indent=2) + '\n')
print(json.dumps(output, indent=2))
