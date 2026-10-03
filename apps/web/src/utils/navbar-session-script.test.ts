import { describe, expect, mock, test } from "bun:test";
import { runInNewContext } from "node:vm";

import {
  NAVBAR_SESSION_ENDPOINT,
  SESSION_PROBE_TIMEOUT_MS,
} from "@/constants/auth/session";

import { buildNavbarSessionScript, getNavbarSession } from "./navbar-session";

describe("navbar session prefetch", () => {
  test("does not restart the request when head scripts run again", async () => {
    const window = { setTimeout, clearTimeout } as unknown as Window;
    const fetch = mock(async () => Response.json({ isAuthenticated: true }));
    const context = { window, fetch, AbortController };

    runInNewContext(buildNavbarSessionScript(), context);
    const request = window.__notraNavbarSession;
    runInNewContext(buildNavbarSessionScript(), context);

    expect(window.__notraNavbarSession).toBe(request);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await request).toBe(true);
  });

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
      const window = { setTimeout, clearTimeout } as unknown as Window;
      const fetch = mock(async () => Response.json({ isAuthenticated }));
      runInNewContext(buildNavbarSessionScript(), {
        window,
        fetch,
        AbortController,
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
    const timeout = mock(setTimeout);
    const window = { setTimeout: timeout, clearTimeout } as unknown as Window;
    runInNewContext(buildNavbarSessionScript(), {
      window,
      fetch: () => Promise.reject(new Error("offline")),
      AbortController,
    });

    expect(timeout.mock.calls[0]?.[1]).toBe(SESSION_PROBE_TIMEOUT_MS);
    expect(await window.__notraNavbarSession).toBe(false);
    expect(window.__notraNavbarSession).toBeUndefined();
  });

  test("does not authenticate a failed HTTP response", async () => {
    const window = { setTimeout, clearTimeout } as unknown as Window;
    runInNewContext(buildNavbarSessionScript(), {
      window,
      fetch: () =>
        Promise.resolve(
          Response.json({ isAuthenticated: true }, { status: 500 })
        ),
      AbortController,
    });
    expect(await window.__notraNavbarSession).toBe(false);
    expect(window.__notraNavbarSession).toBeUndefined();
  });

  test("retries an unsuccessful early probe without AbortSignal.timeout", async () => {
    const window = { setTimeout, clearTimeout } as unknown as Window;
    const fetch = mock(async () =>
      Response.json({ isAuthenticated: true })
    ).mockRejectedValueOnce(new Error("offline"));
    const context = { window, fetch, AbortController, AbortSignal: {} };

    runInNewContext(buildNavbarSessionScript(), context);
    expect(await window.__notraNavbarSession).toBe(false);
    expect(window.__notraNavbarSession).toBeUndefined();

    runInNewContext(buildNavbarSessionScript(), context);
    expect(await window.__notraNavbarSession).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("retries a failed client probe on a later call", async () => {
    const window = { setTimeout, clearTimeout } as unknown as Window;
    const fetch = mock(async () =>
      Response.json({ isAuthenticated: true })
    ).mockRejectedValueOnce(new Error("offline"));
    const originalWindow = Object.getOwnPropertyDescriptor(
      globalThis,
      "window"
    );
    const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: window,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetch,
    });

    try {
      expect(await getNavbarSession()).toBe(false);
      expect(window.__notraNavbarSession).toBeUndefined();
      expect(await getNavbarSession()).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, "window", originalWindow);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", originalFetch);
      }
    }
  });
});
