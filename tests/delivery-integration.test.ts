import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import { afterAll, beforeAll, beforeEach, afterEach, expect, it, vi } from "vitest";
import webhook from "../api/webhook.js";

// Actual HTTP and fetch, redirected exclusively to loopback: no Telegram traffic.
const nativeFetch = globalThis.fetch;
const secret = "local-integration-secret-" + "x".repeat(32);
const rows = readFileSync("tests/fixtures/native-pine-alerts.jsonl", "utf8")
  .trim().split("\n").map((line) => JSON.parse(line));
let server: Server;
let endpoint: string;
let reply = "success";
const received: Record<string, unknown>[] = [];
beforeAll(async () => {
  server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received.push(JSON.parse(body));
    if (reply === "timeout") return; // Client abort must terminate this request.
    res.setHeader("Content-Type", "application/json");
    if (reply === "rate-limit") {
      res.writeHead(429).end('{"ok":false,"retry_after":30}');
    } else if (reply === "invalid-json") res.end("not json");
    else if (reply === "rejected") res.end('{"ok":false}');
    else res.end('{"ok":true,"result":{"message_id":123}}');
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  endpoint = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
beforeEach(() => {
  reply = "success";
  received.length = 0;
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "local-test-token");
  vi.stubEnv("TELEGRAM_CHAT_ID", "configured-chat");
  vi.stubEnv("TRADINGVIEW_WEBHOOK_SECRET", secret);
  vi.stubGlobal("fetch", vi.fn((url: string | URL | Request, init?: RequestInit) => {
    // Reject unexpected destinations before redirecting to our local HTTP service.
    expect(String(url)).toBe("https://api.telegram.org/botlocal-test-token/sendMessage");
    return nativeFetch(endpoint, init);
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function invoke(body: unknown, query: Record<string, string> = { secret }) {
  let status = 0;
  let result: unknown;
  const headers: Record<string, string> = {};
  const res = {
    status(code: number) { status = code; return this; },
    json(value: unknown) { result = value; },
    setHeader(name: string, value: string) { headers[name] = value; },
  };
  await webhook({ method: "POST", query, body, headers: { "content-type": "application/json" } }, res);
  return { status, result, headers };
}
it("delivers every captured native Pine payload through the handler and real local HTTP", async () => {
  for (const row of rows) {
    const result = await invoke(JSON.stringify(row));
    expect(result.status).toBe(200);
    expect(result.result).toEqual({ ok: true, eventId: row.eventId });
    expect(result.headers["Cache-Control"]).toBe("no-store");
    const message = received.at(-1)!;
    expect(message.chat_id).toBe("configured-chat");
    expect(message.parse_mode).toBe("HTML");
    expect(message.text).toContain(row.eventId);
    expect(message.text).toContain(row.eventType);
    expect(message.text).toContain("no broker fill confirmation");
  }
  expect(received).toHaveLength(rows.length);
});
it.each(["rate-limit", "invalid-json", "rejected"])("returns failure after actual HTTP %s response, without retry", async (mode) => {
  reply = mode;
  expect((await invoke(rows[0])).status).toBe(502);
  expect(received).toHaveLength(1);
});
it("aborts a stalled HTTP response within the TradingView request budget", async () => {
  reply = "timeout";
  const started = performance.now();
  expect((await invoke(rows[0])).status).toBe(502);
  expect(performance.now() - started).toBeLessThan(2900);
  expect(received).toHaveLength(1);
});
it("does not allow payload or query fields to redirect the configured Telegram destination", async () => {
  expect((await invoke({ ...rows[0], chat_id: "attacker", token: "attacker" }, { secret, chat_id: "attacker" })).status).toBe(200);
  expect(received[0].chat_id).toBe("configured-chat");
});
it("rejects bad authentication and malformed native payloads before making any HTTP request", async () => {
  expect((await invoke(rows[0], { secret: "incorrect" })).status).toBe(401);
  expect((await invoke({ ...rows[0], tp1: rows[0].sl })).status).toBe(400);
  expect(received).toHaveLength(0);
  expect(fetch).not.toHaveBeenCalled();
});
it("keeps concurrent webhook event responses and Telegram messages associated correctly", async () => {
  const batch = rows.slice(0, 12).map((row, index) => ({ ...row, eventId: `concurrent-${index}` }));
  const results = await Promise.all(batch.map((row) => invoke(row)));
  expect(results.map((result) => result.result)).toEqual(batch.map((row) => ({ ok: true, eventId: row.eventId })));
  expect(results.every((result) => result.status === 200)).toBe(true);
  expect(received).toHaveLength(batch.length);
  for (const row of batch) expect(received.filter((message) => String(message.text).includes(`ID: ${row.eventId}\n`))).toHaveLength(1);
});
