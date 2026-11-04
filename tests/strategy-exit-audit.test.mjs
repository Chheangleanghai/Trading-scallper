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
  sizingEquity: 10000,
  accountRiskPerUnit: 6.6,
  unitNotional: 4177.48,
  riskQty: 7.5757575758,
  exposureQty: 1.0053917827,
  rawQty: 1.0053917827,
  sizedQty: 1,
  riskPctInput: 0.5,
  maxExposurePctInput: 42,
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
      sizingContext: {
        sizingEquity: 10000,
        accountRiskPerUnit: 6.6,
        unitNotional: 4177.48,
        riskQty: 7.5757575758,
        exposureQty: 1.0053917827,
        rawQty: 1.0053917827,
        sizedQty: 1,
      },
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

  it("reconciles a captured full-size XAUUSD close against point-value price movement and fees", () => {
    const row = baseRow({
      entryTime: 1791802500000,
      entryBar: 1535,
      actualEntry: 4177.5,
      exitId: "Close entry(s) order A_SWEEP_MSS_FVG",
      exitComment: "TRADE_CLOSED",
      exitTime: 1791803400000,
      exitBar: 1538,
      actualExit: 4171.83,
      size: 2.1,
      profit: -13.6603593,
      commission: 1.7533593,
      profitPercent: -0.155697967,
      plannedEntry: 4177.48,
      initialStop: 4170.88,
      tp1: 4184.08,
      tp2: 4190.68,
      tp3: 4197.28,
      initialQty: 2.1,
    });
    const group = baseGroup({
      entryTime: 1791802500000,
      exitTime: 1791803400000,
      holdMinutes: 15,
      initialQty: 2.1,
      sizingEquity: 10000,
      exposureQty: 2.1544088781,
      rawQty: 2.1544088781,
      sizedQty: 2.1,
      riskPctInput: 0.5,
      maxExposurePctInput: 90,
      minContract: 0.1,
      minTick: 0.01,
      pointValue: 1,
      netProfitDelta: -13.6603593,
    });
    const result = analyzeStrategyExitLogs(parseStrategyExitLogs([
      logLine("TRADE_EXIT_AUDIT", row),
      logLine("TRADE_GROUP_AUDIT", group),
    ].join("\n")));

    expect(result.trades[0].exitComments).toEqual({ TRADE_CLOSED: 1 });
    expect(result.trades[0].closedTradeRows).toBe(1);
    expect(result.trades[0].reconciliation).toMatchObject({
      rowProfitSum: -13.6603593,
      rowCommissionSum: 1.7533593,
      profitPlusCommission: -11.907,
      groupNetProfitDelta: -13.6603593,
      rowProfitMatchesGroupNetDelta: true,
      priceMovePnlUnits: "chart-currency units",
    });
    expect(result.trades[0].reconciliation.priceMovePnlAtPointValue).toBeCloseTo(-11.907, 8);
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

  it.each([1, -1])("flags the captured 0.1 residual after three stop fills for direction %s", (direction) => {
    const rows = [0.6, 0.6, 0.8].map((qty, index) => baseRow({
      direction, initialQty: 2.1, closedTradeIndex: index,
      exitId: `TP${index + 1}`, exitComment: "STOP_LOSS_HIT", size: direction * qty,
    }));
    rows.push(baseRow({
      direction, initialQty: 2.1, closedTradeIndex: 3,
      exitId: "Close entry(s) order A_SWEEP_MSS_FVG", exitComment: "TRADE_CLOSED",
      exitTime: 1791803700000, size: direction * 0.1,
    }));
    const result = analyzeStrategyExitLogs({ rows, groups: [baseGroup({
      direction, initialQty: 2.1, minContract: 0.1,
    })] });

    expect(result.resultCounts.groupsWithBracketResidual).toBe(1);
    expect(result.trades[0].bracketCoverage).toMatchObject({
      status: "RESIDUAL_AFTER_ALL_BRACKET_EXITS", allBracketIdsObserved: true,
      allBracketExitsWereStops: true, quantityClosedThroughBrackets: 2,
      laterCloseQuantity: 0.1, laterCloseTime: 1791803700000,
    });
    expect(result.trades[0].bracketCoverage.remainingQuantity).toBeCloseTo(0.1, 12);
  });

  it("does not flag an ordinary partial TP followed by a time close", () => {
    const rows = [baseRow({ initialQty: 2.1, size: 0.6 }), baseRow({
      initialQty: 2.1, closedTradeIndex: 1, exitId: "Close entry(s) order A_SWEEP_MSS_FVG",
      exitComment: "TRADE_CLOSED", exitTime: 1791803700000, size: 1.5,
    })];
    const result = analyzeStrategyExitLogs({ rows, groups: [baseGroup({ initialQty: 2.1 })] });
    expect(result.resultCounts.groupsWithBracketResidual).toBe(0);
    expect(result.trades[0].bracketCoverage).toMatchObject({
      status: "NOT_OBSERVED", allBracketIdsObserved: false, remainingQuantity: null,
    });
  });

  it("ignores floating point noise when bracket fills cover the entry quantity", () => {
    const noise = Number.EPSILON * 4;
    const rows = [0.6, 0.6, 0.9 - noise].map((qty, index) => baseRow({
      initialQty: 2.1, closedTradeIndex: index, exitId: `TP${index + 1}`,
      exitComment: "STOP_LOSS_HIT", size: qty,
    }));
    rows.push(baseRow({
      initialQty: 2.1, closedTradeIndex: 3, exitId: "Close entry(s) order A_SWEEP_MSS_FVG",
      exitComment: "TRADE_CLOSED", exitTime: 1791803700000, size: noise,
    }));
    const result = analyzeStrategyExitLogs({ rows, groups: [baseGroup({ initialQty: 2.1, minContract: 0.1 })] });
    expect(result.resultCounts.groupsWithBracketResidual).toBe(0);
    expect(result.trades[0].bracketCoverage.allBracketIdsObserved).toBe(true);
  });
});
