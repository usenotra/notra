import { describe, expect, test } from "bun:test";

import { toCapturedDate } from "../src/ingest/event";

const now = new Date("2026-10-01T12:00:00.000Z");

describe("toCapturedDate", () => {
  test("keeps a plausible client timestamp", () => {
    const sent = "2026-10-01T11:59:58.000Z";
    expect(toCapturedDate(sent, now).toISOString()).toBe(sent);
  });

  test("falls back to the receive time when missing or unparseable", () => {
    expect(toCapturedDate(undefined, now)).toBe(now);
    expect(toCapturedDate("not a date", now)).toBe(now);
  });

  test("replaces timestamps too far in the future or past", () => {
    expect(toCapturedDate("2026-10-01T12:10:00.000Z", now)).toBe(now);
    expect(toCapturedDate("1970-01-01T00:00:00.000Z", now)).toBe(now);
  });
});
