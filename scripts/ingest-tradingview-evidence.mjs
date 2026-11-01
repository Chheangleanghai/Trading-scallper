#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { comparePlanAudits, parsePlanAudit } from "./compare-plan-audit.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePaths = {
  indicator: "pine/indicator.pine",
  strategy: "pine/strategy.pine",
};
const copybackPaths = {
  indicator: "reports/native-v080/indicator-tradingview-copy.pine",
  strategy: "reports/native-v080/strategy-tradingview-normalized.pine",
};
const requiredTimeframes = ["1", "3", "5", "15"];
const manifestPath = process.argv[2];
const outputFlag = process.argv.indexOf("--output");
const outputPath = outputFlag >= 0 ? process.argv[outputFlag + 1] : undefined;

if (!manifestPath || process.argv.length > 2 && process.argv[2] === "--help") {
  console.log("Usage: node scripts/ingest-tradingview-evidence.mjs <manifest.json> [--output <receipt.json>]");
  console.log("The ingester hashes and validates supplied files; screenshot content and TradingView provenance still require human review.");
  process.exit(manifestPath ? 0 : 2);
}

try {
  const manifestAbsolute = resolve(manifestPath);
  const manifestDirectory = dirname(manifestAbsolute);
  const manifest = JSON.parse(await readFile(manifestAbsolute, "utf8"));
  assert(manifest.schemaVersion === 1, "schemaVersion must be 1");
  assert(manifest.projectVersion === "0.8.0", "projectVersion must remain 0.8.0");
  assert(Array.isArray(manifest.artifacts), "artifacts must be an array");

  const sourceHashes = {};
  const copybackMatches = {};
  for (const script of ["indicator", "strategy"]) {
    sourceHashes[script] = sha256(await readFile(resolve(projectRoot, sourcePaths[script])));
    let copy = await readFile(resolve(projectRoot, copybackPaths[script]));
    if (script === "strategy") copy = Buffer.from(copy.toString("utf8").replace(/\r\n/g, "\n"));
    copybackMatches[script] = sha256(copy) === sourceHashes[script];
  }

  const artifacts = [];
  const logs = new Map();
  const backtests = new Map();
  const compileByScript = new Map();
  const replayResults = [];
  for (const [index, item] of manifest.artifacts.entries()) {
    assert(item && typeof item === "object", `artifacts[${index}] must be an object`);
    assert(["indicator", "strategy"].includes(item.script), `artifacts[${index}].script must be indicator or strategy`);
    assert(typeof item.kind === "string", `artifacts[${index}].kind is required`);
    const file = await resolveEvidencePath(manifestDirectory, item.path, `artifacts[${index}].path`);
    const bytes = await readFile(file);
    const digest = sha256(bytes);
    if (item.sha256) assert(item.sha256.toLowerCase() === digest, `${item.path}: declared SHA-256 does not match file`);
    const expectedSourceHash = sourceHashes[item.script];
    assert(item.sourceSha256 === expectedSourceHash, `${item.path}: sourceSha256 does not match current ${item.script} source`);
    assert(copybackMatches[item.script], `current ${item.script} copy-back does not match the local source`);

    const receipt = { kind: item.kind, script: item.script, path: item.path, sha256: digest, sourceSha256: item.sourceSha256 };
    if (item.kind === "compile-screenshot") {
      validateImage(item.path, bytes);
      assert(typeof item.draftTitle === "string" && item.draftTitle.trim(), `${item.path}: draftTitle is required`);
      assert(typeof item.capturedAt === "string" && hasTimezone(item.capturedAt), `${item.path}: capturedAt must be ISO-8601 with timezone`);
      assert(typeof item.compileTimestamp === "string" && hasTimezone(item.compileTimestamp), `${item.path}: compileTimestamp must be ISO-8601 with timezone`);
      assert(Date.parse(item.capturedAt) >= Date.parse(item.compileTimestamp), `${item.path}: capture time cannot precede the compile event`);
      assert(item.symbol === "FOREXCOM:XAUUSD" && item.timeframe === "5", `${item.path}: compile context must be FOREXCOM:XAUUSD M5`);
      assert(item.compileMessage === "Compiled.", `${item.path}: compileMessage must be Compiled.`);
      assert(["Added to chart", "Updated on chart"].includes(item.chartMessage), `${item.path}: chartMessage must show add/update on chart`);
      assert(item.sourceAssociation === "same-unchanged-draft-as-copyback", `${item.path}: explicit copy-back continuity assertion is required`);
      assert(!compileByScript.has(item.script), `only one current compile screenshot is allowed per script in a manifest`);
      compileByScript.set(item.script, item);
      Object.assign(receipt, { draftTitle: item.draftTitle, capturedAt: item.capturedAt, compileTimestamp: item.compileTimestamp, compileClaim: "COMPILE_VISIBLE_HUMAN_REVIEW_REQUIRED", attribution: "MANIFEST_ASSERTED_NOT_MACHINE_VERIFIED" });
    } else if (item.kind === "plan-audit-log") {
      assert(typeof item.pairId === "string" && item.pairId.trim(), `${item.path}: pairId is required`);
      assert(item.symbol === "FOREXCOM:XAUUSD" && requiredTimeframes.includes(String(item.timeframe)), `${item.path}: symbol/timeframe context required`);
      const rows = parsePlanAudit(bytes.toString("utf8"), item.path);
      assert(rows.length > 0, `${item.path}: no PLAN_AUDIT rows found`);
      assert(rows.every((row) => row.symbol === item.symbol && row.timeframe === String(item.timeframe)), `${item.path}: embedded log context disagrees with manifest`);
      assert(!logs.has(item.pairId + ":" + item.script), `duplicate audit log for pairId/script ${item.pairId}/${item.script}`);
      logs.set(item.pairId + ":" + item.script, { item, rows });
      Object.assign(receipt, { pairId: item.pairId, symbol: item.symbol, timeframe: String(item.timeframe), planCount: rows.length });
    } else if (item.kind === "backtest-export") {
      assert(item.script === "strategy", `${item.path}: backtest exports must identify the strategy`);
      assert(requiredTimeframes.includes(String(item.timeframe)), `${item.path}: timeframe must be M1/M3/M5/M15`);
      assert(item.symbol === "FOREXCOM:XAUUSD", `${item.path}: symbol must be FOREXCOM:XAUUSD`);
      assert(typeof item.dateRange === "string" && item.dateRange.trim(), `${item.path}: dateRange is required`);
      assert(item.costSettings && ["commissionPct", "slippageTicks", "spreadPrice"].every((key) => Number.isFinite(item.costSettings[key]) && item.costSettings[key] >= 0), `${item.path}: non-negative commission, slippage and spread are required`);
      const text = bytes.toString("utf8");
      assert(extname(item.path).toLowerCase() === ".csv" && text.includes("\n"), `${item.path}: expected a CSV export`);
      const key = String(item.timeframe);
      assert(!backtests.has(key), `duplicate Strategy Tester export for timeframe M${key}`);
      backtests.set(key, receipt);
      Object.assign(receipt, { symbol: item.symbol, timeframe: key, dateRange: item.dateRange, costSettings: item.costSettings, attribution: "SOURCE_HASH_AND_SETTINGS_MANIFEST_ASSERTED" });
    } else if (item.kind === "replay-pair") {
      assert(item.symbol === "FOREXCOM:XAUUSD" && requiredTimeframes.includes(String(item.timeframe)), `${item.path}: replay chart context required`);
      assert(item.script === "indicator" || item.script === "strategy", `${item.path}: replay script is required`);
      validateImage(item.path, bytes);
      assert(typeof item.beforeReloadPath === "string" && typeof item.afterReloadPath === "string", `${item.path}: beforeReloadPath and afterReloadPath are required`);
      const beforePath = await resolveEvidencePath(manifestDirectory, item.beforeReloadPath, "beforeReloadPath");
      const afterPath = await resolveEvidencePath(manifestDirectory, item.afterReloadPath, "afterReloadPath");
      const beforeBytes = await readFile(beforePath);
      const afterBytes = await readFile(afterPath);
      const beforeRows = parsePlanAudit(beforeBytes.toString("utf8"), item.beforeReloadPath);
      const afterRows = parsePlanAudit(afterBytes.toString("utf8"), item.afterReloadPath);
      const comparison = comparePlanAudits(beforeRows, afterRows, 0);
      const replay = { beforeReloadPath: item.beforeReloadPath, beforeSha256: sha256(beforeBytes), afterReloadPath: item.afterReloadPath, afterSha256: sha256(afterBytes), plansBefore: beforeRows.length, plansAfter: afterRows.length, identicalPlanSet: comparison.parity };
      replayResults.push(replay);
      Object.assign(receipt, replay, { chartContext: `${item.symbol} M${item.timeframe}`, replayClaim: comparison.parity ? "LOGS_MATCH_ONLY_MANUAL_REPLAY_REVIEW_REQUIRED" : "REPLAY_LOG_MISMATCH" });
    } else {
      throw new Error(`${item.path}: unsupported artifact kind ${item.kind}`);
    }
    artifacts.push(receipt);
  }

  const parityResults = [];
  const pairIds = new Set([...logs.values()].map(({ item }) => item.pairId));
  for (const pairId of pairIds) {
    const indicator = logs.get(pairId + ":indicator");
    const strategy = logs.get(pairId + ":strategy");
    if (!indicator || !strategy) {
      parityResults.push({ pairId, status: "INCOMPLETE_PAIR", indicatorPlans: indicator?.rows.length ?? 0, strategyPlans: strategy?.rows.length ?? 0 });
      continue;
    }
    assert(indicator.item.symbol === strategy.item.symbol && String(indicator.item.timeframe) === String(strategy.item.timeframe), `${pairId}: audit log chart contexts differ`);
    const result = comparePlanAudits(indicator.rows, strategy.rows, 0);
    parityResults.push({ pairId, ...result, status: !result.parity ? "MISMATCH" : result.indicatorPlans >= 2 ? "LIMITED_MULTI_PLAN_MATCH" : "SINGLE_PLAN_ONLY" });
  }

  const distinctCompileTimes = new Set([...compileByScript.values()].map((item) => Date.parse(item.compileTimestamp)));
  const distinctCompileImages = new Set(artifacts.filter((item) => item.kind === "compile-screenshot").map((item) => item.sha256));
  const gates = {
    indicatorNativeCompile: compileByScript.has("indicator") ? "HUMAN_REVIEW_REQUIRED" : "NOT_SUBMITTED",
    strategyNativeCompile: compileByScript.has("strategy") ? "HUMAN_REVIEW_REQUIRED" : "NOT_SUBMITTED",
    compileEventsDistinct: compileByScript.size === 2 && distinctCompileTimes.size === 2 && distinctCompileImages.size === 2,
    planAuditParity: parityResults.length ? parityResults : "NOT_SUBMITTED",
    replayReload: replayResults.length ? replayResults : "NOT_SUBMITTED",
    strategyTesterTimeframes: Object.fromEntries(requiredTimeframes.map((timeframe) => [timeframe, backtests.has(timeframe) ? "IMPORTED_NEEDS_REVIEW" : "NOT_SUBMITTED"])),
    profitability: "NOT_ASSESSED_BY_INGESTER",
  };
  const receipt = {
    schemaVersion: 1,
    projectVersion: "0.8.0",
    ingestedAt: new Date().toISOString(),
    sourceHashes,
    copybackMatches,
    artifacts,
    gates,
    limitations: [
      "The tool verifies file hashes, metadata structure, and audit-log consistency; it cannot authenticate TradingView UI identity or visually validate screenshot claims.",
      "Compile gates remain human-review required even when a screenshot is present. Source association is asserted by the evidence submitter.",
      "Strategy Tester exports require human confirmation of TradingView provenance and strategy properties; imported files do not establish profitability or OOS validity.",
      "Replay log equality checks exported PLAN_AUDIT sets only; it does not replace controlled candle-by-candle Bar Replay observation.",
    ],
  };
  if (outputPath) {
    const destination = resolve(outputPath);
    await writeFile(destination, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
    console.log(`Receipt written: ${destination}`);
  }
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function hasTimezone(value) { return typeof value === "string" && /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) && Number.isFinite(Date.parse(value)); }
function validateImage(path, bytes) {
  const signature = bytes.subarray(0, 12);
  const valid = extname(path).toLowerCase() === ".png" && signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || [".jpg", ".jpeg"].includes(extname(path).toLowerCase()) && signature[0] === 0xff && signature[1] === 0xd8
    || extname(path).toLowerCase() === ".webp" && signature.toString("ascii", 0, 4) === "RIFF" && signature.toString("ascii", 8, 12) === "WEBP";
  assert(valid, `${path}: file does not match a supported screenshot image format`);
}
async function resolveEvidencePath(base, relativePath, label) {
  assert(typeof relativePath === "string" && relativePath.trim(), `${label} is required`);
  assert(!isAbsolute(relativePath), `${label} must be relative to the manifest directory`);
  const absolute = resolve(base, relativePath);
  const [realBase, realFile] = await Promise.all([realpath(base), realpath(absolute)]);
  const fromBase = relative(realBase, realFile);
  assert(fromBase && fromBase !== ".." && !fromBase.startsWith(".."), `${label} escapes the evidence directory`);
  return realFile;
}
