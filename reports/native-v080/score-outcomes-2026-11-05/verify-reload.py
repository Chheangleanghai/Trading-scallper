"""Reproduce the limited native M15 reload comparison; this is not Bar Replay."""
from pathlib import Path
from hashlib import sha256
from datetime import datetime, timezone
from collections import Counter
import csv
import json
import subprocess

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[2]
captures = {}
for name in ['before', 'after']:
    path = HERE / ('strategy-' + name + '-reload.csv')
    raw = path.read_bytes()
    rows = list(csv.DictReader(raw.decode('utf-8-sig').splitlines()))
    assert rows and all(set(r) == {'Date', 'Message'} for r in rows)
    text = ''.join('[' + r['Date'] + ']: ' + r['Message'] + '\n' for r in rows)
    (HERE / ('strategy-' + name + '-reload.txt')).write_text(text)
    parsed = []
    counts = Counter()
    for r in rows:
        m = r['Message']
        marker = 'lifecycle' if m.startswith('{') else m.split(' ', 1)[0]
        payload = json.loads(m if marker == 'lifecycle' else m[len(marker) + 1:])
        assert payload['symbol'] == 'FOREXCOM:XAUUSD' and payload['timeframe'] == '15'
        assert payload['scriptVersion'] == '0.8.0'
        counts[marker] += 1
        parsed.append({'displayPrefix': r['Date'], 'marker': marker, 'payload': payload})
    captures[name] = {'raw': raw, 'parsed': parsed, 'sha256': sha256(raw).hexdigest(), 'counts': dict(counts)}
assert captures['before']['raw'] == captures['after']['raw']
assert captures['before']['parsed'] == captures['after']['parsed']
result = {'status': 'OBSERVED_RELOAD_LOG_IDENTITY', 'recordedAtUTC': datetime.now(timezone.utc).isoformat(),
    'symbol': 'FOREXCOM:XAUUSD', 'timeframe': '15',
    'scope': 'Saved exit-audit experiment, one native browser reload, same saved layout; Indicator not covered.',
    'rawExportsByteIdentical': True, 'decodedRecordsIdentical': True, 'recordCountPerExport': len(captures['before']['parsed']),
    'countsPerExport': captures['before']['counts'],
    'sha256BothRawExports': captures['before']['sha256'],
    'earliestDisplayPrefix': min(r['displayPrefix'] for r in captures['before']['parsed']),
    'latestDisplayPrefix': max(r['displayPrefix'] for r in captures['before']['parsed']),
    'sourceAttribution': {
        'displayTitle': 'XAUUSD SMART SCALPER PRO Backtest · Exit audit experiment',
        'priorRestoredCopyback': 'reports/native-v080/continuation-2026-11-05/restored-exit-audit-editor-copy.pine',
        'priorCopybackSha256': 'a8267588770637b4a75e50367267dac11a8ba6783cdd9084e7d9620ff3961623',
        'freshCopybackOrCompileThisCheck': False,
        'note': 'Prior exact copy-back and saved-chart restoration are preserved. This check did not edit or replace source; title and payload version alone are not independent current-hash authentication.'},
    'limitations': ['Historical log equality does not establish first signal appearance or tick/candle-by-candle timing.',
        'No Bar Replay, current-baseline native verification, live-fill or profitability gate is passed.',
        'Hidden Indicator log view was empty before reload; there is no paired Indicator reload result.',
        'Full inputs were not recaptured here; visible legend values and study visibility persisted.'],
    'chartAfterCheck': 'M15, original exit-audit Strategy visible, saved Indicator hidden, Replay off, editor/log panes closed, All changes saved.'}
(HERE / 'reload-comparison.json').write_text(json.dumps(result, indent=2) + '\n')
analysis = subprocess.run(['node', 'scripts/analyze-plan-outcomes.mjs', str(HERE / 'strategy-after-reload.txt')],
    cwd=PROJECT, text=True, capture_output=True, check=True)
(HERE / 'reloaded-m15-outcomes.json').write_text(analysis.stdout)
print(json.dumps(result, indent=2))
