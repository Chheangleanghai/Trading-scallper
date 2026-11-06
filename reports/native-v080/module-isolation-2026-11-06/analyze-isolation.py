"""Reproduce the genuine isolated A result; do not manufacture an empty G export."""
import csv
import hashlib
import json
import subprocess
from decimal import Decimal
from pathlib import Path

D = Path(__file__).resolve().parent
ROOT = D.parents[2]
raw = D / 'a-only-raw.csv'
assert hashlib.sha256(raw.read_bytes()).hexdigest() == '15e6fc91c6aaba33099f9ba057b042c33ca13e4e19783b27e449b7c869475a67'
with raw.open(newline='') as stream:
    reader = csv.DictReader(stream)
    assert reader.fieldnames == ['Date', 'Message']
    rows = list(reader)
text = '\n'.join(r['Message'] for r in rows)
program = """import {readFileSync} from 'node:fs';
import {analyzePlanOutcomes} from './scripts/analyze-plan-outcomes.mjs';
console.log(JSON.stringify(analyzePlanOutcomes(readFileSync(0,'utf8'),'Native A-only CSV Message column decoded in memory'),null,2));"""
checked = subprocess.run(['node', '--input-type=module', '-e', program], input=text,
                         text=True, capture_output=True, check=True, cwd=ROOT)
outcomes = json.loads(checked.stdout)
assert outcomes['counts'] == {'plans': 2, 'completedPositions': 2, 'incompletePositions': 0, 'plansWithoutExitRows': 0}
assert set(outcomes['byModule']) == {'A_SWEEP_MSS_FVG'}
exits = [json.loads(r['Message'][17:], parse_float=Decimal) for r in rows if r['Message'].startswith('TRADE_EXIT_AUDIT ')]
groups = [json.loads(r['Message'][18:], parse_float=Decimal) for r in rows if r['Message'].startswith('TRADE_GROUP_AUDIT ')]
assert len(exits) == len(groups) == 2
checks = []
for row, group in zip(exits, groups):
    assert row['entryTime'] == group['entryTime'] and row['entryId'] == group['module'] == 'A_SWEEP_MSS_FVG'
    gross = row['direction'] * (row['actualExit'] - row['actualEntry']) * abs(row['size']) * group['pointValue']
    fee = (row['actualEntry'] + row['actualExit']) * abs(row['size']) * group['pointValue'] * Decimal('0.0001')
    assert gross - fee == row['profit'] == group['netProfitDelta']
    assert fee == row['commission'] and abs(row['size']) == group['initialQty']
    assert row['exitId'] == 'Close entry(s) order A_SWEEP_MSS_FVG' and row['exitComment'] == 'TRADE_CLOSED'
    assert group['holdMinutes'] == 15 and row['exitTime'] - row['entryTime'] == 900000
    checks.append({'planTimestamp': group['planTimestamp'], 'gross': str(gross),
                   'commission': str(fee), 'net': str(row['profit']), 'holdMinutes': 15,
                   'exitClassification': 'TIME_EXIT_SOURCE_AND_ID_CONFIRMED'})
assert sum((r['profit'] for r in exits), Decimal(0)) == Decimal('-14.7016968')
(D / 'a-only-outcomes.json').write_text(checked.stdout)
result = {'status': 'ISOLATED_NATIVE_COVERAGE_OBSERVED', 'aOnlyRecords': len(rows),
          'aCompletedPositions': 2, 'aExactCashChecks': checks,
          'gOnly': {'nativeReport': 'No trades with current settings',
                    'nativeLogs': 'Waiting on logs', 'downloadLogsDisabled': True,
                    'rawCSVAvailable': False, 'syntheticEmptyCSVCreated': False},
          'limits': ['Observed historical M5 coverage only; no OOS or future-frequency conclusion.',
                     'A/G module settings differ intentionally from the combined run; do not pool these as independent samples.',
                     'G had no accepted trade; this does not prove no candidate detection or a coding defect.',
                     'G top53 controls observed plus action continuity; remaining64 not independently recaptured.']}
(D / 'isolation-analysis.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
