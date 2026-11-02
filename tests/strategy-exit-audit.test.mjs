import { describe, expect, it } from "vitest";
import {
  analyzeStrategyExitLogs,
  parseStrategyExitLogs,
} from "../scripts/analyze-strategy-exits.mjs";

const baseRow = (overrides = {}) => ({
  scriptVersion: "0.8.0",
  symbol: "FOREXCOM:XAUUSD",
  timeframe: "5",
  planTimestamp: 1791802500000,
  setupTimestamp: 1791799200000,
  direction: 1,
  module: "A_SWEEP_MSS_FVG",
  closedTradeIndex: 0,
  entryId: "A_SWEEP_MSS_FVG",
  entryTime: 1791802800000,
  entryBar: 100,
  actualEntry: 4177.5,
  exitId: "TP1",
  exitComment: "TP1_HIT",
  exitTime: 1791803100000,
  exitBar: 101,
  actualExit: 4184.08,
  size: 0.33,
  profit: 2.1714,
  commission: 0.0276,
  profitPercent: 0.05,
  maxRunup: 2.4,
  maxDrawdown: -0.3,
  plannedEntry: 4177.48,
  initialStop: 4170.88,
  managedStopAtObservation: 4170.88,
  tp1: 4184.08,
  tp2: 4190.68,
  tp3: 4197.28,
  initialQty: 1,
  accountCurrency: "USD",
  priceRMultiple: 0.998,
  ...overrides,
});

const baseGroup = (overrides = {}) => ({
  scriptVersion: "0.8.0",
  symbol: "FOREXCOM:XAUUSD",
  timeframe: "5",
  planTimestamp: 1791802500000,
  setupTimestamp: 1791799200000,
  module: "A_SWEEP_MSS_FVG",
  direction: 1,
  entryTime: 1791802800000,
  exitTime: 1791803700000,
  holdMinutes: 15,
  plannedEntry: 4177.48,
  actualEntry: 4177.5,
  initialStop: 4170.88,
  initialQty: 1,
  riskPctInput: 0.5,
  maxExposurePctInput: 90,
  partialInput: true,
  minContract: 0.01,
  minTick: 0.01,
  pointValue: 1,
  netProfitDelta: -1.9,
  accountCurrency: "USD",
  ...overrides,
});

const logLine = (marker, record) => `[2026-10-12T11:15:00Z]: ${marker} ${JSON.stringify(record)}`;

describe("Strategy exit audit ingestion", () => {
  it("groups partial rows with the final net result and preserves costs separately", () => {
    const first = baseRow();
    const second = baseRow({
      closedTradeIndex: 1,
      exitId: "TP2",
      exitComment: "STOP_LOSS_HIT",
      exitTime: 1791803700000,
      exitBar: 103,
      actualExit: 4170.88,
      size: 0.67,
      profit: -4.08,
      commission: 0.056,
      priceRMultiple: -1,
    });
    const parsed = parseStrategyExitLogs([
      logLine("TRADE_EXIT_AUDIT", first),
      logLine("TRADE_EXIT_AUDIT", second),
      logLine("TRADE_GROUP_AUDIT", baseGroup()),
    ].join("\n"));
    const result = analyzeStrategyExitLogs(parsed);

    expect(result.inputCounts).toEqual({ exitRows: 2, groupRecords: 1 });
    expect(result.resultCounts).toMatchObject({ positionGroups: 1, groupsWithNetResult: 1 });
    expect(result.realizedGroups).toMatchObject({ winners: 0, losers: 1, breakeven: 0, netProfitDeltaSum: -1.9 });
    expect(result.trades[0]).toMatchObject({
      closedTradeRows: 2,
      groupNetProfitDelta: -1.9,
      exitComments: { TP1_HIT: 1, STOP_LOSS_HIT: 1 },
    });
    expect(result.trades[0].rowProfitSum).toBeCloseTo(-1.9086, 10);
    expect(result.trades[0].rowCommissionSum).toBeCloseTo(0.0836, 10);
  });

  it("deduplicates exact repeated row logs but rejects conflicting duplicates", () => {
    const row = baseRow();
    const parsed = parseStrategyExitLogs([
      logLine("TRADE_EXIT_AUDIT", row),
      logLine("TRADE_EXIT_AUDIT", row),
    ].join("\n"));
    const result = analyzeStrategyExitLogs(parsed);
    expect(result.resultCounts).toMatchObject({ exactDuplicateExitRows: 1, positionGroups: 1, groupsMissingNetResult: 1 });

    const conflict = baseRow({ profit: row.profit + 1 });
    expect(() => analyzeStrategyExitLogs(parseStrategyExitLogs([
      logLine("TRADE_EXIT_AUDIT", row),
      logLine("TRADE_EXIT_AUDIT", conflict),
    ].join("\n")))).toThrow(/Conflicting duplicate/);
  });

  it("rejects malformed values and exposes an aggregate with no matching rows as unmatched", () => {
    expect(() => parseStrategyExitLogs("TRADE_EXIT_AUDIT {broken"))
      .toThrow(/invalid TRADE_EXIT_AUDIT JSON/);
    const result = analyzeStrategyExitLogs(parseStrategyExitLogs(
      logLine("TRADE_GROUP_AUDIT", baseGroup()),
    ));
    expect(result.resultCounts).toMatchObject({ positionGroups: 0, groupRecordsWithoutExitRows: 1 });
    expect(result.unmatchedGroupRecords).toHaveLength(1);
  });
});
