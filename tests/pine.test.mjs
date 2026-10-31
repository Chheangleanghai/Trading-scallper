import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { canTranspilePineScript } from "@opus-aether-ai/pine-transpiler";
import { runChartRuntimeHarness } from "@opus-aether-ai/pine-transpiler/test-harness";
const read = (file) => readFileSync(resolve("pine", file), "utf8");
// Independent tool: these checks are NOT TradingView compiler/emulator verification.
describe("local Pine structural and pure-predicate checks", () => {
  for (const file of ["indicator.pine", "strategy.pine", "validation.pine"]) {
    it(`parses ${file} with the independent parser`, () => {
      expect(canTranspilePineScript(read(file))).toEqual({ valid: true });
    });
  }
  it("executes shared synthetic assertions without unresolved runtime calls", () => {
    const report = runChartRuntimeHarness({
      fixtureName: "validation.pine",
      source: read("validation.pine"),
      bars: 5,
      barIndexStart: 0,
    });
    expect(report.pass).toBe(true);
    expect(report.barsProcessed).toBe(5);
    expect(report.runtimeErrors).toEqual([]);
    expect(report.unimplementedStdCalls).toEqual([]);
  });
  it("detects a deliberately failed assertion instead of trusting harness pass alone", () => {
    const source = read("validation.pine").replace(
      "== 100, 'Maximum quality'",
      "== 99, 'Maximum quality'",
    );
    expect(source).not.toBe(read("validation.pine"));
    const report = runChartRuntimeHarness({
      fixtureName: "canary-failure",
      source,
      bars: 5,
      barIndexStart: 0,
    });
    // The harness stubs runtime.error rather than throwing: explicitly reject that unresolved call.
    expect(
      report.runtimeErrors.length > 0 ||
        report.unimplementedStdCalls.includes("error"),
    ).toBe(true);
  });
});

describe("indicator/strategy common-engine parity", () => {
  const normalize = (file, source = read(file)) => {
    let body = source.slice(source.indexOf("// Shared source:"));
    if (file === "strategy.pine") {
      const broker = read("modules/broker_sync.pine.inc").split("\n").map(line => line ? "    " + line : "").join("\n").trimEnd();
      body = body.replace(broker, "    // BROKER_SYNC");
      body = body.replace(read("modules/orders.pine.inc"), "// STRATEGY_ORDER_ADAPTER");
      const performance = read("modules/performance.pine.inc");
      expect(body.endsWith(performance)).toBe(true);
      body = body.slice(0, -performance.length);
    }
    return body.trimEnd();
  };
  it("keeps the full analysis/confirmation engine identical after removing the broker adapter", () => {
    expect(normalize("strategy.pine")).toBe(normalize("indicator.pine"));
  });
  it("detects an injected strategy-only entry calculation drift", () => {
    const altered = read("strategy.pine").replace("float anchor = (c.upper + c.lower) / 2", "float anchor = c.upper");
    expect(altered).not.toBe(read("strategy.pine"));
    expect(normalize("strategy.pine", altered)).not.toBe(normalize("indicator.pine"));
  });
});
