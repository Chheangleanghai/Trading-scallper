import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const required = [
  "symbol",
  "timeframe",
  "timestamp",
  "setupTimestamp",
  "direction",
  "strategy",
  "entryMode",
  "entry",
  "sl",
  "tp1",
  "tp2",
  "tp3",
  "quality",
];
const priceFields = ["entry", "sl", "tp1", "tp2", "tp3"];

export function parsePlanAudit(text, sourceName = "input") {
  const rows = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const marker = trimmed.indexOf("PLAN_AUDIT ");
    const jsonText = marker >= 0 ? trimmed.slice(marker + "PLAN_AUDIT ".length) : trimmed;
    if (!jsonText.startsWith("{")) continue;
    let value;
    try {
      value = JSON.parse(jsonText);
    } catch {
      throw new Error(`${sourceName}:${index + 1}: malformed JSON record`);
    }
    if (marker < 0 && !("setupTimestamp" in value) && !("strategy" in value)) continue;
    const missing = required.filter((key) => !(key in value));
    if (missing.length) {
      throw new Error(`${sourceName}:${index + 1}: missing ${missing.join(", ")}`);
    }
    if (
      typeof value.symbol !== "string" ||
      typeof value.timeframe !== "string" ||
      !Number.isSafeInteger(value.timestamp) ||
      !Number.isSafeInteger(value.setupTimestamp) ||
      ![1, -1].includes(value.direction) ||
      typeof value.strategy !== "string" ||
      typeof value.entryMode !== "string" ||
      !Number.isInteger(value.quality) ||
      priceFields.some((key) => typeof value[key] !== "number" || !Number.isFinite(value[key]))
    ) {
      throw new Error(`${sourceName}:${index + 1}: invalid PLAN_AUDIT field type`);
    }
    rows.push(value);
  }
  return rows;
}

function keyOf(row) {
  return `${row.symbol}|${row.timeframe}|${row.timestamp}`;
}

export function comparePlanAudits(indicatorRows, strategyRows, tolerance) {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error("Price tolerance must be a finite non-negative number");
  }
  const mismatches = [];
  const executionDifferences = [];
  const indexRows = (rows, side) => {
    const map = new Map();
    for (const row of rows) {
      const key = keyOf(row);
      if (map.has(key)) mismatches.push({ key, field: "duplicate", side });
      else map.set(key, row);
    }
    return map;
  };
  const indicator = indexRows(indicatorRows, "indicator");
  const strategy = indexRows(strategyRows, "strategy");
  const keys = new Set([...indicator.keys(), ...strategy.keys()]);

  for (const key of keys) {
    const left = indicator.get(key);
    const right = strategy.get(key);
    if (!left || !right) {
      mismatches.push({ key, field: "missing-plan", missingFrom: left ? "strategy" : "indicator" });
      continue;
    }
    for (const field of ["setupTimestamp", "direction", "strategy", "entryMode", "quality"]) {
      if (left[field] !== right[field]) {
        mismatches.push({ key, field, indicator: left[field], strategy: right[field] });
      }
    }
    for (const field of priceFields) {
      const delta = Math.abs(left[field] - right[field]);
      if (delta > tolerance + Number.EPSILON * Math.max(Math.abs(left[field]), Math.abs(right[field]), 1) * 4) {
        mismatches.push({ key, field, indicator: left[field], strategy: right[field], delta, tolerance });
      }
    }
    for (const field of ["executionAccepted", "executionModel"]) {
      if (left[field] !== right[field]) {
        executionDifferences.push({ key, field, indicator: left[field], strategy: right[field] });
      }
    }
  }
  return {
    parity: mismatches.length === 0,
    indicatorPlans: indicatorRows.length,
    strategyPlans: strategyRows.length,
    tolerance,
    mismatches,
    executionDifferences,
  };
}

function main(args) {
  if (args.length !== 4 || args[2] !== "--tolerance") {
    console.error("Usage: node scripts/compare-plan-audit.mjs <indicator.log> <strategy.log> --tolerance <price-units>");
    process.exitCode = 2;
    return;
  }
  const tolerance = Number(args[3]);
  const indicator = parsePlanAudit(readFileSync(args[0], "utf8"), args[0]);
  const strategy = parsePlanAudit(readFileSync(args[1], "utf8"), args[1]);
  if (!indicator.length || !strategy.length) {
    throw new Error("Both logs must contain at least one PLAN_AUDIT record");
  }
  const result = comparePlanAudits(indicator, strategy, tolerance);
  console.log(JSON.stringify(result, null, 2));
  if (!result.parity) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
