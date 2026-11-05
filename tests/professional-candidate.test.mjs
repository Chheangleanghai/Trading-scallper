import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

for (const kind of ['indicator', 'strategy']) {
  it(`preserves the entire ${kind} parent after reversing explicit A-H defaults and UI edits`, () => {
    const parentPath = kind === 'indicator' ? 'pine/indicator.pine' : 'pine/experiments/strategy_quantity_units.pine';
    const parent = readFileSync(parentPath, 'utf8');
    const candidate = readFileSync(`pine/experiments/${kind}_professional.pine`, 'utf8');
    const start = parent.indexOf('if newSignal and showTrade and (active or pending or not useBroker)\n');
    const end = parent.indexOf("plot(showEMA and visualLayout == 'Dashboard' ? ema9", start);
    let restored = candidate
      .replace(kind === 'indicator' ? ' · A-H Plan candidate"' : 'Backtest · A-H Plan candidate"', kind === 'indicator' ? '"' : 'Backtest · Quantity units experiment"')
      .replace(/\/\/ CLEAR_SIGNAL_INPUTS_BEGIN\n[\s\S]*?\/\/ CLEAR_SIGNAL_INPUTS_END\n/, '')
      .replace(/\/\/ CLEAR_SIGNAL_DRAWINGS_BEGIN[^\n]*\n[\s\S]*?\/\/ CLEAR_SIGNAL_DRAWINGS_END\n/, parent.slice(start, end))
      .replace('showLastPlan = input.bool(true,', 'showLastPlan = input.bool(false,')
      .replace("chartLabelSize = input.string('Normal',", "chartLabelSize = input.string('Small',")
      .replace(/\n\/\/ CLEAR_SIGNAL_BADGE_BEGIN[^\n]*\n[\s\S]*?\/\/ CLEAR_SIGNAL_BADGE_END\n$/, '');
    for (const module of 'BCDEFGH') restored = restored.replace(`enable${module} = input.bool(true,`, `enable${module} = input.bool(false,`);
    for (const name of ['showConceptPanel', 'showDashboard']) restored = restored.replace(`${name} = input.bool(false,`, `${name} = input.bool(true,`);
    const renames = {
      "'D: K-SNR (confirmed support/resistance)'": "'D: Confirmed support/resistance'",
      "'D · K-SNR'": "'D · Support / resistance'",
      "'Confirmed K-SNR level; retest/rejection trigger'": "'Confirmed SNR level; retest/rejection trigger'",
      "'K-SNR SUPPORT'": "'SNR SUPPORT'",
      "'K-SNR RESISTANCE'": "'SNR RESISTANCE'",
      "? 'K-SNR ' : ''": "? 'SNR ' : ''",
    };
    for (const [from, to] of Object.entries(renames)) restored = restored.replaceAll(from, to);
    const badges = parent.split('\n').filter(line => line.startsWith('plotshape(entryTriggered and dir == ')).join('\n');
    restored = restored.replace('plot(showDaily ? pdh', badges + '\nplot(showDaily ? pdh');
    expect(restored).toBe(parent);
    expect(candidate).not.toContain('plotshape(entryTriggered and dir == ');
    expect(candidate).toContain("id='D_SNR'");
    for (const module of 'ABCDEFGH') expect(candidate).toContain(`enable${module} = input.bool(true,`);
    for (const label of ['BULL FVG', 'BEAR FVG', 'SWING HIGH', 'BULL OB', 'K-SNR SUPPORT']) expect(candidate).toContain(label);
  });
}

it('regenerates both candidates consistently from their identified parents', () => {
  const result = spawnSync('python3', ['scripts/generate_professional_candidate.py', '--check'], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
});
