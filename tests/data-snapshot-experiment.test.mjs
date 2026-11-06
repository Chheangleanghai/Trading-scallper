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
