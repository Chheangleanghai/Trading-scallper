import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { it, expect } from "vitest";
import { events } from "../src/types.js";
import { validate } from "../src/validation.js";
import { formatMessage } from "../src/telegram.js";

it("validates and formats real native Pine log payloads covering every alert event", () => {
  const rows = readFileSync(
    resolve("tests/fixtures/native-pine-alerts.jsonl"),
    "utf8",
  )
    .trim()
    .split("\n")
    .map((line) => validate(JSON.parse(line)));
  expect(rows.length).toBeGreaterThan(0);
  expect(new Set(rows.map((row) => row.eventType))).toEqual(new Set(events));
  expect(new Set(rows.map((row) => row.direction))).toEqual(
    new Set(["BUY", "SELL"]),
  );
  for (const signal of rows) {
    expect(signal.symbol).toBe("FOREXCOM:XAUUSD");
    expect(signal.executionModel).toBe("INDICATOR_ESTIMATE");
    expect(formatMessage(signal)).toContain("Symbol: FOREXCOM:XAUUSD");
    expect(formatMessage(signal)).toContain("no broker fill confirmation");
  }
  expect(
    rows.some(
      (row) =>
        row.eventType === "SIGNAL_INVALIDATED" && row.filledEntry === null,
    ),
  ).toBe(true);
  expect(
    rows.some(
      (row) => row.filledEntry != null && row.filledEntry !== row.entry,
    ),
  ).toBe(true);
});
