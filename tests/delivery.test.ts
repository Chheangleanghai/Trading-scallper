import { describe, expect, it } from "vitest";
import {
  decideDelivery,
  enqueueSignal,
  payloadSha256,
  type AtomicAcceptResult,
  type OutboxRecord,
  type OutboxRepository,
} from "../src/delivery.js";
import type { Signal } from "../src/types.js";

const sample: Signal = {
  eventId: "test:1:BUY_SIGNAL",
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
  quality: 85,
  timestamp: 1793332800000,
  h1Trend: "Bullish",
};

// Test adapter only. Production storage must implement acceptUnique with a
// durable unique key and a transaction; this in-memory fixture makes no such claim.
class TestRepository implements OutboxRepository {
  records = new Map<string, OutboxRecord>();
  quarantine: { source: string; eventId: string; existingSha256: string; incomingSha256: string }[] = [];
  async acceptUnique(proposed: OutboxRecord): Promise<AtomicAcceptResult> {
    const key = `${proposed.source}\0${proposed.eventId}`;
    const existing = this.records.get(key);
    if (!existing) {
      this.records.set(key, proposed);
      return { kind: "inserted", record: proposed };
    }
    if (existing.payloadSha256 === proposed.payloadSha256)
      return { kind: "duplicate", record: existing };
    this.quarantine.push({
      source: proposed.source,
      eventId: proposed.eventId,
      existingSha256: existing.payloadSha256,
      incomingSha256: proposed.payloadSha256,
    });
    return {
      kind: "collision_quarantined",
      record: existing,
      quarantine: {
        existingPayloadSha256: existing.payloadSha256,
        incomingPayloadSha256: proposed.payloadSha256,
        detectedAt: proposed.updatedAt,
      },
    };
  }
}

describe("durable outbox acceptance contract", () => {
  it("hashes semantically identical payloads independent of object key order", () => {
    const reversed = Object.fromEntries(Object.entries(sample).reverse()) as Signal;
    expect(payloadSha256(sample)).toBe(payloadSha256(reversed));
    expect(payloadSha256(sample)).toBe(payloadSha256({ ...sample, reason: undefined }));
  });

  it("queues the first source/eventId once without performing delivery", async () => {
    const repository = new TestRepository();
    const result = await enqueueSignal(repository, "tradingview", sample, 1000);
    expect(result.kind).toBe("queued");
    expect(result.record).toMatchObject({
      source: "tradingview",
      eventId: sample.eventId,
      state: "queued",
      attemptCount: 0,
      firstSeenAt: 1000,
    });
    expect(repository.records.size).toBe(1);
  });

  it("returns the existing record for an identical duplicate", async () => {
    const repository = new TestRepository();
    const first = await enqueueSignal(repository, "tradingview", sample, 1000);
    const second = await enqueueSignal(repository, "tradingview", sample, 2000);
    expect(first.kind).toBe("queued");
    expect(second).toMatchObject({ kind: "duplicate", record: { firstSeenAt: 1000 } });
    expect(repository.records.size).toBe(1);
  });

  it("quarantines the same key with a different canonical payload", async () => {
    const repository = new TestRepository();
    await enqueueSignal(repository, "tradingview", sample, 1000);
    const collision = await enqueueSignal(repository, "tradingview", { ...sample, entry: 100.5 }, 2000);
    expect(collision.kind).toBe("collision_quarantined");
    expect(collision.record.payloadSha256).toBe(payloadSha256(sample));
    expect(repository.quarantine).toEqual([{
      source: "tradingview",
      eventId: sample.eventId,
      existingSha256: payloadSha256(sample),
      incomingSha256: payloadSha256({ ...sample, entry: 100.5 }),
    }]);
  });

  it("scopes idempotency by source as well as event ID", async () => {
    const repository = new TestRepository();
    expect((await enqueueSignal(repository, "tradingview-a", sample, 1000)).kind).toBe("queued");
    expect((await enqueueSignal(repository, "tradingview-b", sample, 1000)).kind).toBe("queued");
    expect(repository.records.size).toBe(2);
  });

  it("does not accept invalid source or clock values", async () => {
    const repository = new TestRepository();
    await expect(enqueueSignal(repository, "  ", sample, 1000)).rejects.toThrow("source");
    await expect(enqueueSignal(repository, "tradingview", { ...sample, eventId: " " }, 1000)).rejects.toThrow("webhook payload contract");
    await expect(enqueueSignal(repository, "tradingview", sample, -1)).rejects.toThrow("timestamp");
    await expect(enqueueSignal(repository, "tradingview", { ...sample, tp1: 98 }, 1000)).rejects.toThrow("webhook payload contract");
  });
});

describe("delivery outcome and retry policy", () => {
  const policy = { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000, jitterRatio: 0.2 };

  it("marks a Telegram acknowledgement as sent", () => {
    expect(decideDelivery({ kind: "accepted", messageId: 123 }, 1, 10, { policy })).toEqual({
      state: "sent",
      messageId: 123,
    });
  });

  it("honors Telegram retry_after even when it exceeds the local backoff cap", () => {
    expect(decideDelivery({ kind: "http_error", status: 429, retryAfterSeconds: 3 }, 1, 100, { policy })).toEqual({
      state: "retry_scheduled",
      retryAt: 3100,
      delayMs: 3000,
    });
    expect(decideDelivery({ kind: "http_error", status: 429, retryAfterSeconds: 60 }, 1, 100, { policy })).toMatchObject({
      state: "retry_scheduled",
      retryAt: 60100,
      delayMs: 60000,
    });
  });

  it("accepts a zero server delay but rejects unsafe retry timestamps", () => {
    expect(decideDelivery({ kind: "http_error", status: 429, retryAfterSeconds: 0 }, 1, 100, { policy }))
      .toMatchObject({ state: "retry_scheduled", retryAt: 100, delayMs: 0 });
    expect(() => decideDelivery({ kind: "http_error", status: 429, retryAfterSeconds: 1 }, 1, Number.MAX_SAFE_INTEGER, { policy }))
      .toThrow("safe integer");
    expect(() => decideDelivery({ kind: "http_error", status: 429, retryAfterSeconds: Number.MAX_VALUE }, 1, 1, { policy }))
      .toThrow("retryAfterSeconds");
  });

  it("uses bounded exponential backoff with deterministic jitter for 5xx", () => {
    expect(decideDelivery({ kind: "http_error", status: 503 }, 2, 100, { policy, random: () => 1 })).toEqual({
      state: "retry_scheduled",
      retryAt: 2500,
      delayMs: 2400,
    });
    expect(decideDelivery({ kind: "http_error", status: 503 }, 3, 100, { policy, random: () => 0.5 })).toMatchObject({
      state: "dead_lettered",
    });
  });

  it("retries only transport failures known to happen before send", () => {
    expect(decideDelivery({ kind: "transport_error", requestMayHaveReachedTelegram: false }, 1, 100, { policy, random: () => 0.5 })).toMatchObject({
      state: "retry_scheduled",
      retryAt: 1100,
    });
    expect(decideDelivery({ kind: "transport_error", requestMayHaveReachedTelegram: true }, 1, 100, { policy })).toMatchObject({
      state: "ambiguous",
    });
  });

  it("dead-letters permanent HTTP failures and exhausted retries", () => {
    expect(decideDelivery({ kind: "http_error", status: 400 }, 1, 100, { policy })).toMatchObject({ state: "dead_lettered" });
    expect(decideDelivery({ kind: "http_error", status: 503 }, 3, 100, { policy, random: () => 0.5 })).toMatchObject({ state: "dead_lettered" });
  });

  it("rejects invalid attempt counts and retry policies", () => {
    expect(() => decideDelivery({ kind: "http_error", status: 503 }, 0, 100, { policy })).toThrow("attemptCount");
    expect(() => decideDelivery({ kind: "http_error", status: 503 }, 1, 100, { policy: { ...policy, jitterRatio: 2 } })).toThrow("jitterRatio");
    expect(() => decideDelivery({ kind: "http_error", status: 503 }, Number.MAX_SAFE_INTEGER + 1, 100, { policy })).toThrow("attemptCount");
    expect(() => decideDelivery({ kind: "http_error", status: 503 }, 1, 100, { policy: { ...policy, baseDelayMs: 0 } })).toThrow("baseDelayMs");
    expect(() => decideDelivery({ kind: "http_error", status: 503 }, 1, 100, { policy: { ...policy, maxDelayMs: Number.MAX_VALUE } })).toThrow("maxDelayMs");
  });
});
