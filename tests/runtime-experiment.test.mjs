import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { runChartRuntimeHarness } from '@opus-aether-ai/pine-transpiler/test-harness';

const readPine = name => readFileSync(new URL(`../pine/experiments/${name}.pine`, import.meta.url), 'utf8');
const targets = source => source.match(/^getTargets\([\s\S]*?(?=^optionalLiquidity\()/m)?.[0].trimEnd();

describe('Isolated Pine runtime experiment', () => {
  it('builds both candidates and restricts diagnostic resets to the capture', () => {
    const generated = spawnSync('python3', ['scripts/generate_runtime_candidate.py', '--check'], { encoding: 'utf8' });
    expect(generated.status, generated.stderr).toBe(0);
    for (const kind of ['indicator', 'strategy']) {
      const source = readPine(`${kind}_runtime`);
      expect(source).toContain('diagStartBar() =>\n    if diagInside()\n        diagResetBarState()');
      expect(source).toContain('diagnosticLedger.ended := true\n        diagResetBarState()');
      expect(source).toMatch(/diagDetected\([^\n]+ =>\n    if diagInside\(\)\n/);
      expect(source).toMatch(/diagLifecycle\([^\n]+ =>\n    if diagInside\(\)\n/);
      expect(source).toContain("    if targetMode != 'Fixed R'\n        array<float> known = array.from");
    }
  });

  it('preserves Fixed R, Hybrid and Structure results from the original Pine function', () => {
    const original = targets(readPine('strategy_m15_alignment'));
    const efficient = targets(readPine('strategy_runtime'));
    expect(efficient).toBe(targets(readPine('indicator_runtime')));
    const withMode = (text, name) => text.replace('getTargets(int direction', `${name}(string targetMode, int direction`);
    const fixture = `//@version=6
indicator('Target optimization comparison')
type Zone
    int stage
    float upper
    float lower
var Zone candDemand = Zone.new(1, 96, 94)
var Zone candSupply = Zone.new(1, 107, 105)
float sh = 107
float slw = 93
float srHigh = 107
float srLow = 93
float pdh = 111
float pdl = 89
float pwh = 125
float pwl = 74
float previousSessionHigh = 110
float previousSessionLow = 90
float equalHigh = na
float equalLow = na
float r1 = 1
float r2 = 2
float r3 = 3
${withMode(original, 'legacyTargets')}
${withMode(efficient, 'updatedTargets')}
sameTargets(string mode, int side, float planned) =>
    [old1, old2, old3, oldSource, oldAvailable] = legacyTargets(mode, side, planned, 5)
    [new1, new2, new3, newSource, newAvailable] = updatedTargets(mode, side, planned, 5)
    old1 == new1 and old2 == new2 and old3 == new3 and oldSource == newSource and oldAvailable == newAvailable
if barstate.isfirst
    if not sameTargets('Fixed R', 1, 100) or not sameTargets('Fixed R', -1, 100)
        runtime.error('Fixed targets changed')
    if not sameTargets('Structure', 1, 100) or not sameTargets('Structure', -1, 100) or not sameTargets('Structure', 1, 120)
        runtime.error('Structure availability or order changed')
    if not sameTargets('Hybrid', 1, 100) or not sameTargets('Hybrid', -1, 80) or not sameTargets('Hybrid', 1, 120)
        runtime.error('Hybrid targets or fallback changed')
plot(close)`;
    const result = runChartRuntimeHarness({ fixtureName: 'target-optimization-parity', source: fixture, bars: 1, barIndexStart: 0 });
    expect(result.runtimeErrors).toEqual([]);
    expect(result.unimplementedStdCalls).toEqual([]);
    expect(result.pass).toBe(true);
  });
});
