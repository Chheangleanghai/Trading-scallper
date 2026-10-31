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
  it("keeps the validation chart's displayed assertion count in sync with its fixtures", () => {
    const source = read("validation.pine");
    const assertionStatements = (source.match(/^\s*expect\(/gm) ?? []).length - 1; // exclude the expect() function definition
    const terminalRuns = (source.match(/^\s{4}testTerminalLifecycle\(/gm) ?? []).length;
    const assertionCalls = assertionStatements + (terminalRuns - 1) * 2; // two checks run for each terminal lifecycle case
    const displayedCount = source.match(/'(\d+) synthetic assertions passed in this TradingView run'/)?.[1];
    expect(assertionCalls).toBe(206);
    expect(displayedCount).toBe(String(assertionCalls));
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
  it("keeps historical plan drawings isolated from signal and order logic", () => {
    const engine = read("engine.pine.inc");
    const visuals = read("modules/reference_visuals.pine.inc");
    expect(engine.match(/historyMode/g)).toHaveLength(1);
    expect(engine.match(/historyPlanLimit/g)).toHaveLength(1);
    expect(engine.match(/historyLookback/g)).toHaveLength(1);
    expect(visuals).toContain("barstate.isconfirmed and newSignal");
    expect(visuals).toContain("bar_index >= last_bar_index - historyLookback");
    expect(visuals).toContain("array.size(historicalPlans) > keepPlans");
    expect(visuals).toContain("i * 12");
    expect(visuals).toContain("line.set_x2(planLine, labelBar)");
    expect(visuals).toContain("size=size.tiny");
    expect(visuals).not.toMatch(/\bstrategy\.(entry|exit|close)\s*\(/);
    expect(visuals).not.toMatch(/\balert\s*\(/);
  });
  it("embeds the release version in generated Pine alert payloads", () => {
    const engine = read("engine.pine.inc");
    expect(engine).toContain("const string SCRIPT_VERSION = '0.8.0'");
    expect(engine).toContain('"scriptVersion":"\' + SCRIPT_VERSION + \'"');
    expect(engine).not.toContain('"scriptVersion":"0.6.0"');
    for (const file of ["indicator.pine", "strategy.pine"]) {
      expect(read(file)).toContain("const string SCRIPT_VERSION = '0.8.0'");
    }
  });
});

describe("higher-timeframe and signal confirmation safeguards", () => {
  it("requests only completed HTF/reference bars when using lookahead", () => {
    const sources = [
      read("engine.pine.inc"),
      read("modules/candidates.pine.inc"),
      read("modules/context.pine.inc"),
    ].join("\n");
    const requests = sources.match(/^.*request\.security\(.*$/gm) ?? [];
    expect(requests).toHaveLength(5);
    for (const request of requests) {
      expect(request).toContain("lookahead=barmerge.lookahead_on");
      expect(request).toMatch(/\[1\]|\)\[1\]/);
    }
    expect(sources).not.toMatch(/request\.security_lower_tf|barmerge\.lookahead_off/);
  });

  it("keeps entry notifications close-confirmed and analysis inside the confirmed-bar block", () => {
    const engine = read("engine.pine.inc");
    expect(engine).toContain("if barstate.isconfirmed\n    validationReason :=");
    expect(engine).toContain("    updateCandidates()\n");
    expect(engine).toContain("alert(payload, alert.freq_once_per_bar_close)");
  });
});
