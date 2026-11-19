// Analyze fresh same-history pairs and keep their changed history context explicit.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSignalDiagnostics, decodePineCapture } from '../../../../scripts/analyze-signal-diagnostics.mjs';
import { comparePlanAudits, parsePlanAudit } from '../../../../scripts/compare-plan-audit.mjs';
import { parseNativeInputs } from './native-inputs.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../../..');
const nativeDirectory = 'reports/native-v090/validation-continuation-2026-11-13/native';
const priorDirectory = 'reports/native-v090/validation-continuation-2026-11-09/parity';
const read = path => readFileSync(resolve(root, path), 'utf8');
const hashText = text => createHash('sha256').update(text).digest('hex');
const hash = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const write = (name, value) => writeFileSync(resolve(directory, name), JSON.stringify(value, null, 2) + '\n');
const sourcePaths = {
  indicator: 'pine/experiments/indicator_signal_diagnostics.pine',
  strategy: 'pine/experiments/strategy_signal_diagnostics.pine',
};
const sourceTexts = Object.values(sourcePaths).map(read);
const reviewedInputs = JSON.parse(read(`${priorDirectory}/fresh-input-comparison.json`)).comparisons.commonWindow.rows;
const oldPlans = Object.fromEntries(['indicator', 'strategy'].map(model => [model,
  JSON.parse(read(`${priorDirectory}/${model}-plans.json`))]));
const sourceIdentity = Object.fromEntries(Object.entries(sourcePaths).map(([model, path]) => {
  const copyBackPath = `${nativeDirectory}/${model}-editor-copy-back.pine`;
  const sourceSha256 = hash(path);
  const copiedText = read(copyBackPath);
  const normalizedCopyBackSha256 = hashText(copiedText.replace(/\r\n/g, '\n'));
  assert.equal(normalizedCopyBackSha256, sourceSha256, `${model} LF-normalized copy-back mismatch`);
  return [model, { path, sourceSha256, copyBackPath, rawCopyBackSha256: hash(copyBackPath),
    normalizedCopyBackSha256, normalization: 'CRLF_TO_LF_ONLY' }];
}));

const captures = {};
const comparisons = {};
const skipped = [];
for (const window of ['oct22-pm', 'nov3', 'nov4', 'nov10', 'nov11']) {
  const paths = Object.fromEntries(['indicator', 'strategy'].map(model => [model,
    `${nativeDirectory}/${model}-${window}.csv`]));
  const requiredPaths = [...Object.values(paths), ...['indicator', 'strategy']
    .map(model => `${nativeDirectory}/${model}-${window}-inputs-ax.txt`)];
  if (!requiredPaths.every(path => existsSync(resolve(root, path)))) {
    skipped.push({ window, status: 'PAIR_OR_INPUTS_NOT_AVAILABLE', paths,
      missing: requiredPaths.filter(path => !existsSync(resolve(root, path))) });
    continue;
  }
  for (const [model, path] of Object.entries(paths)) {
    const key = `${model}-${window}`;
    const raw = read(path);
    const decoded = decodePineCapture(raw);
    const analysis = analyzeSignalDiagnostics(raw, { chartCurrency: 'USD',
      ...(model === 'strategy' ? { timeExitMinutes: 15, soleMarketCloseIsTimeExit: true } : {}) });
    assert.equal(analysis.captureStatus, 'COMPLETE_WITHIN_CAPTURE_WINDOW', `${key} incomplete`);
    assert.equal(analysis.budgetStatus, 'COMPLETE', `${key} budget incomplete`);
    assert.deepEqual(analysis.completenessProblems, []);
    assert.equal(analysis.context.symbol, 'FOREXCOM:XAUUSD');
    assert.equal(analysis.context.timeframe, '5');
    assert.equal(analysis.context.model, model === 'strategy' ? 'STRATEGY_EMULATOR' : 'INDICATOR_ESTIMATE');
    const expectedParent = read(sourcePaths[model]).match(/const string DIAGNOSTIC_PARENT_SHA = '([a-f0-9]{64})'/)?.[1];
    assert.equal(analysis.context.parentSha256, expectedParent, `${key} parent declaration mismatch`);
    const inputsPath = `${nativeDirectory}/${key}-inputs-ax.txt`;
    const events = decoded.split(/\r?\n/).filter(line => line.includes('SIGNAL_DIAG '))
      .map(line => JSON.parse(line.split('SIGNAL_DIAG ')[1]));
    const plans = parsePlanAudit(decoded.split(/\r?\n/).filter(line => line.includes('PLAN_AUDIT ')).join('\n'), path);
    const inWindow = plan => plan.timestamp > analysis.context.windowStart && plan.timestamp <= analysis.context.windowEnd;
    const overlapsOriginalPlanExtent = analysis.context.windowStart <= Math.max(...oldPlans[model].map(plan => plan.timestamp));
    captures[key] = { path, sha256: hash(path), inputsPath, inputsSha256: hash(inputsPath),
      inputs: parseNativeInputs(read(inputsPath), sourceTexts, inputsPath), events, plans, analysis,
      inWindowPlans: plans.filter(inWindow),
      originalSameWindowComparison: overlapsOriginalPlanExtent
        ? comparePlanAudits(oldPlans[model].filter(inWindow), plans.filter(inWindow), 0) : null };
    write(`${key}.analysis.json`, analysis);
  }
  const indicator = captures[`indicator-${window}`];
  const strategy = captures[`strategy-${window}`];
  const contextKeys = ['symbol', 'timeframe', 'windowStart', 'windowEnd', 'firstDataTime'];
  assert(contextKeys.every(key => indicator.analysis.context[key] === strategy.analysis.context[key]), `${window} context differs`);
  const inputs = reviewedInputs.map(input => ({ variable: input.variable, label: input.label,
    indicator: indicator.inputs[input.label] ?? null, strategy: strategy.inputs[input.label] ?? null }));
  assert(inputs.every(input => input.indicator !== null && input.strategy !== null), `${window} missing native inputs`);
  assert(inputs.every(input => JSON.stringify(input.indicator) === JSON.stringify(input.strategy)), `${window} native inputs differ`);
  comparisons[window] = { equivalentCurrentPairContext: true, contextKeys, comparedTradingInputs: inputs.length,
    tradingInputDifferences: [], inputs,
    comparison: comparePlanAudits(indicator.inWindowPlans, strategy.inWindowPlans, 0),
    originalSameWindowComparisons: { indicator: indicator.originalSameWindowComparison,
      strategy: strategy.originalSameWindowComparison },
    originalFullHistoryFirstDataTime: 1791756000000,
    currentFirstDataTime: indicator.analysis.context.firstDataTime,
    sameLoadedHistoryAsOriginal: indicator.analysis.context.firstDataTime === 1791756000000 };
}

const at = (window, model, time, kind, module) => {
  const capture = captures[`${model}-${window}`];
  const event = capture.events.find(event => event.observedAt === Date.parse(time)
    && event.kind === kind && (module === undefined || event.module === module));
  assert(event, `${model}-${window} missing ${time} ${kind} ${module ?? ''}`);
  return event;
};
const f = 'F_TREND_PULLBACK';
const b = 'B_CRT';
const findings = [];
if (comparisons['oct22-pm']) {
  const time = clock => `2026-10-22T${clock}:00Z`;
  const evidence = {
    indicatorClosed: at('oct22-pm', 'indicator', time('15:25'), 'ESTIMATE_TRADE_CLOSED', b),
    indicatorEngine: at('oct22-pm', 'indicator', time('15:25'), 'ENGINE'),
    strategyEngine: at('oct22-pm', 'strategy', time('15:25'), 'ENGINE'),
    indicatorSetup: at('oct22-pm', 'indicator', time('15:25'), 'SETUP_DETECTED', f),
    strategyClosed: at('oct22-pm', 'strategy', time('15:30'), 'POSITION_CLOSED', b),
    strategySetup: at('oct22-pm', 'strategy', time('15:30'), 'SETUP_DETECTED', f),
    indicatorEarlierChecks: at('oct22-pm', 'indicator', time('15:30'), 'CHECKS', f),
    indicatorChecks: at('oct22-pm', 'indicator', time('15:40'), 'CHECKS', f),
    strategyChecks: at('oct22-pm', 'strategy', time('15:40'), 'CHECKS', f),
    indicatorSelected: at('oct22-pm', 'indicator', time('15:40'), 'SELECTED', f),
    strategySelected: at('oct22-pm', 'strategy', time('15:40'), 'SELECTED', f),
  };
  assert(evidence.indicatorEngine.slotAvailable && !evidence.strategyEngine.slotAvailable && evidence.strategyEngine.brokerBusy);
  assert.equal(evidence.indicatorSetup.setupTime, 1792682700000);
  assert.equal(evidence.strategySetup.setupTime, 1792683000000);
  assert.equal(evidence.indicatorSetup.trigger, 4053.725);
  assert.equal(evidence.strategySetup.trigger, 4051.675);
  assert.equal(evidence.indicatorSetup.invalidation, evidence.strategySetup.invalidation);
  assert.deepEqual(evidence.indicatorEarlierChecks.failedChecks, ['COOLDOWN']);
  for (const model of ['indicator', 'strategy']) assert.deepEqual(evidence[`${model}Checks`].failedChecks, []);
  assert.equal(evidence.indicatorSelected.planId, evidence.strategySelected.planId);
  const comparison = comparisons['oct22-pm'].comparison;
  assert.deepEqual(comparison.mismatches.map(mismatch => mismatch.field), ['setupTimestamp']);
  findings.push({ planTimestamp: 1792683600000, window: 'oct22-pm',
    classification: 'SAME_PLAN_DIFFERENT_SETUP_ORIGIN_FROM_EXECUTION_STATE_ESTABLISHED_IN_CURRENT_HISTORY',
    mechanism: 'Indicator observes estimated B closure15:25 and freezes F trigger4053.725. Strategy is still broker-busy then, observes its actual15:25 exit at15:30 and freezes later F trigger4051.675. Both pass every applicable check and select the same15:40 F plan. The source setup identities remain different. Indicator earlier15:30 confirmation failed only COOLDOWN.',
    evidence });
}
if (comparisons.nov3) {
  const time = clock => `2026-11-03T${clock}:00Z`;
  const evidence = {
    indicatorClosed: at('nov3', 'indicator', time('08:20'), 'ESTIMATE_TRADE_CLOSED', b),
    indicatorEngine: at('nov3', 'indicator', time('08:20'), 'ENGINE'),
    strategyEngine: at('nov3', 'strategy', time('08:20'), 'ENGINE'),
    indicatorSetup: at('nov3', 'indicator', time('08:20'), 'SETUP_DETECTED', f),
    strategyClosed: at('nov3', 'strategy', time('08:25'), 'POSITION_CLOSED', b),
    strategySetup: at('nov3', 'strategy', time('08:25'), 'SETUP_DETECTED', f),
    indicatorChecks: at('nov3', 'indicator', time('08:40'), 'CHECKS', f),
    strategyChecks: at('nov3', 'strategy', time('08:40'), 'CHECKS', f),
    indicatorSelected: at('nov3', 'indicator', time('08:40'), 'SELECTED', f),
    strategySelected: at('nov3', 'strategy', time('08:40'), 'SELECTED', f),
  };
  assert(evidence.indicatorEngine.slotAvailable && !evidence.strategyEngine.slotAvailable && evidence.strategyEngine.brokerBusy);
  assert.equal(evidence.indicatorSetup.setupTime, 1793694000000);
  assert.equal(evidence.strategySetup.setupTime, 1793694300000);
  assert.equal(evidence.indicatorSetup.trigger, 3907.715);
  assert.equal(evidence.strategySetup.trigger, 3908.215);
  assert.equal(evidence.indicatorSetup.invalidation, evidence.strategySetup.invalidation);
  for (const model of ['indicator', 'strategy']) assert.deepEqual(evidence[`${model}Checks`].failedChecks, []);
  assert.equal(evidence.indicatorSelected.planId, evidence.strategySelected.planId);
  assert.deepEqual(comparisons.nov3.comparison.mismatches.map(mismatch => mismatch.field), ['setupTimestamp']);
  findings.push({ planTimestamp: 1793695200000, window: 'nov3',
    classification: 'SAME_PLAN_DIFFERENT_SETUP_ORIGIN_FROM_EXECUTION_STATE_ESTABLISHED_IN_CURRENT_HISTORY',
    mechanism: 'Indicator observes estimated B closure08:20 and freezes short F trigger3907.715. Strategy remains broker-busy at08:20, observes the actual08:20 exit at08:25 and freezes later short F trigger3908.215. Both candidates retain invalidation3914.22 and pass all checks for the same08:40 F plan at entry3906.84. Their different setup timestamps remain visible in the strict comparison.',
    evidence });
}

if (comparisons.nov4) {
  const time = clock => `2026-11-04T${clock}:00Z`;
  const evidence = {
    indicatorClosed: at('nov4', 'indicator', time('10:10'), 'ESTIMATE_TRADE_CLOSED', f),
    indicatorEngine: at('nov4', 'indicator', time('10:10'), 'ENGINE'),
    strategyEngine: at('nov4', 'strategy', time('10:10'), 'ENGINE'),
    indicatorBSetup: at('nov4', 'indicator', time('10:10'), 'SETUP_DETECTED', b),
    indicatorFSetup: at('nov4', 'indicator', time('10:10'), 'SETUP_DETECTED', f),
    indicatorBEarlierChecks: at('nov4', 'indicator', time('10:15'), 'CHECKS', b),
    indicatorFEarlierChecks: at('nov4', 'indicator', time('10:15'), 'CHECKS', f),
    strategyClosed: at('nov4', 'strategy', time('10:15'), 'POSITION_CLOSED', f),
    strategyFSetup: at('nov4', 'strategy', time('10:15'), 'SETUP_DETECTED', f),
    indicatorBChecks: at('nov4', 'indicator', time('10:20'), 'CHECKS', b),
    indicatorFChecks: at('nov4', 'indicator', time('10:20'), 'CHECKS', f),
    indicatorBSelected: at('nov4', 'indicator', time('10:20'), 'SELECTED', b),
    indicatorFNotSelected: at('nov4', 'indicator', time('10:20'), 'QUALIFIED_NOT_SELECTED', f),
    strategyFChecks: at('nov4', 'strategy', time('10:20'), 'CHECKS', f),
    strategyFSelected: at('nov4', 'strategy', time('10:20'), 'SELECTED', f),
  };
  assert(evidence.indicatorEngine.slotAvailable && !evidence.strategyEngine.slotAvailable && evidence.strategyEngine.brokerBusy);
  assert.equal(evidence.indicatorBSetup.setupTime, 1793787000000);
  assert.equal(evidence.indicatorFSetup.setupTime, 1793787000000);
  assert.equal(evidence.strategyFSetup.setupTime, 1793787300000);
  for (const key of ['indicatorBEarlierChecks', 'indicatorFEarlierChecks']) {
    assert.deepEqual(evidence[key].failedChecks, ['COOLDOWN']);
  }
  for (const key of ['indicatorBChecks', 'indicatorFChecks', 'strategyFChecks']) {
    assert.deepEqual(evidence[key].failedChecks, []);
  }
  assert.equal(evidence.indicatorBChecks.quality, 90);
  assert.equal(evidence.indicatorFChecks.quality, 80);
  assert.equal(evidence.strategyFChecks.quality, 80);
  assert.equal(evidence.indicatorBChecks.plannedEntry, evidence.strategyFChecks.plannedEntry);
  assert.equal(evidence.indicatorBSelected.candidateId, evidence.indicatorBSetup.candidateId);
  assert.equal(evidence.indicatorFNotSelected.candidateId, evidence.indicatorFSetup.candidateId);
  assert.equal(evidence.strategyFSelected.candidateId, evidence.strategyFSetup.candidateId);
  findings.push({ planTimestamp: 1793787600000, window: 'nov4',
    classification: 'EXECUTION_STATE_CANDIDATE_ORIGIN_AND_SCORE_ARBITRATION_ESTABLISHED_IN_CURRENT_HISTORY',
    mechanism: 'Indicator closes its prior F estimate10:10, detects B and F then, and both first confirm10:15 but fail only COOLDOWN. Strategy is still broker-busy10:10 and observes the actual10:10 exit at10:15, when it detects later F. At10:20 Indicator B90 and F80 both pass every check, so deterministic highest-score arbitration selects B and marks F QUALIFIED_NOT_SELECTED. Strategy F80 passes and is selected. Entry4046.66 is common, but B invalidation4041.08 versus F invalidation4041.06 creates the0.02 stop difference and corresponding0.02/0.04/0.06 target differences.',
    evidence });
}

if (comparisons.nov10) {
  const time = clock => `2026-11-10T${clock}:00Z`;
  const evidence = {
    indicatorClosed: at('nov10', 'indicator', time('11:45'), 'ESTIMATE_TRADE_CLOSED', b),
    indicatorEngine: at('nov10', 'indicator', time('11:45'), 'ENGINE'),
    strategyEngine: at('nov10', 'strategy', time('11:45'), 'ENGINE'),
    indicatorSetup: at('nov10', 'indicator', time('11:45'), 'SETUP_DETECTED', f),
    strategyClosed: at('nov10', 'strategy', time('11:50'), 'POSITION_CLOSED', b),
    strategySetup: at('nov10', 'strategy', time('11:50'), 'SETUP_DETECTED', f),
    indicatorEarlierChecks: at('nov10', 'indicator', time('11:50'), 'CHECKS', f),
    indicatorChecks: at('nov10', 'indicator', time('11:55'), 'CHECKS', f),
    indicatorSelected: at('nov10', 'indicator', time('11:55'), 'SELECTED', f),
    strategyState: at('nov10', 'strategy', time('11:55'), 'STATE', f),
    strategyInvalidation: at('nov10', 'strategy', time('12:05'), 'INVALIDATED', f),
  };
  assert(evidence.indicatorEngine.slotAvailable && !evidence.strategyEngine.slotAvailable && evidence.strategyEngine.brokerBusy);
  assert.equal(evidence.indicatorSetup.trigger, 4071.75);
  assert.equal(evidence.strategySetup.trigger, 4070.935);
  assert.equal(evidence.indicatorSetup.invalidation, evidence.strategySetup.invalidation);
  assert.deepEqual(evidence.indicatorEarlierChecks.failedChecks, ['COOLDOWN']);
  assert.deepEqual(evidence.indicatorChecks.failedChecks, []);
  assert(evidence.indicatorChecks.plannedEntry < evidence.indicatorSetup.trigger
    && evidence.indicatorChecks.plannedEntry > evidence.strategySetup.trigger);
  assert.equal(evidence.strategyState.candidateId, evidence.strategySetup.candidateId);
  assert.equal(evidence.strategyState.stage, 1);
  assert.equal(evidence.strategyState.checksEvaluated, false);
  assert.equal(evidence.strategyInvalidation.candidateId, evidence.strategySetup.candidateId);
  findings.push({ planTimestamp: 1794311700000, window: 'nov10',
    classification: 'EXECUTION_STATE_FROZEN_TRIGGER_DIVERGENCE_ESTABLISHED_IN_CURRENT_HISTORY',
    mechanism: 'Indicator frees its slot11:45 after an estimated B closure and freezes short F trigger4071.75. Strategy is still broker-busy then, observes the actual11:45 exit at11:50 and freezes later F trigger4070.935. Indicator first confirms11:50 but fails only COOLDOWN. At11:55 the shared close4071.39 is below its short trigger and above the Strategy trigger. Indicator passes checks and selects F; Strategy retains the unconfirmed candidate and invalidates it12:05.',
    evidence });
}

if (comparisons.nov11) {
  const time = clock => `2026-11-11T${clock}:00Z`;
  const c = 'C_TURTLE_SOUP';
  const evidence = {
    commonIndicatorB: at('nov11', 'indicator', time('10:20'), 'SELECTED', b),
    commonStrategyB: at('nov11', 'strategy', time('10:20'), 'SELECTED', b),
    indicatorClosed: at('nov11', 'indicator', time('10:35'), 'ESTIMATE_TRADE_CLOSED', b),
    indicatorEngine: at('nov11', 'indicator', time('10:35'), 'ENGINE'),
    strategyEngine: at('nov11', 'strategy', time('10:35'), 'ENGINE'),
    strategyClosed: at('nov11', 'strategy', time('10:40'), 'POSITION_CLOSED', b),
    strategyLongB: at('nov11', 'strategy', time('10:40'), 'SETUP_DETECTED', b),
    strategyLongBChecks: at('nov11', 'strategy', time('11:20'), 'CHECKS', b),
    indicatorShortB: at('nov11', 'indicator', time('11:30'), 'SETUP_DETECTED', b),
    strategyBState: at('nov11', 'strategy', time('11:30'), 'STATE', b),
    indicatorC: at('nov11', 'indicator', time('11:35'), 'SETUP_DETECTED', c),
    strategyC: at('nov11', 'strategy', time('11:35'), 'SETUP_DETECTED', c),
    indicatorBChecks: at('nov11', 'indicator', time('11:35'), 'CHECKS', b),
    indicatorBSelected: at('nov11', 'indicator', time('11:35'), 'SELECTED', b),
    indicatorCCleared: at('nov11', 'indicator', time('11:35'), 'CANDIDATE_CLEARED', c),
    strategyCChecks: at('nov11', 'strategy', time('11:40'), 'CHECKS', c),
    strategyCSelected: at('nov11', 'strategy', time('11:40'), 'SELECTED', c),
    strategyBCleared: at('nov11', 'strategy', time('11:40'), 'CANDIDATE_CLEARED', b),
  };
  assert.equal(evidence.commonIndicatorB.planId, evidence.commonStrategyB.planId);
  assert(evidence.indicatorEngine.slotAvailable && !evidence.strategyEngine.slotAvailable && evidence.strategyEngine.brokerBusy);
  assert.equal(evidence.strategyLongB.direction, 1);
  assert.deepEqual(evidence.strategyLongBChecks.failedChecks, ['H1_ALIGNMENT', 'ENTRY_DISTANCE']);
  assert.equal(evidence.indicatorShortB.direction, -1);
  assert.equal(evidence.strategyBState.candidateId, evidence.strategyLongB.candidateId);
  assert.equal(evidence.strategyBState.stage, 1);
  assert.equal(evidence.strategyBState.direction, 1);
  assert.equal(evidence.indicatorC.candidateId, evidence.strategyC.candidateId);
  assert.deepEqual(evidence.indicatorBChecks.failedChecks, []);
  assert.deepEqual(evidence.strategyCChecks.failedChecks, []);
  assert.equal(evidence.indicatorCCleared.candidateId, evidence.indicatorC.candidateId);
  assert.equal(evidence.strategyBCleared.candidateId, evidence.strategyLongB.candidateId);
  assert.deepEqual(comparisons.nov11.comparison.mismatches.map(mismatch =>
    [mismatch.key, mismatch.field, mismatch.missingFrom]), [
    ['FOREXCOM:XAUUSD|5|1794396900000', 'missing-plan', 'strategy'],
    ['FOREXCOM:XAUUSD|5|1794397200000', 'missing-plan', 'indicator'],
  ]);
  findings.push(...[
    { planTimestamp: 1794396900000,
      classification: 'EXECUTION_STATE_RETAINED_OPPOSING_B_CANDIDATE_ESTABLISHED_IN_CURRENT_HISTORY',
      mechanism: 'Indicator observes its prior B estimated close10:35 and later arms a short B at11:30. Strategy observes its prior actual exit10:40 and retains a long B candidate from that bar. Its11:20 confirmation fails H1_ALIGNMENT and ENTRY_DISTANCE; the candidate remains stage1 at11:30, so a new short B cannot arm. Indicator short B passes checks and is selected11:35; the common C setup is then cleared.' },
    { planTimestamp: 1794397200000,
      classification: 'EXECUTION_STATE_DIFFERENT_SELECTED_MODULE_ESTABLISHED_IN_CURRENT_HISTORY',
      mechanism: 'Both models detect the identical short C setup11:35. Indicator selects its earlier short B then clears C. Strategy still has the H1-blocked long B candidate, so C survives to11:40, passes all checks, submits and fills a short Strategy position. This is downstream of the different B candidate state.' },
  ].map(finding => ({ ...finding, window: 'nov11', evidence })));
}

const originalComparison = JSON.parse(read(`${priorDirectory}/fresh-pair-comparison.json`)).fullAvailableHistory;
const originalMismatchKeys = new Set(originalComparison.mismatches.map(mismatch => mismatch.key));
const fullHistory = {};
for (const window of Object.keys(comparisons)) {
  const indicator = captures[`indicator-${window}`];
  const strategy = captures[`strategy-${window}`];
  const comparison = comparePlanAudits(indicator.plans, strategy.plans, 0);
  const mismatchedKeys = new Set(comparison.mismatches.map(mismatch => mismatch.key));
  const keyOf = plan => `${plan.symbol}|${plan.timeframe}|${plan.timestamp}`;
  const strategyKeys = new Set(strategy.plans.map(keyOf));
  const common = indicator.plans.filter(plan => strategyKeys.has(keyOf(plan)));
  fullHistory[window] = {
    sources: { indicator: indicator.path, strategy: strategy.path },
    firstDataTime: indicator.analysis.context.firstDataTime,
    counts: { indicator: indicator.plans.length, strategy: strategy.plans.length, common: common.length,
      exactCommon: common.filter(plan => !mismatchedKeys.has(keyOf(plan))).length,
      affectedPlanKeys: mismatchedKeys.size, fieldOrMissingPlanDifferences: comparison.mismatches.length },
    planExtents: Object.fromEntries(['indicator', 'strategy'].map(model => {
      const plans = captures[`${model}-${window}`].plans;
      return [model, { first: Math.min(...plans.map(plan => plan.timestamp)),
        last: Math.max(...plans.map(plan => plan.timestamp)) }];
    })),
    comparison, newMismatchKeys: [...mismatchedKeys].filter(key => !originalMismatchKeys.has(key)),
  };
}

const result = {
  schema: 'fresh-native-targeted-parity-causality/v1', reviewedOn: '2026-11-13', sourceIdentity,
  strategyPropertiesEvidence: {
    path: `${nativeDirectory}/strategy-properties-ax.txt`,
    sha256: hash(`${nativeDirectory}/strategy-properties-ax.txt`),
    observedValues: { initialCapital: 10000, currency: 'USD', pyramiding: 0,
      barDetail: 'Default (4 ticks per bar)', scriptExecution: 'On bar close',
      commission: 0.01, commissionType: 'Percent', longLeverage: '1x', shortLeverage: '1x',
      slippageTicks: 2, limitOrderExecution: 'Requested price', orderExecutionDelay: 'One tick' },
    method: 'Read from the preserved native Properties AX snapshot. The parent task also preserved the dialog screenshot.',
  },
  captures: Object.fromEntries(Object.entries(captures).map(([key, capture]) => [key, {
    path: capture.path, sha256: capture.sha256, inputsPath: capture.inputsPath, inputsSha256: capture.inputsSha256,
    context: capture.analysis.context, eventCount: capture.analysis.eventCount,
    captureStatus: capture.analysis.captureStatus, budgetStatus: capture.analysis.budgetStatus,
    exportStatus: capture.analysis.exportStatus, completenessProblems: capture.analysis.completenessProblems,
  }])), comparisons, findings, fullHistory, skipped,
  limitations: [
    'Current same-pair firstDataTime is compared explicitly. The loaded history differs from the original November9 full-history pair and cannot be claimed identical to that original run.',
    'Original same-window PLAN_AUDIT comparisons are preserved separately. Matching target plans under changed history establishes observed target reproduction only.',
    'Strict planned-field comparator failures remain visible at tolerance0. Causal classification does not convert them into parity PASS.',
    'Capture structural completeness remains unauthenticated at the export-envelope level.',
    'This analyzer performs no browser actions. Fresh browser tests and exact source-copy-back captures were performed by the parent task.',
  ],
};
write('fresh-native-causal-review.json', result);
const latestWindow = Object.keys(fullHistory).at(-1);
if (latestWindow) {
  const priorNov5 = JSON.parse(read(`${priorDirectory}/nov5-causal-review.json`));
  const october = JSON.parse(read('reports/native-v090/validation-continuation-2026-11-13/parity/october-causal-review.json'));
  const classified = [
    ...october.findings.map(finding => ({ ...finding, evidenceArtifact: 'october-causal-review.json' })),
    ...priorNov5.findings.map(finding => ({ ...finding, evidenceArtifact: `${priorDirectory}/nov5-causal-review.json` })),
    ...findings.map(finding => ({ ...finding, evidenceArtifact: 'fresh-native-causal-review.json' })),
  ];
  const latest = fullHistory[latestWindow];
  const keys = [...new Set(latest.comparison.mismatches.map(mismatch => mismatch.key))];
  write('current-full-history-comparison.json', { schema: 'current-full-history-review/v1',
    latestWindow, ...latest,
    originalComparison: { indicatorPlans: originalComparison.indicatorPlans,
      strategyPlans: originalComparison.strategyPlans, affectedPlanKeys: originalMismatchKeys.size,
      comparison: originalComparison },
    classifications: keys.map(key => {
      const planTimestamp = Number(key.split('|').at(-1));
      const finding = classified.find(finding => finding.planTimestamp === planTimestamp);
      return { key, planTimestamp, observedInOriginalComparison: originalMismatchKeys.has(key),
        classification: finding?.classification ?? 'UNRESOLVED_PENDING_NATIVE_ENGINE_AND_CHECKS',
        evidenceArtifact: finding?.evidenceArtifact ?? null };
    }),
    newDiagnosticWindows: [
      { name: 'nov10', keys: ['FOREXCOM:XAUUSD|5|1794311700000'],
        windowStart: Date.parse('2026-11-10T11:15:00Z'), windowEnd: Date.parse('2026-11-10T12:15:00Z'),
        rationale: 'Includes common B setup11:25/plan11:30, estimated closure11:45, Strategy observation11:50 and extra Indicator F11:55 through its12:05 estimated stop.' },
      { name: 'nov11', keys: ['FOREXCOM:XAUUSD|5|1794396900000', 'FOREXCOM:XAUUSD|5|1794397200000'],
        windowStart: Date.parse('2026-11-11T10:00:00Z'), windowEnd: Date.parse('2026-11-11T12:05:00Z'),
        rationale: 'Includes common B setup10:15/plan10:20, Indicator closure10:35/Strategy observation10:40, then Indicator B11:35 and Strategy C11:40 through position closures.' },
    ],
    limitation: 'The original comparison and current comparison have different loaded history and plan coverage. Counts are preserved separately, and target-window repetition does not equate their complete engine states.',
  });
}
console.log(JSON.stringify({ captures: Object.fromEntries(Object.entries(result.captures).map(([key, capture]) => [key,
  { events: capture.eventCount, status: capture.captureStatus, firstDataTime: capture.context.firstDataTime }])),
  comparisons: Object.fromEntries(Object.entries(comparisons).map(([key, comparison]) => [key,
    { parity: comparison.comparison.parity, comparedTradingInputs: comparison.comparedTradingInputs,
      originalIndicatorRepeat: comparison.originalSameWindowComparisons.indicator?.parity ?? null,
      originalStrategyRepeat: comparison.originalSameWindowComparisons.strategy?.parity ?? null,
      sameLoadedHistoryAsOriginal: comparison.sameLoadedHistoryAsOriginal }])),
  findings: findings.map(finding => ({ planTimestamp: finding.planTimestamp, classification: finding.classification })),
  fullHistoryCounts: Object.fromEntries(Object.entries(fullHistory).map(([window, result]) => [window, result.counts])), skipped,
}, null, 2));
