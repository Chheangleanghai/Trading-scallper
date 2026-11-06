import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { canTranspilePineScript } from '@opus-aether-ai/pine-transpiler';
import { runChartRuntimeHarness } from '@opus-aether-ai/pine-transpiler/test-harness';

const read = name => readFileSync(name, 'utf8');
const variants = [
  ['pine/experiments/indicator_confirmation_review.pine', 'indicator_nov5_trace.pine', 'Nov5 Indicator trace'],
  ['pine/experiments/strategy_confirmation_review.pine', 'strategy_nov5_trace.pine', 'Nov5 Strategy trace'],
];

describe('current-parent Nov5 F-state trace', () => {
  it.each(variants)('reconstructs the complete unchanged parent %s', (parent, name, variant) => {
    const source = read(`pine/experiments/${name}`);
    const restored = source
      .replace(` · ${variant}"`, '"')
      .replace(/\/\/ NOV5_TRACE_HELPER_BEGIN\n[\s\S]*?\/\/ NOV5_TRACE_HELPER_END\n/, '')
      .replace(/    \/\/ NOV5_TRACE_(?:BEFORE_UPDATE|AFTER_UPDATE|AFTER_ARBITRATION)\n    researchNov5Trace\('[A-Z_]+', cancelOrder\)\n/g, '');
    expect(restored).toBe(read(parent));
  });

  it.each(variants)('independently parses trace derived from %s', (_parent, name) => {
    expect(canTranspilePineScript(read(`pine/experiments/${name}`))).toEqual({ valid: true });
  });

  it('regenerates exact guarded parents and adds no inputs, state writes, orders or alerts', () => {
    const helper = read('pine/experiments/nov5_candidate_trace.pine.inc');
    expect(helper).not.toMatch(/:=|\binput\.|\bstrategy\.(?:entry|exit|close|cancel)|\balert\s*\(/);
    for (const field of ['open', 'high', 'low', 'close', 'chartStructure', 'ema9', 'ema21', 'ema50', 'atr'])
      expect(helper).toContain(`"${field}":`);
    const result = spawnSync('python3', ['scripts/generate_nov5_candidate_trace.py', '--check'], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
  });

  it('executes inclusive UTC bar-open capture boundaries and null serialization', () => {
    const helper = read('pine/experiments/nov5_candidate_trace.pine.inc');
    const predicates = helper.slice(0, helper.indexOf('\nresearchNov5Trace('));
    const source = `//@version=6\nindicator("Nov5 trace boundaries")\n${predicates}\n
if not traceWindow(1793876700000) or not traceWindow(1793881200000)
    runtime.error('Inclusive window endpoints failed')
if traceWindow(1793876400000) or traceWindow(1793881500000) or traceWindow(1793786100000)
    runtime.error('Trace escaped fixed Nov5 window')
if traceInteger(na) != 'null' or tracePrice(na) != 'null' or traceBoolean(false) != 'false'
    runtime.error('Trace JSON scalar serialization failed')
plot(close)`;
    const report = runChartRuntimeHarness({ fixtureName: 'nov5-trace-boundaries', source, bars: 1, barIndexStart: 0 });
    expect(report.pass).toBe(true);
    expect(report.barsProcessed).toBe(1);
    expect(report.runtimeErrors).toEqual([]);
    expect(report.unimplementedStdCalls).toEqual([]);
  });
});
