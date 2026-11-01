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
    f.manifest.artifacts.push(f.item("indicator", "plan-audit-log", "../outside.log", { pairId: "p", symbol: plan.symbol, timeframe: "5" }));
    expect(f.run().stderr).toMatch(/escapes the evidence directory/);
  });

  it("rejects artifact SHA-256 values that do not match the file", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    f.manifest.artifacts.push(f.item("indicator", "plan-audit-log", path, {
      pairId: "p", symbol: plan.symbol, timeframe: "5", sha256: "0".repeat(64),
    }));
    expect(f.run().stderr).toMatch(/declared SHA-256 does not match/);
  });

  it("rejects a wrong source hash", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    f.manifest.artifacts.push({ ...f.item("indicator", "plan-audit-log", path, { pairId: "p", symbol: plan.symbol, timeframe: "5" }), sourceSha256: "0".repeat(64) });
    expect(f.run().stderr).toMatch(/sourceSha256 does not match/);
  });

  it("reports a missing paired log without claiming parity", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    f.manifest.artifacts.push(f.item("indicator", "plan-audit-log", path, { pairId: "p", symbol: plan.symbol, timeframe: "5" }));
    const result = f.run();
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).gates.planAuditParity).toEqual([{ pairId: "p", status: "INCOMPLETE_PAIR", indicatorPlans: 1, strategyPlans: 0 }]);
  });

  it("rejects incorrect symbol or timeframe metadata", () => {
    const f = fixture();
    const path = f.add("indicator.log", audit());
    f.manifest.artifacts.push(f.item("indicator", "plan-audit-log", path, { pairId: "p", symbol: "FOREXCOM:EURUSD", timeframe: "5" }));
    expect(f.run().stderr).toMatch(/symbol\/timeframe context required/);
  });

  it("flags duplicate plans as a parity mismatch", () => {
    const f = fixture();
    for (const script of ["indicator", "strategy"]) {
      const path = f.add(`${script}.log`, audit() + audit());
      f.manifest.artifacts.push(f.item(script, "plan-audit-log", path, { pairId: "p", symbol: plan.symbol, timeframe: "5" }));
    }
    const result = f.run();
    expect(result.status).toBe(0);
    const parity = JSON.parse(result.stdout).gates.planAuditParity[0];
    expect(parity.status).toBe("MISMATCH");
    expect(parity.mismatches).toEqual(expect.arrayContaining([expect.objectContaining({ field: "duplicate" })]));
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
    const after = f.add("after.log", audit({ ...plan, entry: plan.entry + 1 }));
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
      costSettings: { commissionPct: 0.01, slippageTicks: 2, spreadPrice: 0.2 },
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
