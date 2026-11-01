import { timingSafeEqual, createHash } from "node:crypto";
import { validate } from "../src/validation.js";
import { sendTelegram } from "../src/telegram.js";
interface Request {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>;
}
interface Response {
  status(code: number): Response;
  json(body: unknown): unknown;
  setHeader(name: string, value: string): unknown;
}
export default async function webhook(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const {
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_CHAT_ID: chat,
    TRADINGVIEW_WEBHOOK_SECRET: secret,
  } = process.env;
  if (!token || !chat || !secret || secret.length < 32 || secret.length > 256)
    return res.status(503).json({ error: "Service not configured" });
  const supplied = req.query.secret;
  const hash = (v: string) => createHash("sha256").update(v).digest();
  if (
    typeof supplied !== "string" ||
    supplied.length > 256 ||
    !timingSafeEqual(hash(supplied), hash(secret))
  )
    return res.status(401).json({ error: "Unauthorized" });
  // Check the declared size before touching Vercel's lazy parsed-body helper.
  const contentLength = req.headers["content-length"];
  if (contentLength !== undefined) {
    if (
      typeof contentLength !== "string" ||
      !/^\d+$/.test(contentLength) ||
      !Number.isSafeInteger(Number(contentLength))
    )
      return res.status(400).json({ error: "Invalid content length" });
    if (Number(contentLength) > 8192)
      return res.status(413).json({ error: "Payload too large" });
  }
  const contentType = req.headers["content-type"];
  if (
    typeof contentType !== "string" ||
    !/^application\/json(?:;|$)/i.test(contentType)
  )
    return res.status(415).json({ error: "JSON required" });
  let signal;
  try {
    signal = validate(await readJsonBody(req));
  } catch (error) {
    if (error instanceof PayloadTooLargeError)
      return res.status(413).json({ error: "Payload too large" });
    return res.status(400).json({ error: "Invalid signal" });
  }
  try {
    await sendTelegram(signal, token, chat);
    return res.status(200).json({ ok: true, eventId: signal.eventId });
  } catch {
    return res
      .status(502)
      .json({ error: "Telegram delivery failed; outcome may be unknown" });
  }
}

class PayloadTooLargeError extends Error {}

async function readJsonBody(req: Request): Promise<unknown> {
  if (req[Symbol.asyncIterator]) {
    const chunks: Buffer[] = [];
    let byteLength = 0;
    for await (const chunk of req as Request & AsyncIterable<Uint8Array>) {
      const buffer = Buffer.from(chunk);
      byteLength += buffer.byteLength;
      if (byteLength > 8192) throw new PayloadTooLargeError();
      chunks.push(buffer);
    }
    const source = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
    if (!source) throw new Error("Empty body");
    return JSON.parse(source) as unknown;
  }

  // Plain objects support local handler tests and runtimes that pre-parse JSON.
  const source =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  if (!source) throw new Error("Empty body");
  if (Buffer.byteLength(source) > 8192) throw new PayloadTooLargeError();
  return typeof req.body === "string" ? JSON.parse(source) as unknown : req.body;
}
