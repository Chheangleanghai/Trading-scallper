// Research-only intake. No network, order placement, parameter selection or Pine mutation.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePlanOutcomes } from './analyze-plan-outcomes.mjs';
import { parseStrategyExitLogs } from './analyze-strategy-exits.mjs';

export const CHECKS = ['WINDOW', 'DIRECTION', 'INVALIDATION', 'TARGETS', 'FIBONACCI', 'PREMIUM_DISCOUNT', 'VOLATILITY',
  'NEWS_PAUSE', 'SESSION', 'H1_ALIGNMENT', 'EMA_ALIGNMENT', 'STOP_DISTANCE', 'ENTRY_DISTANCE', 'RR', 'PRICE_ORDER', 'QUOTA', 'COOLDOWN', 'QUALITY'];
const REJECTION_MESSAGES = ['Outside research date window', 'Direction disabled', 'Missing structural invalidation',
  'Insufficient structure targets', 'Fibonacci location filter', 'Premium/discount filter', 'ATR volatility filter',
  'Manual news pause', 'Outside selected session', 'Setup opposes H1 trend', 'EMA alignment filter',
  'Stop distance invalid', 'Entry too far from setup', 'Minimum reward/risk not met',
  'Invalid Entry/SL/TP order', 'Session plan limit', 'Signal cooldown', 'Quality below threshold'];
const kinds = new Set(['CAPTURE_START', 'CAPTURE_END', 'BAR', 'ENGINE', 'STATE', 'SETUP_DETECTED', 'STAGE_REACHED',
  'CONFIRMATION_PASSED', 'INVALIDATED', 'EXPIRED', 'CHECKS', 'SELECTED', 'OPPOSING_CONFLICT', 'QUALIFIED_NOT_SELECTED',
  'CANDIDATE_CLEARED', 'QUALIFIED_PLAN', 'ORDER_SUBMITTED', 'ORDER_CANCELLED', 'FILLED', 'EXIT_ROW', 'POSITION_CLOSED',
  'ESTIMATE_FILLED', ...['TP1_HIT', 'TP2_HIT', 'TP3_HIT', 'STOP_LOSS_HIT', 'TRADE_CLOSED'].map(k => `ESTIMATE_${k}`)]);
const moduleLetter = m => /^[A-H]_/.test(m) ? m[0] : null;
const sum = a => a.reduce((s, n) => s + n, 0);
const near = (a, b) => Math.abs(a - b) <= Math.max(1e-7, Math.abs(b) * 1e-10);
const assert = (v, message) => { if (!v) throw new Error(message); };
const number = (o, k) => assert(typeof o[k] === 'number' && Number.isFinite(o[k]), `Invalid numeric ${k}`);
const canonical = v => JSON.stringify(v, (_, x) => x && !Array.isArray(x) && typeof x === 'object' ?
  Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const integer = (o, k) => assert(Number.isSafeInteger(o[k]) && o[k] >= 0, `Invalid integer ${k}`);
function validateCorrelation(e) {
  const prefix = `${e.symbol}:${e.timeframe}:${e.module}:`;
  if (e.candidateId) {
    assert(e.module && e.candidateId.startsWith(prefix), 'Invalid candidate identity');
    const tail = e.candidateId.slice(prefix.length);
    assert(/^(1|-1):\d+$/.test(tail) && Number.isSafeInteger(Number(tail.split(':')[1])), 'Invalid candidate identity');
    if (e.setupTime != null) assert(Number(tail.split(':')[1]) === e.setupTime, 'Candidate setup identity mismatch');
    if (e.direction != null) assert(Number(tail.split(':')[0]) === e.direction, 'Candidate direction identity mismatch');
  }
  if (e.planId) {
    assert(e.module && e.planId.startsWith(prefix) && /^\d+$/.test(e.planId.slice(prefix.length)) &&
      Number.isSafeInteger(Number(e.planId.slice(prefix.length))), 'Invalid plan identity');
    if (e.kind === 'QUALIFIED_PLAN') assert(Number(e.planId.slice(prefix.length)) === e.observedAt, 'Plan timestamp identity mismatch');
  }
  if (e.orderId) assert(e.orderId === `${e.planId}:ENTRY`, 'Invalid order identity');
  if (e.positionId) {
    const entered = e.entryTime ?? e.actualTime;
    assert(Number.isSafeInteger(entered) && e.positionId === `${e.planId}:${entered}`, 'Invalid position identity');
  }
}
const countBy = (rows, fn) => rows.reduce((o, row) => { const k = fn(row); o[k] = (o[k] ?? 0) + 1; return o; }, {});

// Native Date,Message CSV (RFC4180 quoting, escaped quotes and multiline fields), or copied log lines.
export function decodePineCapture(text) {
  text = text.replace(/^\uFEFF/, '');
  if (!/^"?Date"?,"?Message"?\r?\n/.test(text)) return text;
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else { assert(quoted || cell === '', 'Malformed CSV quote'); quoted = !quoted; }
    } else if (!quoted && c === ',') { row.push(cell); cell = ''; }
    else if (!quoted && c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  assert(!quoted, 'Truncated CSV quoted field');
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  assert(rows.shift().join(',') === 'Date,Message', 'Expected native Date,Message columns');
  assert(rows.every(r => r.length === 2), 'Malformed native CSV row');
  return rows.map(r => r[1]).join('\n');
}

function costSummary(positions) {
  const wins = positions.filter(p => p.net > 0), losses = positions.filter(p => p.net < 0);
  return { positions: positions.length, wins: wins.length, losses: losses.length, exitRows: sum(positions.map(p => p.exitRows)),
    gross: sum(positions.map(p => p.gross)), commission: sum(positions.map(p => p.commission)), net: sum(positions.map(p => p.net)),
    netProfitFactor: losses.length ? sum(wins.map(p => p.net)) / -sum(losses.map(p => p.net)) : null,
    netExpectancy: positions.length ? sum(positions.map(p => p.net)) / positions.length : null };
}

function legacyCosts(text, options) {
  if (!text.includes('TRADE_GROUP_AUDIT ')) return null;
  const old = analyzePlanOutcomes(text);
  const { rows, groups } = parseStrategyExitLogs(text);
  const positions = old.positions.map(p => {
    const g = groups.find(g => g.planTimestamp === p.planTimestamp && g.module === p.module);
    const exits = rows.filter(r => r.planTimestamp === p.planTimestamp && r.module === p.module).sort((a, b) => a.closedTradeIndex - b.closedTradeIndex);
    const last = exits.at(-1);
    const timed = options.timeExitMinutes > 0 && options.soleMarketCloseIsTimeExit === true &&
      last.exitComment === 'TRADE_CLOSED' && last.exitId.startsWith('Close entry(s) order') && g.holdMinutes >= options.timeExitMinutes;
    const cause = last.exitComment === 'STOP_LOSS_HIT' ? 'STOP' : timed ? 'TIME_EXIT_SUPPORTED_BY_ASSERTED_SOURCE_CONTEXT' :
      /^TP[123]_HIT$/.test(last.exitComment) ? 'TARGET' : 'MARKET_CLOSE_UNATTRIBUTED';
    const chartGross = sum(exits.map(r => (r.actualExit - r.actualEntry) * r.size * g.pointValue));
    // Original data lacks chart currency; require explicit context before equating currencies.
    if (options.chartCurrency === g.accountCurrency) assert(near(chartGross - p.commission, p.net), 'Legacy fill-price accounting mismatch');
    return { planTimestamp: p.planTimestamp, module: p.module, gross: p.grossBeforeCommission, commission: p.commission,
      net: p.net, realizedRToPlannedRisk: p.netRToPlannedInitialCashRisk, exitRows: exits.length, cause,
      holdMinutes: g.holdMinutes, quantity: g.initialQty, pointValue: g.pointValue, accountCurrency: g.accountCurrency,
      chartCurrency: options.chartCurrency ?? null, grossChart: chartGross, partialTargetRows: exits.filter(r => /^TP[123]_HIT$/.test(r.exitComment)).length };
  });
  return { source: 'Reused analyzePlanOutcomes and actual emulator rows; historical context options are caller-asserted',
    overall: costSummary(positions), byModule: Object.fromEntries([...new Set(positions.map(p => p.module))].sort().map(m => [m, costSummary(positions.filter(p => p.module === m))])),
    byExitCause: Object.fromEntries([...new Set(positions.map(p => p.cause))].map(c => [c, costSummary(positions.filter(p => p.cause === c))])), positions };
}

export function analyzeSignalDiagnostics(input, options = {}) {
  const text = decodePineCapture(input);
  const parsed = text.split(/\r?\n/).filter(l => l.includes('SIGNAL_DIAG ')).map(line => {
    try { return JSON.parse(line.slice(line.indexOf('SIGNAL_DIAG ') + 12)); }
    catch { throw new Error('Malformed/truncated SIGNAL_DIAG JSON'); }
  });
  const unavailable = Object.fromEntries([... 'ABCDEFGH'].map(m => [m, { status: 'UNAVAILABLE', detectedCandidates: null,
    confirmationCandidates: null, firstBlockers: null, allFailedChecks: null, selectedPlans: null, submittedOrders: null, fills: null }]));
  if (!parsed.length) return { schema: 'signal-diagnostics-analysis/v1', captureStatus: 'UNAVAILABLE',
    budgetStatus: 'UNKNOWN', exportStatus: 'UNAVAILABLE', exportAuthenticity: 'NOT_AUTHENTICATED',
    reason: 'No new diagnostic instrumentation in this capture; missing lifecycle stages are not zero.',
    modules: unavailable, costs: legacyCosts(text, options), limitations: ['No native diagnostic lifecycle counts or order-submission latency can be reconstructed from accepted-plan logs alone.'] };

  const identities = new Map(), events = [], duplicates = [];
  const schema = parsed[0].schema;
  assert(['signal-diagnostics/v1', 'signal-diagnostics/v2'].includes(schema), 'Unsupported diagnostic schema');
  const contextFields = ['schema', 'runTag', ...(schema === 'signal-diagnostics/v2' ? ['captureId'] : []),
    'parentSha256', 'model', 'symbol', 'timeframe', 'windowStart', 'windowEnd', 'firstDataTime'];
  const context = Object.fromEntries(contextFields.map(k => [k, parsed[0][k]]));
  for (const e of parsed) {
    assert(e.schema === schema && kinds.has(e.kind), 'Mixed/unsupported diagnostic schema or kind');
    assert(contextFields.every(k => e[k] === context[k]), 'Mixed capture/source/model context');
    assert(/^[a-f0-9]{64}$/.test(e.parentSha256) && ['STRATEGY_EMULATOR', 'INDICATOR_ESTIMATE'].includes(e.model), 'Invalid source/model');
    for (const k of ['sequence', 'bar', 'barOpen', 'observedAt', 'windowStart', 'windowEnd', 'firstDataTime']) {
      assert(Number.isSafeInteger(e[k]) && e[k] >= 0, `Invalid integer ${k}`);
    }
    assert(e.sequence > 0 && e.windowEnd > e.windowStart && e.observedAt >= e.barOpen, 'Invalid sequence/window/time');
    const expectedEventId = schema === 'signal-diagnostics/v1' ? `${e.runTag}:${e.sequence}` :
      JSON.stringify(['signal-diagnostics/v2', e.captureId, e.symbol, e.timeframe, e.parentSha256, e.runTag, e.sequence]);
    assert(e.eventId === expectedEventId, 'Invalid lifecycle event identity');
    if (e.module) assert(moduleLetter(e.module), 'Invalid A-H module');
    validateCorrelation(e);
    const identityKey = canonical([e.schema, e.captureId ?? '', e.symbol, e.timeframe, e.parentSha256, e.runTag, e.sequence]);
    const prior = identities.get(identityKey);
    if (prior) { assert(canonical(prior) === canonical(e), 'Conflicting duplicate event identity'); duplicates.push(e.eventId); continue; }
    identities.set(identityKey, e); events.push(e);
  }
  events.sort((a, b) => a.sequence - b.sequence);
  const problems = [];
  const starts = events.filter(e => e.kind === 'CAPTURE_START'), ends = events.filter(e => e.kind === 'CAPTURE_END');
  if (starts.length !== 1 || starts[0] !== events[0]) problems.push('MISSING_OR_INVALID_CAPTURE_START');
  if (ends.length !== 1 || ends[0] !== events.at(-1)) problems.push('MISSING_OR_INVALID_CAPTURE_END');
  if (events.some((e, i) => e.sequence !== i + 1)) problems.push('SEQUENCE_GAP');
  const bars = events.filter(e => e.kind === 'BAR'), end = ends[0];
  if (end) {
    const internalBudgetComplete = end.budgetComplete ?? end.complete;
    if (internalBudgetComplete !== true || !Number.isSafeInteger(end.dropped) || end.dropped !== 0) problems.push('INTERNAL_EVENT_BUDGET_INCOMPLETE');
    if (bars.length !== end.observedBars || bars[0]?.bar !== end.firstBar || bars.at(-1)?.bar !== end.lastBar ||
        bars.some((b, i) => i && b.bar !== bars[i - 1].bar + 1)) problems.push('MISSING_BAR_COVERAGE');
    if (end.attempted !== events.length - 1 + end.dropped) problems.push('INVALID_EVENT_TOTAL');
  }
  if (context.firstDataTime > context.windowStart) problems.push('HISTORY_START_AFTER_REQUESTED_WINDOW');
  const complete = problems.length === 0;
  const modules = {}, latencies = [], positions = [], incompletePositions = [];
  const detected = new Map(), plans = new Map();
  for (const e of events) {
    if (e.kind === 'SETUP_DETECTED') { assert(!detected.has(e.candidateId), 'Repeated candidate creation identity'); detected.set(e.candidateId, e); }
    if (e.kind === 'CHECKS') {
      assert(e.checksEvaluated === true && Array.isArray(e.failedChecks) && e.failedChecks.every(x => CHECKS.includes(x)) &&
        new Set(e.failedChecks).size === e.failedChecks.length, 'Invalid failed checks');
      assert(e.firstBlocker === (e.failedChecks[0] ?? null), 'First blocker does not match all failed checks');
      const expectedMessage = e.failedChecks.length ? REJECTION_MESSAGES[CHECKS.indexOf(e.failedChecks[0])] : '';
      assert(e.firstBlockerMessage === expectedMessage, 'First blocker message does not match first failed check');
      if (schema === 'signal-diagnostics/v2') assert(e.decisionConsistent === true, 'Diagnostic checks disagree with engine decision');
    }
    if (e.kind === 'QUALIFIED_PLAN') { assert(!plans.has(e.planId), 'Duplicate qualified plan identity'); plans.set(e.planId, e); }
  }
  for (const e of events.filter(e => e.planId && plans.has(e.planId))) {
    const plan = plans.get(e.planId);
    assert(e.module === plan.module && e.candidateId === plan.candidateId, 'Plan candidate correlation mismatch');
  }
  // A bounded capture can begin after a plan/order was created. Preserve that as
  // an explicit coverage gap; do not silently treat an absent stage as zero or
  // reject a valid fill whose submission predates the selected capture window.
  const lifecycleGaps = [];
  const selectedByPlan = new Map();
  for (const e of events.filter(e => e.kind === 'SELECTED' && e.planId)) {
    selectedByPlan.set(e.planId, (selectedByPlan.get(e.planId) ?? 0) + 1);
    if (!plans.has(e.planId)) lifecycleGaps.push({ stage: 'SELECTED_TO_QUALIFIED_PLAN', planId: e.planId, status: 'PLAN_RECORD_NOT_OBSERVED' });
  }
  for (const [planId, plan] of plans) {
    const selected = events.filter(e => e.kind === 'SELECTED' && e.planId === planId);
    assert(selected.length === 1, 'Qualified plan must have exactly one selected-candidate record');
    assert(selected[0].candidateId === plan.candidateId && selected[0].module === plan.module,
      'Selected candidate and qualified plan correlation mismatch');
  }
  const ordersById = new Map();
  for (const order of events.filter(e => e.kind === 'ORDER_SUBMITTED')) {
    assert(!ordersById.has(order.orderId), 'Duplicate submitted order identity');
    ordersById.set(order.orderId, order);
    if (!plans.has(order.planId)) lifecycleGaps.push({ stage: 'QUALIFIED_PLAN_TO_ORDER', planId: order.planId, status: 'PLAN_RECORD_NOT_OBSERVED' });
    else assert(selectedByPlan.get(order.planId) === 1, 'Submitted order lacks selected-plan record');
  }
  for (const fill of events.filter(e => e.kind === 'FILLED')) {
    const order = ordersById.get(fill.orderId);
    if (!order) lifecycleGaps.push({ stage: 'ORDER_TO_FILL', orderId: fill.orderId, positionId: fill.positionId,
      status: fill.actualTime < context.windowStart ? 'ORDER_MAY_PRECEDE_CAPTURE' : 'ORDER_NOT_OBSERVED_IN_CAPTURE' });
    else assert(order.planId === fill.planId && order.candidateId === fill.candidateId && order.module === fill.module,
      'Fill/order candidate-plan correlation mismatch');
  }
  for (const row of events.filter(e => e.kind === 'EXIT_ROW')) {
    const linkedFill = events.some(e => e.kind === 'FILLED' && e.positionId === row.positionId);
    if (!linkedFill) lifecycleGaps.push({ stage: 'POSITION_TO_FILL', positionId: row.positionId,
      status: row.historicalBackfill === true ? 'ENTRY_PREDATES_ORIGINALLY_CAPTURED_FILL' : 'FILL_NOT_OBSERVED_IN_CAPTURE' });
    if (row.planId && !plans.has(row.planId)) lifecycleGaps.push({ stage: 'POSITION_TO_QUALIFIED_PLAN', planId: row.planId,
      positionId: row.positionId, status: 'PLAN_RECORD_NOT_OBSERVED_IN_CAPTURE' });
  }
  for (const m of 'ABCDEFGH') {
    const rows = events.filter(e => moduleLetter(e.module) === m), select = k => rows.filter(e => e.kind === k);
    const checks = select('CHECKS'), enabled = starts[0]?.enabled?.[m.charCodeAt(0) - 65];
    const observed = { detectedCandidates: select('SETUP_DETECTED').length,
      stageTransitions: countBy(select('STAGE_REACHED'), e => e.stage),
      confirmationCandidates: new Set(select('CONFIRMATION_PASSED').map(e => e.candidateId)).size,
      confirmationPassBars: select('CONFIRMATION_PASSED').length,
      invalidated: select('INVALIDATED').length, expired: select('EXPIRED').length,
      firstBlockers: countBy(checks.filter(e => e.firstBlocker), e => e.firstBlocker),
      allFailedChecks: countBy(checks.flatMap(e => e.failedChecks), x => x),
      conflictCandidates: select('OPPOSING_CONFLICT').length, qualifiedNotSelected: select('QUALIFIED_NOT_SELECTED').length,
      selectedPlans: select('SELECTED').length, qualifiedPlanRecords: select('QUALIFIED_PLAN').length,
      submittedOrders: select('ORDER_SUBMITTED').length, fills: select('FILLED').length,
      filledPositions: new Set(select('FILLED').map(e => e.positionId)).size, exitRows: select('EXIT_ROW').length,
      partialTargetExitRows: select('EXIT_ROW').filter(e => /^TP[123]_HIT$/.test(e.exitComment)).length,
      closedPositions: select('POSITION_CLOSED').length,
      estimatedFills: select('ESTIMATE_FILLED').length, estimatedClosures: select('ESTIMATE_TRADE_CLOSED').length,
      slotBlockedBarObservations: events.filter(e => e.kind === 'ENGINE' && e.slotAvailable === false).length };
    const modelUnavailable = context.model === 'INDICATOR_ESTIMATE' ? ['submittedOrders', 'fills', 'filledPositions', 'exitRows', 'partialTargetExitRows', 'closedPositions'] : [];
    for (const k of modelUnavailable) observed[k] = null;
    modules[m] = { status: enabled === false ? 'DISABLED' : complete ? 'COMPLETE_WITHIN_CAPTURE_WINDOW' : 'INCOMPLETE',
      observed, totals: complete && enabled === true ? observed : null, latestState: select('STATE').at(-1) ?? null };
  }
  for (const [pid, plan] of plans) {
    const cid = plan.candidateId, setup = detected.get(cid);
    const confirmation = events.find(e => e.kind === 'CONFIRMATION_PASSED' && e.candidateId === cid);
    const qualified = events.find(e => e.kind === 'CHECKS' && e.candidateId === cid && e.failedChecks.length === 0);
    const orders = events.filter(e => e.kind === 'ORDER_SUBMITTED' && e.planId === pid);
    assert(orders.length <= 1, 'Duplicate order submission');
    const order = orders[0], fills = events.filter(e => e.kind === 'FILLED' && e.planId === pid);
    if (order) { number(order, 'quantity'); integer(order, 'actualTime'); integer(order, 'actualBar'); assert(order.quantity > 0, 'Invalid order quantity'); }
    for (const fill of fills) {
      number(fill, 'quantity'); integer(fill, 'actualTime'); integer(fill, 'actualBar');
      assert(fill.quantity > 0 && (!order || (fill.actualBar >= order.actualBar && fill.actualTime >= order.actualTime)), 'Fill before submission or invalid quantity');
    }
    if (order) assert(sum(fills.map(f => f.quantity)) <= order.quantity + 1e-7, 'Filled quantity exceeds submitted order');
    latencies.push({ planId: pid, candidateId: cid, module: plan.module, setupBar: setup?.setupBar ?? null,
      confirmationBar: confirmation?.bar ?? null, qualifiedBar: qualified?.bar ?? null, orderBar: order?.actualBar ?? null,
      firstActualFillBar: fills[0]?.actualBar ?? null, lastActualFillBar: fills.at(-1)?.actualBar ?? null,
      setupToConfirmationBars: setup && confirmation ? confirmation.bar - setup.setupBar : null,
      confirmationToQualificationBars: confirmation && qualified ? qualified.bar - confirmation.bar : null,
      confirmationToOrderBars: confirmation && order ? order.actualBar - confirmation.bar : null,
      orderToFirstFillBars: order && fills.length ? fills[0].actualBar - order.actualBar : null,
      orderToFirstFillMilliseconds: order && fills.length ? fills[0].actualTime - order.actualTime : null,
      reportedFilledQuantity: sum(fills.map(f => f.quantity)),
      observedBlockHistory: events.filter(e => e.kind === 'CHECKS' && e.candidateId === cid && e.failedChecks.length).map(e => ({ bar: e.bar, failedChecks: e.failedChecks })),
      limits: setup ? [] : ['Setup creation outside capture or missing; latency unavailable'] });
  }
  const positionIds = new Set(events.filter(e => ['EXIT_ROW', 'POSITION_CLOSED'].includes(e.kind)).map(e => e.positionId));
  const globalRows = new Set();
  for (const id of positionIds) {
    const rows = events.filter(e => e.kind === 'EXIT_ROW' && e.positionId === id), groups = events.filter(e => e.kind === 'POSITION_CLOSED' && e.positionId === id);
    assert(groups.length <= 1, 'Duplicate completed position');
    for (const r of rows) {
      for (const k of ['rowIndex', 'entryTime', 'entryBar', 'exitTime', 'exitBar']) integer(r, k);
      assert(!globalRows.has(r.rowIndex), 'Duplicate closed-trade row index'); globalRows.add(r.rowIndex);
      for (const k of ['entryPrice', 'exitPrice', 'signedQuantity', 'pointValue', 'net', 'commission', 'grossAccount', 'grossChart']) number(r, k);
      assert(r.signedQuantity !== 0 && r.pointValue > 0 && r.commission >= 0 && r.exitTime >= r.entryTime, 'Invalid exit quantity/cost/time');
      assert(near(r.grossAccount - r.commission, r.net), 'Exit gross/fee/net mismatch');
      assert(near((r.exitPrice - r.entryPrice) * r.signedQuantity * r.pointValue, r.grossChart), 'Exit fill-price arithmetic mismatch');
      if (r.chartCurrency === r.accountCurrency) assert(near(r.grossChart, r.grossAccount), 'Same-currency fill/account mismatch');
    }
    const g = groups[0];
    if (g) for (const k of ['entryTime', 'exitTime', 'exitRows']) integer(g, k);
    if (!g || rows.length !== g.exitRows) { incompletePositions.push({ positionId: id, observedRows: rows.length, expectedRows: g?.exitRows ?? null }); continue; }
    const qty = sum(rows.map(r => Math.abs(r.signedQuantity))), fee = sum(rows.map(r => r.commission)), net = sum(rows.map(r => r.net));
    assert(rows.every(r => r.planId === g.planId && r.module === g.module && r.entryTime === g.entryTime && r.accountCurrency === g.accountCurrency), 'Position correlation mismatch');
    assert(g.exitTime === Math.max(...rows.map(r => r.exitTime)), 'Position final exit time mismatch');
    assert(g.initialQuantity > 0 && near(qty, g.initialQuantity) && near(qty, g.closedQuantity), 'Incomplete position quantity');
    const fills = events.filter(e => e.kind === 'FILLED' && e.positionId === id);
    if (fills.length) assert(near(sum(fills.map(f => f.quantity)), qty), 'Fill and closed position quantity mismatch');
    assert(near(fee, g.commission) && near(net, g.net) && near(g.grossAccount - fee, net), 'Position accounting mismatch');
    assert(g.initialPlannedCashRisk > 0 && near(net / g.initialPlannedCashRisk, g.realizedRToPlannedRisk), 'Realized R mismatch');
    const spread = options.spreadPerSide ?? 0;
    assert(Number.isFinite(spread) && spread >= 0, 'Invalid hypothetical spread');
    const sameCurrency = rows.every(r => r.chartCurrency === g.accountCurrency);
    const spreadCost = sameCurrency ? 2 * spread * sum(rows.map(r => Math.abs(r.signedQuantity) * r.pointValue)) : null;
    positions.push({ positionId: id, planId: g.planId, module: g.module, gross: g.grossAccount, commission: fee, net,
      exitRows: rows.length, cause: g.cause, realizedRToPlannedRisk: g.realizedRToPlannedRisk,
      hypotheticalAdditionalSpreadPerSide: spread, hypotheticalAdditionalSpreadCost: spreadCost,
      hypotheticalNetAfterAdditionalSpread: spreadCost === null ? null : net - spreadCost,
      partialTargetRows: rows.filter(r => /^TP[123]_HIT$/.test(r.exitComment)).length });
  }
  const endBudget = end?.budgetComplete ?? end?.complete;
  return { schema: 'signal-diagnostics-analysis/v2', context,
    captureStatus: complete ? 'COMPLETE_WITHIN_CAPTURE_WINDOW' : 'INCOMPLETE',
    budgetStatus: endBudget === true && end?.dropped === 0 ? 'COMPLETE' : endBudget === false ? 'INCOMPLETE' : 'UNKNOWN',
    // Structural continuity is testable from the file; provenance and whether
    // TradingView's UI omitted rows cannot be authenticated by this analyzer.
    exportStatus: complete ? 'STRUCTURALLY_COMPLETE_UNAUTHENTICATED' : 'INCOMPLETE_EXPORT',
    exportAuthenticity: 'NOT_AUTHENTICATED',
    completenessProblems: problems, duplicateExportsIgnored: duplicates.length, eventCount: events.length,
    modules, latencies, costs: { overall: complete && !incompletePositions.length ? costSummary(positions) : null,
      observedCompletedSubtotal: costSummary(positions), positions, incompletePositions,
      fillCorrelationUnavailable: positions.filter(p => !events.some(e => e.kind === 'FILLED' && e.positionId === p.positionId)).map(p => p.positionId),
      byModule: Object.fromEntries([...new Set(positions.map(p => p.module))].map(m => [m, costSummary(positions.filter(p => p.module === m))])),
      byExitCause: Object.fromEntries([...new Set(positions.map(p => p.cause))].map(c => [c, costSummary(positions.filter(p => p.cause === c))])) },
    lifecycleCoverage: { selectedPlans: selectedByPlan.size, qualifiedPlanRecords: plans.size,
      submittedOrders: ordersById.size, fills: events.filter(e => e.kind === 'FILLED').length,
      exitRows: events.filter(e => e.kind === 'EXIT_ROW').length,
      completedPositions: events.filter(e => e.kind === 'POSITION_CLOSED').length,
      observedGaps: lifecycleGaps },
    limitations: ['Source/settings provenance and native parity require separate evidence.',
      'Counts are bounded-window observations; unavailable or incomplete totals are null, not zero.',
      'Failed checks are recorded only where the actual engine evaluated them. Busy-state counterfactual setups are not invented.',
      'Fill prices already contain modeled slippage; commission is subtracted once. Spread scenarios are additional hypothetical costs.',
      'Realized R denominator is original planned account-currency cash risk, not a guaranteed maximum loss.',
      'Historical diagnostics, tests and complete exports do not establish OOS profitability or non-repainting.'] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const path = process.argv[2]; assert(path, 'Usage: node scripts/analyze-signal-diagnostics.mjs <native.csv|log> [--chart-currency USD] [--time-exit-minutes 15 --sole-time-close] [--spread-per-side 0]');
    const arg = key => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : undefined;
    console.log(JSON.stringify(analyzeSignalDiagnostics(readFileSync(path, 'utf8'), { chartCurrency: arg('--chart-currency'),
      timeExitMinutes: Number(arg('--time-exit-minutes')), soleMarketCloseIsTimeExit: process.argv.includes('--sole-time-close'),
      spreadPerSide: Number(arg('--spread-per-side') ?? 0) }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
