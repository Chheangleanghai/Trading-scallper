export const events = [
  "BUY_SIGNAL",
  "SELL_SIGNAL",
  "ENTRY_TRIGGERED",
  "TP1_HIT",
  "TP2_HIT",
  "TP3_HIT",
  "STOP_LOSS_HIT",
  "SIGNAL_INVALIDATED",
  "TRADE_CLOSED",
] as const;
export interface Signal extends SignalMetadata {
  eventId: string;
  eventType: (typeof events)[number];
  symbol: string;
  timeframe: string;
  direction: "BUY" | "SELL";
  strategy: string;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  quality: number;
  timestamp: number;
  h1Trend: string;
}

export type ExecutionModel = "INDICATOR_ESTIMATE" | "STRATEGY_EMULATOR";
export interface SignalMetadata {
  reason?: string;
  setupProgress?: string;
  alignment?: "ALIGNED" | "COUNTER_TREND" | "NEUTRAL";
  scriptVersion?: string;
  targetSource?: string;
  setupTimestamp?: number;
  eventTimestamp?: number;
  invalidation?: number;
  signalPrice?: number;
  managedSl?: number;
  filledEntry?: number | null;
  status?:
    | "DETECTED"
    | "WAITING_CONFIRMATION"
    | "CONFIRMED"
    | "ENTRY_PENDING"
    | "ENTRY_TRIGGERED"
    | "INVALIDATED"
    | "EXPIRED"
    | "CLOSED";
  entryMode?: "Close" | "Limit" | "Breakout";
  executionModel?: ExecutionModel;
}
