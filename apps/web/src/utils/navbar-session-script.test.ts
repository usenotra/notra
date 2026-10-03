import { describe, expect, mock, test } from "bun:test";
import { runInNewContext } from "node:vm";

import {
  NAVBAR_SESSION_ENDPOINT,
  SESSION_PROBE_TIMEOUT_MS,
} from "@/constants/auth/session";

import { buildNavbarSessionScript, getNavbarSession } from "./navbar-session";

describe("navbar session prefetch", () => {
  test("reuses the early request when the navbar mounts", async () => {
    const request = Promise.resolve(true);
    const originalWindow = Object.getOwnPropertyDescriptor(
      globalThis,
      "window"
    );
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { __notraNavbarSession: request },
    });
    try {
      expect(getNavbarSession()).toBe(request);
      expect(getNavbarSession()).toBe(request);
      expect(await getNavbarSession()).toBe(true);
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, "window", originalWindow);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }
    }
  });

  test.each([true, false])(
    "resolves authentication status %s before React mounts",
    async (isAuthenticated) => {
      const window: Window = {} as Window;
      const fetch = mock(async () => Response.json({ isAuthenticated }));
      runInNewContext(buildNavbarSessionScript(), {
        window,
        fetch,
        AbortSignal,
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(NAVBAR_SESSION_ENDPOINT, {
        credentials: "include",
        cache: "no-store",
        signal: expect.any(AbortSignal),
      });
      expect(await window.__notraNavbarSession).toBe(isAuthenticated);
    }
  );

  test("handles network failures without an unhandled rejection", async () => {
    const window: Window = {} as Window;
    const timeout = mock(() => new AbortController().signal);
    runInNewContext(buildNavbarSessionScript(), {
      window,
      fetch: () => Promise.reject(new Error("offline")),
      AbortSignal: { timeout },
    });

    expect(timeout).toHaveBeenCalledWith(SESSION_PROBE_TIMEOUT_MS);
    expect(await window.__notraNavbarSession).toBe(false);
  });

  test("does not authenticate a failed HTTP response", async () => {
    const window: Window = {} as Window;
    runInNewContext(buildNavbarSessionScript(), {
      window,
      fetch: () =>
        Promise.resolve(
          Response.json({ isAuthenticated: true }, { status: 500 })
        ),
      AbortSignal,
    });
    expect(await window.__notraNavbarSession).toBe(false);
  });
});
