import { describe, expect, test } from "bun:test";

import {
  evaluateLocalDevAuth,
  hostnameFromHostHeader,
  isLiveWorkOSApiKey,
  isLocalDevAuthEnabled,
  requestHostIsLoopback,
  requestLooksPubliclyExposed,
} from "./local-dev-auth";

const LIVE_KEY = "sk_test_abcdefghijklmnopqrstuvwxyz";
const DEV_OPTS = {
  nodeEnv: "development",
  apiKey: "sk_test_local_dev_placeholder",
  enabledFlag: "true",
  email: "dev@usenotra.com",
} as const;

function headersFrom(entries: Record<string, string>) {
  return new Headers(entries);
}

describe("isLiveWorkOSApiKey", () => {
  test("rejects empty, short, and placeholder keys", () => {
    expect(isLiveWorkOSApiKey(undefined)).toBe(false);
    expect(isLiveWorkOSApiKey("")).toBe(false);
    expect(isLiveWorkOSApiKey("sk_test_local_dev_placeholder")).toBe(false);
    expect(isLiveWorkOSApiKey("sk_short")).toBe(false);
  });

  test("accepts a real-looking secret key", () => {
    expect(isLiveWorkOSApiKey(LIVE_KEY)).toBe(true);
  });
});

describe("isLocalDevAuthEnabled", () => {
  test("never enables in production", () => {
    expect(isLocalDevAuthEnabled("production", undefined, "true")).toBe(false);
    expect(isLocalDevAuthEnabled("production", LIVE_KEY, "true")).toBe(false);
  });

  test("never enables in test or staging", () => {
    expect(isLocalDevAuthEnabled("test", undefined, "true")).toBe(false);
    expect(isLocalDevAuthEnabled("staging", undefined, "true")).toBe(false);
    expect(
      isLocalDevAuthEnabled("test", "sk_test_local_dev_placeholder", "true")
    ).toBe(false);
  });

  test("requires an explicit opt-in flag in development", () => {
    expect(isLocalDevAuthEnabled("development", undefined, "")).toBe(false);
    expect(isLocalDevAuthEnabled("development", undefined, "false")).toBe(
      false
    );
    expect(
      isLocalDevAuthEnabled(
        "development",
        "sk_test_local_dev_placeholder",
        "true"
      )
    ).toBe(true);
  });

  test("defers to AuthKit when a live key is present", () => {
    expect(isLocalDevAuthEnabled("development", LIVE_KEY, "true")).toBe(false);
  });
});

describe("requestHostIsLoopback", () => {
  test("accepts localhost and loopback addresses with ports", () => {
    expect(requestHostIsLoopback("localhost:3000")).toBe(true);
    expect(requestHostIsLoopback("127.0.0.1:3000")).toBe(true);
    expect(requestHostIsLoopback("[::1]:3000")).toBe(true);
    expect(hostnameFromHostHeader("[::1]:3000")).toBe("::1");
  });

  test("rejects public and tunnel hosts", () => {
    expect(requestHostIsLoopback("example.trycloudflare.com")).toBe(false);
    expect(requestHostIsLoopback("app.usenotra.com")).toBe(false);
  });
});

describe("evaluateLocalDevAuth", () => {
  test("allows loopback after opt-in with a pinned email", () => {
    expect(
      evaluateLocalDevAuth(headersFrom({ host: "localhost:3000" }), DEV_OPTS)
    ).toEqual({ kind: "allowed" });
  });

  test("blocks when the email is missing", () => {
    expect(
      evaluateLocalDevAuth(headersFrom({ host: "localhost:3000" }), {
        ...DEV_OPTS,
        email: "",
      })
    ).toEqual({ kind: "blocked", reason: "missing_email" });
  });

  test("blocks tunneled and forwarded hosts even when opted in", () => {
    expect(
      evaluateLocalDevAuth(
        headersFrom({ host: "random.trycloudflare.com" }),
        DEV_OPTS
      )
    ).toEqual({ kind: "blocked", reason: "non_loopback" });
    expect(
      evaluateLocalDevAuth(
        headersFrom({
          host: "localhost:3000",
          "cf-connecting-ip": "203.0.113.10",
          "cf-ray": "abc",
        }),
        DEV_OPTS
      )
    ).toEqual({ kind: "blocked", reason: "non_loopback" });
    expect(
      requestLooksPubliclyExposed(
        headersFrom({ "x-forwarded-for": "203.0.113.10" })
      )
    ).toBe(true);
  });

  test("stays disabled without the opt-in flag", () => {
    expect(
      evaluateLocalDevAuth(headersFrom({ host: "localhost:3000" }), {
        ...DEV_OPTS,
        enabledFlag: "",
      })
    ).toEqual({ kind: "disabled" });
  });
});
