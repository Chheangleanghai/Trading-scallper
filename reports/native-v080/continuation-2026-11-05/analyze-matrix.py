"""Reconcile the four genuine fixed-window experiment captures; no simulated rows."""
from pathlib import Path
from hashlib import sha256
from datetime import datetime
import csv
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[2]
START = int(datetime.fromisoformat('2026-10-30T00:00:00+00:00').timestamp() * 1000)
END = int(datetime.fromisoformat('2026-11-05T00:00:00+00:00').timestamp() * 1000)


def ui_value(text, label):
    part = text[text.index('text ' + label) + len('text ' + label):]
    return re.search(r'\btext ([^\n]+)', part).group(1).strip()


result = {'status': 'NATIVE_EXPERIMENT_IN_SAMPLE_RESEARCH',
          'source': 'pine/experiments/strategy_quantity_units.pine',
          'sourceSha256': sha256((PROJECT / 'pine/experiments/strategy_quantity_units.pine').read_bytes()).hexdigest(),
          'effectivePlanWindowUTC': {'startInclusive': START, 'endExclusive': END},
          'costs': {'commissionPctPerSide': 0.01, 'slippageTicks': 2,
                    'spreadConfigured': False, 'initialCapitalUSD': 10000},
          'runs': [], 'limitations': [
              'Experimental quantity correction, not the frozen baseline Strategy.',
              'Four separate runs, not a combined portfolio.',
              'Only four London sessions plus a weekend; already inspected in-sample data.',
              'Loaded warm-up history differs by interval; exact earliest bar is not in these logs.',
              'UI maximum drawdown includes intratrade excursions; closed-position drawdown does not.',
              'Additional spread costs below are assumed sensitivity scenarios, not broker measurements.',
              'No untouched OOS, walk-forward, tick replay, live fills or profitability claim.']}

for timeframe in (1, 3, 5, 15):
    raw_path = ROOT / f'matrix-m{timeframe}-native.csv'
    rows = list(csv.DictReader(raw_path.read_text(encoding='utf-8-sig').splitlines()))
    text = ''.join('[' + r['Date'] + ']: ' + r['Message'] + '\n' for r in rows)
    txt_path = ROOT / f'matrix-m{timeframe}-native.txt'
    assert txt_path.read_text() == text
    plans = [json.loads(r['Message'].split('PLAN_AUDIT ', 1)[1]) for r in rows
             if r['Message'].startswith('PLAN_AUDIT ')]
    assert plans and all(p['symbol'] == 'FOREXCOM:XAUUSD' and p['timeframe'] == str(timeframe)
                         and START <= p['timestamp'] < END for p in plans)
    parsed = subprocess.run(['node', 'scripts/analyze-strategy-exits.mjs', str(txt_path)],
                            cwd=PROJECT, capture_output=True, text=True, check=True)
    analysis = json.loads(parsed.stdout)
    (ROOT / f'matrix-m{timeframe}-exit-analysis.json').write_text(parsed.stdout)
    groups = analysis['trades']
    assert len(plans) == len(groups), 'Open/unmatched plans need separate reporting'
    assert all(START <= g['entryTime'] < END for g in groups)
    assert all(g['reconciliation']['rowProfitMatchesGroupNetDelta'] for g in groups)
    assert not analysis['duplicateRows'] and not analysis['duplicateGroupRecords']
    assert not analysis['unmatchedGroupRecords']
    assert all(abs(sum(abs(r['size']) for r in g['exitRows']) - g['sizingContext']['initialQty']) < 1e-8
               for g in groups)
    net = sum(g['rowProfitSum'] for g in groups)
    commission = sum(g['rowCommissionSum'] for g in groups)
    gross = sum(g['reconciliation']['priceMovePnlAtPointValue'] for g in groups)
    assert abs(gross - commission - net) < 1e-7
    gross_wins = sum(max(g['rowProfitSum'], 0) for g in groups)
    gross_losses = -sum(min(g['rowProfitSum'], 0) for g in groups)
    closed_equity = peak = drawdown = 0
    for group in sorted(groups, key=lambda g: g['groupExitTime']):
        closed_equity += group['rowProfitSum']
        peak = max(peak, closed_equity)
        drawdown = max(drawdown, peak - closed_equity)
    ui = (ROOT / f'matrix-m{timeframe}-overview.ax.txt').read_text()
    ui_net = ui_value(ui, 'Total PnL')
    displayed_net = float(re.search(r'[+−-]?\d[\d,]*\.\d+', ui_net).group(0).replace('−', '-').replace(',', ''))
    assert abs(net - displayed_net) < 0.011, 'Native logs do not reconcile with captured Tester net'
    volume = sum(abs(r['size']) for g in groups for r in g['exitRows'])
    result['runs'].append({
        'timeframe': timeframe, 'nativeRecords': len(rows),
        'rawCsvSha256': sha256(raw_path.read_bytes()).hexdigest(),
        'plans': len(plans), 'completedPositions': len(groups),
        'closedExitRows': analysis['inputCounts']['exitRows'],
        'positionWins': analysis['realizedGroups']['winners'],
        'positionLosses': analysis['realizedGroups']['losers'],
        'grossPricePnL': gross, 'commission': commission, 'net': net,
        'positionProfitFactor': gross_wins / gross_losses if gross_losses else None,
        'closedPositionMaxDrawdown': drawdown,
        'bracketResidualGroups': analysis['resultCounts']['groupsWithBracketResidual'],
        'testerUI': {'loadedReportRange': re.search(r'button ([A-Z][a-z]{2} \d+, 2026 — [^\n]+)', ui).group(1),
                     'net': ui_net, 'maxDrawdown': ui_value(ui, 'Max drawdown'),
                     'positiveClosedRows': ui_value(ui, 'Profitable trades'),
                     'closedRowProfitFactor': ui_value(ui, 'Profit factor')},
        'additionalRoundTripPriceCostScenarios': [
            {'extraPriceCostPerUnit': cost, 'netAfterExtraCost': net - volume * cost}
            for cost in (0.1, 0.3, 0.5)]})

(ROOT / 'fixed-window-matrix.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result['runs'], indent=2))
