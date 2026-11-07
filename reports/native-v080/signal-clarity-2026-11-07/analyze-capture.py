"""Reproduce the bounded clarity/reload comparison from preserved native CSVs."""
import collections
import csv
import hashlib
import json
from pathlib import Path

D = Path(__file__).resolve().parent
ROOT = D.parents[2]
FILES = [
    'indicator-before-clarity-raw.csv',
    'indicator-after-clarity-raw.csv',
    'indicator-reload-download-verified.csv',
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


runs = []
streams = []
for name in FILES:
    path = D / name
    rows = list(csv.DictReader(path.read_text(encoding='utf-8-sig').splitlines()))
    messages = [row['Message'] for row in rows]
    plans = [json.loads(m[len('PLAN_AUDIT '):]) for m in messages if m.startswith('PLAN_AUDIT ')]
    assert len(plans) == len({p['timestamp'] for p in plans})
    assert all(p['symbol'] == 'FOREXCOM:XAUUSD' and p['timeframe'] == '5' for p in plans)
    streams.append(messages)
    runs.append({'file': name, 'sha256': digest(path), 'messages': len(messages), 'plans': len(plans),
                 'firstLogPrefix': rows[0]['Date'], 'lastLogPrefix': rows[-1]['Date']})

assert streams[0] == streams[1] == streams[2], 'Investigate every native stream change'
events = [json.loads(m) for m in streams[-1] if m.startswith('{')]
closed = [e for e in events if e.get('eventType') == 'TRADE_CLOSED']
pictured = [e for e in events if e.get('timestamp') == 1793982900000]
assert len([e for e in pictured if e.get('eventType') == 'TRADE_CLOSED']) == 1
assert next(e for e in pictured if e.get('eventType') == 'TRADE_CLOSED')['closeReason'] == 'TIME_EXIT'
assert not any(e['eventType'] == 'STOP_LOSS_HIT' for e in pictured)

source = ROOT / 'pine/experiments/indicator_signal_clarity.pine'
copy = (D / 'indicator-editor-raw.pine').read_bytes().replace(b'\r\n', b'\n').replace(b'\r', b'\n')
assert copy == source.read_bytes()
inputs = json.loads((D / 'indicator-runtime-inputs.json').read_text())
assert inputs['inputCount'] == 127 and not inputs['sharedWithPriorJakartaChanges']
assert inputs['sourceSha256'] == digest(source)
baseline = {
    'pine/indicator.pine': 'c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4',
    'pine/strategy.pine': '42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0',
}
for name, expected in baseline.items():
    assert digest(ROOT / name) == expected, name

result = {
    'status': 'SAME_MODEL_DISPLAY_AND_ONE_RELOAD_MATCH', 'tolerance': 0,
    'fullOrderedStreamsEqual': True, 'runs': runs,
    'indicatorSourceSha256': digest(source), 'normalizedEditorCopyMatch': True,
    'actualInputsCaptured': 127, 'previousSharedInputChanges': [],
    'estimatedClosedPlans': len(closed),
    'estimatedCloseReasons': dict(collections.Counter(e.get('closeReason', 'UNKNOWN') for e in closed)),
    'stopEventsByModule': dict(collections.Counter(e['strategy'] for e in events if e['eventType'] == 'STOP_LOSS_HIT')),
    'picturedPlanCloseReason': 'TIME_EXIT', 'picturedPlanStopEvent': False,
    'baselineHashesUnchanged': baseline,
    'limits': [
        'Indicator OHLC estimates only; no actual exit price, realized PnL or broker fill conclusion.',
        'One closed-market historical reload is not candle-by-candle Replay or full non-repainting proof.',
        'Same-model display regression is not Indicator/Strategy cross-model parity.',
        'No change in confirmed-entry timing, future frequency, win rate or profitability is established.',
        '127 inputs were captured before reload. The final full post-reload input recapture was interrupted.',
        'Matching Strategy revision has local generation/parser checks only, not native compilation.',
    ],
}
(D / 'capture-analysis.json').write_text(json.dumps(result, indent=2) + '\n')
artifacts = {str(p.relative_to(D)): digest(p) for p in sorted(D.rglob('*'))
             if p.is_file() and p.name not in ('artifact-hashes.json', '.DS_Store')}
(D / 'artifact-hashes.json').write_text(json.dumps(artifacts, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ['status', 'actualInputsCaptured', 'estimatedClosedPlans',
                                         'estimatedCloseReasons', 'picturedPlanCloseReason']}, indent=2))
