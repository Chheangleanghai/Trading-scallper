import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { compareCrtFreshnessRuns } from '../scripts/compare-crt-freshness-runs.mjs';

// These archives exercise the evidence reader. They are different historical runs of the old rule.
const earlier = readFileSync('reports/native-v080/continuation-2026-11-05/matrix-m5-native.txt', 'utf8');
const later = readFileSync('reports/native-v090/validation-continuation-2026-11-19/strategy-quantity-units-pine-logs.txt', 'utf8');
const event = fields => `\nCRT_FRESHNESS_AUDIT ${JSON.stringify({
  symbol: 'FOREXCOM:XAUUSD', timeframe: '5', module: 'B_CRT', direction: 1,
  setupTimestamp: Date.UTC(2026, 10, 6, 6, 5), expiredAt: Date.UTC(2026, 10, 6, 6, 20),
  setupReferenceOpen: Date.UTC(2026, 10, 6, 5, 45), currentReferenceOpen: Date.UTC(2026, 10, 6, 6),
  ...fields,
})}\n`;

it('reports distinct captures with reconciled net and explicit settings review', () => {
  const result = compareCrtFreshnessRuns(earlier, later);
  expect(result.status).toBe('SOURCE_SETTINGS_AND_WINDOW_REVIEW_REQUIRED');
  expect(result.original.total.completePositions).toBe(17);
  expect(result.experiment.total.completePositions).toBe(31);
  expect(result.observedNetDifference).toBeCloseTo(-99.075886, 6);
  expect(result.planDifferences).toHaveLength(48);
  expect(result.planDifferences[0]).toMatchObject({ field: 'missing-plan', missingFrom: 'experiment' });
  expect(result.expiryEvidence).toBe('NO_EVENTS_IN_SUPPLIED_LOG');
  expect(() => compareCrtFreshnessRuns(later, later)).toThrow(/distinct run captures/);
});

it('accepts a valid simulated audit event and rejects duplicate or impossible events', () => {
  const simulated = event();
  expect(compareCrtFreshnessRuns(earlier, later + simulated).experimentalExpiryEvents).toHaveLength(1);
  expect(() => compareCrtFreshnessRuns(earlier, later + simulated + simulated)).toThrow(/duplicate CRT/);
  expect(() => compareCrtFreshnessRuns(earlier, later + event({ expiredAt: Date.UTC(2026, 10, 6, 6, 15) })))
    .toThrow(/invalid CRT freshness/);
  expect(() => compareCrtFreshnessRuns(earlier + simulated, later)).toThrow(/Original capture contains/);
});

it('rejects an experiment log that selects a candidate after recording its expiry', () => {
  const inconsistent = event({
    setupTimestamp: 1793965200000, direction: -1,
    setupReferenceOpen: 1793963700000, currentReferenceOpen: 1793964600000,
    expiredAt: 1793965800000,
  });
  expect(() => compareCrtFreshnessRuns(earlier, later + inconsistent)).toThrow(/selected an expired B setup/);
});
