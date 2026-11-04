import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { canTranspilePineScript } from '@opus-aether-ai/pine-transpiler';
import { runChartRuntimeHarness } from '@opus-aether-ai/pine-transpiler/test-harness';

const read = (name) => readFileSync(name, 'utf8');
const helper = read('pine/experiments/exit_quantity_units.pine.inc');
const audit = read('pine/experiments/strategy_exit_audit.pine');
const corrected = read('pine/experiments/strategy_quantity_units.pine');
const legacy = `    float q1 = partial ? math.floor(initialQty * 0.33 / syminfo.mincontract) * syminfo.mincontract : 0
    float q2 = partial ? math.floor(initialQty * 0.33 / syminfo.mincontract) * syminfo.mincontract : 0
    float q3 = initialQty - q1 - q2
`;
function run(body) {
  return runChartRuntimeHarness({
    fixtureName: 'quantity-units-local-properties',
    source: `//@version=6\nindicator("Quantity unit assertions")\n${helper}\n${body}`,
    bars: 1,
    barIndexStart: 0,
  });
}
function assertRan(report) {
  expect(report.pass).toBe(true);
  expect(report.barsProcessed).toBe(1);
  expect(report.runtimeErrors).toEqual([]);
  expect(report.unimplementedStdCalls).toEqual([]);
}

describe('isolated integer-unit exit allocation', () => {
  it('changes only the allocation, its diagnostic, helper, and experiment title', () => {
    const restored = corrected
      .replace('Backtest · Quantity units experiment', 'Backtest · Exit audit experiment')
      .replace(/\/\/ QUANTITY_UNITS_HELPER_BEGIN\n[\s\S]*?\/\/ QUANTITY_UNITS_HELPER_END\n/, '')
      .replace(/    \/\/ QUANTITY_UNITS_ALLOCATION_BEGIN\n[\s\S]*?    \/\/ QUANTITY_UNITS_ALLOCATION_END\n/, legacy);
    expect(restored).toBe(audit);
    expect(corrected).toContain(helper);
    expect(read('pine/experiments/quantity_units_matrix.pine')).toContain(helper.trimEnd());
  });

  it('covers the two genuine native failure sizes and partial-off behavior using the actual Pine helper', () => {
    assertRan(run(`
[a1, a2, a3] = exitQuantityUnits(2.1, 0.1, true)
[b1, b2, b3] = exitQuantityUnits(2.2, 0.1, true)
[c1, c2, c3] = exitQuantityUnits(2.1, 0.1, false)
if math.abs(a1 - 0.6) > 0.000000001 or math.abs(a2 - 0.6) > 0.000000001 or math.abs(a3 - 0.9) > 0.000000001
    runtime.error('2.1-unit allocation failed')
if math.abs(b1 - 0.7) > 0.000000001 or math.abs(b2 - 0.7) > 0.000000001 or math.abs(b3 - 0.8) > 0.000000001
    runtime.error('2.2-unit allocation failed')
if c1 != 0 or c2 != 0 or c3 != 2.1
    runtime.error('Partial-off allocation failed')
`));
  });

  it('conserves minimum-contract units and never creates negative legs across quantity boundaries', () => {
    assertRan(run(`
for units = 1 to 500
    for power = 0 to 2
        float step = power == 0 ? 1.0 : power == 1 ? 0.1 : 0.01
        [q1, q2, q3] = exitQuantityUnits(units * step, step, true)
        [f1, f2, f3] = exitQuantityUnits(units * step, step, false)
        if q1 < 0 or q2 < 0 or q3 <= 0 or math.round(q1 / step) + math.round(q2 / step) + math.round(q3 / step) != units
            runtime.error('Minimum-contract units not conserved')
        if f1 != 0 or f2 != 0 or math.round(f3 / step) != units
            runtime.error('Full exit units not conserved')
`));
    // This checks arithmetic conservation, not TradingView broker quantization.
  });

  it('regenerates deterministically, parses independently, and detects a deliberately broken arithmetic assertion', () => {
    const generation = spawnSync('python3', ['scripts/generate_quantity_experiment.py', '--check'], { encoding: 'utf8' });
    expect(generation.status, generation.stderr).toBe(0);
    for (const name of ['strategy_quantity_units.pine', 'quantity_units_matrix.pine']) {
      expect(canTranspilePineScript(read(`pine/experiments/${name}`))).toEqual({ valid: true });
    }
    const bad = run(`
[q1, q2, q3] = exitQuantityUnits(2.1, 0.1, true)
if q3 > 0
    runtime.error('Deliberate failed assertion')
`);
    expect(bad.runtimeErrors.length > 0 || bad.unimplementedStdCalls.includes('error')).toBe(true);
  });
});
