import { describe, expect, it } from "vitest";
import { comparePlanAudits, parsePlanAudit } from "../scripts/compare-plan-audit.mjs";

const base = {
  scriptVersion: "0.8.0",
  symbol: "FOREXCOM:XAUUSD",
  timeframe: "5",
  timestamp: 1_800_000_300_000,
  setupTimestamp: 1_800_000_000_000,
  direction: 1,
  strategy: "A_SWEEP_MSS_FVG",
  entryMode: "Close",
  entry: 4000.01,
  sl: 3999.01,
  tp1: 4001.01,
  tp2: 4002.01,
  tp3: 4003.01,
  quality: 85,
  executionAccepted: true,
  executionModel: "INDICATOR_ESTIMATE",
};

describe("TradingView plan-audit parity tool", () => {
  it("parses JSONL and TradingView log lines containing PLAN_AUDIT", () => {
    const rows = parsePlanAudit(
      `noise\n12:00 INFO PLAN_AUDIT ${JSON.stringify(base)}\n${JSON.stringify({ ...base, timestamp: base.timestamp + 300_000 })}`,
      "indicator.log",
    );
    expect(rows).toHaveLength(2);
  });

  it("ignores lifecycle records mixed into Pine Logs", () => {
    const lifecycle = {
      ...base,
      eventId: "FOREXCOM:XAUUSD:5:1800000300000:1:A_SWEEP_MSS_FVG:ENTRY_TRIGGERED",
      eventType: "ENTRY_TRIGGERED",
    };
    const rows = parsePlanAudit(
      `PLAN_AUDIT ${JSON.stringify(base)}\n${JSON.stringify(lifecycle)}`,
      "mixed.log",
    );
    expect(rows).toEqual([base]);
  });

  it("rejects an audit record missing symbol or timeframe", () => {
    const { symbol: _symbol, timeframe: _timeframe, ...incomplete } = base;
    expect(() => parsePlanAudit(`PLAN_AUDIT ${JSON.stringify(incomplete)}`, "incomplete.log"))
      .toThrow("missing symbol, timeframe");
  });

  it("matches records independent of log order and ignores execution-adapter differences", () => {
    const other = { ...base, timestamp: base.timestamp + 300_000 };
    const result = comparePlanAudits(
      [base, other],
      [
        { ...other, executionAccepted: false, executionModel: "STRATEGY_EMULATOR" },
        { ...base, executionAccepted: false, executionModel: "STRATEGY_EMULATOR" },
      ],
      0.005,
    );
    expect(result.parity).toBe(true);
    expect(result.executionDifferences).toHaveLength(4);
  });

  it("reports missing, duplicate, pattern, direction, and price mismatches", () => {
    const changed = {
      ...base,
      direction: -1,
      strategy: "B_CRT",
      entry: base.entry + 0.02,
    };
    const unmatched = { ...base, timestamp: base.timestamp + 300_000 };
    const result = comparePlanAudits([base, base, unmatched], [changed], 0.005);
    expect(result.parity).toBe(false);
    expect(result.mismatches.map((item) => item.field)).toEqual(
      expect.arrayContaining(["duplicate", "direction", "strategy", "entry", "missing-plan"]),
    );
  });

  it("rejects missing audit versions and reports a version mismatch", () => {
    expect(() => parsePlanAudit('PLAN_AUDIT {"symbol":"X"}', "old.log")).toThrow("missing scriptVersion");
    const result = comparePlanAudits([base], [{ ...base, scriptVersion: "0.6.0" }], 0.005);
    expect(result.parity).toBe(false);
    expect(result.mismatches).toContainEqual(expect.objectContaining({ field: "scriptVersion" }));
  });

  it("uses an explicit price tolerance and rejects invalid tolerances", () => {
    expect(comparePlanAudits([base], [{ ...base, entry: base.entry + 0.004 }], 0.005).parity).toBe(true);
    expect(comparePlanAudits([base], [{ ...base, entry: base.entry + 0.006 }], 0.005).parity).toBe(false);
    for (const tolerance of [-1, NaN, Infinity]) {
      expect(() => comparePlanAudits([base], [base], tolerance)).toThrow("finite non-negative");
    }
  });

  it("rejects malformed or incomplete audit records with their source line", () => {
    expect(() => parsePlanAudit("PLAN_AUDIT {bad", "strategy.log")).toThrow("strategy.log:1");
    expect(() => parsePlanAudit('PLAN_AUDIT {"direction":1}', "strategy.log")).toThrow("missing");
  });
});
