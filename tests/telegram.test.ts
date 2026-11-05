import { afterEach, describe, it, expect, vi } from "vitest";
import { formatMessage, sendTelegram } from "../src/telegram.js";
import { validate } from "../src/validation.js";
export const sample = {
  eventId: "feed:1:123:BUY_SIGNAL",
  eventType: "BUY_SIGNAL",
  symbol: "XAUUSD",
  timeframe: "1",
  direction: "BUY",
  strategy: "A_SWEEP_MSS_FVG",
  entry: 100,
  sl: 99,
  tp1: 101,
  tp2: 102,
  tp3: 103,
  quality: 85,
  timestamp: 1793332800000,
  h1Trend: "Bullish",
};
afterEach(() => vi.unstubAllGlobals());
describe("Telegram", () => {
  it("names K-SNR without changing the stable strategy ID or planned prices", () => {
    const signal = validate({ ...sample, strategy: "D_SNR" });
    const text = formatMessage(signal);
    expect(text).toContain("Strategy: D_SNR");
    expect(text).toContain("Concept: D · K-SNR (confirmed support/resistance)");
    for (const caption of ["ENTRY (planned): 100", "INITIAL SL: 99", "TP1: 101", "TP2: 102", "TP3: 103"]) expect(text).toContain(caption);
  });
  it("escapes markup and displays actual R and Cambodia time", () => {
    const text = formatMessage(validate({ ...sample, symbol: '<b>&"' }));
    expect(text).toContain("&lt;b&gt;&amp;&quot;");
    expect(text).toContain("2.00R");
    expect(text).toContain("Cambodia");
  });
  it("awaits delivery and checks Telegram result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"ok":false}')),
    );
    await expect(
      sendTelegram(validate(sample), "token", "chat"),
    ).rejects.toThrow("rejected");
  });
  it("handles HTTP failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 429 })),
    );
    await expect(
      sendTelegram(validate(sample), "token", "chat"),
    ).rejects.toThrow("failed");
  });
  it("sends HTML only to backend configured chat", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
    vi.stubGlobal("fetch", fetcher);
    await sendTelegram(validate(sample), "token", "chat");
    expect(JSON.parse(fetcher.mock.calls[0][1].body).chat_id).toBe("chat");
  });
});
describe("extended signal metadata", () => {
  it("distinguishes signal, plan and simulated fill, with managed stop", () => {
    const text = formatMessage(
      validate({
        ...sample,
        signalPrice: 100.2,
        filledEntry: 100.4,
        managedSl: 100.4,
        status: "ENTRY_TRIGGERED",
        entryMode: "Limit",
        executionModel: "STRATEGY_EMULATOR",
        targetSource: "<Structure>",
        eventTimestamp: sample.timestamp + 60000,
        setupTimestamp: sample.timestamp - 120000,
        invalidation: 99.2,
      }),
    );
    expect(text).toContain("Signal close: 100.2");
    expect(text).toContain("Filled entry (Strategy emulator): 100.4");
    expect(text).toContain("Managed SL: 100.4");
    expect(text).toContain("&lt;Structure&gt;");
    expect(text).toContain("ENTRY (planned): 100");
  });
  it("validates null pending fill and rejects invalid optional metadata", () => {
    expect(validate({ ...sample, filledEntry: null }).filledEntry).toBeNull();
    for (const change of [
      { managedSl: NaN },
      { filledEntry: 0 },
      { entryMode: "instant" },
      { executionModel: "BROKER_REAL" },
      { targetSource: "\n" },
      { eventTimestamp: sample.timestamp - 1 },
      { setupTimestamp: sample.timestamp + 1 },
      { status: "PROFIT_GUARANTEED" },
    ])
      expect(() => validate({ ...sample, ...change })).toThrow();
  });
});

describe("multi-strategy event compatibility", () => {
  const modules = [
    "A_SWEEP_MSS_FVG",
    "B_CRT",
    "C_TURTLE_SOUP",
    "D_SNR",
    "E_DEMAND",
    "E_SUPPLY",
    "F_TREND_PULLBACK",
    "G_AMD",
    "H_QUASIMODO",
  ];
  for (const strategy of modules) {
    it(`formats independent ${strategy} events without engine calculations`, () => {
      for (const eventType of [
        "BUY_SIGNAL",
        "ENTRY_TRIGGERED",
        "TP1_HIT",
        "TP2_HIT",
        "TP3_HIT",
        "STOP_LOSS_HIT",
        "SIGNAL_INVALIDATED",
        "TRADE_CLOSED",
      ]) {
        const signal = validate({
          ...sample,
          strategy,
          eventType,
          eventId: `feed:1:${sample.timestamp}:1:${strategy}:${eventType}`,
          status:
            eventType === "SIGNAL_INVALIDATED" ? "EXPIRED" : "ENTRY_TRIGGERED",
          executionModel: "INDICATOR_ESTIMATE",
          entryMode: "Limit",
          filledEntry: eventType === "SIGNAL_INVALIDATED" ? null : 100.1,
          managedSl: 100.1,
          targetSource: "Hybrid: fixed-R fallback",
          eventTimestamp: sample.timestamp + 60000,
          setupTimestamp: sample.timestamp - 60000,
          signalPrice: 100.2,
          invalidation: 99.1,
        });
        expect(formatMessage(signal)).toContain(`Strategy: ${strategy}`);
        expect(formatMessage(signal)).toContain(eventType);
        expect(signal.entry).toBe(100);
      }
    });
  }
});

describe("explainable v0.6 signals", () => {
  it("escapes the qualified signal reason and displays the script version", () => {
    const text = formatMessage(validate({ ...sample, reason: '<retest> & risk passed', setupProgress: 'Setup confirmed; fill triggered', alignment: 'ALIGNED', scriptVersion: '0.6.0' }));
    expect(text).toContain('Why: &lt;retest&gt; &amp; risk passed');
    expect(text).toContain('Script: 0.6.0');
    expect(text).toContain('Alignment: ALIGNED');
  });
  it("rejects malformed explanation fields", () => {
    for (const change of [{ reason: 42 }, { reason: 'x'.repeat(601) }, { setupProgress: '\n' }, { alignment: '100_PERCENT_WIN' }, { scriptVersion: 'x'.repeat(33) }])
      expect(() => validate({ ...sample, ...change })).toThrow();
  });
});
