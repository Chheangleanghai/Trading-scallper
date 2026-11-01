import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const cli = join(root, "scripts/ingest-tradingview-evidence.mjs");
const fixtures = [];
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const plan = {
  scriptVersion: "0.8.0", symbol: "FOREXCOM:XAUUSD", timeframe: "5",
  timestamp: 1_800_000_300_000, setupTimestamp: 1_800_000_000_000,
  direction: 1, strategy: "A_SWEEP_MSS_FVG", entryMode: "Close",
  entry: 4000.01, sl: 3999.01, tp1: 4001.01, tp2: 4002.01, tp3: 4003.01, quality: 85,
};

function fixture() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "tv-evidence-"));
  const directory = join(temporaryRoot, "evidence");
  fixtures.push(temporaryRoot);
  mkdirSync(directory, { recursive: true });
  const sourceSha256 = Object.fromEntries(["indicator", "strategy"].map((script) => [
    script,
    createHash("sha256").update(readFileSync(join(root, `pine/${script}.pine`))).digest("hex"),
  ]));
  const manifest = { schemaVersion: 1, projectVersion: "0.8.0", artifacts: [] };
  const add = (name, bytes) => { writeFileSync(join(directory, name), bytes); return name; };
  const item = (script, kind, path, extra = {}) => ({ script, kind, path, sourceSha256: sourceSha256[script], ...extra });
  const run = () => {
    writeFileSync(join(directory, "manifest.json"), JSON.stringify(manifest));
    return spawnSync(process.execPath, [cli, join(directory, "manifest.json")], { encoding: "utf8" });
  };
  return { directory, manifest, sourceSha256, add, item, run };
}

function audit(row = plan) { return `PLAN_AUDIT ${JSON.stringify(row)}\n`; }
const inputKeys = [
  "enableA", "enableB", "enableC", "enableD", "enableE", "enableF", "enableG", "enableH",
  "crtTF", "turtleAge", "levelTolerance", "maxZoneTests", "useEMA50", "pullbackDepth", "accumulationBars", "accumulationWidth",
  "strategyThresholds", "thresholdA", "thresholdB", "thresholdC", "thresholdD", "thresholdE", "thresholdF", "thresholdG", "thresholdH",
  "useResearchWindow", "researchStart", "researchEnd", "tradeSide", "swing", "expiry", "threshold", "cooldown", "maxTrades",
  "maxExposurePct", "riskPct", "buffer", "maxStop", "maxDistance", "minRR", "r1", "r2", "r3", "minDisp", "trendFilter", "emaFilter",
  "useSession", "sessionPreset", "sessionHours", "sessionZone", "manualPause", "newsStart", "newsEnd", "entryMode", "pendingBars", "timeExit",
  "targetMode", "stopMode", "atrStop", "breakEven", "breakEvenR", "trailing", "trailingStartR", "trailingATR",
  "confluenceLiquidity", "confluenceFib", "confluencePD", "partial",
];
function runContext({ threshold = 75 } = {}) {
  const booleanKeys = new Set([
    "enableA", "enableB", "enableC", "enableD", "enableE", "enableF", "enableG", "enableH", "useEMA50",
    "strategyThresholds", "useResearchWindow", "trendFilter", "emaFilter", "useSession", "manualPause", "breakEven", "trailing",
    "confluenceLiquidity", "confluenceFib", "confluencePD", "partial",
  ]);
  const stringKeys = new Set(["crtTF", "tradeSide", "sessionPreset", "sessionHours", "sessionZone", "entryMode", "targetMode", "stopMode"]);
  const inputSettings = Object.fromEntries(inputKeys.map((key) => [key,
    booleanKeys.has(key) ? key === "enableA" : stringKeys.has(key) ? "test-setting" : 1,
  ]));
  inputSettings.threshold = threshold;
  return {
    dateRangeStart: "2026-10-01T00:00:00Z",
    dateRangeEnd: "2026-11-01T00:00:00Z",
    enabledModules: ["A"],
    inputSettings,
  };
}
function auditArtifact(f, script, path, extra = {}) {
  return f.item(script, "plan-audit-log", path, {
    pairId: "p", symbol: plan.symbol, timeframe: "5", runContext: runContext(), ...extra,
  });
}
function compileItem(f, script = "indicator") {
  const path = f.add(`${script}.png`, png);
  return f.item(script, "compile-screenshot", path, {
    sha256: createHash("sha256").update(png).digest("hex"),
    draftTitle: `${script} draft`, capturedAt: "2026-11-01T12:00:00Z",
    compileTimestamp: "2026-11-01T11:59:00Z", symbol: "FOREXCOM:XAUUSD", timeframe: "5",
    compileMessage: "Compiled.", chartMessage: "Added to chart",
    sourceAssociation: "same-unchanged-draft-as-copyback",
  });
}

afterEach(() => { for (const directory of fixtures.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe("TradingView evidence ingestion CLI", () => {
  it("rejects artifact paths outside the manifest directory", () => {
    const f = fixture();
    writeFileSync(join(f.directory, "..", "outside.log"), audit());
    f.manifest.artifacts.push(auditArtifact(f, "indicator", "../outside.log"));
    expect(f.run().stderr).toMatch(/escapes the evidence directory/);
  });

  it("rejects artifact SHA-256 values that do not match the file", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    f.manifest.artifacts.push(auditArtifact(f, "indicator", path, { sha256: "0".repeat(64) }));
    expect(f.run().stderr).toMatch(/declared SHA-256 does not match/);
  });

  it("rejects a wrong source hash", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    f.manifest.artifacts.push({ ...auditArtifact(f, "indicator", path), sourceSha256: "0".repeat(64) });
    expect(f.run().stderr).toMatch(/sourceSha256 does not match/);
  });

  it("reports a missing paired log without claiming parity", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    f.manifest.artifacts.push(auditArtifact(f, "indicator", path));
    const result = f.run();
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).gates.planAuditParity).toEqual([{ pairId: "p", status: "INCOMPLETE_PAIR", indicatorPlans: 1, strategyPlans: 0 }]);
  });

  it("rejects incorrect symbol or timeframe metadata", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    f.manifest.artifacts.push(auditArtifact(f, "indicator", path, { symbol: "FOREXCOM:EURUSD" }));
    expect(f.run().stderr).toMatch(/symbol\/timeframe context required/);
  });

  it("flags duplicate plans as a parity mismatch", () => {
    const f = fixture();
    for (const script of ["indicator", "strategy"]) {
      const path = f.add(`${script}.log`, audit() + audit());
      f.manifest.artifacts.push(auditArtifact(f, script, path));
    }
    const result = f.run();
    expect(result.status).toBe(0);
    const parity = JSON.parse(result.stdout).gates.planAuditParity[0];
    expect(parity.status).toBe("MISMATCH");
    expect(parity.mismatches).toEqual(expect.arrayContaining([expect.objectContaining({ field: "duplicate" })]));
  });

  it("refuses parity when paired logs have different date windows or input settings", () => {
    const f = fixture();
    for (const script of ["indicator", "strategy"]) {
      const path = f.add(`${script}.log`, audit());
      f.manifest.artifacts.push(auditArtifact(f, script, path, {
        runContext: runContext({ threshold: script === "indicator" ? 75 : 70 }),
      }));
    }
    const result = f.run();
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).gates.planAuditParity[0].status).toBe("RUN_CONTEXT_MISMATCH");
  });

  it("requires the full settings record for reproducible plan logs", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    const context = runContext();
    delete context.inputSettings.sessionZone;
    f.manifest.artifacts.push(auditArtifact(f, "indicator", path, { runContext: context }));
    expect(f.run().stderr).toMatch(/inputSettings missing sessionZone/);
  });

  it("rejects input settings with incorrect JSON types", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    const context = runContext();
    context.inputSettings.trendFilter = "true";
    f.manifest.artifacts.push(auditArtifact(f, "indicator", path, { runContext: context }));
    expect(f.run().stderr).toMatch(/invalid types for trendFilter/);
  });

  it("rejects invalid screenshot timestamps and metadata", () => {
    const f = fixture();
    const screenshot = compileItem(f);
    screenshot.compileTimestamp = "11:59 AM";
    f.manifest.artifacts.push(screenshot);
    expect(f.run().stderr).toMatch(/compileTimestamp must be ISO-8601 with timezone/);
  });

  it("reports replay log differences", () => {
    const f = fixture();
    const screenshotPath = f.add("replay.png", png);
    const before = f.add("before.log", audit());
    const after = f.add("after.log", audit({ ...plan, entry: plan.entry + 0.5 }));
    f.manifest.artifacts.push(f.item("indicator", "replay-pair", screenshotPath, {
      symbol: plan.symbol, timeframe: "5", beforeReloadPath: before, afterReloadPath: after,
    }));
    const result = f.run();
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).artifacts[0].replayClaim).toBe("REPLAY_LOG_MISMATCH");
  });

  it("rejects malformed Strategy Tester CSV structure", () => {
    const f = fixture();
    const path = f.add("m5.csv", "Trade #,Type,Price\n1,Entry\n");
    f.manifest.artifacts.push(f.item("strategy", "backtest-export", path, {
      symbol: plan.symbol, timeframe: "5", dateRange: "2026-01-01/2026-02-01",
      runContext: runContext(),
      positionSizing: { mode: "risk-percent", currency: "USD", initialCapital: 10000, riskPct: 0.5, maxExposurePct: 90 },
      costSettings: { commissionPct: 0.01, slippageTicks: 2, spreadPrice: 0.2, spreadAssumption: "manual estimate" },
    }));
    expect(f.run().stderr).toMatch(/inconsistent column counts/);
  });

  it("never upgrades manifest compile claims to a PASSED native gate", () => {
    const f = fixture();
    const screenshot = compileItem(f);
    screenshot.nativeCompileStatus = "PASSED";
    screenshot.sourceAttributionVerified = true;
    f.manifest.artifacts.push(screenshot);
    const result = f.run();
    expect(result.status).toBe(0);
    const receipt = JSON.parse(result.stdout);
    expect(receipt.gates.indicatorNativeCompile).toBe("HUMAN_REVIEW_REQUIRED");
    expect(receipt.artifacts[0].attribution).toBe("MANIFEST_ASSERTED_NOT_MACHINE_VERIFIED");
    expect(JSON.stringify(receipt)).not.toContain('"indicatorNativeCompile":"PASSED"');
  });
});
