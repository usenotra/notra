import { createRouter } from "@tanstack/react-router";

import { RouteError } from "@/components/route-error";

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
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
