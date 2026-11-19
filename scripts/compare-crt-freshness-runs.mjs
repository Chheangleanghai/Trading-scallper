import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePlanOutcomes } from './analyze-plan-outcomes.mjs';
import { comparePlanAudits, parsePlanAudit } from './compare-plan-audit.mjs';

const SYMBOL = 'FOREXCOM:XAUUSD';
const M5 = 300_000;
const M15 = 900_000;
const EXPIRY_MARKER = 'CRT_FRESHNESS_AUDIT ';
const isBarTime = (time, interval) => Number.isSafeInteger(time) && time > 0 && time % interval === 0;

function parseExpiries(lines, name) {
  const expiries = [];
  const seen = new Set();
  for (const [index, line] of lines.entries()) {
    const start = line.indexOf(EXPIRY_MARKER);
    if (start < 0) continue;
    const location = `${name}:${index + 1}`;
    let row;
    try {
      row = JSON.parse(line.slice(start + EXPIRY_MARKER.length));
    } catch {
      throw new Error(`${location}: malformed CRT freshness event`);
    }
    if (row?.symbol !== SYMBOL || row.timeframe !== '5' || row.module !== 'B_CRT' ||
        ![1, -1].includes(row.direction) || !isBarTime(row.setupTimestamp, M5) ||
        !isBarTime(row.expiredAt, M5) || row.expiredAt <= row.setupTimestamp ||
        !isBarTime(row.setupReferenceOpen, M15) || row.setupReferenceOpen + M15 > row.setupTimestamp - M5 ||
        (row.currentReferenceOpen !== null && (!isBarTime(row.currentReferenceOpen, M15) ||
          row.currentReferenceOpen <= row.setupReferenceOpen || row.currentReferenceOpen + M15 > row.expiredAt - M5))) {
      throw new Error(`${location}: invalid CRT freshness event timing or context`);
    }
    const key = JSON.stringify([row.setupTimestamp, row.direction]);
    if (seen.has(key)) throw new Error(`${location}: duplicate CRT freshness event`);
    seen.add(key);
    expiries.push(row);
  }
  return expiries.sort((a, b) => a.expiredAt - b.expiredAt);
}

function readRun(text, name) {
  const lines = text.split(/\r?\n/);
  const outcomes = analyzePlanOutcomes(text, name);
  if (outcomes.context.symbol !== SYMBOL || outcomes.context.timeframe !== '5') {
    throw new Error(`${name}: expected ${SYMBOL} standard M5 capture`);
  }
  if (outcomes.counts.incompletePositions || outcomes.counts.plansWithoutExitRows) {
    throw new Error(`${name}: plans without complete exits require separate review before comparison`);
  }
  const plans = parsePlanAudit(lines.filter(line => line.includes('PLAN_AUDIT ')).join('\n'), name);
  if (new Set(plans.map(plan => plan.timestamp)).size !== plans.length) {
    throw new Error(`${name}: more than one selected plan at the same close`);
  }
  return { outcomes, plans, expiries: parseExpiries(lines, name) };
}

function describeRun(run) {
  const planTimes = run.plans.map(plan => plan.timestamp).sort((a, b) => a - b);
  return {
    input: run.outcomes.input,
    observedPlanRange: { first: planTimes[0], last: planTimes.at(-1) },
    total: run.outcomes.overall,
    byModule: run.outcomes.byModule,
  };
}

export function compareCrtFreshnessRuns(originalText, experimentText, originalName = 'original', experimentName = 'experiment') {
  const original = readRun(originalText, originalName);
  const experiment = readRun(experimentText, experimentName);
  if (original.outcomes.input.sha256 === experiment.outcomes.input.sha256) {
    throw new Error('Supply two distinct run captures');
  }
  if (original.expiries.length) throw new Error('Original capture contains experimental expiry events');
  for (const key of ['scriptVersion', 'accountCurrency']) {
    if (original.outcomes.context[key] !== experiment.outcomes.context[key]) {
      throw new Error(`Run context mismatch: ${key}`);
    }
  }
  for (const plan of experiment.plans.filter(plan => plan.strategy === 'B_CRT')) {
    if (experiment.expiries.some(row => row.setupTimestamp === plan.setupTimestamp &&
        row.direction === plan.direction && row.expiredAt <= plan.timestamp)) {
      throw new Error(`Experiment selected an expired B setup at ${plan.timestamp}`);
    }
  }

  const compared = comparePlanAudits(original.plans, experiment.plans, 0);
  const mismatches = [...compared.mismatches, ...compared.executionDifferences].map(row => {
    const { indicator, strategy, missingFrom, ...fields } = row;
    if (missingFrom) return { ...fields, missingFrom: missingFrom === 'indicator' ? 'original' : 'experiment' };
    return { ...fields, original: indicator, experiment: strategy };
  }).sort((a, b) => Number(a.key.split('|').at(-1)) - Number(b.key.split('|').at(-1)));
  return {
    schema: 'crt-freshness-run-comparison/v1',
    status: 'SOURCE_SETTINGS_AND_WINDOW_REVIEW_REQUIRED',
    context: original.outcomes.context,
    original: describeRun(original),
    experiment: describeRun(experiment),
    observedNetDifference: experiment.outcomes.overall.net - original.outcomes.overall.net,
    planDifferences: mismatches,
    experimentalExpiryEvents: experiment.expiries,
    expiryEvidence: experiment.expiries.length ? 'EVENTS_PRESENT' : 'NO_EVENTS_IN_SUPPLIED_LOG',
    limitations: [
      'Check exact editor copy-backs, actual inputs, loaded candles, date range and Strategy Properties before attributing differences to the rule.',
      'An expiry records a candidate removal. Whether the original rule would have traded it depends on later checks and competing candidates.',
      'Closed position outcomes already include configured commission and fill slippage. Review TradingView Strategy Tester separately for intratrade drawdown.',
    ],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const paths = process.argv.slice(2);
    if (paths.length !== 2) throw new Error('Usage: node scripts/compare-crt-freshness-runs.mjs <original-messages.txt> <experiment-messages.txt>');
    const [original, experiment] = paths.map(path => readFileSync(path, 'utf8'));
    process.stdout.write(JSON.stringify(compareCrtFreshnessRuns(original, experiment, ...paths), null, 2) + '\n');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
