import { expect, test } from "bun:test";

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { renderedPathname } from "../src/utils/rendered-pathname";

test("sidebar pathname switches with rendered matches, not the pending URL", async () => {
  const root = createRootRoute();
  let release = () => {};
  let started = () => {};
  const loading = new Promise<void>((resolve) => {
    started = resolve;
  });
  const sites = createRoute({ getParentRoute: () => root, path: "/org/sites" });
  const site = createRoute({
    getParentRoute: () => root,
    path: "/org/sites/$siteId",
    loader: () =>
      new Promise<void>((resolve) => {
        release = resolve;
        started();
      }),
  });
  const router = createRouter({
    routeTree: root.addChildren([sites, site]),
    history: createMemoryHistory({ initialEntries: ["/org/sites"] }),
    isServer: false,
    origin: "http://localhost",
    defaultPendingMs: 60_000,
  });
  await router.load();
  expect(renderedPathname(router.state)).toBe("/org/sites");

  router.history.push("/org/sites/notra-blog-test");
  const navigation = router.load();
  await loading;
  expect(router.state.location.pathname).toBe("/org/sites/notra-blog-test");
  expect(renderedPathname(router.state)).toBe("/org/sites");

  const unsubscribe = router.subscribe("onBeforeRouteMount", () => {
    expect(router.state.resolvedLocation?.pathname).toBe("/org/sites");
    expect(renderedPathname(router.state)).toBe("/org/sites/notra-blog-test");
  });
  release();
  await navigation;
  unsubscribe();
  expect(renderedPathname(router.state)).toBe("/org/sites/notra-blog-test");

  router.history.back();
  await router.load();
  expect(renderedPathname(router.state)).toBe("/org/sites");
});

test("rendered pathname preserves masked modal URLs and initial locations", async () => {
  const root = createRootRoute();
  const analytics = createRoute({
    getParentRoute: () => root,
    path: "/org/analytics",
  });
  const router = createRouter({
    routeTree: root.addChildren([analytics]),
    history: createMemoryHistory({ initialEntries: ["/org/analytics"] }),
  });
  const background = router.state.location;
  const masked = { ...background, pathname: "/org/analytics/accounts/account" };
  expect(renderedPathname(router.state)).toBe("/org/analytics");
  await router.load();
  expect(
    renderedPathname({
      ...router.state,
      location: { ...background, maskedLocation: masked },
    })
  ).toBe(masked.pathname);
  expect(
    renderedPathname({
      ...router.state,
      location: { ...background, pathname: "/org/sites" },
      resolvedLocation: { ...background, maskedLocation: masked },
    })
  ).toBe(masked.pathname);
});
