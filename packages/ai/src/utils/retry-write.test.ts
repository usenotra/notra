import { expect, test } from "bun:test";

import { retryWrite } from "./retry-write";

test("retries immediately and returns a transiently successful write", async () => {
  let calls = 0;
  expect(
    await retryWrite(async () => {
      calls++;
      if (calls < 3) {
        throw new Error("transient");
      }
      return "written";
    })
  ).toBe("written");
  expect(calls).toBe(3);
});

test("exhaustion preserves the original error identity", async () => {
  const failure = new Error("still unavailable");
  let calls = 0;
  try {
    await retryWrite(async () => {
      calls++;
      throw failure;
    });
    throw new Error("expected retryWrite to reject");
  } catch (error) {
    expect(error).toBe(failure);
  }
  expect(calls).toBe(3);
});
