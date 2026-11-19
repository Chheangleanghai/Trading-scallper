// Reproduce direct native causal findings while preserving every original capture in place.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSignalDiagnostics, decodePineCapture } from '../../../../scripts/analyze-signal-diagnostics.mjs';
import { comparePlanAudits, parsePlanAudit } from '../../../../scripts/compare-plan-audit.mjs';
import { parseNativeInputs } from './native-inputs.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../../..');
const nativeDirectory = 'reports/native-v090/validation-continuation-2026-11-09/native';
const oldParityDirectory = 'reports/native-v090/validation-continuation-2026-11-09/parity';
const read = path => readFileSync(resolve(root, path), 'utf8');
const hash = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const write = (name, value) => writeFileSync(resolve(directory, name), JSON.stringify(value, null, 2) + '\n');
const sourcePaths = {
  indicator: 'pine/experiments/indicator_signal_diagnostics.pine',
  strategy: 'pine/experiments/strategy_signal_diagnostics.pine',
};
const copyBackPaths = {
  indicator: 'reports/native-v090/indicator-install-2026-11-09/indicator-editor-copy-back.pine',
  strategy: `${nativeDirectory}/strategy-editor-copy-back.pine`,
};

const parseInputs = path => parseNativeInputs(read(path), Object.values(sourcePaths).map(read), path);

const reviewedInputs = JSON.parse(read(`${oldParityDirectory}/fresh-input-comparison.json`))
  .comparisons.commonWindow.rows;
const sourceIdentity = Object.fromEntries(Object.keys(sourcePaths).map(model => {
  const localHash = hash(sourcePaths[model]);
  const copiedHash = hash(copyBackPaths[model]);
  assert.equal(localHash, copiedHash, `${model} source-copy-back mismatch`);
  return [model, { sourcePath: sourcePaths[model], sourceSha256: localHash,
    copyBackPath: copyBackPaths[model], copyBackSha256: copiedHash }];
}));

const captures = {};
const comparisons = {};
for (const window of ['oct19', 'oct22-am']) {
  for (const model of ['indicator', 'strategy']) {
    const key = `${model}-${window}`;
    const path = `${nativeDirectory}/${key}.csv`;
    const raw = read(path);
    const decoded = decodePineCapture(raw);
    const analysis = analyzeSignalDiagnostics(raw, { chartCurrency: 'USD',
      ...(model === 'strategy' ? { timeExitMinutes: 15, soleMarketCloseIsTimeExit: true } : {}) });
    assert.equal(analysis.captureStatus, 'COMPLETE_WITHIN_CAPTURE_WINDOW', `${key} incomplete`);
    assert.equal(analysis.budgetStatus, 'COMPLETE', `${key} budget incomplete`);
    assert.deepEqual(analysis.completenessProblems, [], `${key} completeness problems`);
    assert.equal(analysis.context.symbol, 'FOREXCOM:XAUUSD');
    assert.equal(analysis.context.timeframe, '5');
    assert.equal(analysis.context.model, model === 'strategy' ? 'STRATEGY_EMULATOR' : 'INDICATOR_ESTIMATE');
    const expectedParent = read(sourcePaths[model]).match(/const string DIAGNOSTIC_PARENT_SHA = '([a-f0-9]{64})'/)?.[1];
    assert.equal(analysis.context.parentSha256, expectedParent, `${key} parent declaration mismatch`);
    const events = decoded.split(/\r?\n/).filter(line => line.includes('SIGNAL_DIAG '))
      .map(line => JSON.parse(line.split('SIGNAL_DIAG ')[1]));
    const plans = parsePlanAudit(decoded.split(/\r?\n/).filter(line => line.includes('PLAN_AUDIT ')).join('\n'), path);
    const inputsPath = `${nativeDirectory}/${key}-inputs-ax.txt`;
    captures[key] = { path, sha256: hash(path), analysis, events, plans, inputsPath,
      inputsSha256: hash(inputsPath), inputs: parseInputs(inputsPath) };
    write(`${key}.analysis.json`, analysis);
  }
  const indicator = captures[`indicator-${window}`];
  const strategy = captures[`strategy-${window}`];
  const contextKeys = ['symbol', 'timeframe', 'windowStart', 'windowEnd', 'firstDataTime'];
  assert(contextKeys.every(key => indicator.analysis.context[key] === strategy.analysis.context[key]), `${window} context differs`);
  const inputs = reviewedInputs.map(input => ({ variable: input.variable, label: input.label,
    indicator: indicator.inputs[input.label] ?? null, strategy: strategy.inputs[input.label] ?? null }));
  assert(inputs.every(input => input.indicator !== null && input.strategy !== null), `${window} missing input`);
  assert(inputs.every(input => JSON.stringify(input.indicator) === JSON.stringify(input.strategy)), `${window} trading inputs differ`);
  const bounded = capture => capture.plans.filter(plan => plan.timestamp > capture.analysis.context.windowStart
    && plan.timestamp <= capture.analysis.context.windowEnd);
  comparisons[window] = { contextKeys, equivalentContext: true, comparedTradingInputs: inputs.length,
    tradingInputDifferences: [], inputs, comparison: comparePlanAudits(bounded(indicator), bounded(strategy), 0) };
}

const at = (capture, time, kind, module) => {
  const event = captures[capture].events.find(event => event.observedAt === Date.parse(time)
    && event.kind === kind && (module === undefined || event.module === module));
  assert(event, `${capture} missing ${time} ${kind} ${module ?? ''}`);
  return event;
};
const f = 'F_TREND_PULLBACK';
const b = 'B_CRT';
const oct19 = time => `2026-10-19T${time}:00Z`;
const oct22 = time => `2026-10-22T${time}:00Z`;
const evidence = {
  oct19F: {
    indicatorClosed: at('indicator-oct19', oct19('10:20'), 'ESTIMATE_TRADE_CLOSED', f),
    indicatorEngine: at('indicator-oct19', oct19('10:20'), 'ENGINE'),
    strategyEngine: at('strategy-oct19', oct19('10:20'), 'ENGINE'),
    indicatorSetup: at('indicator-oct19', oct19('10:20'), 'SETUP_DETECTED', f),
    strategyClosed: at('strategy-oct19', oct19('10:25'), 'POSITION_CLOSED', f),
    strategySetup: at('strategy-oct19', oct19('10:25'), 'SETUP_DETECTED', f),
    indicatorCooldown: at('indicator-oct19', oct19('10:25'), 'CHECKS', f),
    indicatorChecks: at('indicator-oct19', oct19('10:35'), 'CHECKS', f),
    indicatorSelection: at('indicator-oct19', oct19('10:35'), 'SELECTED', f),
    strategyState: at('strategy-oct19', oct19('10:35'), 'STATE', f),
    strategyLaterChecks: at('strategy-oct19', oct19('10:50'), 'CHECKS', f),
    strategyInvalidation: at('strategy-oct19', oct19('11:05'), 'INVALIDATED', f),
  },
  oct19B: Object.fromEntries(['indicator', 'strategy'].map(model => [model, {
    setup: at(`${model}-oct19`, oct19('10:50'), 'SETUP_DETECTED', b),
    engine: at(`${model}-oct19`, oct19('11:05'), 'ENGINE'),
    checks: at(`${model}-oct19`, oct19('11:05'), 'CHECKS', b),
    ...(model === 'strategy' ? { selected: at('strategy-oct19', oct19('11:05'), 'SELECTED', b) } : {}),
  }])),
  oct22B: {
    indicatorClosed: at('indicator-oct22-am', oct22('08:25'), 'ESTIMATE_TRADE_CLOSED', b),
    indicatorEngine: at('indicator-oct22-am', oct22('08:25'), 'ENGINE'),
    strategyEngine: at('strategy-oct22-am', oct22('08:25'), 'ENGINE'),
    indicatorSetup: at('indicator-oct22-am', oct22('08:25'), 'SETUP_DETECTED', b),
    indicatorInvalidation: at('indicator-oct22-am', oct22('08:30'), 'INVALIDATED', b),
    strategyClosed: at('strategy-oct22-am', oct22('08:30'), 'POSITION_CLOSED', b),
    strategySetup: at('strategy-oct22-am', oct22('08:30'), 'SETUP_DETECTED', b),
    indicatorState: at('indicator-oct22-am', oct22('08:35'), 'STATE', b),
    strategyChecks: at('strategy-oct22-am', oct22('08:35'), 'CHECKS', b),
    strategySelection: at('strategy-oct22-am', oct22('08:35'), 'SELECTED', b),
  },
};
const first = evidence.oct19F;
assert(first.indicatorEngine.slotAvailable && !first.strategyEngine.slotAvailable && first.strategyEngine.brokerBusy);
assert.equal(first.indicatorSetup.trigger, 4167.785);
assert.equal(first.strategySetup.trigger, 4164.96);
assert.deepEqual(first.indicatorCooldown.failedChecks, ['COOLDOWN']);
assert.deepEqual(first.indicatorChecks.failedChecks, []);
assert(first.indicatorChecks.plannedEntry < first.indicatorSetup.trigger
  && first.indicatorChecks.plannedEntry > first.strategySetup.trigger);
assert.equal(first.strategyState.candidateId, first.strategySetup.candidateId);
assert.equal(first.strategyState.stage, 1);
assert.equal(first.strategyState.checksEvaluated, false);
assert.deepEqual(first.strategyLaterChecks.failedChecks, ['STOP_DISTANCE', 'ENTRY_DISTANCE']);
const second = evidence.oct19B;
assert.equal(second.indicator.setup.candidateId, second.strategy.setup.candidateId);
assert.equal(second.indicator.engine.sessionPlans, 5);
assert.equal(second.strategy.engine.sessionPlans, 4);
assert.deepEqual(second.indicator.checks.failedChecks, ['QUOTA']);
assert.deepEqual(second.strategy.checks.failedChecks, []);
const third = evidence.oct22B;
assert(third.indicatorEngine.slotAvailable && !third.strategyEngine.slotAvailable && third.strategyEngine.brokerBusy);
assert.equal(third.indicatorSetup.invalidation, 4093.25);
assert.equal(third.indicatorInvalidation.candidateId, third.indicatorSetup.candidateId);
assert.equal(third.strategySetup.trigger, 4090.045);
assert.equal(third.strategySetup.invalidation, 4094.165);
assert.equal(third.indicatorState.stage, 0);
assert.equal(third.indicatorState.checksEvaluated, false);
assert.deepEqual(third.strategyChecks.failedChecks, []);
assert.equal(third.strategyChecks.candidateId, third.strategySetup.candidateId);

const result = {
  schema: 'native-october-parity-causality/v1',
  reviewedOn: '2026-11-13',
  sourceIdentity,
  captures: Object.fromEntries(Object.entries(captures).map(([key, capture]) => [key, {
    path: capture.path, sha256: capture.sha256, inputsPath: capture.inputsPath,
    inputsSha256: capture.inputsSha256, context: capture.analysis.context,
    eventCount: capture.analysis.eventCount, captureStatus: capture.analysis.captureStatus,
    budgetStatus: capture.analysis.budgetStatus, exportStatus: capture.analysis.exportStatus,
    completenessProblems: capture.analysis.completenessProblems,
  }])),
  comparisons,
  findings: [
    { planTimestamp: 1792406100000, classification: 'EXECUTION_STATE_FROZEN_TRIGGER_DIVERGENCE_ESTABLISHED',
      mechanism: 'Indicator closes its estimate at10:20 and creates a short F trigger4167.785. Strategy remains busy and observes its actual10:20 exit at10:25, then creates a different F trigger4164.96. At10:35 the shared Close-entry price4166.48 lies between those triggers. Indicator passes every check and selects F. Strategy remains unconfirmed. Its later10:50 confirmation fails STOP_DISTANCE and ENTRY_DISTANCE, then invalidates11:05.', evidence: first },
    { planTimestamp: 1792407900000, classification: 'QUOTA_BLOCK_ESTABLISHED_BY_ACTUAL_CHECKS',
      mechanism: 'Both models detect the same10:50 B candidate and confirm11:05. Indicator has5 session plans and fails only QUOTA. Strategy has4 and selects B with no failed checks. The extra Indicator10:35 F accounts for the one-plan quota difference.', evidence: second },
    { planTimestamp: 1792658100000, classification: 'EXECUTION_STATE_CANDIDATE_AND_REFERENCE_CONSUMPTION_DIVERGENCE_ESTABLISHED',
      mechanism: 'Indicator frees its slot at08:25 and creates B with invalidation4093.25. Strategy is still busy then. At08:30 Indicator invalidates that candidate while Strategy observes its actual08:25 position exit, creates a new B with invalidation4094.165 and trigger4090.045, and selects it08:35 after all checks pass. Indicator has no B candidate at08:35. The source consumes each completed CRT reference on setup creation. Both setup bars (08:20 and08:25 opens) share the08:00 completed M15 reference, so the Indicator cannot reuse that consumed reference after invalidation.',
      inferenceBoundary: 'ENGINE, setup identities, invalidation, empty Indicator state and Strategy checks/selection are native observations. The completed-reference08:00 identity and no-rearm explanation are derived from source request.security(crtTF,[high[1],low[1],time[1]],lookahead_on), actual15-minute CRT input, setup bar opens and memory.crtUsed assignment. The capture does not separately log memory.crtUsed.', evidence: third },
  ],
  limitations: [
    'These three mismatch mechanisms are established in the captured historical context. Strict full-history planned-field parity continues to fail.',
    'CAPTURE_START/CAPTURE_END and continuous sequence verification establish internal structural completeness. The analyzer explicitly reports STRUCTURALLY_COMPLETE_UNAUTHENTICATED because the log file has no independently authenticated export envelope.',
    'Target windows are a subset of available history. Global trading research admission remains disabled. Counts describe observed window events and inherited engine state.',
    'Strategy exits and costs are broker-emulator historical results. Indicator closure events are OHLC-model estimates.',
    'Native runtime source and inputs are supported by preserved post-paste copy-backs and AX snapshots. This read-only analysis did not run new browser actions or Replay.',
  ],
};
write('october-causal-review.json', result);
console.log(JSON.stringify({ sourceIdentity, captures: Object.fromEntries(Object.entries(result.captures)
  .map(([key, capture]) => [key, { events: capture.eventCount, status: capture.captureStatus }])),
  inputComparisons: Object.fromEntries(Object.entries(comparisons).map(([key, comparison]) => [key,
    { variables: comparison.comparedTradingInputs, parity: comparison.comparison.parity }])),
  findings: result.findings.map(finding => ({ planTimestamp: finding.planTimestamp, classification: finding.classification })),
}, null, 2));
