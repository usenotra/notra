import { describe, expect, test } from "bun:test";

import { withShutdownDeadline } from "../src/utils/shutdown";

describe("runner shutdown deadlines", () => {
  test("waits for successful cleanup", async () => {
    let cleaned = false;
    expect(
      await withShutdownDeadline(async () => {
        cleaned = true;
      }, 100)
    ).toBe(true);
    expect(cleaned).toBe(true);
  });

  test("reports rejected cleanup without an unhandled rejection", async () => {
    expect(
      await withShutdownDeadline(
        () => Promise.reject(new Error("offline")),
        100
      )
    ).toBe(false);
  });

  test("continues shutdown when a cleanup operation never resolves", async () => {
    expect(
      await withShutdownDeadline(() => new Promise(() => undefined), 10)
    ).toBe(false);
  });
});
