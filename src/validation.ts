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
  // Legacy producers may omit status. When present, it must agree with an
  // entry notification: a detected/pending/cancelled plan is not an entry.
  if (s.status !== undefined) {
    if (
      ["BUY_SIGNAL", "SELL_SIGNAL"].includes(s.eventType) &&
      !["CONFIRMED", "ENTRY_TRIGGERED"].includes(s.status)
    )
      throw new Error("Signal is not confirmed");
    if (s.eventType === "ENTRY_TRIGGERED" && s.status !== "ENTRY_TRIGGERED")
      throw new Error("Entry event/status mismatch");
  }
  for (const [key, limit] of [["reason", 600], ["setupProgress", 300], ["scriptVersion", 32]] as const) {
    const value = s[key];
    if (value !== undefined && (typeof value !== "string" || !value.trim() || value.length > limit || /[\x00-\x1f]/.test(value)))
      throw new Error(`Invalid ${key}`);
  }
  if (s.alignment !== undefined && !["ALIGNED", "COUNTER_TREND", "NEUTRAL"].includes(s.alignment))
    throw new Error("Invalid alignment");
  const closure = [s.closeReason, s.closedAt, s.exitPrice, s.realizedNet, s.realizedCurrency].some(value => value !== undefined);
  if (closure) {
    if (s.eventType !== 'TRADE_CLOSED' || !['STOP', 'TP1', 'TP2', 'TP3', 'TIME_EXIT', 'CLOSED_OTHER'].includes(s.closeReason ?? ''))
      throw new Error('Invalid closure context');
    if (!Number.isSafeInteger(s.closedAt) || s.closedAt! < s.timestamp || s.closedAt! > 4102444800000 || (s.eventTimestamp !== undefined && s.closedAt! > s.eventTimestamp))
      throw new Error('Invalid closedAt');
    const actual = [s.exitPrice, s.realizedNet, s.realizedCurrency].some(value => value !== undefined);
    if (actual && s.executionModel !== 'STRATEGY_EMULATOR')
      throw new Error('Realized results require strategy emulator');
    if (s.exitPrice !== undefined && (typeof s.exitPrice !== 'number' || !Number.isFinite(s.exitPrice) || s.exitPrice <= 0))
      throw new Error('Invalid exitPrice');
    if (s.realizedNet !== undefined && (typeof s.realizedNet !== 'number' || !Number.isFinite(s.realizedNet) || typeof s.realizedCurrency !== 'string'))
      throw new Error('Invalid realizedNet');
    if (s.realizedCurrency !== undefined && (typeof s.realizedCurrency !== 'string' || !/^[A-Za-z0-9]{1,12}$/.test(s.realizedCurrency) || s.realizedNet === undefined))
      throw new Error('Invalid realizedCurrency');
  }
  return s;
}
