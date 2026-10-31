"""Render v0.3.0 observations without mixing source versions or inventing metrics."""
from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parents[1]
folder = root / 'reports'
def read(name):
    return [json.loads(line) for line in (folder / name).read_text().splitlines() if line.strip()]
rows = read('v030-matrix.jsonl')
features = read('v030-features.jsonl')
guard = json.loads((folder / 'v030-runtime-guards.json').read_text())
assert guard['expected_error_observed'], 'Native research guard not verified'
expected = {(letter, tf) for letter in 'ABCDEFGH' for tf in ['1', '3', '5', '15']}
observed = {(row['case'].split('_')[1], row['timeframe']) for row in rows}
assert len(rows) == 32 and observed == expected, 'Require 32 unique native runs'
assert len(features) == 11, 'Require all feature profiles'
sha = hashlib.sha256((root / 'pine/strategy.pine').read_bytes()).hexdigest()
assert all(r['source_sha256'] == sha for r in rows + features), 'Source hash mismatch'
assert all(r['strategy_status'] == 'Active strategy' for r in rows + features), 'Strategy not active'
for name in ['B_future_window', 'B_past_window', 'B_manual_pause']:
    assert next(r for r in features if r['case'] == 'v030_' + name)['no_trades']
def number(value):
    if value is None:
        return None
    match = re.match(r'[+−-]?[\d,]+(?:\.\d+)?', value)
    return float(match.group().replace('−', '-').replace(',', '')) if match else None
assert all(r['no_trades'] or number(r['pnl_display']) is not None for r in rows + features)
negative = sum((number(r['pnl_display']) or 0) < 0 for r in rows)
positive = sum((number(r['pnl_display']) or 0) > 0 for r in rows)
empty = sum(r['no_trades'] for r in rows)
lines = [
    '# v0.3.0 TradingView upgrade verification — 2026-10-31', '',
    f'**{negative} of 32 isolated runs lost money, {positive} were positive, and {empty} had no trades.** '
    'This release fixes order handling and adds research controls. It does not establish a profitable strategy or live readiness.', '',
    '## Changes', '',
    '- Cancelled pending plans cannot be replaced on the same bar. This keeps the old cancellation ID from cancelling a replacement order.',
    '- Optional research date window: inclusive start, exclusive end; the whole signal bar must be inside. '
    'Pending cancellation is close-time only, and existing trades retain exits beyond the window.',
    '- Both / BUY only / SELL only selection, default Both. The date filter defaults off.',
    '- 58 native synthetic assertions, including 14 new research/cancellation checks.', '',
    '## Observed verification', '',
    '- Native TradingView compilation: canonical indicator, strategy and validation script.',
    '- [58-assertion chart capture](validation-58-native.png); [indicator chart capture](v030-indicator-m5.png).',
    '- 32 isolated native Strategy Tester runs: A–H on M1/M3/M5/M15; 11 additional feature profiles below.',
    '- Inverted date window raises the expected native user-defined runtime error; see [guard record](v030-runtime-guards.json).',
    '- Local Node22 verification: 75 tests across six files, strict TypeScript, generated consistency and independent Pine parsing. '
    'Native synthetic assertion count is separate from the Vitest test count.',
    '- Existing captured payload fixtures cover nine event types and both directions. The serializer/backend schema is unchanged.', '',
    '## Assumptions and limits', '',
    'FOREXCOM:XAUUSD, standard candles; source defaults except isolated modules and listed feature settings. '
    '$10,000 USD, 0.5% planned-risk ceiling, 90% notional/equity cap, 0.01% commission per execution, '
    'two ticks slippage, bar-close calculations, next-tick market orders, fixed 1/2/3R targets, partial exits, '
    '15-minute close-time holding check, no Bar Magnifier. Costs are examples, not broker-calibrated spread/execution. '
    'Trade/win counts below are emulator exit records; partials may count separately. '
    'Available chart history differs by timeframe; the live right edge advanced during testing. '
    'The Oct 5–19 / Oct 19–31 profiles use already inspected data and are exploratory, **not untouched out-of-sample tests**. '
    'No settings were optimized to maximize historical returns.', '',
    '## Isolated module results', '',
    '| Module | Chart | Loaded history | Net P&L | Drawdown | Profitable exit records | PF | Expectancy / exit |',
    '|---|---|---|---:|---:|---:|---:|---:|',
]
for row in sorted(rows, key=lambda r: (int(r['timeframe']), r['case'])):
    columns = [row['case'].split('_')[1], row['timeframe'] + 'm', row['date_range'],
               row['pnl_display'], row['max_drawdown_display'], row['profitable_trades_display'],
               row['profit_factor_display'], row['expectancy_display']]
    lines.append('| ' + ' | '.join(str(x) if x is not None else '—' for x in columns) + ' |')
lines += ['', '## Additional M5 CRT profiles', '',
          '| Profile | Net P&L | Drawdown | Profitable exit records | PF |',
          '|---|---:|---:|---:|---:|']
for row in features:
    columns = [row['case'].removeprefix('v030_'), row['pnl_display'], row['max_drawdown_display'],
               row['profitable_trades_display'], row['profit_factor_display']]
    lines.append('| ' + ' | '.join(str(x) if x is not None else 'No trades' for x in columns) + ' |')
lines += ['', '## Source and deployment evidence', '', f'Canonical strategy SHA-256: `{sha}`.', '',
          'Raw records: [32 module runs](v030-matrix.jsonl) and [11 feature runs](v030-features.jsonl). '
          'Each includes timestamp, input values, source hash and the observed tester text. '
          'The [earlier 48 runs](TRADINGVIEW_RESULTS.md) belong to the previous source and are retained separately.', '',
          'The user reports deployment and supplied a Telegram screenshot of test-buy-004. '
          'This demonstrates receipt of that test message. No native live alert delivery, Vercel cold-start latency, '
          'real broker execution, untouched out-of-sample evaluation or demo forward test was observed in this upgrade. '
          'No running alerts, backend deployment or real messages were changed/sent. '
          'Recreate the indicator alert after installing the new Pine source because TradingView alerts retain a script snapshot.', '',
          'The temporary chart test tab used autosave disabled. The original three indicator states were restored exactly, '
          'and autosave was returned to enabled; see [restoration record](v030-chart-restoration.json). ', '']
(folder / 'V030_RESULTS.md').write_text('\n'.join(lines))
print(f'Written V030_RESULTS.md: {len(rows)} runs + {len(features)} profiles; {negative} negative, {positive} positive, {empty} empty.')
