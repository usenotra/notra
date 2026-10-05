import { describe, expect, mock, test } from "bun:test";
import { runInNewContext } from "node:vm";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { useDashboardSession } from "@/lib/auth/use-dashboard-session";

import { buildNavbarSessionScript, getNavbarSession } from "./navbar-session";

describe("navbar session snapshot", () => {
  test.each([true, false])(
    "stores the confirmed status %s without resetting it on navigation",
    async (isAuthenticated) => {
      const window = { setTimeout, clearTimeout } as unknown as Window;
      const fetch = mock(async () => Response.json({ isAuthenticated }));
      const context = { window, fetch, AbortController };

      expect(window.__notraNavbarSessionResolved).toBeUndefined();
      runInNewContext(buildNavbarSessionScript(), context);
      expect(window.__notraNavbarSessionResolved).toBeUndefined();
      await window.__notraNavbarSession;
      expect(window.__notraNavbarSessionResolved).toBe(isAuthenticated);

      runInNewContext(buildNavbarSessionScript(), context);
      expect(window.__notraNavbarSessionResolved).toBe(isAuthenticated);
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );

  test("stores the client fallback result for subsequent navbar mounts", async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(
      globalThis,
      "window"
    );
    const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    const window = { setTimeout, clearTimeout } as unknown as Window;
    const fetch = mock(async () => Response.json({ isAuthenticated: true }));
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: window,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetch,
    });

    try {
      await getNavbarSession();
      expect(window.__notraNavbarSessionResolved).toBe(true);
      await getNavbarSession();
      expect(window.__notraNavbarSessionResolved).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);
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

  test("keeps server rendering unresolved rather than flashing signed-out actions", () => {
    function SessionProbe() {
      const session = useDashboardSession();
      return createElement("span", null, JSON.stringify(session));
    }

    expect(renderToString(createElement(SessionProbe))).toContain(
      "&quot;isAuthenticated&quot;:false,&quot;isResolved&quot;:false"
    );
  });
});
