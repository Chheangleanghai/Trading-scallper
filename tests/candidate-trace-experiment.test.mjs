import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { runChartRuntimeHarness } from '@opus-aether-ai/pine-transpiler/test-harness';

const read = (name) => readFileSync(name, 'utf8');
const variants = [
  ['pine/indicator.pine', 'indicator_candidate_trace.pine', 'Indicator trace'],
  ['pine/experiments/strategy_exit_audit.pine', 'strategy_legacy_candidate_trace.pine', 'Legacy Strategy trace'],
  ['pine/experiments/strategy_quantity_units.pine', 'strategy_quantity_candidate_trace.pine', 'Quantity Strategy trace'],
];

describe('bounded read-only candidate research trace', () => {
  it.each(variants)('reconstructs the exact unchanged parent %s', (parent, name, variant) => {
    const traced = read(`pine/experiments/${name}`);
    const restored = traced
      .replace(` · ${variant}"`, '"')
      .replace(/\/\/ CANDIDATE_TRACE_HELPER_BEGIN\n[\s\S]*?\/\/ CANDIDATE_TRACE_HELPER_END\n/, '')
      .replace(/    \/\/ CANDIDATE_TRACE_(?:BEFORE_UPDATE|AFTER_UPDATE|AFTER_ARBITRATION)\n    researchCandidateTrace\('[A-Z_]+', cancelOrder\)\n/g, '');
    expect(restored).toBe(read(parent));
  });

  it('preserves source state and order calls and regenerates deterministically', () => {
    const helper = read('pine/experiments/candidate_trace.pine.inc');
    expect(helper).not.toMatch(/:=|\bstrategy\.(?:entry|exit|close|cancel)|\balert\s*\(/);
    const result = spawnSync('python3', ['scripts/generate_candidate_trace.py', '--check'], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
  });

  it('executes the actual window predicate at inclusive and exclusive boundaries', () => {
    const helper = read('pine/experiments/candidate_trace.pine.inc');
    const predicates = helper.slice(0, helper.indexOf('\nresearchCandidateTrace('));
    const result = runChartRuntimeHarness({
      fixtureName: 'candidate-trace-capture-boundaries',
      source: `//@version=6\nindicator("Trace window checks")\n${predicates}\n
if not traceWindow(1791441000000) or traceWindow(1791451800000)
    runtime.error('First trace window boundary failed')
if traceWindow(1792670400000) or not traceWindow(1792681200000)
    runtime.error('Disjoint trace windows failed')
if traceWindow(1793781000000)
    runtime.error('Trace escaped its research window')
if traceInteger(na) != 'null' or tracePrice(na) != 'null' or traceBoolean(false) != 'false'
    runtime.error('Trace JSON null/boolean serialization failed')
`,
      bars: 1,
      barIndexStart: 0,
    });
    expect(result.pass).toBe(true);
    expect(result.barsProcessed).toBe(1);
    expect(result.runtimeErrors).toEqual([]);
    expect(result.unimplementedStdCalls).toEqual([]);
  });
});
