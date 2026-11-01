import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { spawnSync } from "node:child_process";
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
        expect((await enqueueSignal(restarted, "tradingview", signal, 1500)).kind).toBe("duplicate");
        const result = await deliverNext(restarted, async () => ({ kind: "accepted", messageId: 456 }), 2000, { clock: () => 2001 });
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
        { policy: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000, jitterRatio: 0 }, clock: () => 2000 });
      expect(result).toMatchObject({ kind: "processed", decision: { state: "retry_scheduled", retryAt: 62000 } });
      expect(repo.claimNext(61999)).toBeUndefined();
      expect(repo.claimNext(62000)?.attemptCount).toBe(2);
    } finally { repo.close(); }
  });

  it("persists exhausted retries as dead-lettered", async () => {
    const { repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      const result = await deliverNext(repo, async () => ({ kind: "http_error", status: 503 }), 2000, {
        policy: { maxAttempts: 1, baseDelayMs: 1000, maxDelayMs: 5000, jitterRatio: 0 },
        clock: () => 2001,
      });
      expect(result).toMatchObject({ kind: "processed", decision: { state: "dead_lettered" } });
      expect(repo.inspect("tradingview", signal.eventId)).toMatchObject({ state: "dead_lettered", attemptCount: 1 });
    } finally { repo.close(); }
  });

  it("rejects an invalid retry policy before it claims or sends queued work", async () => {
    const { repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      const send = async () => { throw new Error("must not send"); };
      await expect(deliverNext(repo, send, 2000, {
        policy: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 5000, jitterRatio: 2 },
      })).rejects.toThrow("jitterRatio");
      expect(repo.inspect("tradingview", signal.eventId)).toMatchObject({ state: "queued", attemptCount: 0 });
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

  it("bounds repeated pre-send crash recovery by the configured attempt limit", async () => {
    const { repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      expect(repo.claimNext(2000, 10, 2)?.attemptCount).toBe(1);
      expect(repo.claimNext(2010, 10, 2)?.attemptCount).toBe(2);
      expect(repo.claimNext(2020, 10, 2)).toBeUndefined();
      expect(repo.inspect("tradingview", signal.eventId)).toMatchObject({
        state: "dead_lettered", attemptCount: 2,
        lastError: "retry limit exhausted during claim recovery",
      });
    } finally { repo.close(); }
  });

  it("lets only one concurrent worker on independent SQLite connections claim a ready event", async () => {
    const { root, repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      repo.close();
      const compiled = join(root, "compiled");
      const tsc = spawnSync(process.execPath, [resolve("node_modules/typescript/bin/tsc"), "--outDir", compiled, "--noEmit", "false"], { encoding: "utf8" });
      expect(tsc.status).toBe(0);
      writeFileSync(join(compiled, "package.json"), '{"type":"module"}');
      const moduleUrl = pathToFileURL(join(compiled, "src/local-outbox.js")).href;
      const workerUrl = new URL("./fixtures/claim-worker.mjs", import.meta.url);
      const workers = [1, 2].map(() => new Worker(workerUrl, {
        workerData: { moduleUrl, databasePath: join(root, "outbox.sqlite"), claimTime: 2000 },
      }));
      try {
        const ready = workers.map((worker) => new Promise<void>((resolveReady, reject) => {
          worker.once("message", (message) => message?.ready ? resolveReady() : reject(new Error("worker failed to initialize")));
          worker.once("error", reject);
        }));
        await Promise.all(ready);
        const claims = workers.map((worker) => new Promise<string | null>((resolveClaim, reject) => {
          worker.once("message", (message) => resolveClaim(message?.eventId ?? null));
          worker.once("error", reject);
        }));
        for (const worker of workers) worker.postMessage("claim");
        expect((await Promise.all(claims)).filter(Boolean)).toEqual([signal.eventId]);
      } finally { await Promise.all(workers.map((worker) => worker.terminate())); }
    } finally { try { repo.close(); } catch { /* closed before worker race */ } }
  });

  it("rejects stale ownership and refuses a late completion after lease expiry", async () => {
    const { repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      const oldClaim = repo.claimNext(2000, 10)!;
      const currentClaim = repo.claimNext(2010, 10)!;
      expect(repo.markSendStarted(oldClaim, 2011)).toBe(false);
      expect(repo.finishClaim(oldClaim, { state: "sent", messageId: 123 }, 2011)).toBe(false);
      expect(repo.markSendStarted(currentClaim, 2011)).toBe(true);
      expect(repo.markSendStarted(currentClaim, 2012)).toBe(false);
      expect(repo.finishClaim(currentClaim, { state: "sent", messageId: 123 }, 2020)).toBe(false);
      expect(repo.claimNext(2020, 10)).toBeUndefined();
      expect(repo.inspect("tradingview", signal.eventId)?.state).toBe("ambiguous");
    } finally { repo.close(); }
  });

  it("does not allow a claimed but not send-started event to be marked sent", async () => {
    const { repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      const claim = repo.claimNext(2000, 100)!;
      expect(repo.finishClaim(claim, { state: "sent", messageId: 123 }, 2001)).toBe(false);
      expect(repo.inspect("tradingview", signal.eventId)).toMatchObject({ state: "processing", attemptCount: 1 });
      expect(repo.markSendStarted(claim, 2001)).toBe(true);
      expect(repo.finishClaim(claim, { state: "sent", messageId: 123 }, 2002)).toBe(true);
      expect(repo.inspect("tradingview", signal.eventId)).toMatchObject({ state: "sent", attemptCount: 1 });
    } finally { repo.close(); }
  });

  it("uses response time for a slow Telegram request and marks an expired response lease lost", async () => {
    const { repo } = open();
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      const result = await deliverNext(repo, async () => ({ kind: "accepted", messageId: 789 }), 2000,
        { leaseMs: 10, clock: () => 2010 });
      expect(result.kind).toBe("lease_lost");
      expect(repo.claimNext(2010, 10)).toBeUndefined();
      expect(repo.inspect("tradingview", signal.eventId)?.state).toBe("ambiguous");
    } finally { repo.close(); }
  });

  it("does not acknowledge failed persistence and remains recoverable after the database fault is removed", async () => {
    const { root, repo } = open();
    const fault = new DatabaseSync(join(root, "outbox.sqlite"));
    try {
      fault.exec(`CREATE TRIGGER reject_outbox_insert BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'injected persistence fault'); END`);
      await expect(enqueueSignal(repo, "tradingview", signal, 1000)).rejects.toThrow("injected persistence fault");
      fault.exec("DROP TRIGGER reject_outbox_insert");
      expect((await enqueueSignal(repo, "tradingview", signal, 1001)).kind).toBe("queued");
      expect(repo.inspect("tradingview", signal.eventId)?.state).toBe("queued");
    } finally { fault.close(); repo.close(); }
  });

  it("survives a collision-quarantine persistence fault without replacing the accepted event", async () => {
    const { root, repo } = open();
    const fault = new DatabaseSync(join(root, "outbox.sqlite"));
    try {
      await enqueueSignal(repo, "tradingview", signal, 1000);
      fault.exec(`CREATE TRIGGER reject_quarantine BEFORE INSERT ON collision_quarantine BEGIN SELECT RAISE(ABORT, 'injected quarantine fault'); END`);
      await expect(enqueueSignal(repo, "tradingview", { ...signal, entry: 100.5 }, 1001)).rejects.toThrow("injected quarantine fault");
      expect(repo.inspect("tradingview", signal.eventId)?.payload.entry).toBe(100);
      fault.exec("DROP TRIGGER reject_quarantine");
      expect((await enqueueSignal(repo, "tradingview", { ...signal, entry: 100.5 }, 1002)).kind).toBe("collision_quarantined");
      expect(repo.quarantineCount()).toBe(1);
    } finally { fault.close(); repo.close(); }
  });

  it("waits for SQLite busy timeout and then succeeds once the lock is released", async () => {
    const { root, repo: unused } = open();
    const repo = new LocalSqliteOutbox(join(root, "outbox.sqlite"), 20);
    const locker = new DatabaseSync(join(root, "outbox.sqlite"));
    try {
      locker.exec("BEGIN IMMEDIATE");
      expect(() => repo.claimNext(2000)).toThrow(/database is locked|database is busy/i);
      locker.exec("COMMIT");
      expect(await enqueueSignal(repo, "tradingview", signal, 1000)).toMatchObject({ kind: "queued" });
    } finally { locker.close(); repo.close(); unused.close(); }
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
      const result = await deliverNext(repo, async () => { throw new Error("socket closed"); }, 2000, { clock: () => 2001 });
      expect(result).toMatchObject({ kind: "processed", decision: { state: "ambiguous" } });
      expect(repo.claimNext(1_000_000)).toBeUndefined();
    } finally { repo.close(); }
  });
});
