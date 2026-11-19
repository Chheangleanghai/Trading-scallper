// Historical cohort description for the isolated B/CRT freshness hypothesis.
// This does not replay the engine: suppressing one plan can change later plans.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePlanOutcomes } from './analyze-plan-outcomes.mjs';
import { parsePlanAudit } from './compare-plan-audit.mjs';

const FIVE_MINUTES = 300_000;
const FIFTEEN_MINUTES = 900_000;
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);

export function referenceRolledOver(setupClose, planClose) {
  if (!Number.isSafeInteger(setupClose) || !Number.isSafeInteger(planClose) || planClose <= setupClose ||
      setupClose % FIVE_MINUTES !== 0 || planClose % FIVE_MINUTES !== 0) {
    throw new Error('Expected ordered, UTC-aligned M5 setup and plan close timestamps');
  }
  // Pine's completed [1] M15 reference changes at the next M15 bar open.
  const setupOpen = setupClose - FIVE_MINUTES;
  const planOpen = planClose - FIVE_MINUTES;
  return Math.floor(setupOpen / FIFTEEN_MINUTES) !== Math.floor(planOpen / FIFTEEN_MINUTES);
}

function summarize(rows) {
  return {
    positions: rows.length,
    wins: rows.filter(row => row.net > 0).length,
    grossPriceMove: sum(rows, 'gross'),
    commission: sum(rows, 'commission'),
    net: sum(rows, 'net'),
  };
}

export function analyzeCrtFreshness(text, sourceName = 'input') {
  const outcomes = analyzePlanOutcomes(text, sourceName);
  if (outcomes.context.symbol !== 'FOREXCOM:XAUUSD' || outcomes.context.timeframe !== '5') {
    throw new Error('Freshness cohort requires FOREXCOM:XAUUSD standard M5 evidence');
  }
  if (outcomes.counts.incompletePositions || outcomes.counts.plansWithoutExitRows) {
    throw new Error('Incomplete strategy outcome evidence; cohort totals unavailable');
  }
  const plans = parsePlanAudit(text.split(/\r?\n/).filter(line => line.includes('PLAN_AUDIT ')).join('\n'), sourceName);
  const planIndex = new Map(plans.map(p => [JSON.stringify([p.timestamp, p.strategy]), p]));
  const positions = outcomes.positions.filter(p => p.module === 'B_CRT').map(position => {
    const plan = planIndex.get(JSON.stringify([position.planTimestamp, position.module]));
    if (!plan) throw new Error('B position has no exact plan');
    return {
      planTimestamp: position.planTimestamp,
      setupTimestamp: plan.setupTimestamp,
      setupToPlanBars: (plan.timestamp - plan.setupTimestamp) / FIVE_MINUTES,
      referenceRolledOver: referenceRolledOver(plan.setupTimestamp, plan.timestamp),
      gross: position.grossBeforeCommission,
      commission: position.commission,
      net: position.net,
    };
  });
  if (!positions.length) throw new Error('No B_CRT completed positions in evidence');
  if (positions.some(p => !Number.isInteger(p.setupToPlanBars) || p.setupToPlanBars < 1)) {
    throw new Error('Invalid B setup-to-plan M5 latency');
  }
  const sameReference = positions.filter(p => !p.referenceRolledOver);
  const rolledReference = positions.filter(p => p.referenceRolledOver);
  const all = summarize(positions);
  const same = summarize(sameReference);
  const rolled = summarize(rolledReference);
  if (same.positions + rolled.positions !== all.positions ||
      Math.abs(same.net + rolled.net - all.net) > 1e-7 ||
      Math.abs(all.grossPriceMove - all.commission - all.net) > 1e-7) {
    throw new Error('B cohort accounting mismatch');
  }
  return {
    schema: 'crt-freshness-observational/v1',
    source: outcomes.input,
    hypothesis: 'Expire an unconfirmed M5 B candidate when its completed M15 reference candle changes.',
    referenceRolloverIsInferredFromStandardM5M15Clock: true,
    actualCrtTimeWasNotLogged: true,
    all, sameReference: same, rolledReference: rolled,
    positions,
    status: 'HYPOTHESIS_ONLY_NOT_NATIVE_BACKTESTED',
    caveat: 'This is a post-hoc split of already selected positions. Expiring a candidate can change later selection, order state and equity; the sums are not a counterfactual strategy backtest or out-of-sample result.',
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/analyze-crt-freshness.mjs <one-run-pine-logs.txt>');
    const filename = process.argv[2];
    process.stdout.write(JSON.stringify(analyzeCrtFreshness(readFileSync(filename, 'utf8'), filename), null, 2) + '\n');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
