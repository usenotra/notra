import { describe, expect, test } from "bun:test";

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { modalNavigationOptions } from "./route-modal";

describe("modal navigation", () => {
  test("retains the exact background search and hash without scrolling", () => {
    const search = { project: "project-one", filter: ["one", "two"] };
    const options = modalNavigationOptions(
      { pathname: "/acme/geo/gaps", search, hash: "selected" },
      "/acme/geo/competitors/Example%20Inc?project=project-one"
    );
    expect(options?.to).toBe("/acme/geo/gaps");
    expect(options?.search).toBe(search);
    expect(options?.hash).toBe("selected");
    expect(options?.resetScroll).toBe(false);
    expect(options?.hashScrollIntoView).toBe(false);
    expect(options?.state.notraModal).toEqual({
      kind: "competitor",
      organizationSlug: "acme",
      name: "Example Inc",
    });
    expect(options?.mask).toEqual({
      to: "/acme/geo/competitors/Example%20Inc",
      search: { project: "project-one" },
      hash: "",
      unmaskOnReload: true,
    });
  });

  test("does not intercept other organizations, sections, external URLs or same-path changes", () => {
    const location = {
      pathname: "/acme/geo/competitors/example",
      search: {},
      hash: "",
    };
    for (const href of [
      "/other/geo/competitors/example",
      "/acme/analytics/accounts/example",
      "https://example.com/acme/geo/competitors/example",
      "//example.com/acme/geo/competitors/example",
      "/acme/geo/competitors/example?range=week",
      "/acme/geo/competitors/%ZZ",
    ]) {
      expect(modalNavigationOptions(location, href)).toBeUndefined();
    }
  });

  test.each([
    [
      "/acme/analytics/leaderboard",
      "/acme/analytics/accounts/alice",
      "account",
    ],
    ["/acme/integrations/github", "/acme/integrations/framer", "framer"],
    ["/acme/integrations", "/acme/integrations/raycast", "raycast"],
  ] as const)("intercepts %s to %s", (pathname, href, kind) => {
    expect(
      modalNavigationOptions({ pathname, search: {}, hash: "" }, href)?.state
        .notraModal.kind
    ).toBe(kind);
  });

  test("native mask preserves background matches, browser href, back/forward and reload semantics", async () => {
    const root = createRootRoute();
    const background = createRoute({
      getParentRoute: () => root,
      path: "/$slug/geo/gaps",
      validateSearch: (search: Record<string, unknown>) => search,
    });
    const detail = createRoute({
      getParentRoute: () => root,
      path: "/$slug/geo/competitors/$competitor",
    });
    const routeTree = root.addChildren([background, detail]);
    const history = createMemoryHistory({
      initialEntries: ["/acme/geo/gaps?project=one#row"],
    });
    const router = createRouter({
      routeTree,
      history,
      isServer: false,
      origin: "http://localhost",
    });
    await router.load();
    const initialMatchIds = router.state.matches.map((match) => match.id);
    const options = modalNavigationOptions(
      router.state.location,
      "/acme/geo/competitors/example?project=one"
    );
    if (!options) {
      throw new Error("Expected modal navigation options");
    }
    await router.navigate(options);
    expect(router.state.matches.map((match) => match.id)).toEqual(
      initialMatchIds
    );
    expect(router.state.location.pathname).toBe("/acme/geo/gaps");
    expect(router.state.location.search).toEqual({ project: "one" });
    expect(history.location.href).toBe(
      "/acme/geo/competitors/example?project=one"
    );
    expect(router.state.location.state.notraModal?.name).toBe("example");
    history.back();
    await router.load();
    expect(router.state.location.maskedLocation).toBeUndefined();
    expect(history.location.href).toBe("/acme/geo/gaps?project=one#row");
    history.forward();
    await router.load();
    expect(router.state.location.state.notraModal?.name).toBe("example");
    const reloaded = createRouter({
      routeTree,
      history,
      isServer: false,
      origin: "http://localhost",
    });
    await reloaded.load();
    expect(reloaded.state.location.pathname).toBe(
      "/acme/geo/competitors/example"
    );
    expect(reloaded.state.location.state.notraModal).toBeUndefined();
    expect(reloaded.state.matches.at(-1)?.routeId).toBe(detail.id);
  });

  test.each([
    ["analytics/leaderboard", "analytics/accounts/alice", "account"],
    ["geo/gaps", "geo/competitors/example", "competitor"],
    ["integrations", "integrations/framer", "framer"],
    ["integrations", "integrations/raycast", "raycast"],
  ] as const)(
    "%s to %s is masked only on soft navigation",
    async (from, to, kind) => {
      const root = createRootRoute();
      const background = createRoute({
        getParentRoute: () => root,
        path: `/acme/${from}`,
      });
      const detail = createRoute({
        getParentRoute: () => root,
        path: `/acme/${to}`,
      });
      const routeTree = root.addChildren([background, detail]);
      const history = createMemoryHistory({
        initialEntries: [`/acme/${from}`],
      });
      const router = createRouter({
        routeTree,
        history,
        isServer: false,
        origin: "http://localhost",
      });
      await router.load();
      const options = modalNavigationOptions(
        router.state.location,
        `/acme/${to}`
      );
      if (!options) {
        throw new Error("Expected modal navigation options");
      }
      await router.navigate(options);
      expect(router.state.matches.at(-1)?.routeId).toBe(background.id);
      expect(router.state.location.state.notraModal?.kind).toBe(kind);
      expect(history.location.href).toBe(`/acme/${to}`);

      const direct = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [`/acme/${to}`] }),
        isServer: false,
        origin: "http://localhost",
      });
      await direct.load();
      expect(direct.state.matches.at(-1)?.routeId).toBe(detail.id);
      expect(direct.state.location.maskedLocation).toBeUndefined();
      expect(direct.state.location.state.notraModal).toBeUndefined();
    }
  );
});
