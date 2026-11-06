import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it } from 'vitest';

// Synthetic intake fixtures only; never used or saved as TradingView evidence.
const ids = ['A_SWEEP_MSS_FVG', 'B_CRT', 'C_TURTLE_SOUP', 'D_SNR', 'E_DEMAND', 'E_SUPPLY', 'F_TREND_PULLBACK', 'G_AMD', 'H_QUASIMODO'];
const snapshot = (time = 1793785800000) => ({
  schema: 'data-snapshot/v1', parentSourceSha256: 'a'.repeat(64), scriptVersion: '0.8.0', symbol: 'FOREXCOM:XAUUSD', timeframe: '5', windowBasis: 'BAR_OPEN_TIME',
  time, timeClose: time + 300000, barIndex: 100, lastBarIndex: 300, firstLoadedBarTime: 1791792000000,
  open: 4044.5, high: 4045, low: 4043, close: 4044.77, volume: null, mintick: 0.01,
  atr: 5, atrMean: 4, ema9: 4041, ema21: 4038, ema50: 4035, h1CompletedClose: 4042, h1CompletedEMA50: 4030,
  hTrend: 1, mTrend: 1, crtTime: time - 900000, crtHigh: 4046, crtLow: 4035, pdh: 4050, pdl: 4000, pwh: 4100, pwl: 3900,
  swingHigh: 4045, swingLow: 4032, swingHighBar: 90, swingLowBar: 80, chartStructure: 1,
  aStage: 0, direction: 1, active: true, pending: false, brokerBusy: false, cancelOrder: false, slotAvailable: false,
  sessionTrades: 2, maximumPlans: 5, lastSignalBar: 100, cooldownBars: 5, signalTime: time + 300000, signalBar: 100, fillBar: 100,
  selectedStrategy: 'F_TREND_PULLBACK', status: 'ENTRY_TRIGGERED', inSession: true, volatilityAllowed: true, paused: false, decisionReason: 'Synthetic fixture',
  plan: { timestamp: time + 300000, setupTimestamp: time - 300000, strategy: 'F_TREND_PULLBACK', direction: 1, entryMode: 'Close', entry: 4044.77, sl: 4031.97, tp1: 4057.57, tp2: 4070.37, tp3: 4083.17, quality: 80 },
  candidates: ids.map(id => ({ id, enabled: true, stage: 0, direction: 0, ready: false, setupBar: null, setupTime: null, confirmationTime: null, trigger: null, lower: null, upper: null, invalidation: null, plannedEntry: null, quality: 0, status: 'IDLE', rejection: '' })),
});
const log = rows => rows.map(row => `[synthetic fixture]: DATA_SNAPSHOT_AUDIT ${JSON.stringify(row)}\n`).join('');
const csv = rows => 'Date,Message\r\n' + rows.map(row => `synthetic fixture,"DATA_SNAPSHOT_AUDIT ${JSON.stringify(row).replaceAll('"', '""')}"\r\n`).join('');
const dirs = [];
function run(beforeText, afterText, beforeExt = '.log', afterExt = '.log', args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'snapshot-intake-'));
  dirs.push(dir);
  const before = join(dir, 'before' + beforeExt), after = join(dir, 'after' + afterExt);
  writeFileSync(before, beforeText); writeFileSync(after, afterText);
  const result = spawnSync('python3', ['scripts/compare-data-snapshots.py', before, after, ...args], { encoding: 'utf8' });
  return { ...result, before, after, parsed: result.stdout ? JSON.parse(result.stdout) : null };
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

it('compares CSV against log text at exact numeric values and preserves original artifact hashes/counts', () => {
  const rows = [snapshot(), snapshot(1793786100000)];
  const raw = csv(rows), result = run(raw, 'unrelated Pine logs\n' + log(rows), '.csv');
  expect(result.status, result.stderr).toBe(0);
  expect(result.parsed.status).toBe('EXACT_SNAPSHOT_MATCH');
  expect(result.parsed.inputs.before.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  expect(result.parsed.inputs.before.snapshotCount).toBe(2);
  expect(result.parsed.counts.commonSnapshots).toBe(2);
  expect(result.parsed.targetBar.before.rawOhlc.close).toBe('4044.77');
  expect(result.parsed.targetBar.before.closeModeEntryEqualsRawClose).toBe(true);
});

it('separates market, derived, execution, candidate, plan, history and last-index metadata changes without filling missing rows', () => {
  const a = snapshot(), b = structuredClone(a);
  b.close = 4044.89; b.atr = 5.1; b.active = false; b.candidates[0].trigger = 4045;
  b.plan.entry = 4044.89; b.firstLoadedBarTime -= 300000; b.barIndex += 1; b.lastBarIndex += 2;
  const result = run(log([a, snapshot(1793786100000)]), log([b]));
  expect(result.status, result.stderr).toBe(1);
  for (const category of ['rawOhlc', 'derivedContext', 'executionState', 'candidates', 'plan', 'historyBoundary', 'metadata'])
    expect(result.parsed.differenceCounts[category].snapshots).toBe(1);
  expect(result.parsed.counts.beforeOnlySnapshots).toBe(1);
  expect(result.parsed.dataAndStateEqual).toBe(false);
  expect(result.parsed.allComparedValuesEqual).toBe(false);
  const missingTarget = run(log([snapshot(1793786100000)]), log([snapshot(1793786100000)]));
  expect(missingTarget.parsed.targetBar.before).toEqual({ present: false });
  const metadataOnly = structuredClone(a); metadataOnly.lastBarIndex++;
  const meta = run(log([a]), log([metadataOnly]));
  expect(meta.status, meta.stderr).toBe(0);
  expect(meta.parsed.status).toBe('DATA_AND_STATE_MATCH_METADATA_DIFFERS');
  expect(meta.parsed.dataAndStateEqual).toBe(true);
  expect(meta.parsed.allComparedValuesEqual).toBe(false);
});

it('does not round away a decimal difference beyond binary float precision', () => {
  const before = log([snapshot()]);
  const result = run(before, before.replace('"close":4044.77', '"close":4044.77000000000000001'));
  expect(result.status, result.stderr).toBe(1);
  expect(result.parsed.differences.rawOhlc[0].differences[0].after).toBe('4044.77000000000000001');
});

it('rejects duplicates, mixed context, malformed JSON/CSV and incomplete or mis-typed snapshots', () => {
  const a = snapshot();
  const cases = [
    [log([a, a]), /duplicate snapshot/],
    [log([a, { ...snapshot(1793786100000), symbol: 'OTHER:XAUUSD' }]), /conflicting snapshot context/],
    [log([a, { ...snapshot(1793786100000), firstLoadedBarTime: a.firstLoadedBarTime - 300000 }]), /conflicting first loaded/],
    ['DATA_SNAPSHOT_AUDIT {bad}\n', /invalid snapshot JSON/],
    [log([a]).replace('"atr":5', '"atr":NaN'), /Invalid JSON number/],
    [log([a]).replace('"atr":5', '"atr":5,"atr":5'), /Duplicate JSON field/],
    [log([{ ...a, close: undefined }]), /missing fields/],
    [log([{ ...a, active: 'true' }]), /invalid boolean/],
    ['no snapshot rows\n', /no DATA_SNAPSHOT_AUDIT/],
  ];
  for (const [invalid, error] of cases) {
    const result = run(log([a]), invalid);
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toMatch(error);
  }
  const conflicting = run(log([a]), log([{ ...a, parentSourceSha256: 'b'.repeat(64) }]));
  expect(conflicting.status).toBe(2);
  expect(conflicting.stderr).toMatch(/Conflicting snapshot context between/);
  const malformedCsv = run(log([a]), 'Date,Message\n"unterminated', '.log', '.csv');
  expect(malformedCsv.status).toBe(2);
  expect(malformedCsv.stderr).toMatch(/malformed CSV/);
});

it('supports an output receipt while refusing to overwrite a raw input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'snapshot-output-')); dirs.push(dir);
  const output = join(dir, 'receipt.json');
  const result = run(log([snapshot()]), log([snapshot()]), '.log', '.log', ['--output', output]);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toBe('');
  expect(JSON.parse(readFileSync(output, 'utf8')).status).toBe('EXACT_SNAPSHOT_MATCH');
  const blocked = spawnSync('python3', ['scripts/compare-data-snapshots.py', result.before, result.after, '--output', result.before], { encoding: 'utf8' });
  expect(blocked.status).toBe(2);
  expect(readFileSync(result.before, 'utf8')).toBe(log([snapshot()]));
});
