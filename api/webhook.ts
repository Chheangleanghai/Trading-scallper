import { timingSafeEqual, createHash } from "node:crypto";
import { validate } from "../src/validation.js";
import { sendTelegram } from "../src/telegram.js";
interface Request {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
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
  const contentType = req.headers["content-type"];
  if (
    typeof contentType !== "string" ||
    !/^application\/json(?:;|$)/i.test(contentType)
  )
    return res.status(415).json({ error: "JSON required" });
  let signal;
  try {
    const raw =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!raw) return res.status(400).json({ error: "Invalid signal" });
    if (Buffer.byteLength(raw) > 8192)
      return res.status(413).json({ error: "Payload too large" });
    signal = validate(
      typeof req.body === "string" ? JSON.parse(req.body) : req.body,
    );
  } catch {
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
