import { readFileSync } from "node:fs";

const ROW_MARKER = "TRADE_EXIT_AUDIT ";
const GROUP_MARKER = "TRADE_GROUP_AUDIT ";

const rowStringFields = [
  "scriptVersion", "symbol", "timeframe", "module", "entryId", "exitId", "exitComment",
  "accountCurrency",
];
const rowNumberFields = [
  "planTimestamp", "setupTimestamp", "direction", "entryTime", "entryBar", "actualEntry",
  "exitTime", "exitBar", "actualExit", "size", "profit", "commission", "profitPercent",
  "maxRunup", "maxDrawdown", "plannedEntry", "initialStop", "managedStopAtObservation",
  "tp1", "tp2", "tp3", "initialQty",
];
const groupStringFields = ["scriptVersion", "symbol", "timeframe", "module", "accountCurrency"];
const groupNumberFields = [
  "planTimestamp", "setupTimestamp", "direction", "entryTime", "exitTime", "holdMinutes",
  "plannedEntry", "actualEntry", "initialStop", "initialQty", "riskPctInput",
  "maxExposurePctInput", "sizingEquity", "accountRiskPerUnit", "unitNotional", "riskQty",
  "exposureQty", "rawQty", "sizedQty", "minContract", "minTick", "pointValue", "netProfitDelta",
];

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected a JSON object`);
  }
}

function validateFields(record, strings, numbers, label) {
  for (const key of strings) {
    if (typeof record[key] !== "string") throw new Error(`${label}: ${key} must be a string`);
  }
  for (const key of numbers) {
    if (typeof record[key] !== "number" || !Number.isFinite(record[key])) {
      throw new Error(`${label}: ${key} must be a finite number`);
    }
  }
  if (![1, -1].includes(record.direction)) throw new Error(`${label}: direction must be 1 or -1`);
  for (const key of ["planTimestamp", "setupTimestamp", "entryTime", "exitTime"]) {
    if (!Number.isSafeInteger(record[key]) || record[key] <= 0) {
      throw new Error(`${label}: ${key} must be a positive safe integer timestamp`);
    }
  }
}

function parsePayload(line, marker, sourceName, lineNumber) {
  const start = line.indexOf(marker) + marker.length;
  const payload = line.slice(start).trim();
  if (!payload.startsWith("{")) {
    throw new Error(`${sourceName}:${lineNumber}: ${marker.trim()} is missing its JSON object`);
  }
  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error(`${sourceName}:${lineNumber}: invalid ${marker.trim()} JSON: ${error.message}`);
  }
}

function exitKey(row) {
  return JSON.stringify([
    row.symbol, row.timeframe, row.planTimestamp, row.module, row.entryId, row.entryTime,
  ]);
}

export function parseStrategyExitLogs(text, sourceName = "input") {
  const rows = [];
  const groups = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    if (line.includes(ROW_MARKER)) {
      const record = parsePayload(line, ROW_MARKER, sourceName, lineNumber);
      requireRecord(record, `${sourceName}:${lineNumber}`);
      validateFields(record, rowStringFields, rowNumberFields, `${sourceName}:${lineNumber}`);
      if (record.closedTradeIndex !== undefined &&
          (!Number.isSafeInteger(record.closedTradeIndex) || record.closedTradeIndex < 0)) {
        throw new Error(`${sourceName}:${lineNumber}: closedTradeIndex must be a non-negative integer`);
      }
      if (record.priceRMultiple !== null &&
          (typeof record.priceRMultiple !== "number" || !Number.isFinite(record.priceRMultiple))) {
        throw new Error(`${sourceName}:${lineNumber}: priceRMultiple must be finite or null`);
      }
      rows.push(record);
    }
    if (line.includes(GROUP_MARKER)) {
      const record = parsePayload(line, GROUP_MARKER, sourceName, lineNumber);
      requireRecord(record, `${sourceName}:${lineNumber}`);
      validateFields(record, groupStringFields, groupNumberFields, `${sourceName}:${lineNumber}`);
      if (typeof record.partialInput !== "boolean") {
        throw new Error(`${sourceName}:${lineNumber}: partialInput must be boolean`);
      }
      groups.push(record);
    }
  }
  if (rows.length === 0 && groups.length === 0) {
    throw new Error(`${sourceName}: no TRADE_EXIT_AUDIT or TRADE_GROUP_AUDIT records found`);
  }
  return { rows, groups };
}

function breakdown(rows, field) {
  return rows.reduce((result, row) => {
    const name = row[field] || "(empty)";
    result[name] = (result[name] ?? 0) + 1;
    return result;
  }, {});
}

function reconciliation(rows, group) {
  const rowProfitSum = rows.reduce((sum, row) => sum + row.profit, 0);
  const rowCommissionSum = rows.reduce((sum, row) => sum + row.commission, 0);
  const groupNetProfitDelta = group?.netProfitDelta ?? null;
  const pointValue = group?.pointValue;
  const priceMovePnlAtPointValue = Number.isFinite(pointValue)
    ? rows.reduce((sum, row) => sum + row.direction *
      (row.actualExit - row.actualEntry) * Math.abs(row.size) * pointValue, 0)
    : null;
  const profitPlusCommission = rowProfitSum + rowCommissionSum;
  const rowProfitMatchesGroupNetDelta = groupNetProfitDelta === null
    ? null
    : Math.abs(rowProfitSum - groupNetProfitDelta) <= 1e-8;

  return {
    rowProfitSum,
    rowCommissionSum,
    profitPlusCommission,
    groupNetProfitDelta,
    rowProfitMatchesGroupNetDelta,
    priceMovePnlAtPointValue,
    priceMovePnlUnits: priceMovePnlAtPointValue === null ? null : "chart-currency units",
    currencyComparisonNote: "Price movement uses chart prices and syminfo.pointvalue without account-currency conversion; compare it with account-currency fields only when both currencies match.",
  };
}

function bracketCoverage(rows, group) {
  const ids = ["TP1", "TP2", "TP3"];
  const brackets = rows.filter((row) => ids.includes(row.exitId));
  const allBracketIdsObserved = ids.every((id) => brackets.some((row) => row.exitId === id));
  const initialQty = group?.initialQty ?? rows[0].initialQty;
  const tolerance = Math.max(Math.abs(initialQty) * Number.EPSILON * 16,
    (group?.minContract ?? 0) * 1e-6);
  const lastBracketExitTime = brackets.length ? Math.max(...brackets.map((row) => row.exitTime)) : null;
  const quantityClosedThroughBrackets = brackets.reduce((sum, row) => sum + Math.abs(row.size), 0);
  const remainingQuantity = Math.max(0, initialQty - quantityClosedThroughBrackets);
  const laterCloses = allBracketIdsObserved
    ? rows.filter((row) => row.exitComment === "TRADE_CLOSED" && row.exitTime > lastBracketExitTime)
    : [];
  const laterCloseQuantity = laterCloses.reduce((sum, row) => sum + Math.abs(row.size), 0);
  const residualObserved = allBracketIdsObserved && remainingQuantity > tolerance && laterCloseQuantity > tolerance;
  return {
    status: residualObserved ? "RESIDUAL_AFTER_ALL_BRACKET_EXITS" : "NOT_OBSERVED",
    allBracketIdsObserved,
    initialQty,
    quantityClosedThroughBrackets,
    remainingQuantity: allBracketIdsObserved ? remainingQuantity : null,
    laterCloseQuantity,
    allBracketExitsWereStops: allBracketIdsObserved && brackets.every((row) => row.exitComment === "STOP_LOSS_HIT"),
    lastBracketExitTime,
    laterCloseTime: laterCloses.length ? Math.max(...laterCloses.map((row) => row.exitTime)) : null,
    note: "An observed remaining quantity does not identify the broker order reservation or rounding cause; requested order quantities are not in these logs.",
  };
}

export function analyzeStrategyExitLogs(parsed) {
  const byKey = new Map();
  const duplicateRows = [];
  for (const row of parsed.rows) {
    const key = exitKey(row);
    const group = byKey.get(key) ?? { key, rows: [], groupRecords: [] };
    const repeatedIndex = row.closedTradeIndex === undefined
      ? null
      : group.rows.find((item) => item.closedTradeIndex === row.closedTradeIndex);
    if (repeatedIndex) {
      if (JSON.stringify(repeatedIndex) !== JSON.stringify(row)) {
        throw new Error(`Conflicting duplicate closedTradeIndex ${row.closedTradeIndex} for ${key}`);
      }
      duplicateRows.push({ key, closedTradeIndex: row.closedTradeIndex });
      continue;
    }
    group.rows.push(row);
    byKey.set(key, group);
  }

  const unmatchedGroupRecords = [];
  const duplicateGroupRecords = [];
  for (const record of parsed.groups) {
    const key = JSON.stringify([
      record.symbol, record.timeframe, record.planTimestamp, record.module,
      record.module, record.entryTime,
    ]);
    const group = byKey.get(key);
    if (!group) {
      unmatchedGroupRecords.push(record);
      continue;
    }
    if (group.groupRecords.length > 0) duplicateGroupRecords.push(record);
    group.groupRecords.push(record);
  }

  const trades = [...byKey.values()].map((group) => {
    const sortedRows = group.rows.toSorted((a, b) => a.exitTime - b.exitTime ||
      (a.closedTradeIndex ?? 0) - (b.closedTradeIndex ?? 0));
    const aggregate = group.groupRecords[0] ?? null;
    return {
      symbol: sortedRows[0].symbol,
      timeframe: sortedRows[0].timeframe,
      scriptVersion: sortedRows[0].scriptVersion,
      module: sortedRows[0].module,
      direction: sortedRows[0].direction,
      planTimestamp: sortedRows[0].planTimestamp,
      setupTimestamp: sortedRows[0].setupTimestamp,
      entryTime: sortedRows[0].entryTime,
      plannedEntry: sortedRows[0].plannedEntry,
      actualEntry: sortedRows[0].actualEntry,
      initialStop: sortedRows[0].initialStop,
      closedTradeRows: sortedRows.length,
      rowProfitSum: sortedRows.reduce((sum, row) => sum + row.profit, 0),
      rowCommissionSum: sortedRows.reduce((sum, row) => sum + row.commission, 0),
      reconciliation: reconciliation(sortedRows, aggregate),
      bracketCoverage: bracketCoverage(sortedRows, aggregate),
      exitComments: breakdown(sortedRows, "exitComment"),
      exitIds: breakdown(sortedRows, "exitId"),
      exitRows: sortedRows,
      groupNetProfitDelta: aggregate?.netProfitDelta ?? null,
      groupExitTime: aggregate?.exitTime ?? null,
      groupHoldMinutes: aggregate?.holdMinutes ?? null,
      sizingContext: aggregate ? {
        initialQty: aggregate.initialQty,
        sizingEquity: aggregate.sizingEquity,
        accountRiskPerUnit: aggregate.accountRiskPerUnit,
        unitNotional: aggregate.unitNotional,
        riskQty: aggregate.riskQty,
        exposureQty: aggregate.exposureQty,
        rawQty: aggregate.rawQty,
        sizedQty: aggregate.sizedQty,
        riskPctInput: aggregate.riskPctInput,
        maxExposurePctInput: aggregate.maxExposurePctInput,
        partialInput: aggregate.partialInput,
        minContract: aggregate.minContract,
        minTick: aggregate.minTick,
        pointValue: aggregate.pointValue,
        accountCurrency: aggregate.accountCurrency,
      } : null,
    };
  });

  const completed = trades.filter((trade) => trade.groupNetProfitDelta !== null);
  return {
    schema: "strategy-exit-audit-analysis/v1",
    evidenceStatus: "Parsed user-supplied Pine Logs; this tool does not authenticate TradingView, source hash, settings, or run context.",
    inputCounts: { exitRows: parsed.rows.length, groupRecords: parsed.groups.length },
    resultCounts: {
      positionGroups: trades.length,
      groupsWithNetResult: completed.length,
      groupsMissingNetResult: trades.length - completed.length,
      exactDuplicateExitRows: duplicateRows.length,
      duplicateGroupRecords: duplicateGroupRecords.length,
      groupRecordsWithoutExitRows: unmatchedGroupRecords.length,
      groupsWithBracketResidual: trades.filter((trade) => trade.bracketCoverage.status === "RESIDUAL_AFTER_ALL_BRACKET_EXITS").length,
    },
    realizedGroups: completed.length > 0 ? {
      winners: completed.filter((trade) => trade.groupNetProfitDelta > 0).length,
      losers: completed.filter((trade) => trade.groupNetProfitDelta < 0).length,
      breakeven: completed.filter((trade) => trade.groupNetProfitDelta === 0).length,
      netProfitDeltaSum: completed.reduce((sum, trade) => sum + trade.groupNetProfitDelta, 0),
      accountCurrency: completed[0].sizingContext.accountCurrency,
    } : null,
    caveats: [
      "Export one chart instance, settings set, and date range per input file; the payload has no run ID or source hash.",
      "Closed-row profit and commission are reported separately; do not assume they reconcile by subtraction without checking TradingView's definitions.",
      "priceRMultiple is a price-distance ratio against the initial planned stop, not fee-adjusted cash R.",
      "Unmatched or missing group records mean the position result is incomplete; they are not silently filled in.",
      "A residual after all TP1/TP2/TP3 bracket exits is flagged only when a later TRADE_CLOSED row confirms remaining size; this does not establish the rounding or reservation cause.",
    ],
    trades,
    unmatchedGroupRecords,
    duplicateRows,
    duplicateGroupRecords,
  };
}

function main() {
  const input = process.argv[2];
  if (!input || process.argv.length > 3) {
    console.error("Usage: node scripts/analyze-strategy-exits.mjs <raw-pine-logs.txt>");
    process.exitCode = 2;
    return;
  }
  try {
    const text = readFileSync(input, "utf8");
    const parsed = parseStrategyExitLogs(text, input);
    process.stdout.write(`${JSON.stringify(analyzeStrategyExitLogs(parsed), null, 2)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
