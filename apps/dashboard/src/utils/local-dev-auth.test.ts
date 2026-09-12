import { describe, expect, test } from "bun:test";

import { isLiveWorkOSApiKey, isLocalDevAuthEnabled } from "./local-dev-auth";

describe("isLiveWorkOSApiKey", () => {
  test("rejects empty, short, and placeholder keys", () => {
    expect(isLiveWorkOSApiKey(undefined)).toBe(false);
    expect(isLiveWorkOSApiKey("")).toBe(false);
    expect(isLiveWorkOSApiKey("sk_test_local_dev_placeholder")).toBe(false);
    expect(isLiveWorkOSApiKey("sk_short")).toBe(false);
  });

  test("accepts a real-looking secret key", () => {
    expect(isLiveWorkOSApiKey("sk_test_abcdefghijklmnopqrstuvwxyz")).toBe(true);
  });
});

describe("isLocalDevAuthEnabled", () => {
  test("never enables in production", () => {
    expect(isLocalDevAuthEnabled("production", undefined)).toBe(false);
    expect(
      isLocalDevAuthEnabled("production", "sk_test_abcdefghijklmnopqrstuvwxyz")
    ).toBe(false);
  });

  test("enables in development when WorkOS is not configured", () => {
    expect(isLocalDevAuthEnabled("development", undefined)).toBe(true);
    expect(
      isLocalDevAuthEnabled("development", "sk_test_local_dev_placeholder")
    ).toBe(true);
  });

  test("defers to AuthKit when a live key is present", () => {
    expect(
      isLocalDevAuthEnabled("development", "sk_test_abcdefghijklmnopqrstuvwxyz")
    ).toBe(false);
  });
});
