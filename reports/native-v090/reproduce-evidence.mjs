// Offline research receipt. Reads preserved raw evidence; never changes Pine or raw captures.
// Run from any directory. Optional --output-dir must name a directory that does not exist.
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSignalDiagnostics, decodePineCapture } from '../../scripts/analyze-signal-diagnostics.mjs';
import { analyzePlanOutcomes } from '../../scripts/analyze-plan-outcomes.mjs';
import { parsePlanAudit, comparePlanAudits } from '../../scripts/compare-plan-audit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const hash = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const evidence = {
  diagnosticStrategy: 'reports/native-v090/tradingview-strategy-signal-diag-2026-11-08.csv',
  diagnosticIndicatorArchived: 'reports/native-v080/signal-diagnostics-2026-11-07/indicator-run-research-1.csv',
  archivedIndicator: 'reports/native-v080/qualified-plan-2026-11-06/indicator-paired-raw.csv',
  archivedStrategy: 'reports/native-v080/qualified-plan-2026-11-06/strategy-paired-final-raw.csv',
  priorIndicator: 'reports/native-v080/confirmation-review-2026-11-05/indicator-native.log',
  priorStrategy: 'reports/native-v080/confirmation-review-2026-11-05/strategy-native.log',
  priorClassification: 'reports/native-v080/recalculation-review-2026-11-05/parity-timelines.json',
};
const before = Object.fromEntries(Object.entries(evidence).map(([name, path]) => [name, { path, sha256: hash(path) }]));
const decoded = Object.fromEntries(Object.entries(evidence).filter(([key]) => key !== 'priorClassification')
  .map(([key, path]) => [key, decodePineCapture(read(path))]));
const parse = text => parsePlanAudit(text.split(/\r?\n/).filter(line => line.includes('PLAN_AUDIT ')).join('\n'));
const indicator = parse(decoded.archivedIndicator), strategy = parse(decoded.archivedStrategy);
const priorIndicator = parse(decoded.priorIndicator), priorStrategy = parse(decoded.priorStrategy);
const comparison = comparePlanAudits(indicator, strategy, 0);
const priorCases = JSON.parse(read(evidence.priorClassification)).cases;
const key = row => `${row.symbol}|${row.timeframe}|${row.timestamp}`;
const indexes = [indicator, strategy, priorIndicator, priorStrategy].map(rows => new Map(rows.map(row => [key(row), row])));
const sameReviewedPlan = (a, b) => !a && !b || Boolean(a && b && comparePlanAudits([a], [b], 0).parity);
const mismatchKeys = [...new Set(comparison.mismatches.map(row => row.key))];
const cases = mismatchKeys.map(id => {
  const current = [indexes[0].get(id), indexes[1].get(id)];
  const previous = [indexes[2].get(id), indexes[3].get(id)];
  const timestamp = Number(id.split('|').at(-1));
  const prior = priorCases.find(row => row.timestamp === timestamp);
  const reviewedValuesMatch = current.every((row, side) => sameReviewedPlan(row, previous[side]));
  return { key: id, timestamp, utc: new Date(timestamp).toISOString(),
    mismatches: comparison.mismatches.filter(row => row.key === id),
    indicator: current[0] ?? null, strategy: current[1] ?? null,
    priorReviewedPlanValuesMatch: reviewedValuesMatch,
    assessment: prior && reviewedValuesMatch ? prior.assessment : 'UNRESOLVED',
    explanation: prior && reviewedValuesMatch ? prior.explanation : 'No matching prior causal review applies.',
    attribution: 'Current archived plan values checked against the older review. Candidate trace evidence belongs to its original separate experiments; this is not a new native trace.' };
});
const common = [...indexes[0].keys()].filter(id => indexes[1].has(id));
const differentCommon = common.filter(id => mismatchKeys.includes(id));
const parity = { schema: 'archived-parity-classification/v1', status: comparison.parity ? 'PLANS_MATCH_IN_ARCHIVE_ONLY' : 'PARITY_FAILED',
  scope: 'Archived November 6 pair; not current diagnostic-source native parity.',
  indicatorPlans: indicator.length, strategyPlans: strategy.length, commonPlans: common.length,
  exactCommonPlans: common.length - differentCommon.length, differingCommonPlans: differentCommon.length,
  indicatorOnlyPlans: indicator.length - common.length, strategyOnlyPlans: strategy.length - common.length,
  comparison, cases,
  separateUnresolvedIssue: 'The previously recorded Nov4 09:55 close/Entry change after reload is separate from execution-state mismatches and remains unresolved.',
  sourceClassification: before.priorClassification };
const diagnostic = analyzeSignalDiagnostics(read(evidence.diagnosticStrategy));
const indicatorDiagnostic = analyzeSignalDiagnostics(read(evidence.diagnosticIndicatorArchived));
const archived = analyzePlanOutcomes(decoded.archivedStrategy, evidence.archivedStrategy + ' decoded Message column');
const costs = analyzeSignalDiagnostics(read(evidence.archivedStrategy), {
  chartCurrency: 'USD', timeExitMinutes: 15, soleMarketCloseIsTimeExit: true,
});
for (const [name, { path, sha256 }] of Object.entries(before)) {
  if (hash(path) !== sha256) throw new Error(`Raw evidence changed during analysis: ${name}`);
}
const analysisTools = ['reports/native-v090/reproduce-evidence.mjs', 'scripts/analyze-signal-diagnostics.mjs',
  'scripts/analyze-plan-outcomes.mjs', 'scripts/analyze-strategy-exits.mjs', 'scripts/compare-plan-audit.mjs'];
const receipt = { schema: 'research-evidence-reproduction/v1',
  analysisTools: analysisTools.map(path => ({ path, sha256: hash(path) })), artifacts: before,
  diagnosticCapture: { status: diagnostic.captureStatus, exportStatus: diagnostic.exportStatus,
    eventCount: diagnostic.eventCount, lifecycle: diagnostic.lifecycleCoverage, costs: diagnostic.costs.overall },
  archivedIndicatorDiagnosticCapture: { status: indicatorDiagnostic.captureStatus,
    exportStatus: indicatorDiagnostic.exportStatus, eventCount: indicatorDiagnostic.eventCount,
    context: indicatorDiagnostic.context, modules: indicatorDiagnostic.modules,
    scope: 'Older Indicator diagnostic capture; distinct source/capture context from the Strategy. Not a current-source paired comparison.' },
  archivedPositions: { ...archived.counts, ...archived.overall },
  archivedExitCauses: costs.costs.byExitCause,
  archivedParity: { status: parity.status, indicatorPlans: parity.indicatorPlans, strategyPlans: parity.strategyPlans,
    commonPlans: parity.commonPlans, exactCommonPlans: parity.exactCommonPlans,
    differingCommonPlans: parity.differingCommonPlans, indicatorOnlyPlans: parity.indicatorOnlyPlans,
    strategyOnlyPlans: parity.strategyOnlyPlans, assessments: cases.map(({ utc, assessment }) => ({ utc, assessment })) },
  limits: ['No new native execution is performed by this tool.',
    'The legacy time-exit/source context is explicitly caller-asserted and supported by its archived report, not authenticated by this tool.',
    'Inspected historical outcomes cannot serve as untouched out-of-sample results.',
    'A structurally complete diagnostic export cannot authenticate TradingView provenance or exact active source.'] };
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--output-dir')) throw new Error('Usage: node reports/native-v090/reproduce-evidence.mjs [--output-dir <new-directory>]');
if (args.length) {
  const output = resolve(args[1]);
  mkdirSync(output); // Fail rather than overwrite any existing evidence or prior analysis.
  for (const [name, value] of Object.entries({ receipt, diagnostic, indicatorDiagnostic, archived, parity })) {
    writeFileSync(resolve(output, `${name}.json`), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  }
}
console.log(JSON.stringify(receipt, null, 2));
