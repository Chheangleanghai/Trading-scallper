"""Build human-readable reports from recorded native TradingView observations."""
from pathlib import Path
import csv
import hashlib
import json
import re

root = Path(__file__).resolve().parents[1]
report_dir = root / 'reports'
rows = [json.loads(line) for line in (report_dir / 'tradingview-matrix.jsonl').read_text().splitlines()]
features_path = report_dir / 'tradingview-features.jsonl'
features = [json.loads(line) for line in features_path.read_text().splitlines()] if features_path.exists() else []
expected = {(letter, tf) for letter in 'ABCDEFGH' for tf in ['1', '3', '5', '15']}
observed = {(row['case'][0], row['timeframe']) for row in rows}
if len(rows) != 32 or observed != expected:
    raise SystemExit('Require exactly one observation per module/timeframe (32 total).')
source_hash = hashlib.sha256((root / 'pine/strategy.pine').read_bytes()).hexdigest()
if any(row['source_sha256'] != source_hash for row in rows + features):
    raise SystemExit('Recorded source hash differs from current strategy; do not mix versions.')

def number(value):
    if value is None:
        return None
    match = re.match(r'[+−-]?[\d,]+(?:\.\d+)?', value)
    return float(match.group().replace('−', '-').replace(',', '')) if match else None

negative = sum((number(row['pnl_display']) or 0) < 0 for row in rows)
positive = sum((number(row['pnl_display']) or 0) > 0 for row in rows)
none = sum(row['no_trades'] for row in rows)
lines = [
    '# Native TradingView test results — 2026-10-30', '',
    '**Research conclusion: the current rules are not approved for live trading.** '
    f'Of the 32 isolated module/timeframe runs, {negative} lost money, {positive} were positive and {none} had no trades. '
    'Small positive samples do not establish an edge. No parameters were optimized to maximize win rate.', '',
    'These are observed TradingView Strategy Tester results on the connected **FOREX.com XAUUSD** feed. '
    'They are functional smoke tests on available history, not an out-of-sample or forward-tested performance claim.', '',
    '## Verification', '',
    '- Native TradingView: full strategy compilation and all eight modules on four chart timeframes.',
    '- Native regression script: **44 assertions passed**, including tick-rounded 2R, zero-risk and one-tick-shortfall checks. '
    'See [chart capture](validation-44-native.png).',
    '- Local Node22 verification: **67 tests across five files**, strict TypeScript, generated-source consistency and independent Pine parsing. '
    'Local pure-Pine assertions use an independent transpiler and an explicit failing canary; this tool is not TradingView.',
    '- The indicator and strategy use one shared generated engine. Native indicator acceptance is recorded with its '
    '[chart capture](final-indicator-forexcom-m5.png).', '',
    'Native Pine JSON audit: **67 captured historical payloads covered all nine alert event types and both directions**. '
    'Every captured payload is validated and Telegram-formatted by the backend regression test. '
    'This verifies the shared serializer/schema boundary, not live TradingView webhook or Telegram delivery. '
    'See [audit metadata](pine-alert-audit.json) and ../tests/fixtures/native-pine-alerts.jsonl.', '',
    '## Assumptions', '',
    '$10,000 USD initial capital; 0.5% planned-risk ceiling; maximum simulated notional90% of equity; '
    'feed point value/minimum units; commission0.01% per execution; slippage2 feed ticks; no Bar Magnifier; '
    'bar-close calculations; next-tick market orders; fixed1/2/3R projections; 15-minute time exit; '
    'rounded original-unit partial exits. Other inputs are source defaults except the isolated enabled module. '
    'Costs are examples and have not been calibrated to the broker’s historical spread or execution.', '',
    'The feed/chart history limit produced different loaded intervals: M1 Oct26–30, M3 Oct12–30, '
    'M5 Oct5–30, and M15 Aug3–Oct30,2026. They are **not equal-period comparisons**. '
    'The live right edge advanced during testing. Raw snapshots and timestamps are retained.', '',
    '**Trades/win rate below are TradingView exit-record counts, which can count partial exits separately.** '
    'The on-chart module summary aggregates completed positions; its count and win rate can differ. '
    'Profit factor “—” means unavailable/undefined, not an invented infinite value.', '',
    '## All 32 observed runs', '',
    '| Module | Chart | Loaded interval | Net P&L | Max drawdown | Profitable exit records | PF | Expectancy / exit record |',
    '|---|---|---|---:|---:|---:|---:|---:|',
]
for row in sorted(rows, key=lambda r: (int(r['timeframe']), r['case'])):
    if row['no_trades']:
        values = ['No trades', '—', '—', '—', '—']
    else:
        values = [row[k] or '—' for k in ['pnl_display', 'max_drawdown_display', 'profitable_trades_display', 'profit_factor_display', 'expectancy_display']]
    lines.append(f"| {row['case'].split('_')[0]} | M{row['timeframe']} | {row['date_range']} | " + ' | '.join(values) + ' |')
lines += ['', '## Entry, stop, target and management checks', '',
          'Each profile starts from B-only M5 defaults, then changes the recorded parameters. '
          'These are behavior checks; selecting a better historical profile would require a separate preregistered research/test process.', '',
          '| Profile | Net P&L | PF | Profitable exit records |', '|---|---:|---:|---:|']
for row in features:
    lines.append(f"| {row['case']} | {row['pnl_display'] or 'No trades'} | {row['profit_factor_display'] or '—'} | {row['profitable_trades_display'] or '—'} |")
lines += ['', '## Fixes made during testing', '',
          '1. Added a configurable exposure ceiling to risk-based unit sizing. Previously some valid plans required more '
          'buying power than the emulator’s default1× margin, giving no fills despite submitted plans.',
          '2. Replaced floating-point minimum-R and minimum-stop comparisons with tick-count comparisons. '
          'An exact2R price ladder can otherwise evaluate to1.99999999998 and be rejected. One-tick-shortfall rejection is regression-tested.',
          '3. Rendered dashboards on the last confirmed historical bar as well as the last bar, so a strategy panel '
          'does not stay blank until the current live candle closes.',
          '4. Rejected candidates with missing/nonpositive structural invalidation even under alternative stop modes; '
          'kept initial and managed stops separate and made empty-body/configuration HTTP errors explicit.', '',
          '## Limits and remaining acceptance', '',
          '- No real broker orders were placed. Tester fills and indicator touches are simulations.',
          '- Telegram credentials and webhook secret were not configured; real phone delivery and Vercel deployment remain unverified.',
          '- The Basic account reported one saved script and two applied studies. Existing saved scripts were not overwritten and no upgrade/publication was performed. '
          'A separate temporary chart tab was used for isolated testing. Its shared-layout behavior affected the layout; '
          'the original three indicators were recovered from pre-test cached layout data, their inputs/styles were verified, '
          'and the restored FOREX.com M5 layout was saved with autosave on. See [restoration verification](chart-restoration.json).',
          '- Broad adversarial bar-replay tests, provider-revision invariance, other feeds, realistic broker-cost calibration, '
          'baseline comparison, out-of-sample/walk-forward research and demo forward testing remain outstanding.',
          '- Positive cases have small samples. The primary A setup is particularly sparse in this sample. '
          'A heuristic quality score is not a probability; the initial results do not justify live deployment.', '',
          '## Reproducibility and raw evidence', '',
          f'Final strategy SHA-256: `{source_hash}`.', '',
          '[Raw matrix](tradingview-matrix.jsonl) · [Raw feature profiles](tradingview-features.jsonl) · '
          '[CSV summary](tradingview-summary.csv). Source defaults and module rules are in ../STRATEGIES.md.', '',
          'Pre-tick-fix observations are archived separately. Stale/unconfirmed UI probes are explicitly marked and '
          'excluded from these tables; they are retained for audit rather than presented as passed tests.', '']
(report_dir / 'TRADINGVIEW_RESULTS.md').write_text('\n'.join(lines))
keys = ['case', 'timeframe', 'date_range', 'no_trades', 'pnl_display', 'max_drawdown_display', 'profitable_trades_display', 'profit_factor_display', 'expectancy_display', 'source_sha256']
with (report_dir / 'tradingview-summary.csv').open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=keys)
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k) for k in keys})
print(f'Reported {len(rows)} matrix runs and {len(features)} feature profiles: {negative} negative, {positive} positive, {none} no-trade.')
