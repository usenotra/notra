import { createRouter } from "@tanstack/react-router";

import { RouteError } from "@/components/route-error";
import { parseSearch, stringifySearch } from "@/utils/search-params";

import { createDashboardUiRoutes } from "./routes/-dashboard-ui";
import { createEntryUiRoutes } from "./routes/-entry-ui";
import { createOnboardingUiRoutes } from "./routes/-onboarding-ui";
import { routeTree } from "./routeTree.gen";

const dashboardRouteTree = routeTree.addChildren([
  ...Object.values(routeTree.children ?? {}),
  ...createDashboardUiRoutes(routeTree),
  ...createEntryUiRoutes(routeTree),
  ...createOnboardingUiRoutes(routeTree),
]);

export function getRouter() {
  return createRouter({
    routeTree: dashboardRouteTree,
    scrollRestoration: true,
    defaultErrorComponent: RouteError,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    defaultPreload: "intent",
    // A loader preloaded on hover serves the click that follows instead of
    // running again, so the click no longer waits for a server round trip.
    // Revisits within the window reuse the loader result too; page data
    // itself stays fresh through React Query.
    defaultPreloadStaleTime: 30_000,
    defaultStaleTime: 30_000,
    parseSearch,
    stringifySearch,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
