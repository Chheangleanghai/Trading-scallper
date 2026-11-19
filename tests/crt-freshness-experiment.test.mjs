import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { analyzeCrtFreshness, referenceRolledOver } from '../scripts/analyze-crt-freshness.mjs';

const closeAt = (hour, minute) => Date.UTC(2026, 10, 6, hour, minute);

describe('isolated B/CRT completed-reference hypothesis', () => {
  it('identifies a reference change at the next M15 open, using only M5 close times', () => {
    expect(referenceRolledOver(closeAt(10, 5), closeAt(10, 10))).toBe(false);
    expect(referenceRolledOver(closeAt(10, 10), closeAt(10, 15))).toBe(false);
    expect(referenceRolledOver(closeAt(10, 15), closeAt(10, 20))).toBe(true);
    expect(referenceRolledOver(closeAt(10, 0), closeAt(10, 5))).toBe(true);
    expect(() => referenceRolledOver(closeAt(10, 6), closeAt(10, 10))).toThrow(/UTC-aligned M5/);
    expect(() => referenceRolledOver(closeAt(10, 10), closeAt(10, 5))).toThrow(/ordered/);
  });

  it('reconciles observed B position groups without treating a subset as a backtest', () => {
    const evidence = readFileSync('reports/native-v090/validation-continuation-2026-11-19/strategy-quantity-units-pine-logs.txt', 'utf8');
    const result = analyzeCrtFreshness(evidence);
    expect(result.source.sha256).toBe('3ad7bc9b3d11ddcc64d2e044650e3c16b7765db21016c0c4580bd8f1c0bbcfaf');
    expect(result.status).toBe('HYPOTHESIS_ONLY_NOT_NATIVE_BACKTESTED');
    expect(result.actualCrtTimeWasNotLogged).toBe(true);
    expect(result.all.positions).toBe(21);
    expect(result.sameReference.positions).toBe(11);
    expect(result.rolledReference.positions).toBe(10);
    expect(result.all.wins).toBe(9);
    expect(result.all.grossPriceMove).toBeCloseTo(-31.653, 6);
    expect(result.all.commission).toBeCloseTo(37.1533395, 6);
    expect(result.all.net).toBeCloseTo(-68.8063395, 6);
    expect(result.sameReference.net).toBeCloseTo(-20.5332367, 6);
    expect(result.rolledReference.net).toBeCloseTo(-48.2731028, 6);
  });

  it('preserves the different result from a non-overlapping earlier native period', () => {
    const evidence = readFileSync('reports/native-v080/continuation-2026-11-05/corrected-strategy-native.txt', 'utf8');
    const result = analyzeCrtFreshness(evidence);
    expect(result.positions.every(position => position.planTimestamp < closeAt(0, 0))).toBe(true);
    expect(result.all.positions).toBe(55);
    expect(result.sameReference).toMatchObject({ positions: 30, wins: 11 });
    expect(result.rolledReference).toMatchObject({ positions: 25, wins: 9 });
    expect(result.sameReference.net).toBeCloseTo(-54.1678279, 7);
    expect(result.rolledReference.net).toBeCloseTo(-46.72156, 7);
  });

  it('regenerates the two candidates from pinned parent source with a B-only guard', () => {
    const regenerated = spawnSync('python3', ['scripts/generate_crt_freshness_candidate.py', '--check'], { encoding: 'utf8' });
    expect(regenerated.status, regenerated.stderr || regenerated.stdout).toBe(0);
    for (const kind of ['indicator', 'strategy']) {
      const candidate = readFileSync(`pine/experiments/${kind}_crt_freshness.pine`, 'utf8');
      expect(candidate).toContain("syminfo.tickerid == 'FOREXCOM:XAUUSD' and timeframe.period == '5' and timeframe.in_seconds(crtTF) == 900");
      expect(candidate).toContain('candB.stage := 0');
      expect(candidate).toContain('memory.crtCandidateReference := crtTime');
      expect(candidate).toContain("var Candidate candD = Candidate.new(id='D_SNR'");
    }
  });
});
