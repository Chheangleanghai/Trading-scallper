import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { runChartRuntimeHarness } from '@opus-aether-ai/pine-transpiler/test-harness';

const read = path => readFileSync(path, 'utf8');
for (const kind of ['indicator', 'strategy']) {
  it(`restores the complete frozen ${kind} parent after removing review-only changes`, () => {
    const parent = read(`pine/experiments/${kind}_professional.pine`);
    let restored = read(`pine/experiments/${kind}_confirmation_review.pine`)
      .replace(' · A-H Confirmation review"', ' · A-H Plan candidate"')
      .replace('max_lines_count=150, max_boxes_count=60', 'max_lines_count=100, max_boxes_count=20')
      .replace("chartLabelSize = input.string('Small',", "chartLabelSize = input.string('Normal',")
      .replace("dashboardSize = input.string('Tiny',", "dashboardSize = input.string('Small',")
      .replace(/\/\/ REVIEW_INPUTS_BEGIN\n[\s\S]*?\/\/ REVIEW_INPUTS_END\n/, '')
      .replace(/\/\/ REVIEW_PATTERN_STATE_BEGIN\n[\s\S]*?\/\/ REVIEW_PATTERN_STATE_END\n/, '')
      .replace(/^[ \t]*\/\/ REVIEW_PATTERN_CAPTURE_BEGIN\n[\s\S]*?\/\/ REVIEW_PATTERN_CAPTURE_END\n/m, '')
      .replace(/^[ \t]*\/\/ REVIEW_ESTIMATE_CAPTURE_BEGIN\n[\s\S]*?\/\/ REVIEW_ESTIMATE_CAPTURE_END\n/m, '')
      .replace(/^[ \t]*\/\/ REVIEW_EMULATOR_CAPTURE_BEGIN\n[\s\S]*?\/\/ REVIEW_EMULATOR_CAPTURE_END\n/m, '')
      .replace(/\/\/ REVIEW_OUTCOME_HELPER_BEGIN[^\n]*\n[\s\S]*?\/\/ REVIEW_OUTCOME_HELPER_END\n/, '')
      .replace(' + reviewOutcomeJson(kind, signalTime)', '')
      .replace(/\/\/ REVIEW_DRAWINGS_BEGIN[^\n]*\n[\s\S]*?\/\/ REVIEW_DRAWINGS_END\n/, read('pine/experiments/clear_signal_levels.pine.inc'))
      .replace(/\/\/ REVIEW_BADGE_BEGIN[\s\S]*$/, read('pine/experiments/clear_signal_badge.pine.inc'));
    expect(restored).toBe(parent);
  });
}

it('regenerates review candidates with guards on both already verified parents', () => {
  const result = spawnSync('python3', ['scripts/generate_confirmation_candidate.py', '--check'], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  const hashes = ['050518694b7d83a112dc22e40e1072621f7884cc89b526b29995532131f0ad1b', 'eb601426b7a71779cd0aee0f56f987a6cf723cf48b23131aa29d9214913f4851'];
  for (const [index, kind] of ['indicator', 'strategy'].entries())
    expect(createHash('sha256').update(read(`pine/experiments/${kind}_professional.pine`)).digest('hex')).toBe(hashes[index]);
});

it('executes actual closure classification: stop-first estimates, timed exits and unknown emulator reasons', () => {
  const helpers = read('pine/experiments/confirmation_outcome.pine.inc').split('type ReviewOutcome')[0];
  const source = `//@version=6\nindicator("closure checks")\n${helpers}\nif barstate.isfirst
    if reviewCloseCode(true, true, true) != 'STOP' or reviewCloseCode(false, true, true) != 'TP3' or reviewCloseCode(false, false, true) != 'TIME_EXIT'
        runtime.error('Estimate classification')
    if reviewExitCode('TRADE_CLOSED', false) != 'CLOSED_OTHER' or reviewExitCode('TRADE_CLOSED', true) != 'TIME_EXIT' or reviewExitCode('STOP_LOSS_HIT', true) != 'STOP'
        runtime.error('Emulator classification')
    if reviewCloseCaption('TIME_EXIT', false) != 'Time exit (est.)' or reviewCloseCaption('STOP', true) != 'SL exit (sim.)'
        runtime.error('Model caption')
plot(close)`;
  const report = runChartRuntimeHarness({ fixtureName: 'closure-classification', source, bars: 1, barIndexStart: 0 });
  expect(report.pass).toBe(true);
  expect(report.barsProcessed).toBe(1);
  expect(report.runtimeErrors).toEqual([]);
  expect(report.unimplementedStdCalls).toEqual([]);
});
