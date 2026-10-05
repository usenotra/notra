import { afterEach, describe, expect, mock, test } from "bun:test";

import { redirect } from "@tanstack/react-router";

import { followServerRedirect } from "./follow-server-redirect";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
});

describe("followServerRedirect", () => {
  test("returns successful data", async () => {
    expect(await followServerRedirect(Promise.resolve("loaded"))).toBe(
      "loaded"
    );
  });

  test("follows a late redirect for the current page without settling as an error", async () => {
    const assign = mock(() => undefined);
    Object.defineProperty(globalThis, "window", {
      value: { location: { assign } },
      configurable: true,
      writable: true,
    });
    let reject!: (error: unknown) => void;
    const pending = new Promise<never>((_, rejectPromise) => {
      reject = rejectPromise;
    });
    const followed = followServerRedirect(pending, () => true);
    let settled = false;
    void followed.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      }
    );
    reject(redirect({ href: "/login" }));
    await Promise.resolve();
    await Promise.resolve();
    expect(assign).toHaveBeenCalledWith("/login");
    expect(settled).toBe(false);
  });

  test("does not follow a redirect from a page that is no longer current", async () => {
    const assign = mock(() => undefined);
    Object.defineProperty(globalThis, "window", {
      value: { location: { assign } },
      configurable: true,
      writable: true,
    });
    const error = redirect({ href: "/login" });
    await expect(
      followServerRedirect(Promise.reject(error), () => false)
    ).rejects.toBe(error);
    expect(assign).not.toHaveBeenCalled();
  });

  test("preserves redirects on the server", async () => {
    Reflect.deleteProperty(globalThis, "window");
    const error = redirect({ href: "/login" });
    await expect(followServerRedirect(Promise.reject(error))).rejects.toBe(
      error
    );
  });

  test("preserves non-redirect failures", async () => {
    const error = new Error("Data loading failed");
    await expect(followServerRedirect(Promise.reject(error))).rejects.toBe(
      error
    );
  });
});
