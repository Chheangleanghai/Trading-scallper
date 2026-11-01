import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Signal } from "./types.js";
import {
  decideDelivery,
  validateRetryPolicy,
  type AtomicAcceptResult,
  type DeliveryState,
  type DeliveryDecision,
  type OutboxRecord,
  type OutboxRepository,
  type RetryPolicy,
  type TelegramOutcome,
} from "./delivery.js";

export interface ClaimedOutboxRecord extends OutboxRecord {
  state: "processing";
  attemptCount: number;
  leaseToken: string;
  leaseUntil: number;
}

type MaybePromise<T> = T | Promise<T>;

/** Portable worker contract. A remote production adapter can implement these
 * transitions asynchronously while the local SQLite adapter stays synchronous. */
export interface WorkerOutboxRepository extends OutboxRepository {
  claimNext(now: number, leaseMs: number | undefined, maxAttempts: number): MaybePromise<ClaimedOutboxRecord | undefined>;
  markSendStarted(claim: ClaimedOutboxRecord, now: number): MaybePromise<boolean>;
  finishClaim(claim: ClaimedOutboxRecord, decision: DeliveryDecision, now: number): MaybePromise<boolean>;
}

/**
 * Local SQLite outbox for development/research. Its atomic uniqueness and
 * state transitions survive process restarts, but local disk is not a
 * production serverless store and this adapter is intentionally not wired to
 * api/webhook.ts.
 */
export class LocalSqliteOutbox implements WorkerOutboxRepository {
  private readonly db: DatabaseSync;

  constructor(path: string, busyTimeoutMs = 5_000) {
    if (!Number.isSafeInteger(busyTimeoutMs) || busyTimeoutMs < 0 || busyTimeoutMs > 60_000)
      throw new Error("busyTimeoutMs must be an integer from 0 to 60000");
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA busy_timeout = ${busyTimeoutMs};
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS outbox (
        source TEXT NOT NULL,
        event_id TEXT NOT NULL,
        payload_sha256 TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('queued','processing','sent','failed','retry_scheduled','ambiguous','dead_lettered')),
        attempt_count INTEGER NOT NULL,
        first_seen_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        next_attempt_at INTEGER,
        lease_token TEXT,
        lease_until INTEGER,
        send_started INTEGER NOT NULL DEFAULT 0,
        message_id TEXT,
        last_error TEXT,
        PRIMARY KEY (source, event_id)
      );
      CREATE INDEX IF NOT EXISTS outbox_ready ON outbox(state, next_attempt_at, first_seen_at);
      CREATE TABLE IF NOT EXISTS collision_quarantine (
        id INTEGER PRIMARY KEY,
        source TEXT NOT NULL,
        event_id TEXT NOT NULL,
        existing_sha256 TEXT NOT NULL,
        incoming_sha256 TEXT NOT NULL,
        incoming_payload_json TEXT NOT NULL,
        detected_at INTEGER NOT NULL
      );
    `);
  }

  close(): void { this.db.close(); }

  async acceptUnique(record: OutboxRecord): Promise<AtomicAcceptResult> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.db.prepare(
        "SELECT * FROM outbox WHERE source = ? AND event_id = ?",
      ).get(record.source, record.eventId) as DbRow | undefined;
      if (!existing) {
        this.db.prepare(`INSERT INTO outbox
          (source,event_id,payload_sha256,payload_json,state,attempt_count,first_seen_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?)`).run(
          record.source, record.eventId, record.payloadSha256, JSON.stringify(record.payload),
          "queued", 0, record.firstSeenAt, record.updatedAt,
        );
        this.db.exec("COMMIT");
        return { kind: "inserted", record };
      }
      const stored = toOutboxRecord(existing);
      if (stored.payloadSha256 === record.payloadSha256) {
        this.db.exec("COMMIT");
        return { kind: "duplicate", record: stored };
      }
      this.db.prepare(`INSERT INTO collision_quarantine
        (source,event_id,existing_sha256,incoming_sha256,incoming_payload_json,detected_at)
        VALUES (?,?,?,?,?,?)`).run(
        record.source, record.eventId, stored.payloadSha256, record.payloadSha256,
        JSON.stringify(record.payload), record.updatedAt,
      );
      this.db.exec("COMMIT");
      return {
        kind: "collision_quarantined", record: stored,
        quarantine: {
          existingPayloadSha256: stored.payloadSha256,
          incomingPayloadSha256: record.payloadSha256,
          detectedAt: record.updatedAt,
        },
      };
    } catch (error) {
      this.rollbackQuietly();
      throw error;
    }
  }

  /** Claim one ready item under an immediate write transaction. Expired work
   * before request start is safe to queue again; after request start it is
   * ambiguous and is quarantined from automatic retries to avoid duplicates. */
  claimNext(now: number, leaseMs = 30_000, maxAttempts = 5): ClaimedOutboxRecord | undefined {
    validateClock(now);
    if (!Number.isSafeInteger(leaseMs) || leaseMs < 1 || !Number.isSafeInteger(now + leaseMs))
      throw new Error("leaseMs must produce a positive safe lease timestamp");
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1)
      throw new Error("maxAttempts must be a positive safe integer");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(`UPDATE outbox SET
        state = CASE WHEN send_started = 1 THEN 'ambiguous' ELSE 'queued' END,
        last_error = CASE WHEN send_started = 1 THEN 'worker lease expired after request start; outcome unknown' ELSE last_error END,
        lease_token = NULL, lease_until = NULL, send_started = 0, updated_at = ?
        WHERE state = 'processing' AND lease_until <= ?`).run(now, now);
      this.db.prepare(`UPDATE outbox SET state='dead_lettered', updated_at=?,
        last_error='retry limit exhausted during claim recovery', next_attempt_at=NULL
        WHERE state IN ('queued','retry_scheduled') AND attempt_count >= ?`).run(now, maxAttempts);
      const row = this.db.prepare(`SELECT * FROM outbox
        WHERE state IN ('queued','retry_scheduled')
          AND attempt_count < ? AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
        ORDER BY first_seen_at, source, event_id LIMIT 1`).get(maxAttempts, now) as DbRow | undefined;
      if (!row) { this.db.exec("COMMIT"); return undefined; }
      const token = randomUUID();
      const until = now + leaseMs;
      const updated = this.db.prepare(`UPDATE outbox SET state='processing', attempt_count=attempt_count+1,
        updated_at=?, lease_token=?, lease_until=?, send_started=0
        WHERE source=? AND event_id=? AND state IN ('queued','retry_scheduled') AND attempt_count < ?`)
        .run(now, token, until, row.source, row.event_id, maxAttempts);
      if (Number(updated.changes) !== 1) throw new Error("outbox claim lost its atomic row transition");
      const claimed = this.db.prepare("SELECT * FROM outbox WHERE source=? AND event_id=?")
        .get(row.source, row.event_id) as DbRow;
      this.db.exec("COMMIT");
      return { ...toOutboxRecord(claimed), state: "processing", attemptCount: Number(claimed.attempt_count), leaseToken: token, leaseUntil: until };
    } catch (error) { this.rollbackQuietly(); throw error; }
  }

  markSendStarted(claim: ClaimedOutboxRecord, now: number): boolean {
    validateClock(now);
    if (now < claim.updatedAt) throw new Error("send start clock precedes claim time");
    const result = this.db.prepare(`UPDATE outbox SET send_started=1, updated_at=?
      WHERE source=? AND event_id=? AND state='processing' AND send_started=0
        AND lease_token=? AND updated_at<=? AND lease_until>?`)
      .run(now, claim.source, claim.eventId, claim.leaseToken, now, now);
    return Number(result.changes) === 1;
  }

  finishClaim(claim: ClaimedOutboxRecord, decision: DeliveryDecision, now: number): boolean {
    validateClock(now);
    if (now < claim.updatedAt) throw new Error("completion clock precedes claim time");
    const state = decision.state;
    const retryAt = decision.state === "retry_scheduled" ? decision.retryAt : null;
    const messageId = decision.state === "sent" && decision.messageId !== undefined ? String(decision.messageId) : null;
    const detail = decision.state === "sent" ? null : decision.state === "retry_scheduled" ? null : decision.reason;
    const result = this.db.prepare(`UPDATE outbox SET state=?, updated_at=?, next_attempt_at=?,
      lease_token=NULL, lease_until=NULL, send_started=0, message_id=?, last_error=?
      WHERE source=? AND event_id=? AND state='processing' AND send_started=1
        AND lease_token=? AND updated_at<=? AND lease_until>?`)
      .run(state, now, retryAt, messageId, detail, claim.source, claim.eventId, claim.leaseToken, now, now);
    return Number(result.changes) === 1;
  }

  inspect(source: string, eventId: string): (OutboxRecord & { nextAttemptAt?: number; lastError?: string }) | undefined {
    const row = this.db.prepare("SELECT * FROM outbox WHERE source=? AND event_id=?").get(source, eventId) as DbRow | undefined;
    if (!row) return undefined;
    return {
      ...toOutboxRecord(row),
      ...(row.next_attempt_at === null ? {} : { nextAttemptAt: Number(row.next_attempt_at) }),
      ...(row.last_error === null ? {} : { lastError: String(row.last_error) }),
    };
  }

  quarantineCount(): number {
    return Number((this.db.prepare("SELECT COUNT(*) AS count FROM collision_quarantine").get() as { count: number }).count);
  }

  private rollbackQuietly(): void {
    try { this.db.exec("ROLLBACK"); } catch { /* Preserve the original storage failure. */ }
  }
}

export async function deliverNext(
  repository: WorkerOutboxRepository,
  send: (payload: Signal) => Promise<TelegramOutcome>,
  now: number,
  options: { leaseMs?: number; policy?: RetryPolicy; random?: () => number; clock?: () => number } = {},
): Promise<{ kind: "idle" } | { kind: "lease_lost" } | { kind: "processed"; decision: DeliveryDecision }> {
  if (options.policy) validateRetryPolicy(options.policy);
  const maxAttempts = options.policy?.maxAttempts ?? 5;
  const claim = await repository.claimNext(now, options.leaseMs, maxAttempts);
  if (!claim) return { kind: "idle" };
  if (!await repository.markSendStarted(claim, now)) return { kind: "lease_lost" };
  let outcome: TelegramOutcome;
  try { outcome = await send(claim.payload); }
  catch { outcome = { kind: "transport_error", requestMayHaveReachedTelegram: true }; }
  const completedAt = (options.clock ?? Date.now)();
  const decision = decideDelivery(outcome, claim.attemptCount, completedAt, options);
  if (!await repository.finishClaim(claim, decision, completedAt)) return { kind: "lease_lost" };
  return { kind: "processed", decision };
}

type DbRow = Record<string, unknown> & {
  source: string; event_id: string; payload_sha256: string; payload_json: string;
  state: string; attempt_count: number; first_seen_at: number; updated_at: number;
  next_attempt_at: number | null; lease_token: string | null; lease_until: number | null;
  send_started: number; message_id: string | null; last_error: string | null;
};

function toOutboxRecord(row: DbRow): OutboxRecord {
  return {
    source: row.source, eventId: row.event_id, payloadSha256: row.payload_sha256,
    payload: JSON.parse(row.payload_json) as Signal, state: row.state as DeliveryState,
    attemptCount: Number(row.attempt_count),
    firstSeenAt: Number(row.first_seen_at), updatedAt: Number(row.updated_at),
  };
}

function validateClock(now: number): void {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("now must be a non-negative integer timestamp");
}
