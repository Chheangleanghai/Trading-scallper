// Offline descriptive research only. Does not alter Pine, select parameters or send orders.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePlanAudit } from "./compare-plan-audit.mjs";
import { parseStrategyExitLogs, analyzeStrategyExitLogs } from "./analyze-strategy-exits.mjs";

const key = (symbol, timeframe, timestamp, module) => JSON.stringify([symbol, timeframe, timestamp, module]);
const sum = (values) => values.reduce((a, b) => a + b, 0);
const close = (a, b, tolerance = 1e-7) => Math.abs(a - b) <= tolerance;
function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

// A descriptive IID-binomial interval, not a forecast or a correction for serial dependence.
function wilson95(wins, count) {
  if (!count) return null;
  const z = 1.959963984540054;
  const p = wins / count;
  const denominator = 1 + z * z / count;
  const midpoint = (p + z * z / (2 * count)) / denominator;
  const half = z * Math.sqrt(p * (1 - p) / count + z * z / (4 * count * count)) / denominator;
  return { lower: Math.max(0, midpoint - half), upper: Math.min(1, midpoint + half) };
}

function summarize(positions) {
  const winners = positions.filter((p) => p.net > 0);
  const losers = positions.filter((p) => p.net < 0);
  const winSum = sum(winners.map((p) => p.net));
  const lossSum = -sum(losers.map((p) => p.net));
  const mean = (values) => values.length ? sum(values) / values.length : null;
  return {
    completePositions: positions.length,
    actualExitRows: sum(positions.map((p) => p.actualExitRows)),
    wins: winners.length, losses: losers.length,
    breakevens: positions.length - winners.length - losers.length,
    winRate: positions.length ? winners.length / positions.length : null,
    winRateWilson95IID: wilson95(winners.length, positions.length),
    grossBeforeCommission: sum(positions.map((p) => p.grossBeforeCommission)),
    commission: sum(positions.map((p) => p.commission)),
    net: sum(positions.map((p) => p.net)),
    meanNetPerCompletePosition: mean(positions.map((p) => p.net)),
    meanNetRToPlannedInitialCashRisk: mean(positions.map((p) => p.netRToPlannedInitialCashRisk)),
    meanWin: mean(winners.map((p) => p.net)),
    meanLoss: mean(losers.map((p) => p.net)),
    positionProfitFactor: lossSum > 0 ? winSum / lossSum : null,
    profitFactorStatus: lossSum > 0 ? "FINITE" : positions.length ? "NO_LOSSES_IN_SAMPLE" : "NO_POSITIONS",
    sparseDescriptiveSample: positions.length < 30,
    // Comments can overlap within a position; these counts must not be added as exclusive categories.
    positionsWithExitComment: Object.fromEntries([...new Set(positions.flatMap((p) => p.exitComments))]
      .sort().map((comment) => [comment, positions.filter((p) => p.exitComments.includes(comment)).length])),
  };
}

function groupSummaries(positions, groupKey) {
  const groups = new Map();
  for (const position of positions) {
    const name = String(groupKey(position));
    groups.set(name, [...(groups.get(name) ?? []), position]);
  }
  return Object.fromEntries([...groups].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
    .map(([name, rows]) => [name, summarize(rows)]));
}

export function analyzePlanOutcomes(text, sourceName = "input") {
  // Explicit markers avoid treating lifecycle/trace JSON as additional qualified plans.
  const planLines = text.split(/\r?\n/).filter((line) => line.includes("PLAN_AUDIT "));
  const plans = parsePlanAudit(planLines.join("\n"), sourceName);
  requireThat(plans.length > 0, "No explicit PLAN_AUDIT records found");
  const index = new Map();
  for (const plan of plans) {
    const id = key(plan.symbol, plan.timeframe, plan.timestamp, plan.strategy);
    requireThat(!index.has(id), `Duplicate plan: ${id}`);
    requireThat(typeof plan.executionAccepted === "boolean" && plan.executionModel === "STRATEGY_EMULATOR",
      `Strategy acceptance/model metadata required: ${id}`);
    index.set(id, plan);
  }
  const parsedExits = parseStrategyExitLogs(text, sourceName);
  const exits = analyzeStrategyExitLogs(parsedExits);
  requireThat(!exits.duplicateRows.length && !exits.duplicateGroupRecords.length && !exits.unmatchedGroupRecords.length,
    "Duplicate or unmatched exit/group records; split captures before analysis");
  const identities = new Set(plans.map((p) => JSON.stringify([p.scriptVersion, p.symbol, p.timeframe])));
  requireThat(identities.size === 1, "Mixed version/symbol/timeframe context");
  const consumed = new Set();
  const positions = [];
  const incompletePositions = [];
  const currencies = new Set();
  for (const trade of exits.trades) {
    const id = key(trade.symbol, trade.timeframe, trade.planTimestamp, trade.module);
    const plan = index.get(id);
    requireThat(plan, `Exit position has no matching plan: ${id}`);
    requireThat(!consumed.has(id), `Multiple position groups for one plan: ${id}`);
    consumed.add(id);
    requireThat(plan.executionAccepted, `Exit position belongs to rejected plan: ${id}`);
    const equals = (actual, expected, field) => requireThat(actual === expected, `${id}: ${field} mismatch`);
    for (const row of trade.exitRows) {
      for (const field of ["scriptVersion", "setupTimestamp", "direction"]) equals(row[field], plan[field], field);
      for (const [field, planned] of [["plannedEntry", "entry"], ["initialStop", "sl"], ["tp1", "tp1"], ["tp2", "tp2"], ["tp3", "tp3"]]) {
        equals(row[field], plan[planned], field);
      }
      for (const field of ["entryTime", "actualEntry"]) equals(row[field], trade[field], field);
      requireThat(row.entryId === plan.strategy && row.size * plan.direction > 0 && row.commission >= 0 &&
        row.exitTime >= row.entryTime && row.entryTime >= plan.timestamp, `${id}: invalid exit identity/timing/size/cost`);
    }
    if (trade.groupNetProfitDelta === null) {
      incompletePositions.push({ key: id, entryTime: trade.entryTime, exitRows: trade.closedTradeRows });
      continue;
    }
    const sizing = trade.sizingContext;
    const aggregate = parsedExits.groups.find((g) =>
      key(g.symbol, g.timeframe, g.planTimestamp, g.module) === id && g.entryTime === trade.entryTime);
    requireThat(aggregate, `${id}: missing exact group identity`);
    for (const field of ["scriptVersion", "setupTimestamp", "direction"]) equals(aggregate[field], plan[field], field);
    equals(aggregate.plannedEntry, plan.entry, "group plannedEntry");
    equals(aggregate.initialStop, plan.sl, "group initialStop");
    equals(aggregate.actualEntry, trade.actualEntry, "group actualEntry");
    currencies.add(sizing.accountCurrency);
    requireThat(trade.exitRows.every((r) => r.accountCurrency === sizing.accountCurrency && r.initialQty === sizing.initialQty),
      `${id}: currency or initial quantity mismatch`);
    requireThat(sizing.initialQty > 0 && sizing.accountRiskPerUnit > 0 && sizing.minContract > 0,
      `${id}: invalid planned initial cash risk`);
    requireThat(close(sum(trade.exitRows.map((r) => Math.abs(r.size))), sizing.initialQty,
      Math.max(1e-8, sizing.minContract * 1e-6)), `${id}: incomplete closed quantity`);
    requireThat(close(trade.rowProfitSum, trade.groupNetProfitDelta), `${id}: row/group net mismatch`);
    requireThat(trade.groupExitTime === Math.max(...trade.exitRows.map((r) => r.exitTime)) &&
      close(trade.groupHoldMinutes, (trade.groupExitTime - trade.entryTime) / 60000), `${id}: group exit/hold mismatch`);
    const risk = sizing.accountRiskPerUnit * sizing.initialQty;
    positions.push({ key: id, planTimestamp: plan.timestamp, entryTime: trade.entryTime,
      exitTime: trade.groupExitTime, module: plan.strategy, quality: plan.quality,
      direction: plan.direction, actualExitRows: trade.closedTradeRows,
      plannedInitialCashRisk: risk, net: trade.groupNetProfitDelta,
      commission: trade.rowCommissionSum, grossBeforeCommission: trade.groupNetProfitDelta + trade.rowCommissionSum,
      netRToPlannedInitialCashRisk: trade.groupNetProfitDelta / risk,
      exitComments: Object.keys(trade.exitComments) });
  }
  requireThat(positions.length > 0 && currencies.size === 1, "No complete positions or mixed account currencies");
  const byModule = groupSummaries(positions, (p) => p.module);
  const scoreSupportByModule = Object.fromEntries(Object.keys(byModule).map((module) => [module,
    [...new Set(positions.filter((p) => p.module === module).map((p) => p.quality))].sort((a, b) => a - b)]));
  const modulesWithMultipleScores = Object.entries(scoreSupportByModule).filter(([, scores]) => scores.length > 1).map(([module]) => module);
  return {
    schema: "plan-outcomes-descriptive/v1", status: "SCORE_CALIBRATION_INCONCLUSIVE",
    input: { name: sourceName, sha256: createHash("sha256").update(text).digest("hex") },
    context: { scriptVersion: plans[0].scriptVersion, symbol: plans[0].symbol, timeframe: plans[0].timeframe,
      accountCurrency: [...currencies][0], sourceAndSettingsAuthenticatedByThisTool: false },
    counts: { plans: plans.length, completedPositions: positions.length, incompletePositions: incompletePositions.length,
      plansWithoutExitRows: plans.filter((p) => !consumed.has(key(p.symbol, p.timeframe, p.timestamp, p.strategy))).length },
    overall: summarize(positions), byScore: groupSummaries(positions, (p) => p.quality), byModule,
    byModuleAndScore: groupSummaries(positions, (p) => `${p.module}|${p.quality}`),
    byDirection: groupSummaries(positions, (p) => p.direction === 1 ? "LONG" : "SHORT"),
    scoreSupportByModule, modulesWithMultipleScores,
    scoreAndModuleFullyConfoundedInThisSample: modulesWithMultipleScores.length === 0,
    incompletePositions,
    plansWithoutExitRows: plans.filter((p) => !consumed.has(key(p.symbol, p.timeframe, p.timestamp, p.strategy))),
    positions,
    limitations: [
      "Descriptive already-inspected historical sample, not untouched OOS, probability calibration or causal inference.",
      "Score/module associations do not identify a score effect; module selection and state histories can confound outcomes.",
      "Wilson intervals assume IID Bernoulli outcomes; serially correlated trades and small samples limit that interpretation.",
      "Partial exit rows are aggregated into complete positions. Reported net already includes commission; it is not subtracted twice.",
      "Net R uses logged planned account risk per unit times initial quantity, not a guaranteed maximum loss or actual-fill stop risk.",
      "Missing/open/rejected plans are separately retained and excluded from closed-position summaries, never assigned zero P&L.",
      "Observed win rate is not the quality score divided by 100; no threshold, module or trading rule is recommended from this sample.",
      "Fewer than 30 positions is marked sparse descriptively; 30 does not establish statistical power or independence.",
    ],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    if (process.argv.length !== 3) throw new Error("Usage: node scripts/analyze-plan-outcomes.mjs <one-run-pine-logs.txt>");
    const filename = process.argv[2];
    process.stdout.write(JSON.stringify(analyzePlanOutcomes(readFileSync(filename, "utf8"), filename), null, 2) + "\n");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
