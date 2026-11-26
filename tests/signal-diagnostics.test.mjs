import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { runChartRuntimeHarness } from '@opus-aether-ai/pine-transpiler/test-harness';
import { analyzeSignalDiagnostics, decodePineCapture, readDiagnosticInput } from '../scripts/analyze-signal-diagnostics.mjs';

// SYNTHETIC UNIT FIXTURE ONLY: these rows test intake/accounting and are not TradingView evidence.
const cid = 'SYNTHETIC:XAUUSD:5:B_CRT:1:1300000';
const pid = 'SYNTHETIC:XAUUSD:5:B_CRT:1900000';
const positionId = `${pid}:1900000`;
function capture() {
  const events = [];
  const add = (kind, bar, fields = {}) => {
    const sequence = events.length + 1;
    const base = { schema: 'signal-diagnostics/v2', runTag: 'synthetic-unit-only', captureId: 'synthetic-capture-1', parentSha256: 'a'.repeat(64),
      model: 'STRATEGY_EMULATOR', symbol: 'SYNTHETIC:XAUUSD', timeframe: '5', windowStart: 1000000,
      windowEnd: 2200000, firstDataTime: 0, sequence,
      kind, module: '', candidateId: '', bar, barOpen: 1000000 + (bar - 100) * 300000,
      observedAt: 1300000 + (bar - 100) * 300000, ...fields };
    base.eventId = JSON.stringify(['signal-diagnostics/v2', base.captureId, base.symbol, base.timeframe, base.parentSha256, base.runTag, sequence]);
    events.push(base);
  };
  const candidate = { module: 'B_CRT', candidateId: cid };
  const plan = { ...candidate, planId: pid };
  add('CAPTURE_START', 100, { enabled: Array(8).fill(true), budget: 4000 });
  add('BAR', 100);
  add('SETUP_DETECTED', 100, { ...candidate, setupTime: 1300000, setupBar: 100, direction: 1, trigger: 101, invalidation: 90 });
  add('STAGE_REACHED', 100, { ...candidate, stage: 1 });
  add('BAR', 101);
  add('CONFIRMATION_PASSED', 101, { ...candidate, setupTime: 1300000, setupBar: 100, confirmationBar: 101 });
  add('CHECKS', 101, { ...candidate, checksEvaluated: true, firstBlocker: 'SESSION',
    firstBlockerMessage: 'Outside selected session', decisionConsistent: true, failedChecks: ['SESSION', 'H1_ALIGNMENT', 'QUALITY'] });
  add('BAR', 102);
  add('CONFIRMATION_PASSED', 102, { ...candidate, setupTime: 1300000, setupBar: 100, confirmationBar: 102 });
  add('CHECKS', 102, { ...candidate, checksEvaluated: true, decisionConsistent: true, firstBlocker: null, firstBlockerMessage: '', failedChecks: [] });
  add('SELECTED', 102, plan);
  add('QUALIFIED_PLAN', 102, { ...plan, executionAccepted: true, status: 'ENTRY_PENDING' });
  add('ORDER_SUBMITTED', 102, { ...plan, orderId: `${pid}:ENTRY`, actualTime: 1900000, actualBar: 102, price: 100, quantity: 1, positionId: '' });
  add('BAR', 103);
  add('FILLED', 103, { ...plan, orderId: `${pid}:ENTRY`, actualTime: 1900000, actualBar: 103, price: 100, quantity: 0.4, positionId });
  add('FILLED', 103, { ...plan, orderId: `${pid}:ENTRY`, actualTime: 1900000, actualBar: 103, price: 100, quantity: 0.6, positionId });
  const exit = { ...plan, positionId, entryTime: 1900000, entryBar: 103, entryPrice: 100, pointValue: 1,
    tickSize: 0.01, accountCurrency: 'USD', chartCurrency: 'USD', exitBar: 103 };
  add('EXIT_ROW', 103, { ...exit, rowIndex: 0, exitTime: 1901000, exitPrice: 105, signedQuantity: 0.4,
    grossAccount: 2, grossChart: 2, net: 1.9, commission: 0.1, exitId: 'TP1', exitComment: 'TP1_HIT' });
  add('EXIT_ROW', 103, { ...exit, rowIndex: 1, exitTime: 1902000, exitPrice: 107, signedQuantity: 0.6,
    grossAccount: 4.2, grossChart: 4.2, net: 4, commission: 0.2, exitId: 'TP3', exitComment: 'TP3_HIT' });
  add('POSITION_CLOSED', 103, { ...plan, positionId, entryTime: 1900000, exitTime: 1902000, initialQuantity: 1,
    closedQuantity: 1, exitRows: 2, grossAccount: 6.2, commission: 0.3, net: 5.9,
    initialPlannedCashRisk: 10, realizedRToPlannedRisk: 0.59, cause: 'TARGET', accountCurrency: 'USD' });
  const attempted = events.length;
  add('CAPTURE_END', 104, { budgetComplete: true, dropped: 0, attempted, observedBars: 4, firstBar: 100, lastBar: 103, endReason: 'WINDOW_END' });
  return events;
}
const encode = events => events.map(e => `SIGNAL_DIAG ${JSON.stringify(e)}`).join('\n');
const csv = events => 'Date,Message\r\n' + events.map(e => `"2026-11-06T00:00:00Z","${`SIGNAL_DIAG ${JSON.stringify(e)}`.replaceAll('"', '""')}"`).join('\r\n') + '\r\n';
const edit = (kind, changes, events = capture()) => events.map(e => e.kind === kind ? { ...e, ...changes } : e);
function resequence(events) {
  const copy = events.map((event, index) => ({ ...event, sequence: index + 1 }));
  for (const event of copy) event.eventId = JSON.stringify(['signal-diagnostics/v2', event.captureId,
    event.symbol, event.timeframe, event.parentSha256, event.runTag, event.sequence]);
  copy.at(-1).attempted = copy.length - 1;
  return copy;
}

describe('Research-only signal diagnostic intake', () => {
  it('evaluates the same optional confirmed M15 structure rule in both Pine scripts', () => {
    const generated = spawnSync('python3', ['scripts/generate_m15_alignment_candidate.py', '--check'], { encoding: 'utf8' });
    expect(generated.status, generated.stderr).toBe(0);
    const sources = ['indicator', 'strategy'].map(kind =>
      readFileSync(new URL(`../pine/experiments/${kind}_m15_alignment.pine`, import.meta.url), 'utf8'));
    const predicates = sources.map(source => source.match(/^m15StructurePass\([^\n]+\n +[^\n]+/m)?.[0]);
    expect(predicates[0]).toBeDefined();
    expect(predicates[0]).toBe(predicates[1]);
    for (const source of sources) {
      expect(source).toContain('m15Filter = input.bool(false,');
      expect(source).toContain("request.security(syminfo.tickerid, '15', structureContext()[1], lookahead=barmerge.lookahead_on)");
      expect(source).toContain('m15StructurePass(m15Filter, direction, mTrend)');
    }
    const source = `//@version=6
indicator('M15 alignment fixture')
${predicates[0]}
if barstate.isfirst
    if not m15StructurePass(true, 1, 1) or not m15StructurePass(true, -1, -1)
        runtime.error('Matching structure qualifies on both sides')
    if m15StructurePass(true, 1, -1) or m15StructurePass(true, -1, 1) or m15StructurePass(true, 1, 0) or m15StructurePass(true, 1, na) or m15StructurePass(true, 0, 0)
        runtime.error('Require a defined, matching structure direction')
    if not m15StructurePass(false, 1, -1)
        runtime.error('Disabled filter preserves existing decision')
plot(close)`;
    const result = runChartRuntimeHarness({ fixtureName: 'm15-structure-alignment', source, bars: 1, barIndexStart: 0 });
    expect(result.runtimeErrors).toEqual([]);
    expect(result.unimplementedStdCalls).toEqual([]);
    expect(result.pass).toBe(true);
  });

  it('reconciles M15 structure with candidate direction without replacing earlier blockers', () => {
    const rows = edit('CAPTURE_START', { requireM15Structure: true }).map(e => {
      if (e.kind !== 'CHECKS') return e;
      if (e.firstBlocker === null) return { ...e, m15Structure: 1 };
      return { ...e, m15Structure: 0, failedChecks: [...e.failedChecks, 'M15_STRUCTURE'] };
    });
    const result = analyzeSignalDiagnostics(encode(rows));
    expect(result.captureSetup.requireM15Structure).toBe(true);
    expect(result.modules.B.totals.firstBlockers).toEqual({ SESSION: 1 });
    expect(result.modules.B.totals.allFailedChecks.M15_STRUCTURE).toBe(1);
    expect(() => analyzeSignalDiagnostics(encode(edit('CHECKS', { m15Structure: 1 }, rows)))).toThrow(/captured direction/);
    const disabled = edit('CAPTURE_START', { requireM15Structure: false }, edit('CHECKS', { m15Structure: -1 }));
    expect(analyzeSignalDiagnostics(encode(disabled)).captureSetup.requireM15Structure).toBe(false);
  });

  it('runs the shared Pine execution-cost gate for both sides, limit orders, and invalid plans', () => {
    const generated = spawnSync('python3', ['scripts/generate_execution_cost_candidate.py', '--check'], { encoding: 'utf8' });
    expect(generated.status, generated.stderr).toBe(0);
    const sources = ['indicator', 'strategy'].map(kind =>
      readFileSync(new URL(`../pine/experiments/${kind}_execution_cost.pine`, import.meta.url), 'utf8'));
    const predicates = sources.map(source => source.match(/^modeledCostRiskPct\([\s\S]*?(?=^rrFeasible\()/m)?.[0]);
    expect(predicates[0]).toBeDefined();
    expect(predicates[0]).toBe(predicates[1]);
    for (const source of sources) {
      expect(source).toContain('executionCostLimitPct = input.float(0,');
      expect(source).toMatch(/if blocked == '' and not costOK\n\s+blocked := 'Modeled costs exceed stop-risk limit'\n\s+bool safe = blocked == ''/);
      expect(source).toMatch(/array\.push\(diagnosticChecks, costOK\)\n\s+array\.push\(diagnosticNames, 'EXECUTION_COST'\)/);
    }
    const source = `//@version=6
indicator('Execution cost gate fixture')
${predicates[0]}
if barstate.isfirst
    float buy = modeledCostRiskPct(1, 4000, 3995, 0.01, 0.01, 2, 0, false)
    float sell = modeledCostRiskPct(-1, 4000, 4005, 0.01, 0.01, 2, 0, false)
    float limit = modeledCostRiskPct(1, 4000, 3995, 0.01, 0.01, 2, 0, true)
    float withSpread = modeledCostRiskPct(1, 4000, 3995, 0.01, 0.01, 2, 1.5, false)
    float wrongSide = modeledCostRiskPct(1, 4000, 4005, 0.01, 0.01, 2, 0, false)
    float zeroRisk = modeledCostRiskPct(-1, 4000, 4000, 0.01, 0.01, 2, 0, false)
    float missingStop = modeledCostRiskPct(1, 4000, na, 0.01, 0.01, 2, 0, false)
    if math.abs(buy - 16.79) > 0.000001 or math.abs(sell - 16.81) > 0.000001
        runtime.error('Buy and sell cost percentage must use positive directional risk')
    if math.abs(limit - 16.39) > 0.000001 or math.abs(withSpread - 17.09) > 0.000001
        runtime.error('Limit entry slippage and extra spread must count on the configured legs')
    if not na(wrongSide) or not na(zeroRisk) or not na(missingStop)
        runtime.error('Invalid planned stops must have an unknown cost')
    if not executionCostPass(16.79, buy) or executionCostPass(16.78, buy) or executionCostPass(20, missingStop) or not executionCostPass(0, missingStop)
        runtime.error('The limit is inclusive, and only the disabled gate permits unknown cost')
plot(close)`;
    const report = runChartRuntimeHarness({ fixtureName: 'execution-cost-stop-risk', source, bars: 1, barIndexStart: 0 });
    expect(report.runtimeErrors).toEqual([]);
    expect(report.unimplementedStdCalls).toEqual([]);
    expect(report.pass).toBe(true);
  });

  it('preserves earlier blockers and checks the declared execution-cost threshold in diagnostic captures', () => {
    const executionCostModel = { limitPct: 15, commissionPctPerSide: 0.01, slippageTicks: 2, additionalSpreadTicks: 0 };
    const rows = edit('CAPTURE_START', { executionCostModel }).map(e => {
      if (e.kind !== 'CHECKS') return e;
      if (e.firstBlocker === null) return { ...e, executionCostPctOfRisk: 15 };
      return { ...e, executionCostPctOfRisk: 17, failedChecks: [...e.failedChecks, 'EXECUTION_COST'] };
    });
    const result = analyzeSignalDiagnostics(encode(rows));
    expect(result.captureSetup.executionCostModel).toEqual(executionCostModel);
    expect(result.modules.B.totals.firstBlockers).toEqual({ SESSION: 1 });
    expect(result.modules.B.totals.allFailedChecks.EXECUTION_COST).toBe(1);

    const costFirst = rows.map(e => e.kind === 'CHECKS' && e.firstBlocker === 'SESSION' ? {
      ...e, failedChecks: ['EXECUTION_COST'], firstBlocker: 'EXECUTION_COST', firstBlockerMessage: 'Modeled costs exceed stop-risk limit',
    } : e);
    expect(analyzeSignalDiagnostics(encode(costFirst)).modules.B.totals.firstBlockers).toEqual({ EXECUTION_COST: 1 });
    expect(() => analyzeSignalDiagnostics(encode(edit('CHECKS', { executionCostPctOfRisk: 14 }, rows)))).toThrow(/captured threshold/);
    expect(() => analyzeSignalDiagnostics(encode(edit('CAPTURE_START', { executionCostModel: null }, rows)))).toThrow(/capture settings/);
  });

  it('defers only a time-only exit in the Close-entry timing experiment', () => {
    const generated = spawnSync('python3', ['scripts/generate_time_exit_candidate.py', '--check'], { encoding: 'utf8' });
    expect(generated.status, generated.stderr).toBe(0);
    const candidate = readFileSync(new URL('../pine/experiments/indicator_time_exit_timing.pine', import.meta.url), 'utf8');
    const predicate = candidate.match(/^estimateExit\([^\n]+\n(?: +[^\n]+\n)+/m)?.[0];
    expect(predicate).toBeDefined();
    const source = `//@version=6
indicator('Time-exit timing fixture')
${predicate}
checkExit(bool nextOpen, bool queued, bool due, bool stopTouched, bool finalTouched, bool expectedStop, bool expectedTarget, bool expectedTime, bool expectedQueue, string reason) =>
    [stopHit, targetHit, timed, queueExit] = estimateExit(nextOpen, queued, due, stopTouched, finalTouched)
    if stopHit != expectedStop or targetHit != expectedTarget or timed != expectedTime or queueExit != expectedQueue
        runtime.error(reason)
if barstate.isfirst
    checkExit(false, false, true, false, false, false, false, true, false, 'Legacy closes at the limit')
    checkExit(true, false, false, false, false, false, false, false, false, 'Before time limit')
    checkExit(true, false, true, false, false, false, false, false, true, 'Queues at the time limit')
    checkExit(true, false, true, true, false, true, false, false, false, 'Existing stop takes priority')
    checkExit(true, false, true, false, true, false, true, false, false, 'Existing last target takes priority')
    checkExit(true, true, true, true, true, false, false, true, false, 'Queued market close precedes next candle touches')
plot(close)`;
    const report = runChartRuntimeHarness({ fixtureName: 'indicator-time-exit-next-open', source, bars: 1, barIndexStart: 0 });
    expect(report.runtimeErrors).toEqual([]);
    expect(report.unimplementedStdCalls).toEqual([]);
    expect(report.pass).toBe(true);
  });

  it('correlates one candidate and plan with two fills and partial exits without double-counting costs', () => {
    const out = analyzeSignalDiagnostics(encode(capture()));
    expect(out.captureStatus).toBe('COMPLETE_WITHIN_CAPTURE_WINDOW');
    expect(out.budgetStatus).toBe('COMPLETE');
    expect(out.exportStatus).toBe('STRUCTURALLY_COMPLETE_UNAUTHENTICATED');
    expect(out.exportAuthenticity).toBe('NOT_AUTHENTICATED');
    expect(out.modules.B.totals).toMatchObject({ detectedCandidates: 1, confirmationCandidates: 1, confirmationPassBars: 2,
      selectedPlans: 1, submittedOrders: 1, fills: 2, filledPositions: 1, exitRows: 2, closedPositions: 1 });
    expect(out.costs.overall).toMatchObject({ positions: 1, exitRows: 2, gross: 6.2, net: 5.9 });
    expect(out.costs.overall.commission).toBeCloseTo(0.3, 10);
    expect(out.costs.positions[0].realizedRToPlannedRisk).toBe(0.59);
    expect(out.costs.positions[0].partialTargetRows).toBe(2);
    expect(out.costs.positions[0].targetRows).toBe(2);
    expect(out.modules.B.totals).toMatchObject({ targetExitRows: 2, partialTargetExitRows: 2,
      targetExitRowsWithUnknownInitialQuantity: 0 });
    expect(out.costs.positions[0].hypotheticalNetAfterAdditionalSpread).toBe(5.9);
    expect(out.lifecycleCoverage).toMatchObject({ selectedPlans: 1, qualifiedPlanRecords: 1,
      submittedOrders: 1, fills: 2, exitRows: 2, completedPositions: 1, observedGaps: [] });
  });

  it('keeps the first blocker distinct from all failed checks and retains measured delay stages', () => {
    const out = analyzeSignalDiagnostics(encode(capture()));
    expect(out.modules.B.totals.firstBlockers).toEqual({ SESSION: 1 });
    expect(out.modules.B.totals.allFailedChecks).toEqual({ SESSION: 1, H1_ALIGNMENT: 1, QUALITY: 1 });
    expect(out.latencies[0]).toMatchObject({ candidateId: cid, planId: pid, setupToConfirmationBars: 1,
      confirmationToQualificationBars: 1, confirmationToOrderBars: 1, orderToFirstFillBars: 1,
      orderToFirstFillMilliseconds: 0, reportedFilledQuantity: 1 });
    expect(out.latencies[0].observedBlockHistory).toEqual([{ bar: 101, failedChecks: ['SESSION', 'H1_ALIGNMENT', 'QUALITY'] }]);
    expect(out.modules.A.totals.detectedCandidates).toBe(0);
  });

  it('deduplicates identical exported events but rejects identity collisions and invalid IDs', () => {
    const events = capture();
    const out = analyzeSignalDiagnostics(encode([...events, { ...events[2] }]));
    expect(out.duplicateExportsIgnored).toBe(1);
    expect(out.modules.B.totals.detectedCandidates).toBe(1);
    expect(() => analyzeSignalDiagnostics(encode([...events, { ...events[2], trigger: 102 }]))).toThrow(/Conflicting duplicate/);
    expect(() => analyzeSignalDiagnostics(encode(edit('SETUP_DETECTED', { eventId: 'wrong' })))).toThrow(/identity/);
  });

  it('uses a capture-scoped composite event identity even when run tags and sequence numbers repeat', () => {
    const first = capture()[2];
    const second = { ...first, captureId: 'synthetic-capture-2' };
    second.eventId = JSON.stringify(['signal-diagnostics/v2', second.captureId, second.symbol, second.timeframe,
      second.parentSha256, second.runTag, second.sequence]);
    expect(first.runTag).toBe(second.runTag);
    expect(first.sequence).toBe(second.sequence);
    expect(first.eventId).not.toBe(second.eventId);
    expect(JSON.parse(first.eventId)).toEqual(['signal-diagnostics/v2', first.captureId, first.symbol, first.timeframe,
      first.parentSha256, first.runTag, first.sequence]);
  });

  it('requires nonempty capture, run, symbol and timeframe context before accepting composite IDs', () => {
    for (const [field, value] of [['captureId', ''], ['captureId', undefined], ['captureId', null],
      ['runTag', ' '], ['symbol', ''], ['timeframe', '']]) {
      const events = resequence(capture().map(e => ({ ...e, [field]: value })));
      expect(() => analyzeSignalDiagnostics(encode(events))).toThrow(/capture context/);
    }
  });

  it('verifies generated parent hashes against the actual frozen parent files', () => {
    for (const kind of ['indicator', 'strategy']) {
      const parent = readFileSync(new URL(`../pine/experiments/${kind}_signal_clarity.pine`, import.meta.url));
      const generated = readFileSync(new URL(`../pine/experiments/${kind}_signal_diagnostics.pine`, import.meta.url), 'utf8');
      const parentHash = createHash('sha256').update(parent).digest('hex');
      const embedded = generated.match(/const string DIAGNOSTIC_PARENT_SHA = '([a-f0-9]{64})'/)?.[1];
      const generatedHash = createHash('sha256').update(generated).digest('hex');
      expect(embedded).toBe(parentHash);
      expect(generatedHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('renders expired and cancelled entries as unfilled, with closed reserved for exits', () => {
    const indicator = readFileSync(new URL('../pine/experiments/indicator_signal_diagnostics.pine', import.meta.url), 'utf8');
    const ending = indicator.match(/^clarityPlanEnding\([^\n]+$/m)?.[0];
    const cancelledCaption = indicator.match(/latestView\.wasCancelled \? (.+) : 'Ended; reason unavailable'/)?.[1];
    const previousState = indicator.match(/string previousState = [^\n]+/)?.[0];
    expect(ending).toBeDefined();
    expect(cancelledCaption).toBeDefined();
    expect(previousState).toBeDefined();
    expect(indicator).toMatch(/cancelOrder := true\n\s*\/\/ SIGNAL_DIAGNOSTIC_HOOK_BEGIN\n\s*clearOrderExpired := expired/);
    expect(indicator).toContain('latestView.wasCancelled := cancelOrder');
    expect(indicator).toContain('cancelledPlan ? lastPlanView.terminal');

    const source = `//@version=6
indicator('Plan outcome checks')
${ending}
cancelCaption(bool clearOrderExpired) => ${cancelledCaption}
previousCaption(bool closedPlan, bool cancelledPlan) =>
    ${previousState}
    previousState
if barstate.isfirst
    if clarityPlanEnding(false, true, cancelCaption(true)) != '\\nPending order expired · no fill'
        runtime.error('Expired pending plan')
    if clarityPlanEnding(false, true, cancelCaption(false)) != '\\nPending order cancelled · no fill'
        runtime.error('Cancelled pending plan')
    if clarityPlanEnding(false, false, 'Time exit (est.)') != '\\nCLOSED · Time exit (est.)'
        runtime.error('Closed trade')
    if clarityPlanEnding(true, false, '') != ''
        runtime.error('Open plan')
    if previousCaption(true, false) != ' closed' or previousCaption(false, true) != ' unfilled' or previousCaption(false, false) != ' ended'
        runtime.error('Previous plan state')
plot(close)`;
    const report = runChartRuntimeHarness({ fixtureName: 'diagnostic-indicator-outcomes', source, bars: 1, barIndexStart: 0 });
    expect(report.pass).toBe(true);
    expect(report.runtimeErrors).toEqual([]);
    expect(report.unimplementedStdCalls).toEqual([]);
  });

  it('keeps the structural invalidation, minimum ATR and tick grid in the opt-in stop', () => {
    const sources = ['indicator', 'strategy'].map(kind => readFileSync(
      new URL(`../pine/experiments/${kind}_signal_diagnostics.pine`, import.meta.url), 'utf8',
    ));
    const helpers = source => source.slice(source.indexOf('structureStopWithAtrFloor(int'), source.indexOf('// Time inputs are absolute timestamps.'));
    expect(helpers(sources[0])).toBe(helpers(sources[1]));
    for (const source of sources) {
      expect(source).toContain("stopMode = input.string('Structure', 'Stop mode'");
      expect(source).toContain("float proposedStop = stopMode == 'Structure + ATR floor' ? structureStopWithAtrFloor(direction, planned, baseStop, atr, buffer, stopFloorAtr, syminfo.mintick) : roundPrice(baseStop - direction * atr * buffer)");
      expect(source).toContain('riskTicks >= 2 and risk <= atr * maxStop');
    }

    const source = `//@version=6
indicator('Structural stop checks')
${helpers(sources[0])}
if barstate.isfirst
    float goldLong = structureStopWithAtrFloor(1, 3571.24, 3568.31, 4.2, 0.15, 1.0, 0.01)
    float goldShort = structureStopWithAtrFloor(-1, 3571.24, 3581.00, 5.8, 0.15, 1.0, 0.01)
    float goldOutward = structureStopWithAtrFloor(1, 2000.00, 1999.80, 0.255, 0.15, 1.0, 0.01)
    float bitcoinShort = structureStopWithAtrFloor(-1, 61477, 61520, 193.4, 0.15, 1.0, 1)
    if na(goldLong) or math.abs(goldLong - 3567.04) > 0.0000001
        runtime.error('XAUUSD long ATR floor, exact tick')
    if na(goldShort) or math.abs(goldShort - 3581.87) > 0.0000001
        runtime.error('XAUUSD short structured distance with buffer')
    if na(goldOutward) or math.abs(goldOutward - 1999.74) > 0.0000001
        runtime.error('XAUUSD fractional risk rounds outward')
    if na(bitcoinShort) or bitcoinShort != 61671
        runtime.error('BTCUSD short ATR floor with a whole-price tick')
    if not na(structureStopWithAtrFloor(1, 100, 101, 2, 0.15, 1, 0.01)) or not na(structureStopWithAtrFloor(-1, 100, 100, 2, 0.15, 1, 0.01))
        runtime.error('Wrong-side or entry-level invalidation')
    if not na(structureStopWithAtrFloor(1, 100, na, 2, 0.15, 1, 0.01)) or not na(structureStopWithAtrFloor(1, 100, 99, 0, 0.15, 1, 0.01)) or not na(structureStopWithAtrFloor(1, 100, 99, 2, 0.15, 1, 0))
        runtime.error('Missing structure, ATR, or tick')
    if not rrFeasible(1, 3571.24, goldLong, 3579.64, 2, 0.01) or rrFeasible(1, 3571.24, goldLong, 3579.63, 2, 0.01)
        runtime.error('TP2 feasibility uses the adjusted stop')
plot(close)`;
    const report = runChartRuntimeHarness({ fixtureName: 'structure-stop-atr-floor', source, bars: 1, barIndexStart: 0 });
    expect(report.pass).toBe(true);
    expect(report.runtimeErrors).toEqual([]);
    expect(report.unimplementedStdCalls).toEqual([]);
  });

  it('uses confirmed MSNR body levels once and allows only the first later retest', () => {
    const indicator = readFileSync(new URL('../pine/experiments/indicator_signal_diagnostics.pine', import.meta.url), 'utf8');
    const msnrSource = readFileSync(new URL('../pine/experiments/msnr_body_flip.pine.inc', import.meta.url), 'utf8');
    const strategy = readFileSync(new URL('../pine/experiments/strategy_signal_diagnostics.pine', import.meta.url), 'utf8');
    const predicates = indicator.slice(indicator.indexOf('breakConfirmed(int'), indicator.indexOf('rangeSweep(int'));
    const lifecycle = indicator.slice(indicator.indexOf('type Candidate\n'), indicator.indexOf('// Independent, persistent candidates.'));
    for (const source of [indicator, strategy]) {
      expect(source).toContain(msnrSource);
      expect(source).toContain("snrMode = input.string('K-SNR', 'D support/resistance concept'");
      expect(source.indexOf('    updateCandidates()')).toBeLessThan(source.indexOf('        msnrLevels.observeMsnr(bar_index,'));
      expect(source).toContain('"snrConcept"');
    }

    const source = `//@version=6
indicator('MSNR body flip checks')
${predicates}
diagDetected(string id, int direction, int stamped, int detected, float trigger, float invalidation) => 0
diagCandidateId(string id, int direction, int stamped) => id
diagEmit(string kind, string id, string candidate, string payload) => 0
${lifecycle}
${msnrSource}
if barstate.isfirst
    if msnrBodyLevel(1, 96, 100, 100, 98, 0.2) != 100 or msnrBodyLevel(-1, 104, 100, 100, 102, 0.2) != 100
        runtime.error('A and V body levels')
    if not na(msnrBodyLevel(1, 96, 100, 101, 98, 0.2)) or not na(msnrBodyLevel(1, 100, 100, 100, 98, 0.2))
        runtime.error('Skip gaps and dojis')
    if msnrBreak(1, 100, 0.2, 99, 99.5, 101, false) or msnrBreak(1, 100, 0.2, 101, 101, 102, true)
        runtime.error('Require displaced crossing from the correct side')
    Candidate longCandidate = Candidate.new(id='D_SNR', enabled=true)
    msnrLevels.observeMsnr(10, 5, 96, 100, 100, 98, 0.2)
    longCandidate.updateMsnr(msnrLevels, 11, 110, 98, 99.6, 102, 99.5, 101.8, 0.2, true)
    msnrLevels.observeMsnr(11, 5, 100, 98, 99.6, 101.8, 0.2)
    if longCandidate.stage != 1 or longCandidate.ready or longCandidate.invalidation != 99.5 or not na(msnrLevels.resistance)
        runtime.error('Freeze on breakout and consume the broken level')
    longCandidate.updateMsnr(msnrLevels, 11, 110, 98, 99.6, 102, 99.5, 101.8, 0.2, true)
    if longCandidate.ready or longCandidate.tests != 0
        runtime.error('No same-bar retest')
    longCandidate.maintain(12, 100.5, 102, 20)
    longCandidate.updateMsnr(msnrLevels, 12, 120, 101.8, 101, 102, 100.5, 101.9, 0.2, true)
    if longCandidate.ready or longCandidate.tests != 0
        runtime.error('A near miss preserves the pending candidate')
    longCandidate.maintain(13, 99.85, 101.5, 20)
    longCandidate.updateMsnr(msnrLevels, 13, 130, 101.9, 100.1, 101.5, 99.85, 101.4, 0.2, false)
    if not longCandidate.ready or longCandidate.tests != 1 or longCandidate.confirmationTime != 130
        runtime.error('First later directional retest confirms')
    longCandidate.maintain(14, 99.85, 101.5, 20)
    longCandidate.updateMsnr(msnrLevels, 14, 140, 101.4, 100.1, 101.5, 99.85, 101.4, 0.2, false)
    if longCandidate.ready or longCandidate.stage != 0
        runtime.error('First retest cannot be reused after arbitration')
    MsnrBodyLevels shortLevels = MsnrBodyLevels.new()
    shortLevels.observeMsnr(20, 5, 104, 100, 100, 102, 0.2)
    Candidate shortCandidate = Candidate.new(id='D_SNR', enabled=true)
    shortCandidate.updateMsnr(shortLevels, 21, 210, 102, 100.4, 100.6, 98.4, 99.0, 0.2, true)
    shortLevels.observeMsnr(21, 5, 100, 102, 100.4, 99.0, 0.2)
    if shortCandidate.direction != -1 or shortCandidate.invalidation != 100.6 or not na(shortLevels.support)
        runtime.error('Short breakout flips support, stop uses its far edge or breakout extreme')
    shortCandidate.maintain(22, 99.5, 100.15, 20)
    shortCandidate.updateMsnr(shortLevels, 22, 220, 99, 99.7, 100.15, 99.5, 100.0, 0.2, false)
    if shortCandidate.ready or shortCandidate.stage != 0 or shortCandidate.status != 'INVALIDATED'
        runtime.error('Unconfirmed first touch consumes the candidate')
    shortLevels.observeMsnr(23, 5, 96, 100, 100, 98, 0.2)
    shortLevels.observeMsnr(27, 5, 100.4, 99.0, 99.0, 98.5, 0.2)
    if shortLevels.resistance != 100
        runtime.error('Keep an unbroken level before its age limit')
    shortLevels.observeMsnr(28, 5, 99.0, 98.5, 98.5, 98.0, 0.2)
    if not na(shortLevels.resistance)
        runtime.error('An unbroken body level expires')
plot(close)`;
    const report = runChartRuntimeHarness({ fixtureName: 'msnr-body-flip', source, bars: 1, barIndexStart: 0 });
    expect(report.pass).toBe(true);
    expect(report.runtimeErrors).toEqual([]);
    expect(report.unimplementedStdCalls).toEqual([]);
  });

  it('compacts only the Strategy research presentation while preserving its trading decisions', () => {
    const parent = readFileSync(new URL('../pine/experiments/strategy_signal_clarity.pine', import.meta.url), 'utf8');
    const strategy = readFileSync(new URL('../pine/experiments/strategy_signal_diagnostics.pine', import.meta.url), 'utf8');
    const indicator = readFileSync(new URL('../pine/experiments/indicator_signal_diagnostics.pine', import.meta.url), 'utf8');
    const uniqueLine = (source, prefix) => {
      const matches = source.split('\n').filter(line => line.trimStart().startsWith(prefix));
      expect(matches).toHaveLength(1);
      return matches[0].trim();
    };
    const section = (source, start, end) => {
      const from = source.indexOf(start);
      expect(from).toBeGreaterThanOrEqual(0);
      const to = source.indexOf(end, from);
      expect(to).toBeGreaterThan(from);
      return source.slice(from, to);
    };
    const through = (source, start, end) => {
      const from = source.indexOf(start);
      expect(from).toBeGreaterThanOrEqual(0);
      const to = source.indexOf(end, from);
      expect(to).toBeGreaterThan(from);
      return source.slice(from, to + end.length);
    };
    const withoutDiagnosticHooks = source => source.replace(
      /^[ \t]*\/\/ SIGNAL_DIAGNOSTIC_HOOK_BEGIN\n[\s\S]*?^[ \t]*\/\/ SIGNAL_DIAGNOSTIC_HOOK_END\n/gm, '');

    expect(strategy.length).toBeLessThan(parent.length * 0.92);
    expect(withoutDiagnosticHooks(section(
      strategy,
      '// Flags consumed by both the visual indicator and strategy adapter.',
      '// QUANTITY_UNITS_HELPER_BEGIN',
    )).replace("stopMode == 'Structure + ATR floor' ? structureStopWithAtrFloor(direction, planned, baseStop, atr, buffer, stopFloorAtr, syminfo.mintick) : ", '')
      .replace(/    \/\/ Update body levels after evaluating[^\n]+\n    if enableD and snrMode == 'MSNR body flip'\n        msnrLevels\.observeMsnr[^\n]+\n/, '')).toBe(section(
      parent,
      '// Flags consumed by both the visual indicator and strategy adapter.',
      '// QUANTITY_UNITS_HELPER_BEGIN',
    ));
    expect(withoutDiagnosticHooks(through(
      strategy,
      '// QUANTITY_UNITS_HELPER_BEGIN',
      "strategy.close(selectedStrategy, comment='TRADE_CLOSED', immediately=false)",
    ))).toBe(through(
      parent,
      '// QUANTITY_UNITS_HELPER_BEGIN',
      "strategy.close(selectedStrategy, comment='TRADE_CLOSED', immediately=false)",
    ));
    expect(section(strategy, 'candidateRejection(bool', 'readinessState('))
      .toBe(section(parent, 'candidateRejection(bool', 'readinessState('));
    expect(withoutDiagnosticHooks(section(strategy, 'updateCandidates() =>', 'strategyName('))
      .replace(/        \/\/ MSNR_BRANCH_BEGIN\n[\s\S]*?        else\n([\s\S]*?)\n        \/\/ MSNR_BRANCH_END/, (_, legacy) => legacy.replace(/^    /gm, '')))
      .toBe(section(parent, 'updateCandidates() =>', 'strategyName('));
    for (const prefix of [
      'string blocked = candidateRejection(',
      'bool safe = blocked ==',
      'float accountRisk = strategy.convert_to_account(',
      'float unitNotional = strategy.convert_to_account(',
      'float riskQty = accountRisk > 0',
      'float exposureQty = unitNotional > 0',
      'float rawQty = math.min(riskQty, exposureQty)',
      'float qty = syminfo.mincontract > 0',
      'strategy.entry(selectedStrategy,',
      "strategy.exit('TP1',",
      "strategy.exit('TP2',",
      "strategy.exit('TP3',",
      "strategy.close(selectedStrategy, comment='TRADE_CLOSED', immediately=false)",
    ]) expect(uniqueLine(strategy, prefix)).toBe(uniqueLine(parent, prefix));

    for (const marker of ['REVIEW_DRAWINGS_BEGIN', 'REVIEW_BADGE_BEGIN', 'REVIEW_CONCEPT_VIEW_BEGIN',
      'SESSION_PLAN_LABELS_BEGIN', 'var table diagnosticTable', 'var table performance']) {
      expect(strategy).not.toContain(marker);
    }
    for (const kind of ['CAPTURE_START', 'CAPTURE_END', 'SETUP_DETECTED', 'CONFIRMATION_PASSED', 'CHECKS',
      'SELECTED', 'QUALIFIED_PLAN', 'ORDER_SUBMITTED', 'FILLED', 'EXIT_ROW', 'POSITION_CLOSED']) {
      expect(strategy).toContain(`'${kind}'`);
    }
    expect(indicator).toContain('var table diagnosticTable');
  });

  it('keeps legacy v1 evidence readable while using explicit v2 export status for new runs', () => {
    const legacy = capture().map(({ captureId, eventId, endReason, ...event }) => ({
      ...event, schema: 'signal-diagnostics/v1', eventId: `${event.runTag}:${event.sequence}`,
      ...(event.kind === 'CAPTURE_END' ? { complete: event.budgetComplete } : {}),
    }));
    const out = analyzeSignalDiagnostics(encode(legacy));
    expect(out.captureStatus).toBe('COMPLETE_WITHIN_CAPTURE_WINDOW');
    expect(out.budgetStatus).toBe('COMPLETE');
    expect(out.exportStatus).toBe('STRUCTURALLY_COMPLETE_UNAUTHENTICATED');
  });

  it('reports missing diagnostics as unavailable, not zero', () => {
    const out = analyzeSignalDiagnostics('Some native compile message.');
    expect(out.captureStatus).toBe('UNAVAILABLE');
    expect(out.modules.A.detectedCandidates).toBeNull();
    expect(out.costs).toBeNull();
  });

  it('marks missing boundaries, sequence gaps, dropped events and short history explicitly incomplete', () => {
    const cases = [
      capture().filter(e => e.kind !== 'CAPTURE_START'),
      capture().filter(e => e.kind !== 'CAPTURE_END'),
      capture().filter(e => e.kind !== 'STAGE_REACHED'),
      edit('CAPTURE_END', { budgetComplete: false, dropped: 3, attempted: capture().length + 2 }),
      capture().map(e => ({ ...e, firstDataTime: 1000001 })),
    ];
    for (const events of cases) {
      const out = analyzeSignalDiagnostics(encode(events));
      expect(out.captureStatus).toBe('INCOMPLETE');
      expect(out.completenessProblems.length).toBeGreaterThan(0);
      expect(out.modules.B.totals).toBeNull();
      expect(out.modules.B.observed.detectedCandidates).toBe(1);
      expect(out.costs.overall).toBeNull();
      expect(out.costs.observedCompletedSubtotal).toMatchObject({ positions: 1, exitRows: 2, gross: 6.2, net: 5.9 });
    }
    const omitted = capture().filter(e => e.kind !== 'STAGE_REACHED');
    const omittedOut = analyzeSignalDiagnostics(encode(omitted));
    expect(omittedOut.budgetStatus).toBe('COMPLETE');
    expect(omittedOut.exportStatus).toBe('INCOMPLETE_EXPORT');
  });

  it('does not call an early or differently terminated diagnostic window complete', () => {
    for (const changes of [
      { barOpen: 1900000, observedAt: 2200000, bar: 103 },
      { endReason: 'BUDGET_LIMIT' },
      { endReason: undefined },
    ]) {
      const out = analyzeSignalDiagnostics(encode(edit('CAPTURE_END', changes)));
      expect(out.captureStatus).toBe('INCOMPLETE');
      expect(out.budgetStatus).toBe('COMPLETE');
      expect(out.completenessProblems).toContain('CAPTURE_END_BEFORE_WINDOW_END_OR_INVALID_REASON');
      expect(out.costs.overall).toBeNull();
    }
  });

  it('checks window membership, observation chronology and event-to-BAR timestamps', () => {
    const outside = capture().map(e => e.bar === 100 ? { ...e, barOpen: 999999 } : e);
    const reversed = edit('STAGE_REACHED', { observedAt: 1200000 });
    const mismatched = edit('STAGE_REACHED', { barOpen: 1000001 });
    const repeatedBarTime = capture().map(e => e.bar === 101 ? { ...e, barOpen: 1000000, observedAt: 1300000 } : e);
    for (const [events, problem] of [
      [outside, 'EVENT_OUTSIDE_CAPTURE_WINDOW'],
      [reversed, 'NON_MONOTONIC_OBSERVATION_TIME'],
      [mismatched, 'EVENT_BAR_ASSOCIATION_MISMATCH'],
      [repeatedBarTime, 'MISSING_BAR_COVERAGE'],
    ]) {
      const out = analyzeSignalDiagnostics(encode(events));
      expect(out.captureStatus).toBe('INCOMPLETE');
      expect(out.completenessProblems).toContain(problem);
      expect(out.modules.B.totals).toBeNull();
    }
  });

  it('rejects inconsistent first/all blockers, unknown checks and mixed source/model contexts', () => {
    const first = capture().findIndex(e => e.kind === 'CHECKS');
    for (const fields of [{ firstBlocker: 'H1_ALIGNMENT' }, { failedChecks: ['SESSION', 'UNKNOWN'] },
      { failedChecks: ['SESSION', 'SESSION'] }]) {
      const events = capture(); events[first] = { ...events[first], ...fields };
      expect(() => analyzeSignalDiagnostics(encode(events))).toThrow(/blocker|checks/);
    }
    const mismatch = capture(); mismatch[first] = { ...mismatch[first], firstBlockerMessage: 'Quality below threshold' };
    expect(() => analyzeSignalDiagnostics(encode(mismatch))).toThrow(/message/);
    const disagreement = capture(); disagreement[first] = { ...disagreement[first], decisionConsistent: false };
    expect(() => analyzeSignalDiagnostics(encode(disagreement))).toThrow(/disagree/);
    expect(() => analyzeSignalDiagnostics(encode(edit('SETUP_DETECTED', { parentSha256: 'b'.repeat(64) })))).toThrow(/Mixed capture/);
    expect(() => analyzeSignalDiagnostics(encode(edit('FILLED', { model: 'INDICATOR_ESTIMATE' })))).toThrow(/Mixed capture/);
  });

  it('rejects excess fills, duplicated exits, quantity loss and inconsistent gross/net/R', () => {
    expect(() => analyzeSignalDiagnostics(encode(edit('FILLED', { quantity: 0.8 })))).toThrow(/exceeds submitted/);
    const rows = capture(); rows.find(e => e.kind === 'EXIT_ROW' && e.rowIndex === 1).rowIndex = 0;
    expect(() => analyzeSignalDiagnostics(encode(rows))).toThrow(/Duplicate closed-trade/);
    expect(() => analyzeSignalDiagnostics(encode(edit('POSITION_CLOSED', { closedQuantity: 0.9 })))).toThrow(/quantity/);
    expect(() => analyzeSignalDiagnostics(encode(edit('POSITION_CLOSED', { net: 5.6 })))).toThrow(/accounting/);
    expect(() => analyzeSignalDiagnostics(encode(edit('POSITION_CLOSED', { realizedRToPlannedRisk: 0.56 })))).toThrow(/Realized R/);
    expect(() => analyzeSignalDiagnostics(encode(edit('EXIT_ROW', { grossAccount: 10 })))).toThrow(/gross\/fee\/net/);
  });

  it('keeps a position with missing partial rows outside complete-position results', () => {
    const out = analyzeSignalDiagnostics(encode(capture().filter(e => !(e.kind === 'EXIT_ROW' && e.rowIndex === 0))));
    expect(out.captureStatus).toBe('INCOMPLETE');
    expect(out.costs.overall).toBeNull();
    expect(out.costs.observedCompletedSubtotal.positions).toBe(0);
    expect(out.costs.incompletePositions).toEqual([{ positionId, observedRows: 1, expectedRows: 2 }]);
  });

  it('sees a fill without any exit rows in an otherwise complete capture', () => {
    const withoutExits = resequence(capture().filter(e => !['EXIT_ROW', 'POSITION_CLOSED'].includes(e.kind)));
    const out = analyzeSignalDiagnostics(encode(withoutExits));
    expect(out.captureStatus).toBe('COMPLETE_WITHIN_CAPTURE_WINDOW');
    expect(out.modules.B.totals).toMatchObject({ filledPositions: 1, exitRows: 0, closedPositions: 0 });
    expect(out.costs.overall).toBeNull();
    expect(out.costs.observedCompletedSubtotal.positions).toBe(0);
    expect(out.costs.incompletePositions).toEqual([{ positionId, observedRows: 0, expectedRows: null }]);
  });

  it('retains MSNR settings and comparable bar coverage even with zero trades', () => {
    const noTrades = capture().filter(e => ['CAPTURE_START', 'CAPTURE_END', 'BAR'].includes(e.kind));
    const dOnly = [false, false, false, true, false, false, false, false];
    const control = resequence(edit('CAPTURE_START', { enabled: dOnly }, noTrades));
    const experiment = edit('CAPTURE_START', { snrConcept: 'MSNR body flip', msnrMaximumLevelAge: 60 }, control);
    const base = analyzeSignalDiagnostics(encode(control));
    const candidate = analyzeSignalDiagnostics(encode(experiment));
    expect(base.captureSetup).toEqual({ enabledModules: dOnly, snrConcept: null, msnrMaximumLevelAge: null });
    expect(candidate.captureSetup).toEqual({ enabledModules: dOnly, snrConcept: 'MSNR body flip', msnrMaximumLevelAge: 60 });
    expect(candidate.barCoverage).toEqual(base.barCoverage);
    expect(candidate.barCoverage).toMatchObject({ observedBars: 4, firstOpen: 1000000, lastOpen: 1900000 });
    expect(candidate.costs.overall.positions).toBe(0);
    expect(() => analyzeSignalDiagnostics(encode(edit('CAPTURE_START', { msnrMaximumLevelAge: 1 }, experiment)))).toThrow(/MSNR capture settings/);
  });

  it('counts a full-position TP3 as a target exit while partial quantities remain distinct', () => {
    const full = resequence(capture().filter(e => !(e.kind === 'FILLED' && e.quantity === 0.4) &&
      !(e.kind === 'EXIT_ROW' && e.rowIndex === 0)).map(e =>
      e.kind === 'FILLED' ? { ...e, quantity: 1 } :
      e.kind === 'EXIT_ROW' ? { ...e, signedQuantity: 1, grossAccount: 7, grossChart: 7, net: 6.8, commission: 0.2 } :
      e.kind === 'POSITION_CLOSED' ? { ...e, exitRows: 1, grossAccount: 7, commission: 0.2, net: 6.8, realizedRToPlannedRisk: 0.68 } : e));
    const out = analyzeSignalDiagnostics(encode(full));
    expect(out.costs.positions[0]).toMatchObject({ targetRows: 1, partialTargetRows: 0,
      targetRowsWithUnknownInitialQuantity: 0 });
    expect(out.modules.B.totals).toMatchObject({ targetExitRows: 1, partialTargetExitRows: 0 });
    const bounded = analyzeSignalDiagnostics(encode(resequence(capture().filter(e => e.kind !== 'POSITION_CLOSED'))));
    expect(bounded.modules.B.totals).toMatchObject({ targetExitRows: 2, partialTargetExitRows: null,
      targetExitRowsWithUnknownInitialQuantity: 2 });
  });

  it('applies additional hypothetical spread separately and avoids unsupported currency conversions', () => {
    const out = analyzeSignalDiagnostics(encode(capture()), { spreadPerSide: 0.25 });
    expect(out.costs.overall.net).toBe(5.9);
    expect(out.costs.positions[0].hypotheticalAdditionalSpreadCost).toBe(0.5);
    expect(out.costs.positions[0].hypotheticalNetAfterAdditionalSpread).toBe(5.4);
    const mixed = edit('EXIT_ROW', { chartCurrency: 'EUR' });
    expect(analyzeSignalDiagnostics(encode(mixed), { spreadPerSide: 0.25 }).costs.positions[0].hypotheticalAdditionalSpreadCost).toBeNull();
  });

  it('rejects closed quantities that exceed the position quantity actually filled', () => {
    const events = edit('FILLED', { quantity: 0.2 });
    // Submitted1 permits these0.4 fills; the independent closed position still says1.
    expect(() => analyzeSignalDiagnostics(encode(events))).toThrow(/fill.*quantity|quantity.*fill/i);
  });

  it('validates orders and fills even when their qualified plan was outside the bounded capture', () => {
    const orphan = () => resequence(capture().filter(e => !['SELECTED', 'QUALIFIED_PLAN'].includes(e.kind)));
    const valid = analyzeSignalDiagnostics(encode(orphan()));
    expect(valid.captureStatus).toBe('COMPLETE_WITHIN_CAPTURE_WINDOW');
    expect(valid.lifecycleCoverage.observedGaps).toContainEqual({ stage: 'QUALIFIED_PLAN_TO_ORDER', planId: pid,
      status: 'PLAN_RECORD_NOT_OBSERVED' });
    for (const [kind, fields] of [
      ['ORDER_SUBMITTED', { quantity: -1 }],
      ['ORDER_SUBMITTED', { actualBar: -1 }],
      ['ORDER_SUBMITTED', { actualTime: 9999999 }],
      ['FILLED', { quantity: -1 }],
      ['FILLED', { actualBar: -1 }],
      ['FILLED', { actualBar: 102.5 }],
      ['FILLED', { actualBar: 104 }],
      ['FILLED', { quantity: 0.8 }],
      ['FILLED', { actualBar: 101 }],
    ]) expect(() => analyzeSignalDiagnostics(encode(edit(kind, fields, orphan())))).toThrow(/integer|quantity|submission|fill/i);
    const futureFill = orphan().map(e => e.kind === 'FILLED' ? { ...e, actualTime: 9999999, positionId: `${pid}:9999999` } : e);
    expect(() => analyzeSignalDiagnostics(encode(futureFill))).toThrow(/future fill/);
  });

  it('rejects exit-bar chronology and broker events masquerading as Indicator estimates', () => {
    expect(() => analyzeSignalDiagnostics(encode(edit('EXIT_ROW', { exitBar: 102 })))).toThrow(/exit.*time/i);
    for (const kind of ['ORDER_SUBMITTED', 'FILLED', 'EXIT_ROW', 'POSITION_CLOSED']) {
      const events = resequence(capture().filter(e => !['ORDER_SUBMITTED', 'FILLED', 'EXIT_ROW', 'POSITION_CLOSED'].includes(e.kind) || e.kind === kind)
        .map(e => ({ ...e, model: 'INDICATOR_ESTIMATE' })));
      expect(() => analyzeSignalDiagnostics(encode(events))).toThrow(/Broker lifecycle event/);
    }
  });

  it('checks reported exit causes against the final actual exit row without inferring holding-time inputs', () => {
    for (const cause of ['STOP', 'TIME_EXIT', 'UNCLASSIFIED'])
      expect(() => analyzeSignalDiagnostics(encode(edit('POSITION_CLOSED', { cause })))).toThrow(/exit cause|Time exit/);
    const timed = capture().map(e => e.kind === 'POSITION_CLOSED' ? { ...e, cause: 'TIME_EXIT' } :
      e.kind === 'EXIT_ROW' && e.rowIndex === 1 ? { ...e, exitComment: 'TRADE_CLOSED', exitId: 'Close entry(s) order B_CRT' } : e);
    const out = analyzeSignalDiagnostics(encode(timed));
    expect(out.costs.positions[0]).toMatchObject({ cause: 'TIME_EXIT', causeAttribution: 'INSTRUMENTATION_REPORTED_WITH_EXIT_ROW_CONSISTENCY' });
    expect(out.limitations.some(x => x.includes('holding-time settings'))).toBe(true);
    const wrongId = timed.map(e => e.kind === 'EXIT_ROW' && e.rowIndex === 1 ? { ...e, exitId: 'TP3' } : e);
    expect(() => analyzeSignalDiagnostics(encode(wrongId))).toThrow(/supporting market-close row/);
  });

  it('does not add money from different account currencies across completed positions', () => {
    const native = decodePineCapture(readFileSync(new URL('../reports/native-v090/tradingview-strategy-signal-diag-2026-11-08.csv', import.meta.url), 'utf8'));
    const events = native.split(/\r?\n/).filter(l => l.includes('SIGNAL_DIAG '))
      .map(l => JSON.parse(l.slice(l.indexOf('SIGNAL_DIAG ') + 12)));
    const firstPosition = events.find(e => e.kind === 'POSITION_CLOSED').positionId;
    const mixed = events.map(e => e.positionId === firstPosition && ['EXIT_ROW', 'POSITION_CLOSED'].includes(e.kind)
      ? { ...e, accountCurrency: 'EUR', ...(e.kind === 'EXIT_ROW' ? { chartCurrency: 'EUR' } : {}) } : e);
    expect(() => analyzeSignalDiagnostics(encode(mixed))).toThrow(/mixed account currencies/);
  });

  it('validates candidate, plan, order and position correlation identities against the emitted context', () => {
    const cases = [
      edit('SETUP_DETECTED', { candidateId: 'forged' }),
      edit('SETUP_DETECTED', { direction: -1 }),
      edit('SETUP_DETECTED', { setupTime: 1300001 }),
      edit('QUALIFIED_PLAN', { planId: 'SYNTHETIC:OTHER:5:B_CRT:1900000' }),
      edit('QUALIFIED_PLAN', { planId: 'SYNTHETIC:XAUUSD:5:C_TURTLE_SOUP:1900000' }),
      edit('ORDER_SUBMITTED', { orderId: `${pid}:OTHER` }),
      edit('FILLED', { positionId: `${pid}:1900001` }),
      edit('EXIT_ROW', { positionId: `${pid}:1900001` }),
      edit('POSITION_CLOSED', { positionId: `${pid}:1900001` }),
      ...['EXIT_ROW', 'POSITION_CLOSED'].flatMap(kind => ['module', 'candidateId', 'planId', 'positionId']
        .map(field => edit(kind, { [field]: '' }))),
    ];
    for (const events of cases) expect(() => analyzeSignalDiagnostics(encode(events))).toThrow(/identity|correlation|candidate|plan|position|order/i);
  });

  it('keeps candidate identity and signed direction consistent across orphan position rows', () => {
    const orphan = resequence(capture().filter(e => !['SELECTED', 'QUALIFIED_PLAN'].includes(e.kind)));
    const differentCandidate = 'SYNTHETIC:XAUUSD:5:B_CRT:1:1300001';
    expect(() => analyzeSignalDiagnostics(encode(edit('EXIT_ROW', { candidateId: differentCandidate }, orphan))))
      .toThrow(/Position correlation mismatch/);
    expect(() => analyzeSignalDiagnostics(encode(edit('POSITION_CLOSED', { candidateId: differentCandidate }, orphan))))
      .toThrow(/Position correlation mismatch/);
    const reversed = orphan.map(e => e.kind === 'EXIT_ROW' ? { ...e, signedQuantity: -e.signedQuantity } : e);
    expect(() => analyzeSignalDiagnostics(encode(reversed))).toThrow(/quantity direction/);
  });

  it('reports lifecycle stages absent from a bounded capture without silently joining them', () => {
    const events = resequence(capture().filter(e => e.kind !== 'ORDER_SUBMITTED'));
    const out = analyzeSignalDiagnostics(encode(events));
    expect(out.lifecycleCoverage.observedGaps).toContainEqual({ stage: 'ORDER_TO_FILL', orderId: `${pid}:ENTRY`,
      positionId, status: 'ORDER_NOT_OBSERVED_IN_CAPTURE' });

    const preWindow = capture().filter(e => e.kind !== 'ORDER_SUBMITTED').map(e => {
      const event = { ...e };
      if (event.kind === 'FILLED') { event.actualTime = 900000; event.positionId = `${pid}:900000`; }
      if (event.kind === 'EXIT_ROW' || event.kind === 'POSITION_CLOSED') {
        event.entryTime = 900000; event.positionId = `${pid}:900000`;
      }
      return event;
    });
    const result = analyzeSignalDiagnostics(encode(resequence(preWindow)));
    expect(result.lifecycleCoverage.observedGaps).toContainEqual({ stage: 'ORDER_TO_FILL', orderId: `${pid}:ENTRY`,
      positionId: `${pid}:900000`, status: 'ORDER_MAY_PRECEDE_CAPTURE' });
  });

  it('rejects noninteger exit row, fill bar and position timestamp fields', () => {
    for (const [kind, fields] of [
      ['EXIT_ROW', { rowIndex: 0.5 }],
      ['EXIT_ROW', { rowIndex: -1 }],
      ['EXIT_ROW', { entryTime: 1900000.5 }],
      ['EXIT_ROW', { exitTime: 1902000.5 }],
      ['EXIT_ROW', { entryBar: 103.5 }],
      ['EXIT_ROW', { exitBar: 103.5 }],
      ['FILLED', { actualTime: 1900000.5 }],
      ['FILLED', { actualBar: 103.5 }],
      ['POSITION_CLOSED', { exitTime: 1902000.5 }],
      ['POSITION_CLOSED', { exitRows: 2.5 }],
    ]) expect(() => analyzeSignalDiagnostics(encode(edit(kind, fields)))).toThrow(/integer|identity|time|bar|index|rows/i);
  });

  it('keeps broker fill and realized-position fields unavailable for Indicator estimates', () => {
    const rows = capture().filter(e => !['ORDER_SUBMITTED', 'FILLED', 'EXIT_ROW', 'POSITION_CLOSED'].includes(e.kind));
    const events = rows.map((e, i) => {
      const event = { ...e, sequence: i + 1, model: 'INDICATOR_ESTIMATE' };
      event.eventId = JSON.stringify(['signal-diagnostics/v2', event.captureId, event.symbol, event.timeframe,
        event.parentSha256, event.runTag, event.sequence]);
      return event;
    });
    events.at(-1).attempted = events.length - 1;
    const out = analyzeSignalDiagnostics(encode(events));
    expect(out.captureStatus).toBe('COMPLETE_WITHIN_CAPTURE_WINDOW');
    expect(out.costs.availability).toBe('UNAVAILABLE_FOR_INDICATOR_ESTIMATE');
    expect(out.costs.overall).toBeNull();
    expect(out.costs.observedCompletedSubtotal).toBeNull();
    expect(out.costs.positions).toBeNull();
    expect(out.modules.B.totals.fills).toBeNull();
    expect(out.modules.B.totals.closedPositions).toBeNull();
    expect(out.latencies[0].orderToFirstFillBars).toBeNull();
  });

  it('decodes native CSV quoting and multiline cells and rejects truncated input', () => {
    expect(analyzeSignalDiagnostics(csv(capture())).costs.overall.net).toBe(5.9);
    expect(decodePineCapture('\uFEFFDate,Message\r\n"date","a,""quoted""\nsecond line"\r\n')).toBe('a,"quoted"\nsecond line');
    expect(() => decodePineCapture('Date,Message\n"date","unfinished')).toThrow(/Truncated CSV/);
    expect(() => analyzeSignalDiagnostics('SIGNAL_DIAG {')).toThrow(/Malformed\/truncated/);
  });

  it('reads compressed native captures directly and documents CLI options in help', () => {
    const source = new URL('../reports/native-v090/ah-holding-comparison-2026-11-21/ksnr-strategy-15-native.csv.gz', import.meta.url);
    const text = readDiagnosticInput(source);
    expect(text.startsWith('Date,Message')).toBe(true);
    const report = analyzeSignalDiagnostics(text);
    expect(report).toMatchObject({ captureStatus: 'COMPLETE_WITHIN_CAPTURE_WINDOW', budgetStatus: 'COMPLETE',
      lifecycleCoverage: { selectedPlans: 3, completedPositions: 3, exitRows: 4 } });
    expect(report.costs.overall.net).toBeCloseTo(10.3860254, 7);

    const help = spawnSync(process.execPath, [new URL('../scripts/analyze-signal-diagnostics.mjs', import.meta.url).pathname, '--help'],
      { encoding: 'utf8' });
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('<native.csv|native.csv.gz|log>');
    expect(help.stdout).toContain('--sole-time-close');
  });

  it('reproduces genuine 77-position legacy accounting without inventing missing stage counts', () => {
    const raw = readFileSync(new URL('../reports/native-v080/qualified-plan-2026-11-06/strategy-paired-final-raw.csv', import.meta.url), 'utf8');
    const out = analyzeSignalDiagnostics(raw, { chartCurrency: 'USD', timeExitMinutes: 15, soleMarketCloseIsTimeExit: true });
    expect(out.captureStatus).toBe('UNAVAILABLE');
    expect(out.modules.A.detectedCandidates).toBeNull();
    expect(out.costs.overall).toMatchObject({ positions: 77, wins: 33, losses: 44, exitRows: 113 });
    expect(out.costs.overall.gross).toBeCloseTo(51.898, 8);
    expect(out.costs.overall.commission).toBeCloseTo(134.1201774, 8);
    expect(out.costs.overall.net).toBeCloseTo(-82.2221774, 8);
    expect(out.costs.overall.netProfitFactor).toBeCloseTo(0.7734486992529832, 10);
    expect(out.costs.byExitCause.TIME_EXIT_SUPPORTED_BY_ASSERTED_SOURCE_CONTEXT.positions).toBe(68);
    expect(out.costs.byExitCause.STOP.positions).toBe(9);
    expect(out.costs.byModule.B_CRT.positions).toBe(46);
  });
});
