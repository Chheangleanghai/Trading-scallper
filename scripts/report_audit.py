"""Render the v0.5 audit without mixing tested source hashes or extrapolating win rates."""
from pathlib import Path
import hashlib
import json
import re
root = Path(__file__).resolve().parents[1]
folder = root / 'reports'
rows = [json.loads(line) for line in (folder / 'v050-matrix.jsonl').read_text().splitlines() if line.strip()]
expected = {(m, tf) for m in 'ABCDEFGH' for tf in ['1', '3', '5', '15']}
assert len(rows) == 32 and {(r['case'].split('_')[1], r['timeframe']) for r in rows} == expected
frozen = folder / 'sources/v050-matrix-strategy.pine'
frozen_text = frozen.read_text()
frozen_sha = hashlib.sha256(frozen.read_bytes()).hexdigest()
assert all(r['source_sha256'] == frozen_sha and 'Active strategy' in r['strategy_status'] for r in rows)
current = (root / 'pine/strategy.pine').read_text()
assert current.replace('table.new(position.middle_right, 2, 7,', 'table.new(position.bottom_left, 2, 7,', 1) == frozen_text, 'Unexpected difference from tested trading engine'
def number(v):
    if v is None:
        return None
    match = re.match(r'[+−-]?[\d,]+(?:\.\d+)?', v)
    return float(match.group().replace('−', '-').replace(',', '')) if match else None
assert all(r['no_trades'] or number(r['pnl_display']) is not None for r in rows)
negative = sum((number(r['pnl_display']) or 0) < 0 for r in rows)
positive = sum((number(r['pnl_display']) or 0) > 0 for r in rows)
empty = sum(r['no_trades'] for r in rows)
lines = ['# v0.5.0 — Pattern audit and smaller, lighter UI', '',
    '**The system is not established as profitable or suitable for live trading.** '
    f'Of 32 isolated historical runs, {negative} were negative, {positive} positive and {empty} had no trades. '
    'Positive tiny samples do not establish a reliable win rate.', '',
    '## Corrections', '',
    '- A confirmed swing can emit only one closing structure break. Wick-only touches, repeated recrosses '
    'and conflicting dual-direction breaks do not create new BOS/CHoCH. The M15 context applies the same rule.',
    '- Quasimodo requires a recorded closing break of the matching neckline pivot after head confirmation '
    'and no later than right-shoulder confirmation. Geometry alone and a wick above/below the neckline are insufficient. '
    'The previous geometry-only implementation did not enforce this closing-break evidence. The resulting variant is deliberately conservative; '
    'fast breaks before head confirmation and breaks outside the retained six-per-side history can be omitted.',
    '- Smaller default text, Tiny/Small/Normal/Large options, pale context label backgrounds (82% transparency), '
    'dark text and light dashboard surfaces. Confirmed BUY/SELL markers remain visually distinct.',
    '- The compact panel adds a new-signal gate reason: session, ATR/warm-up, news pause, date window, '
    'cooldown, plan limit, pending order or remaining confirmation/risk checks. The panel moves to the middle right to avoid the watermark.', '',
    '## What is and is not verified', '',
    'The standalone native harness contains 82 assertions, including 24 new structure-break, ambiguity and QM chronology/lookup checks. '
    'The local Node22 suite passes 75 tests in six files, including execution of the assertion source through an independent harness, '
    'a failing canary, strict TypeScript, generation consistency and independent Pine parsing. '
    'Native TradingView compilation/execution and its actual success caption are recorded in [v050-native-assertions.json](v050-native-assertions.json); a successful test is not proof of predictive value.', '',
    '| Module | Audited operational rule | Remaining limitation |',
    '|---|---|---|',
    '| A | Confirmed pivot sweep → later MSS/FVG → later rejection, shared safety checks | Very sparse trades; the loaded sample does not demonstrate an edge. |',
    '| B | Completed-reference range sweep/re-entry → later sweep-candle break | One specified CRT approximation, not every discretionary CRT interpretation. |',
    '| C | Aged confirmed-pivot false breakout → later reversal break | Intraday pivot variant, not the original 20-day Turtle Soup method. |',
    '| D | Repeated confirmed pivot levels, displaced breakout/retest or rejection | Two pivots and ATR tolerance do not establish future level strength. |',
    '| E | Opposite candle + impulsive break of confirmed swing → zone retest | Tested bars count individually; this is not proof of institutional supply/demand. |',
    '| F | Structure + EMA9/21/(50) pullback and later trigger | EMA/structure conditions are not validated predictors of returns. |',
    '| G | Prior compressed range → sweep/reclaim → later displacement | Rolling-range AMD heuristic, not proof of accumulation/manipulation. |',
    '| H | Five confirmed pivots + time-qualified closing neckline break → later retest | Strict QM approximation; small samples and bounded history. |', '',
    'The chart OB and FVG candidates are separate contextual annotations. They are not equivalent to a qualified strategy entry. '
    'The 0–100 score is a heuristic, not a winning probability. No strategy was enabled or threshold relaxed to force immediate signals.', '',
    '## Native historical results', '',
    'FOREXCOM:XAUUSD, standard M1/M3/M5/M15 candles, all other source defaults except the isolated module. '
    '$10,000 USD capital, 0.5% planned-risk ceiling, 90% notional/equity cap, 0.01% commission per execution, '
    'two ticks slippage, partial exits, fixed 1/2/3R targets and a 15-minute close-time holding check. '
    'These costs are examples, not calibrated broker spread/execution. '
    'Loaded history varies by timeframe and the live right edge advanced. This is inspected historical data, not an untouched out-of-sample test.', '',
    '**Win-rate denominators are exit records and may count partial exits separately.** '
    'A 100% value from three exit records can reflect a single position and must not be described as a reliable strategy win rate. '
    'A missing profit factor with no losses is undefined, not a fabricated infinite result.', '',
    '| Module | Chart | Loaded history | Net P&L | Drawdown | Profitable exit records | PF | Expectancy / exit |',
    '|---|---|---|---:|---:|---:|---:|---:|']
for r in sorted(rows, key=lambda r: (int(r['timeframe']), r['case'])):
    values = [r['case'].split('_')[1], r['timeframe'] + 'm', r['date_range'], r['pnl_display'],
              r['max_drawdown_display'], r['profitable_trades_display'], r['profit_factor_display'], r['expectancy_display']]
    lines.append('| ' + ' | '.join(str(x) if x is not None else '—' for x in values) + ' |')
lines += ['', '## Source provenance and remaining work', '',
    f'The exact matrix source is [archived here](sources/v050-matrix-strategy.pine), SHA-256 `{frozen_sha}`. '
    'The final canonical source differs only in moving the compact table from bottom left to middle right. '
    'This report generator asserts that exact one-line difference. No trade calculation changed after the matrix. '
    'Final native compilation and the UI save are documented in verification.json and v050-chart-update.json.', '',
    'Raw matrix: [v050-matrix.jsonl](v050-matrix.jsonl). Small/light, Dashboard and Tiny/light native controls: '
    '[v050-native-checks.json](v050-native-checks.json). '
    'Entry notification still requires a confirmed chart close: M1 checks each minute, M5 each five minutes. '
    'A valid setup can be absent for long periods. Simulated touches do not confirm broker fills.', '',
    'Untouched out-of-sample tests, walk-forward research, broker-calibrated cost stress, multiple feeds, '
    'demo forward testing and a native live-alert-to-phone reconciliation remain outstanding. '
    'No new Telegram messages or running alerts were created. Recreate the indicator alert to use the new logic; '
    'TradingView retains the script/input snapshot from alert creation.', '',
    '[Updated chart preview](v050-light-final.png).', '']
(folder / 'V050_AUDIT.md').write_text('\n'.join(lines))
print(f'Wrote V050_AUDIT.md: {negative} negative, {positive} positive, {empty} no-trade runs.')
