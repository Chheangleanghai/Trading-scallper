import { createHash } from "node:crypto";
import type { Signal } from "./types.js";

export type DeliveryState =
  | "queued"
  | "processing"
  | "sent"
  | "failed"
  | "retry_scheduled"
  | "ambiguous"
  | "dead_lettered";

export interface OutboxRecord {
  source: string;
  eventId: string;
  payloadSha256: string;
  payload: Signal;
  state: "queued";
  attemptCount: 0;
  firstSeenAt: number;
  updatedAt: number;
}

export type AtomicAcceptResult =
  | { kind: "inserted"; record: OutboxRecord }
  | { kind: "duplicate"; record: OutboxRecord }
  | {
      kind: "collision_quarantined";
      record: OutboxRecord;
      quarantine: {
        existingPayloadSha256: string;
        incomingPayloadSha256: string;
        detectedAt: number;
      };
    };

/**
 * A production implementation must back this operation with a durable unique
 * constraint on (source,eventId) and perform duplicate/collision handling
 * atomically. On a conflicting digest, it must durably quarantine the incoming
 * payload/digest and existing digest without replacing the original event.
 * This interface deliberately has no process-local implementation.
 */
export interface OutboxRepository {
  acceptUnique(record: OutboxRecord): Promise<AtomicAcceptResult>;
}

export type EnqueueResult =
  | { kind: "queued"; record: OutboxRecord }
  | { kind: "duplicate"; record: OutboxRecord }
  | {
      kind: "collision_quarantined";
      record: OutboxRecord;
      quarantine: {
        existingPayloadSha256: string;
        incomingPayloadSha256: string;
        detectedAt: number;
      };
    };

function canonical(value: unknown, arrayItem = false): string {
  if (value === undefined) return arrayItem ? "null" : "";
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item, true)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("payload contains a non-JSON value");
  return serialized;
}

export function payloadSha256(signal: Signal): string {
  return createHash("sha256").update(canonical(signal)).digest("hex");
}

/**
 * Build a durable outbox record. No Telegram I/O occurs here. Repeated keys
 * and conflicting payloads are resolved by the repository's atomic operation.
 */
export async function enqueueSignal(
  repository: OutboxRepository,
  source: string,
  signal: Signal,
  now = Date.now(),
): Promise<EnqueueResult> {
  if (!source.trim()) throw new Error("source is required");
  if (!signal.eventId.trim()) throw new Error("eventId is required");
  if (!Number.isSafeInteger(now) || now < 0)
    throw new Error("now must be a non-negative integer timestamp");

  const proposed: OutboxRecord = {
    source: source.trim(),
    eventId: signal.eventId,
    payloadSha256: payloadSha256(signal),
    payload: structuredClone(signal),
    state: "queued",
    attemptCount: 0,
    firstSeenAt: now,
    updatedAt: now,
  };
  const result = await repository.acceptUnique(proposed);
  if (result.kind === "inserted") return { kind: "queued", record: result.record };
  if (result.kind === "duplicate") {
    if (result.record.payloadSha256 !== proposed.payloadSha256)
      throw new Error("repository returned duplicate for conflicting payload");
    return { kind: "duplicate", record: result.record };
  }
  if (result.record.payloadSha256 === proposed.payloadSha256)
    throw new Error("repository quarantined an identical duplicate payload");
  if (
    result.quarantine.existingPayloadSha256 !== result.record.payloadSha256 ||
    result.quarantine.incomingPayloadSha256 !== proposed.payloadSha256
  )
    throw new Error("repository returned an invalid collision quarantine record");
  return { kind: "collision_quarantined", record: result.record, quarantine: result.quarantine };
}

export type TelegramOutcome =
  | { kind: "accepted"; messageId?: string | number }
  | { kind: "http_error"; status: number; retryAfterSeconds?: number }
  | { kind: "transport_error"; requestMayHaveReachedTelegram: boolean };

export type DeliveryDecision =
  | { state: "sent"; messageId?: string | number }
  | { state: "retry_scheduled"; retryAt: number; delayMs: number }
  | { state: "ambiguous"; reason: string }
  | { state: "dead_lettered"; reason: string };

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
}

const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 15 * 60_000,
  jitterRatio: 0.2,
};

function validateRetryPolicy(policy: RetryPolicy): void {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1)
    throw new Error("maxAttempts must be a positive integer");
  if (!Number.isFinite(policy.baseDelayMs) || policy.baseDelayMs < 1)
    throw new Error("baseDelayMs must be positive");
  if (!Number.isFinite(policy.maxDelayMs) || policy.maxDelayMs < policy.baseDelayMs)
    throw new Error("maxDelayMs must be at least baseDelayMs");
  if (!Number.isFinite(policy.jitterRatio) || policy.jitterRatio < 0 || policy.jitterRatio > 1)
    throw new Error("jitterRatio must be between 0 and 1");
}

function retryDecision(
  attemptCount: number,
  now: number,
  policy: RetryPolicy,
  random: () => number,
  explicitDelayMs?: number,
): DeliveryDecision {
  if (attemptCount >= policy.maxAttempts)
    return { state: "dead_lettered", reason: "retry limit exhausted" };
  let delayMs: number;
  if (explicitDelayMs !== undefined) {
    delayMs = Math.min(policy.maxDelayMs, Math.max(0, explicitDelayMs));
  } else {
    const exponential = Math.min(
      policy.maxDelayMs,
      policy.baseDelayMs * 2 ** Math.min(attemptCount - 1, 30),
    );
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample > 1)
      throw new Error("random must return a number between 0 and 1");
    const jitter = exponential * policy.jitterRatio * (sample * 2 - 1);
    delayMs = Math.min(policy.maxDelayMs, Math.max(0, Math.round(exponential + jitter)));
  }
  return { state: "retry_scheduled", retryAt: now + delayMs, delayMs };
}

/** Pure decision policy for an outbox worker; never sends or retries by itself. */
export function decideDelivery(
  outcome: TelegramOutcome,
  attemptCount: number,
  now: number,
  options: { policy?: RetryPolicy; random?: () => number } = {},
): DeliveryDecision {
  const policy = options.policy ?? defaultRetryPolicy;
  validateRetryPolicy(policy);
  if (!Number.isInteger(attemptCount) || attemptCount < 1)
    throw new Error("attemptCount must be a positive integer");
  if (!Number.isSafeInteger(now) || now < 0)
    throw new Error("now must be a non-negative integer timestamp");

  if (outcome.kind === "accepted")
    return { state: "sent", ...(outcome.messageId === undefined ? {} : { messageId: outcome.messageId }) };
  if (outcome.kind === "transport_error" && outcome.requestMayHaveReachedTelegram)
    return { state: "ambiguous", reason: "request outcome is unknown; automatic retry could duplicate a message" };

  if (outcome.kind === "http_error") {
    if (!Number.isInteger(outcome.status) || outcome.status < 100 || outcome.status > 599)
      throw new Error("invalid HTTP status");
    if (outcome.status === 429) {
      const seconds = outcome.retryAfterSeconds;
      if (seconds !== undefined && (!Number.isFinite(seconds) || seconds < 0))
        throw new Error("retryAfterSeconds must be non-negative");
      return retryDecision(attemptCount, now, policy, options.random ?? Math.random,
        seconds === undefined ? undefined : seconds * 1000);
    }
    if (outcome.status >= 500)
      return retryDecision(attemptCount, now, policy, options.random ?? Math.random);
    return { state: "dead_lettered", reason: `non-retryable Telegram HTTP ${outcome.status}` };
  }

  return retryDecision(attemptCount, now, policy, options.random ?? Math.random);
}
