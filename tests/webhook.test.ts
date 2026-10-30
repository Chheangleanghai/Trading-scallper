import { beforeEach, afterEach, it, expect, vi } from "vitest";
import webhook from "../api/webhook.js";
import { validate } from "../src/validation.js";
const sample = {
  eventId: "test",
  eventType: "BUY_SIGNAL",
  symbol: "XAUUSD",
  timeframe: "1",
  direction: "BUY",
  strategy: "A",
  entry: 100,
  sl: 99,
  tp1: 101,
  tp2: 102,
  tp3: 103,
  quality: 85,
  timestamp: 1793332800000,
  h1Trend: "Bullish",
};
const secret = "a".repeat(48);
beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "token");
  vi.stubEnv("TELEGRAM_CHAT_ID", "123");
  vi.stubEnv("TRADINGVIEW_WEBHOOK_SECRET", secret);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function call(overrides: Record<string, unknown> = {}) {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn(),
  };
  await webhook(
    {
      method: "POST",
      query: { secret },
      headers: { "content-type": "application/json" },
      body: sample,
      ...overrides,
    },
    res,
  );
  return res;
}
it("rejects unauthorized before sending", async () => {
  expect(
    (await call({ query: { secret: "wrong" } })).status,
  ).toHaveBeenCalledWith(401);
});
it("rejects GET", async () => {
  expect((await call({ method: "GET" })).status).toHaveBeenCalledWith(405);
});
it("rejects wrong content type", async () => {
  expect((await call({ headers: {} })).status).toHaveBeenCalledWith(415);
});
it("rejects malformed and oversized bodies", async () => {
  expect((await call({ body: "{" })).status).toHaveBeenCalledWith(400);
  expect((await call({ body: "x".repeat(9000) })).status).toHaveBeenCalledWith(
    413,
  );
});
it("rejects reversed prices, nonfinite values, wrong direction, score and timestamp", () => {
  for (const change of [
    { sl: 101 },
    { tp2: 100 },
    { entry: NaN },
    { quality: 101 },
    { timestamp: 1.2 },
    { direction: "SELL" },
  ])
    expect(() => validate({ ...sample, ...change })).toThrow();
});
it("accepts valid short and management events", () => {
  expect(
    validate({
      ...sample,
      eventType: "STOP_LOSS_HIT",
      direction: "SELL",
      sl: 101,
      tp1: 99,
      tp2: 98,
      tp3: 97,
    }).direction,
  ).toBe("SELL");
});
it("returns success only after Telegram responds", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response('{"ok":true}')),
  );
  expect((await call()).status).toHaveBeenCalledWith(200);
});
it("returns 502 on delivery failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
  expect((await call()).status).toHaveBeenCalledWith(502);
});
it("returns 503 when configuration is missing", async () => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
  expect((await call()).status).toHaveBeenCalledWith(503);
});
it("does not report success before Telegram acknowledges", async () => {
  let acknowledge!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        acknowledge = resolve;
      }),
    ),
  );
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn(),
  };
  const request = webhook(
    {
      method: "POST",
      query: { secret },
      headers: { "content-type": "application/json" },
      body: sample,
    },
    res,
  );
  expect(res.json).not.toHaveBeenCalled();
  acknowledge(new Response('{"ok":true}'));
  await request;
  expect(res.status).toHaveBeenCalledWith(200);
});
it("allows repeated delivery without claiming persistent deduplication", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response('{"ok":true}')));
  vi.stubGlobal("fetch", fetcher);
  await call();
  await call();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("returns 400 for a missing body and accepts JSON charset content type", async () => {
  expect((await call({ body: undefined })).status).toHaveBeenCalledWith(400);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response('{"ok":true}')),
  );
  expect(
    (
      await call({
        headers: { "content-type": "application/json; charset=utf-8" },
      })
    ).status,
  ).toHaveBeenCalledWith(200);
});
it("rejects repeated secret query parameters and invalid configured secret lengths", async () => {
  expect(
    (await call({ query: { secret: [secret, secret] } })).status,
  ).toHaveBeenCalledWith(401);
  vi.stubEnv("TRADINGVIEW_WEBHOOK_SECRET", "x".repeat(257));
  expect((await call()).status).toHaveBeenCalledWith(503);
});
