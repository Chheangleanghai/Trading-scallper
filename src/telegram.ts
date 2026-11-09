import type { Signal } from "./types.js";
export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const conceptNames: Readonly<Record<string, string>> = {
  A_SWEEP_MSS_FVG: "A · Sweep / MSS / FVG",
  B_CRT: "B · CRT range reversal",
  C_TURTLE_SOUP: "C · Confirmed-pivot false breakout",
  D_SNR: "D · K-SNR (confirmed support/resistance)",
  E_DEMAND: "E · Demand retest",
  E_SUPPLY: "E · Supply retest",
  F_TREND_PULLBACK: "F · Structural trend pullback",
  G_AMD: "G · Compressed-range AMD approximation",
  H_QUASIMODO: "H · Confirmed Quasimodo approximation",
};
export function formatMessage(s: Signal): string {
  const risk = Math.abs(s.entry - s.sl);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Phnom_Penh",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(s.eventTimestamp ?? s.timestamp));
  const model =
    s.executionModel === "STRATEGY_EMULATOR"
      ? "Strategy emulator"
      : s.executionModel === "INDICATOR_ESTIMATE"
        ? "Indicator estimate"
        : "Execution model not reported";
  const fillLabel = s.executionModel
    ? `Filled entry (${model})`
    : "Reported filled entry (model not reported)";
  const details = [
    s.scriptVersion ? `Script: ${escapeHtml(s.scriptVersion)}` : "",
    s.reason ? `Why: ${escapeHtml(s.reason)}` : "",
    s.setupProgress ? `Setup: ${escapeHtml(s.setupProgress)}` : "",
    s.alignment ? `Alignment: ${escapeHtml(s.alignment)}` : "",
    s.entryMode ? `Entry mode: ${escapeHtml(s.entryMode)}` : "",
    s.status ? `Status: ${escapeHtml(s.status)}` : "",
    s.signalPrice !== undefined ? `Signal close: ${s.signalPrice}` : "",
    s.filledEntry != null
      ? `${fillLabel}: ${s.filledEntry}`
      : "Filled entry: not reported",
    s.managedSl !== undefined ? `Managed SL: ${s.managedSl}` : "",
    s.targetSource ? `Targets: ${escapeHtml(s.targetSource)}` : "",
    s.closeReason ? `Closed: ${escapeHtml(s.closeReason)} at ${new Date(s.closedAt!).toISOString()}` : "",
    s.exitPrice !== undefined ? `Exit price (emulator): ${s.exitPrice}` : "",
    s.realizedNet !== undefined ? `Realized net (emulator, after fees): ${s.realizedNet.toFixed(2)} ${escapeHtml(s.realizedCurrency!)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `🚨 <b>XAUUSD SMART SCALPER PRO</b>
${s.direction === "BUY" ? "🟢" : "🔴"} ${escapeHtml(s.eventType)}
━━━━━━━━━━━━━━━━
Symbol: ${escapeHtml(s.symbol)}
Timeframe: ${escapeHtml(s.timeframe)}
H1: ${escapeHtml(s.h1Trend)}
Strategy: ${escapeHtml(s.strategy)}
Concept: ${escapeHtml(conceptNames[s.strategy] ?? s.strategy)}
Quality: ${s.quality}/100 (heuristic)
ENTRY (planned): ${s.entry}
INITIAL SL: ${s.sl}
TP1: ${s.tp1} (${(Math.abs(s.tp1 - s.entry) / risk).toFixed(2)}R)
TP2: ${s.tp2} (${(Math.abs(s.tp2 - s.entry) / risk).toFixed(2)}R)
TP3: ${s.tp3} (${(Math.abs(s.tp3 - s.entry) / risk).toFixed(2)}R)
${details}
Event time: ${time} Cambodia (UTC+7)
Plan time (UTC): ${new Date(s.timestamp).toISOString()}
ID: ${escapeHtml(s.eventId)}
${model}; no broker fill confirmation.
⚠️ Trading involves risk.`;
}
export async function sendTelegram(
  s: Signal,
  token: string,
  chatId: string,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatMessage(s),
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(2200),
    },
  );
  if (!response.ok) throw new Error("Telegram request failed");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("ok" in body) || body.ok !== true)
    throw new Error("Telegram delivery rejected");
}
