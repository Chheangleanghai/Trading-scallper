import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzePlanOutcomes } from "../scripts/analyze-plan-outcomes.mjs";

// Preserved genuine native capture. Mutations below are malformed-input tests, not market outcomes.
const native = readFileSync(new URL("../reports/native-v080/continuation-2026-11-05/corrected-strategy-native.txt", import.meta.url), "utf8");
const firstTime = 1791189000000;
function mutate(marker, transform) {
  let changed = false;
  return native.split("\n").map((line) => {
    const index = line.indexOf(marker + " ");
    if (changed || index < 0) return line;
    changed = true;
    const start = index + marker.length + 1;
    return line.slice(0, start) + JSON.stringify(transform(JSON.parse(line.slice(start))));
  }).join("\n");
}

describe("Plan/outcome research join", () => {
  it("reconciles genuine partial exits as positions and never subtracts commission twice", () => {
    const result = analyzePlanOutcomes(native);
    expect(result.counts).toEqual({ plans: 92, completedPositions: 92, incompletePositions: 0, plansWithoutExitRows: 0 });
    expect(result.overall).toMatchObject({ completePositions: 92, actualExitRows: 140, wins: 37, losses: 55 });
    expect(result.overall.net).toBeCloseTo(-84.1152028, 8);
    expect(result.overall.commission).toBeCloseTo(160.4372028, 8);
    expect(result.overall.grossBeforeCommission).toBeCloseTo(76.322, 8);
    expect(result.positions[0].netRToPlannedInitialCashRisk).toBeCloseTo(6.2520969 / (5.14 * 2.1), 8);
    expect(result.byScore[80].completePositions).toBe(22);
    expect(result.byScore[90].completePositions).toBe(68);
    expect(result.byScore[100].completePositions).toBe(2);
    expect(result.modulesWithMultipleScores).toEqual([]);
    expect(result.scoreAndModuleFullyConfoundedInThisSample).toBe(true);
    expect(result.status).toBe("SCORE_CALIBRATION_INCONCLUSIVE");
    expect(result.byScore[100].winRateWilson95IID.lower).toBeCloseTo(0.0945312, 6);
    expect(result.byScore[100].winRateWilson95IID.upper).toBeCloseTo(0.9054688, 6);
  });

  it("rejects duplicate capture content and inconsistent plan/exit levels or net results", () => {
    const plan = native.split("\n").find((line) => line.includes("PLAN_AUDIT "));
    const exit = native.split("\n").find((line) => line.includes("TRADE_EXIT_AUDIT "));
    expect(() => analyzePlanOutcomes(native + "\n" + plan)).toThrow(/Duplicate plan/);
    expect(() => analyzePlanOutcomes(native + "\n" + exit)).toThrow(/Duplicate or unmatched/);
    expect(() => analyzePlanOutcomes(mutate("TRADE_EXIT_AUDIT", (r) => ({ ...r, tp1: r.tp1 + 0.01 })))).toThrow(/tp1 mismatch/);
    expect(() => analyzePlanOutcomes(mutate("TRADE_GROUP_AUDIT", (r) => ({ ...r, netProfitDelta: r.netProfitDelta + 1 })))).toThrow(/row\/group net mismatch/);
  });

  it("keeps missing outcomes and partial closures outside realized summaries", () => {
    const missingGroup = native.split("\n").filter((line) => !(line.includes("TRADE_GROUP_AUDIT ") && line.includes(`"planTimestamp":${firstTime}`))).join("\n");
    const partial = analyzePlanOutcomes(missingGroup);
    expect(partial.counts).toMatchObject({ plans: 92, completedPositions: 91, incompletePositions: 1, plansWithoutExitRows: 0 });
    const missingExit = missingGroup.split("\n").filter((line) => !(line.includes("TRADE_EXIT_AUDIT ") && line.includes(`"planTimestamp":${firstTime}`))).join("\n");
    const open = analyzePlanOutcomes(missingExit);
    expect(open.counts).toMatchObject({ completedPositions: 91, incompletePositions: 0, plansWithoutExitRows: 1 });
    expect(open.overall.net).toBeCloseTo(-84.1152028 - 6.2520969, 8);
    expect(open.plansWithoutExitRows[0].timestamp).toBe(firstTime);
  });

  it("fails closed on ambiguous execution metadata and mismatched currency or quantity", () => {
    expect(() => analyzePlanOutcomes(mutate("PLAN_AUDIT", (r) => ({ ...r, executionModel: "INDICATOR_ESTIMATE" })))).toThrow(/acceptance\/model/);
    expect(() => analyzePlanOutcomes(mutate("TRADE_GROUP_AUDIT", (r) => ({ ...r, accountCurrency: "EUR" })))).toThrow(/currency or initial quantity/);
    expect(() => analyzePlanOutcomes(mutate("TRADE_EXIT_AUDIT", (r) => ({ ...r, size: r.size / 2 })))).toThrow(/incomplete closed quantity/);
  });
});
