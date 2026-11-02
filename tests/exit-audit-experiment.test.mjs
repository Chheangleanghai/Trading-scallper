import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { canTranspilePineScript } from "@opus-aether-ai/pine-transpiler";

const root = resolve(".");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const baselinePath = "pine/strategy.pine";
const experimentPath = "pine/experiments/strategy_exit_audit.pine";
const expectedBaselineHash =
  "42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0";

describe("isolated closed-trade audit experiment", () => {
  it("keeps the frozen baseline byte-identical outside its title and log-only instrumentation", () => {
    const baseline = read(baselinePath);
    expect(createHash("sha256").update(baseline).digest("hex")).toBe(
      expectedBaselineHash,
    );

    const experiment = read(experimentPath)
      .replace(
        'strategy("XAUUSD SMART SCALPER PRO Backtest · Exit audit experiment",',
        'strategy("XAUUSD SMART SCALPER PRO Backtest",',
      )
      .replace(
        /            \/\/ EXIT_AUDIT_ROW_BEGIN[^\n]*\n[\s\S]*?            \/\/ EXIT_AUDIT_ROW_END\n/,
        "",
      )
      .replace(
        /    \/\/ EXIT_AUDIT_GROUP_BEGIN[^\n]*\n[\s\S]*?    \/\/ EXIT_AUDIT_GROUP_END\n/,
        "",
      )
      .replace(
        /\/\/ EXIT_AUDIT_STATE_BEGIN[^\n]*\n[\s\S]*?\/\/ EXIT_AUDIT_STATE_END\n/,
        "",
      );
    expect(experiment).toBe(baseline);
  });

  it("regenerates deterministically, parses independently, and emits row plus group telemetry", () => {
    const generation = spawnSync(
      "python3",
      ["scripts/generate_exit_audit_experiment.py", "--check"],
      { cwd: root, encoding: "utf8" },
    );
    expect(generation.status, generation.stderr).toBe(0);
    const source = read(experimentPath);
    expect(canTranspilePineScript(source)).toEqual({ valid: true });
    expect(source).toContain("strategy.closedtrades.exit_time(trade)");
    expect(source).toContain("strategy.closedtrades.exit_price(trade)");
    expect(source).toContain("strategy.closedtrades.commission(trade)");
    expect(source).toContain("strategy.closedtrades.max_runup(trade)");
    expect(source).toContain("strategy.closedtrades.max_drawdown(trade)");
    expect(source).toContain("auditGroupPlanTimestamp := signalTime");
    expect(source).toContain('"planTimestamp":\' + str.tostring(auditGroupPlanTimestamp)');
    expect(source).toContain('"netProfitDelta":\' + str.tostring(net)');
    const rowBlock = source.match(
      /            \/\/ EXIT_AUDIT_ROW_BEGIN[^\n]*\n([\s\S]*?)            \/\/ EXIT_AUDIT_ROW_END/,
    )?.[1];
    const groupBlock = source.match(
      /    \/\/ EXIT_AUDIT_GROUP_BEGIN[^\n]*\n([\s\S]*?)    \/\/ EXIT_AUDIT_GROUP_END/,
    )?.[1];
    expect(rowBlock).toBeTruthy();
    expect(groupBlock).toBeTruthy();
    for (const block of [rowBlock, groupBlock]) {
      expect(block).not.toMatch(/\b(?:strategy\.(?:entry|exit|close|cancel)|alert)\s*\(/);
    }
  });
});
