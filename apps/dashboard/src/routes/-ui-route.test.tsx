import { describe, expect, test } from "bun:test";

import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";
import { renderToString } from "react-dom/server";

import { createUiRoute } from "./-ui-route";

describe("UI route navigation", () => {
  test("commits a gated destination without waiting for its page data", async () => {
    const root = createRootRoute();
    let resolveData!: (value: string) => void;
    const data = new Promise<string>((resolve) => {
      resolveData = resolve;
    });
    let gated: boolean | undefined;
    let pendingPreloaded = false;
    const Pending = Object.assign(() => <h1>Loading traffic</h1>, {
      preload: async () => {
        pendingPreloaded = true;
      },
    });
    const route = createUiRoute({
      parent: root,
      path: "traffic",
      stream: true,
      gate: async () => undefined,
      loader: (input) => {
        gated = input.gated;
        return data;
      },
      component: () => null,
      pendingComponent: Pending,
    });
    const router = createRouter({
      routeTree: root.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/traffic"] }),
      isServer: false,
      origin: "http://localhost",
    });
    await router.load();
    const match = router.state.matches.find(
      (item) => item.routeId === route.id
    );
    expect(match?.status).toBe("success");
    expect(gated).toBe(true);
    expect(pendingPreloaded).toBe(true);
    expect(match?.loaderData).toEqual({ data: undefined, pending: data });
    expect(renderToString(<RouterProvider router={router} />)).toContain(
      "<h1>Loading traffic</h1>"
    );
    resolveData("loaded");
    expect(await data).toBe("loaded");
  });

  test("handles gate redirects before starting deferred data", async () => {
    const root = createRootRoute();
    let loaderCalled = false;
    const destination = createUiRoute({
      parent: root,
      path: "repaired",
      component: () => null,
    });
    const route = createUiRoute({
      parent: root,
      path: "traffic",
      stream: true,
      gate: async () => {
        throw redirect({ href: "/repaired" });
      },
      loader: async () => {
        loaderCalled = true;
        return "loaded";
      },
      component: () => null,
    });
    const router = createRouter({
      routeTree: root.addChildren([route, destination]),
      history: createMemoryHistory({ initialEntries: ["/traffic"] }),
      isServer: false,
      origin: "http://localhost",
    });
    await router.load();
    expect(loaderCalled).toBe(false);
    expect(router.state.location.pathname).toBe("/repaired");
  });

  test("awaits ungated loaders that may still redirect", async () => {
    const root = createRootRoute();
    const route = createUiRoute({
      parent: root,
      path: "content",
      stream: true,
      loader: async () => "loaded",
      component: () => null,
    });
    const router = createRouter({
      routeTree: root.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/content"] }),
      isServer: false,
      origin: "http://localhost",
    });
    await router.load();
    const match = router.state.matches.find(
      (item) => item.routeId === route.id
    );
    expect(match?.loaderData).toEqual({ data: "loaded", pending: undefined });
  });
});
