import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { enqueueSignal } from "../src/delivery.js";
import { deliverNext, LocalSqliteOutbox } from "../src/local-outbox.js";
import type { Signal } from "../src/types.js";

const signal: Signal = {
  eventId: "sqlite-test:1:BUY_SIGNAL", eventType: "BUY_SIGNAL", symbol: "FOREXCOM:XAUUSD",
  timeframe: "5", direction: "BUY", strategy: "A_SWEEP_MSS_FVG", entry: 100, sl: 99,
  tp1: 101, tp2: 102, tp3: 103, quality: 85, timestamp: 1793332800000, h1Trend: "Bullish",
};
const roots: string[] = [];
function open() {
  const root = mkdtempSync(join(tmpdir(), "xauusd-outbox-"));
  roots.push(root);
  return { root, repo: new LocalSqliteOutbox(join(root, "outbox.sqlite")) };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("local SQLite outbox integration", () => {
  it("persists unique acceptance across repository instances and quarantines collisions", async () => {
    const { root, repo } = open();
    try {
      const second = new LocalSqliteOutbox(join(root, "outbox.sqlite"));
      try {
        const results = await Promise.all([
          enqueueSignal(repo, "tradingview", signal, 1000),
          enqueueSignal(second, "tradingview", signal, 1001),
        ]);
        expect(results.map((result) => result.kind).sort()).toEqual(["duplicate", "queued"]);
        const collision = await enqueueSignal(second, "tradingview", { ...signal, entry: 100.5 }, 1002);
        expect(collision.kind).toBe("collision_quarantined");
        expect(second.quarantineCount()).toBe(1);
        expect(second.inspect("tradingview", signal.eventId)?.payload.entry).toBe(100);
      } finally { second.close(); }
    } finally { repo.close(); }
  });

  it("survives restart and records an acknowledgement", async () => {
    const { root, repo } = open();
    const db = join(root, "outbox.sqlite");
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      repo.close();
      const restarted = new LocalSqliteOutbox(db);
      try {
        const result = await deliverNext(restarted, async () => ({ kind: "accepted", messageId: 456 }), 2000);
        expect(result).toMatchObject({ kind: "processed", decision: { state: "sent", messageId: 456 } });
        expect(restarted.inspect("tradingview", signal.eventId)).toMatchObject({ state: "sent", attemptCount: 1 });
      } finally { restarted.close(); }
    } finally { try { repo.close(); } catch { /* already closed */ } }
  });

  it("schedules server-mandated 429 delay durably", async () => {
    const { repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      const result = await deliverNext(repo, async () => ({ kind: "http_error", status: 429, retryAfterSeconds: 60 }), 2000,
        { policy: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000, jitterRatio: 0 } });
      expect(result).toMatchObject({ kind: "processed", decision: { state: "retry_scheduled", retryAt: 62000 } });
      expect(repo.claimNext(61999)).toBeUndefined();
      expect(repo.claimNext(62000)?.attemptCount).toBe(2);
    } finally { repo.close(); }
  });

  it("requeues a lease that expired before request start", async () => {
    const { repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      expect(repo.claimNext(2000, 10)?.attemptCount).toBe(1);
      expect(repo.claimNext(2010, 10)?.attemptCount).toBe(2);
    } finally { repo.close(); }
  });

  it("moves an expired lease after request start to ambiguous instead of retrying", async () => {
    const { root, repo } = open();
    const db = join(root, "outbox.sqlite");
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      const claim = repo.claimNext(2000, 10)!;
      expect(repo.markSendStarted(claim, 2001)).toBe(true);
      repo.close();
      const restarted = new LocalSqliteOutbox(db);
      try {
        expect(restarted.claimNext(2010, 10)).toBeUndefined();
        expect(restarted.inspect("tradingview", signal.eventId)).toMatchObject({
          state: "ambiguous", attemptCount: 1,
          lastError: "worker lease expired after request start; outcome unknown",
        });
      } finally { restarted.close(); }
    } finally { try { repo.close(); } catch { /* already closed before simulated restart */ } }
  });

  it("treats a worker exception as ambiguous and does not automatically retry", async () => {
    const { repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      const result = await deliverNext(repo, async () => { throw new Error("socket closed"); }, 2000);
      expect(result).toMatchObject({ kind: "processed", decision: { state: "ambiguous" } });
      expect(repo.claimNext(1_000_000)).toBeUndefined();
    } finally { repo.close(); }
  });
});
