// Verify a fresh-ID historical TradingView rerun against the preserved November 11 capture.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSignalDiagnostics, decodePineCapture } from '../../../../scripts/analyze-signal-diagnostics.mjs';
import { comparePlanAudits, parsePlanAudit } from '../../../../scripts/compare-plan-audit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const native = resolve(here, '../native');
const files = ['indicator-nov11.csv', 'indicator-nov11-repeat-fresh.csv'];
const captures = files.map(file => {
  const raw = readFileSync(resolve(native, file), 'utf8');
  const decoded = decodePineCapture(raw);
  const events = decoded.split(/\r?\n/).filter(line => line.includes('SIGNAL_DIAG '))
    .map(line => JSON.parse(line.split('SIGNAL_DIAG ')[1]));
  const analysis = analyzeSignalDiagnostics(raw, { chartCurrency: 'USD' });
  assert.equal(analysis.captureStatus, 'COMPLETE_WITHIN_CAPTURE_WINDOW', `${file}: incomplete capture`);
  assert.equal(analysis.budgetStatus, 'COMPLETE', `${file}: exhausted diagnostic budget`);
  assert.deepEqual(analysis.completenessProblems, [], `${file}: structural gaps`);
  const plans = parsePlanAudit(decoded.split(/\r?\n/).filter(line => line.includes('PLAN_AUDIT ')).join('\n'), file);
  return { file, sha256: createHash('sha256').update(raw).digest('hex'), events, plans, analysis };
});

const [original, repeat] = captures;
const oldContext = original.analysis.context;
const newContext = repeat.analysis.context;
for (const field of ['schema', 'runTag', 'parentSha256', 'model', 'symbol', 'timeframe', 'windowStart', 'windowEnd', 'firstDataTime']) {
  assert.deepEqual(newContext[field], oldContext[field], `Context changed: ${field}`);
}
assert.notEqual(newContext.captureId, oldContext.captureId, 'Capture ID did not change');
assert.equal(repeat.events.length, original.events.length, 'Diagnostic event count changed');
const substantive = event => {
  const { captureId, eventId, ...rest } = event;
  return rest;
};
assert.deepEqual(repeat.events.map(substantive), original.events.map(substantive),
  'Historical diagnostic sequence changed beyond capture identity');

// The live chart can add later plans after the original export. Compare all plans through
// the captured diagnostic endpoint, then separately compare plans inside that window.
const throughEnd = capture => capture.plans.filter(plan => plan.timestamp <= oldContext.windowEnd);
const inWindow = capture => capture.plans.filter(plan =>
  plan.timestamp > oldContext.windowStart && plan.timestamp <= oldContext.windowEnd);
const historical = comparePlanAudits(throughEnd(original), throughEnd(repeat), 0);
const windowPlans = comparePlanAudits(inWindow(original), inWindow(repeat), 0);
assert.equal(historical.parity, true, 'Plans through window end changed');
assert.equal(windowPlans.parity, true, 'Plans inside window changed');

const result = {
  result: 'FRESH_ID_HISTORICAL_REPEAT_MATCH',
  scope: 'FOREXCOM:XAUUSD M5, 2026-11-11 10:00–12:05 UTC, same loaded-history start',
  original: { file: original.file, sha256: original.sha256, captureId: oldContext.captureId,
    eventCount: original.events.length, planCountThroughEnd: throughEnd(original).length },
  repeat: { file: repeat.file, sha256: repeat.sha256, captureId: newContext.captureId,
    eventCount: repeat.events.length, planCountThroughEnd: throughEnd(repeat).length },
  substantiveDiagnosticEventsMatch: true,
  completeWithinWindow: true,
  planParityThroughEnd: historical.parity,
  planParityInWindow: windowPlans.parity,
  limits: [
    'Structural export completeness is not independently authenticated.',
    'One historical rerun does not prove general non-repainting or live first appearance.',
    'Later plans outside the endpoint are excluded because the chart kept advancing.',
  ],
};
writeFileSync(resolve(here, 'fresh-repeat-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
