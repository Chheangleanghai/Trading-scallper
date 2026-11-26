import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { canTranspilePineScript } from '@opus-aether-ai/pine-transpiler';

const parentPath = 'pine/experiments/indicator_confirmation_review.pine';
const probePath = 'pine/experiments/indicator_data_snapshot.pine';
const read = path => readFileSync(path, 'utf8');

it('restores the entire frozen parent after removing only the probe title and appended observations', () => {
  const source = read(probePath);
  const restored = source
    .replace('"XAUUSD SMART SCALPER PRO · Data snapshot research"', '"XAUUSD SMART SCALPER PRO · A-H Confirmation review"')
    .replace(/\n\/\/ DATA_SNAPSHOT_AUDIT_BEGIN[^\n]*\n[\s\S]*?\/\/ DATA_SNAPSHOT_AUDIT_END\n$/, '');
  expect(restored).toBe(read(parentPath));
  const observation = source.slice(source.indexOf('// DATA_SNAPSHOT_AUDIT_BEGIN'));
  expect(observation).not.toMatch(/\b(?:alert|strategy\.(?:entry|exit|close|cancel))\s*\(/);
  expect(observation).not.toMatch(/\b(?:active|pending|stage|dir|entry|stop|tp[123]|lastSignal|sessionTrades)\s*:=/);
});

it('keeps the snapshot generator reproducible and independently parses the resulting full source', () => {
  const result = spawnSync('python3', ['scripts/generate_data_snapshot.py', '--check'], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  expect(canTranspilePineScript(read(probePath))).toEqual({ valid: true });
});

it.each([
  ['indicator_signal_live_probe.pine', 'indicator_signal_diagnostics.pine', 'Live signal research', 'A-H Research diagnostics', '--diagnostics'],
  ['indicator_time_exit_live_probe.pine', 'indicator_time_exit_timing.pine', 'Time exit live research', 'Time exit timing research', '--time-exit'],
])('generates %s from its exact tested engine', (probeFile, parentFile, probeTitle, parentTitle, flag) => {
  const probe = read(`pine/experiments/${probeFile}`);
  const start = probe.indexOf('// LIVE_SIGNAL_PROBE_BEGIN');
  const parent = probe.slice(0, start - 1).replace(`· ${probeTitle}"`, `· ${parentTitle}"`);
  expect(parent).toBe(read(`pine/experiments/${parentFile}`));
  const observer = probe.slice(start);
  expect(observer).toContain('if barstate.isconfirmed and liveProbeInside');
  expect(observer).toContain('varip int liveProbeFirstPlanUpdate = na');
  expect(observer).toContain('barstate.isrealtime and barstate.isnew and not barstate.isconfirmed');
  expect(observer).not.toMatch(/\b(?:alert|strategy\.(?:entry|exit|close|cancel))\s*\(/);
  expect(observer).not.toMatch(/\b(?:active|pending|stage|dir|entry|stop|tp[123]|lastSignal|sessionTrades|timeExitQueued)\s*:?=/);
  const built = spawnSync('python3', ['scripts/generate_live_snapshot.py', flag, '--check'], { encoding: 'utf8' });
  expect(built.status, built.stderr).toBe(0);
  expect(canTranspilePineScript(probe)).toEqual({ valid: true });
});
