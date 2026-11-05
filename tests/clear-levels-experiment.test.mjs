import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('reconstructs the exact frozen Indicator after removing only the clear-display changes', () => {
  const baseline = readFileSync('pine/indicator.pine', 'utf8');
  const variant = readFileSync('pine/experiments/indicator_clear_levels.pine', 'utf8');
  const start = baseline.indexOf('if newSignal and showTrade and (active or pending or not useBroker)\n');
  const end = baseline.indexOf("plot(showEMA and visualLayout == 'Dashboard' ? ema9", start);
  const restored = variant
    .replace(' · Clear levels experiment"', '"')
    .replace(/\/\/ CLEAR_SIGNAL_INPUTS_BEGIN\n[\s\S]*?\/\/ CLEAR_SIGNAL_INPUTS_END\n/, '')
    .replace('showLastPlan = input.bool(true,', 'showLastPlan = input.bool(false,')
    .replace("chartLabelSize = input.string('Normal',", "chartLabelSize = input.string('Small',")
    .replace(/\/\/ CLEAR_SIGNAL_DRAWINGS_BEGIN[^\n]*\n[\s\S]*?\/\/ CLEAR_SIGNAL_DRAWINGS_END\n/, baseline.slice(start, end))
    .replaceAll('if showStructure and not clearOnly', 'if showStructure')
    .replaceAll('if showZones and not clearOnly and visualLayout', 'if showZones and visualLayout')
    .replaceAll('if showOB and not clearOnly and visualLayout', 'if showOB and visualLayout')
    .replace("bool referenceView = visualLayout == 'Reference' and not clearOnly", "bool referenceView = visualLayout == 'Reference'")
    .replace("if showDashboard and visualLayout == 'Dashboard' and not clearOnly", "if showDashboard and visualLayout == 'Dashboard'")
    .replace(/\n\/\/ CLEAR_SIGNAL_BADGE_BEGIN[^\n]*\n[\s\S]*?\/\/ CLEAR_SIGNAL_BADGE_END\n$/, '');
  expect(restored).toBe(baseline);
  const generated = spawnSync('python3', ['scripts/generate_clear_signal_indicator.py', '--check'], { encoding: 'utf8' });
  expect(generated.status, generated.stderr).toBe(0);
});
