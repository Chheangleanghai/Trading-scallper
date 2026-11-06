import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { canTranspilePineScript } from '@opus-aether-ai/pine-transpiler';

const read = name => readFileSync(`pine/experiments/${name}.pine`, 'utf8');
const viewport = `// Visible-range data controls label spacing only. It never feeds a trading predicate.
var float clearVisibleHigh = na
var float clearVisibleLow = na
if time >= chart.left_visible_bar_time and time <= chart.right_visible_bar_time
    clearVisibleHigh := na(clearVisibleHigh) ? high : math.max(clearVisibleHigh, high)
    clearVisibleLow := na(clearVisibleLow) ? low : math.min(clearVisibleLow, low)`;
const rolling = `// Presentation-only rolling range for label spacing; no viewport-triggered reloads.
float clearVisibleHigh = ta.highest(high, 100)
float clearVisibleLow = ta.lowest(low, 100)`;

for (const kind of ['indicator', 'strategy']) {
  it(`${kind} removes the restart dependency while reconstructing every frozen parent statement`, () => {
    const source = read(`${kind}_stable_display`);
    expect(source).not.toMatch(/chart\.(?:left|right)_visible_bar_time/);
    expect(source.replace('A-H Stable display review"', 'A-H Confirmation review"').replace(rolling, viewport))
      .toBe(read(`${kind}_confirmation_review`));
  });
}

it('keeps live snapshot instrumentation separate from the entire stable engine and its inputs', () => {
  const probe = read('indicator_stable_live_snapshot');
  const restored = probe.replace('A-H Stable live snapshot"', 'A-H Stable display review"')
    .replace(/\n\/\/ DATA_SNAPSHOT_AUDIT_BEGIN[^\n]*\n[\s\S]*$/, '');
  expect(restored).toBe(read('indicator_stable_display'));
  const helper = probe.slice(probe.indexOf('// DATA_SNAPSHOT_AUDIT_BEGIN'));
  expect(helper).not.toMatch(/\b(?:alert|strategy\.(?:entry|exit|close|cancel))\s*\(/);
  expect(helper).not.toMatch(/\b(?:active|pending|stage|dir|entry|stop|tp[123]|lastSignal|sessionTrades)\s*:=/);
  expect(helper).toContain('barstate.isrealtime');
  expect(helper).toContain('stableProbeBootAt');
});

it('reproduces and independently parses all three stable-display experiments', () => {
  const result = spawnSync('python3', ['scripts/generate_stable_display.py', '--check'], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  for (const name of ['indicator_stable_display', 'strategy_stable_display', 'indicator_stable_live_snapshot'])
    expect(canTranspilePineScript(read(name))).toEqual({ valid: true });
});
