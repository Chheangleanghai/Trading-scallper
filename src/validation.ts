import { events, type Signal } from "./types.js";
export function validate(input: unknown): Signal {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected object");
  const v = input as Record<string, unknown>;
  for (const key of ["eventId", "symbol", "timeframe", "strategy", "h1Trend"]) {
    if (
      typeof v[key] !== "string" ||
      !(v[key] as string).trim() ||
      (v[key] as string).length > (key === "eventId" ? 384 : 120) ||
      /[\x00-\x1f]/.test(v[key] as string)
    )
      throw new Error(`Invalid ${key}`);
  }
  if (
    !events.includes(v.eventType as Signal["eventType"]) ||
    !["BUY", "SELL"].includes(v.direction as string)
  )
    throw new Error("Invalid event/direction");
  for (const key of [
    "entry",
    "sl",
    "tp1",
    "tp2",
    "tp3",
    "quality",
    "timestamp",
  ])
    if (typeof v[key] !== "number" || !Number.isFinite(v[key]))
      throw new Error(`Invalid ${key}`);
  const s = v as unknown as Signal;
  if (
    [s.entry, s.sl, s.tp1, s.tp2, s.tp3].some((n) => n <= 0) ||
    s.quality < 0 ||
    s.quality > 100 ||
    !Number.isSafeInteger(s.timestamp) ||
    s.timestamp <= 0 ||
    s.timestamp > 4102444800000
  )
    throw new Error("Invalid numeric range");
  if (
    s.direction === "BUY"
      ? !(s.sl < s.entry && s.entry < s.tp1 && s.tp1 < s.tp2 && s.tp2 < s.tp3)
      : !(s.sl > s.entry && s.entry > s.tp1 && s.tp1 > s.tp2 && s.tp2 > s.tp3)
  )
    throw new Error("Invalid price ordering");
  if (
    (s.eventType === "BUY_SIGNAL" && s.direction !== "BUY") ||
    (s.eventType === "SELL_SIGNAL" && s.direction !== "SELL")
  )
    throw new Error("Direction mismatch");
  for (const key of ["targetSource"] as const) {
    const value = s[key];
    if (
      value !== undefined &&
      (typeof value !== "string" ||
        !value.trim() ||
        value.length > 120 ||
        /[\x00-\x1f]/.test(value))
    )
      throw new Error(`Invalid ${key}`);
  }
  for (const key of [
    "invalidation",
    "signalPrice",
    "managedSl",
    "filledEntry",
  ] as const) {
    const value = s[key];
    if (
      value !== undefined &&
      !(key === "filledEntry" && value === null) &&
      (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    )
      throw new Error(`Invalid ${key}`);
  }
  for (const key of ["setupTimestamp", "eventTimestamp"] as const) {
    const value = s[key];
    if (
      value !== undefined &&
      (typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value <= 0 ||
        value > 4102444800000)
    )
      throw new Error(`Invalid ${key}`);
  }
  if (s.setupTimestamp !== undefined && s.setupTimestamp > s.timestamp)
    throw new Error("Setup follows confirmation");
  if (s.eventTimestamp !== undefined && s.eventTimestamp < s.timestamp)
    throw new Error("Event precedes confirmation");
  if (
    s.entryMode !== undefined &&
    !["Close", "Limit", "Breakout"].includes(s.entryMode)
  )
    throw new Error("Invalid entry mode");
  if (
    s.executionModel !== undefined &&
    !["INDICATOR_ESTIMATE", "STRATEGY_EMULATOR"].includes(s.executionModel)
  )
    throw new Error("Invalid execution model");
  if (
    s.status !== undefined &&
    ![
      "DETECTED",
      "WAITING_CONFIRMATION",
      "CONFIRMED",
      "ENTRY_PENDING",
      "ENTRY_TRIGGERED",
      "INVALIDATED",
      "EXPIRED",
      "CLOSED",
    ].includes(s.status)
  )
    throw new Error("Invalid status");
  return s;
}
