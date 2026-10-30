import { describe, expect, it } from "vitest";
import { validate } from "../src/validation.js";
import { events } from "../src/types.js";

const base = {
  eventId: "FOREXCOM:XAUUSD:5:1793332800000:1:A_SWEEP_MSS_FVG:BUY_SIGNAL",
  eventType: "BUY_SIGNAL",
  symbol: "FOREXCOM:XAUUSD",
  timeframe: "5",
  direction: "BUY",
  strategy: "A_SWEEP_MSS_FVG",
  entry: 100,
  sl: 99,
  tp1: 101,
  tp2: 102,
  tp3: 103,
  quality: 75,
  timestamp: 1793332800000,
  h1Trend: "Bullish",
};
describe("untrusted TradingView payloads", () => {
  for (const direction of ["BUY", "SELL"]) {
    for (const eventType of events.filter(
      (e) => e !== (direction === "BUY" ? "SELL_SIGNAL" : "BUY_SIGNAL"),
    )) {
      it(`accepts a valid ${direction} ${eventType} ladder`, () => {
        const prices =
          direction === "BUY" ? {} : { sl: 101, tp1: 99, tp2: 98, tp3: 97 };
        expect(
          validate({ ...base, ...prices, direction, eventType }).direction,
        ).toBe(direction);
      });
    }
  }
  for (const key of ["eventId", "symbol", "timeframe", "strategy", "h1Trend"]) {
    it(`requires bounded non-control string ${key}`, () => {
      for (const value of [
        undefined,
        null,
        42,
        [],
        {},
        "",
        "   ",
        "a\n",
        "a\r",
        "a\u0000",
        "x".repeat(385),
      ])
        expect(() => validate({ ...base, [key]: value })).toThrow();
    });
  }
  for (const key of [
    "entry",
    "sl",
    "tp1",
    "tp2",
    "tp3",
    "quality",
    "timestamp",
  ]) {
    it(`rejects missing/string/nonfinite ${key}`, () => {
      for (const value of [
        undefined,
        null,
        "100",
        true,
        NaN,
        Infinity,
        -Infinity,
      ])
        expect(() => validate({ ...base, [key]: value })).toThrow();
    });
  }
  it("rejects non-object JSON and unknown event/direction", () => {
    for (const value of [null, undefined, [], true, 1, "{}"])
      expect(() => validate(value)).toThrow();
    for (const change of [
      { direction: "LONG" },
      { eventType: "BUY_NOW" },
      { quality: -1 },
      { quality: 101 },
      { timestamp: 4102444800001 },
      { timestamp: 0 },
    ])
      expect(() => validate({ ...base, ...change })).toThrow();
  });
  it("accepts zero/100 score and nonstandard broker symbol strings", () => {
    for (const quality of [0, 100])
      expect(
        validate({ ...base, quality, symbol: "BROKER:GOLD.cash" }).quality,
      ).toBe(quality);
  });
  it("rejects every zero or reversed boundary in both ladders", () => {
    for (const change of [
      { sl: 100 },
      { tp1: 100 },
      { tp2: 101 },
      { tp3: 102 },
      { sl: 0 },
    ])
      expect(() => validate({ ...base, ...change })).toThrow();
    const short = {
      ...base,
      direction: "SELL",
      eventType: "SELL_SIGNAL",
      sl: 101,
      tp1: 99,
      tp2: 98,
      tp3: 97,
    };
    for (const change of [
      { sl: 100 },
      { tp1: 100 },
      { tp2: 99 },
      { tp3: 98 },
      { tp3: 0 },
    ])
      expect(() => validate({ ...short, ...change })).toThrow();
  });
  it("accepts a longer deterministic event ID while keeping symbols bounded", () => {
    expect(validate({ ...base, eventId: "x".repeat(384) }).eventId.length).toBe(
      384,
    );
    expect(() => validate({ ...base, symbol: "x".repeat(121) })).toThrow();
  });
  it("validates metadata types and temporal order", () => {
    for (const change of [
      { targetSource: null },
      { targetSource: 123 },
      { filledEntry: "100" },
      { managedSl: 0 },
      { signalPrice: Infinity },
      { invalidation: -1 },
      { setupTimestamp: 1.5 },
      { eventTimestamp: Infinity },
      { setupTimestamp: base.timestamp + 1 },
      { eventTimestamp: base.timestamp - 1 },
    ])
      expect(() => validate({ ...base, ...change })).toThrow();
  });
});
