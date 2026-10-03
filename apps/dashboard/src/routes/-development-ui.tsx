import {
  type AnyRoute,
  createRoute,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { AutumnOrgProvider } from "@/components/providers/autumn-org-provider";
import { DatabaseProvider } from "@/components/providers/database-provider";

import { createUiRoute } from "./-ui-route";

export function createDevelopmentUiRoutes(parent: AnyRoute) {
  if (process.env.NODE_ENV !== "development") {
    return [];
  }

  const DesignSystem = lazy(() => import("@/app/design-system/page.dev"));
  const TwoFactor = lazy(
    () => import("@/app/design-system/2fa-preview/page.dev")
  );
  const AuthFlow = lazy(() => import("@/app/design-system/auth-flow/page.dev"));
  const CodeResearch = lazy(
    () => import("@/app/design-system/code-research/page.dev")
  );
  const GeoDemo = lazy(() => import("@/app/design-system/geo-demo/page.dev"));
  const GeoFirstScan = lazy(
    () => import("@/app/design-system/geo-first-scan/page.dev")
  );
  const GeoGaps = lazy(() => import("@/app/design-system/geo-gaps/page.dev"));
  const GeoTraffic = lazy(
    () => import("@/app/design-system/geo-traffic/page.dev")
  );
  const Icons = lazy(() => import("@/app/design-system/icons/page.dev"));
  const ScanFilters = lazy(
    () => import("@/app/design-system/scan-filters/page.dev")
  );

  const preview = createRoute({
    getParentRoute: () => parent,
    path: "design-system",
    beforeLoad: () => {
      if (process.env.NODE_ENV !== "development") {
        throw notFound();
      }
    },
    component: () => (
      <DatabaseProvider>
        <AutumnOrgProvider>
          <Suspense>
            <Outlet />
          </Suspense>
        </AutumnOrgProvider>
      </DatabaseProvider>
    ),
  });
  return [
    preview.addChildren([
      createUiRoute({
        parent: preview,
        path: "/",
        component: () => <DesignSystem />,
      }),
      createUiRoute({
        parent: preview,
        path: "2fa-preview",
        component: () => <TwoFactor />,
      }),
      createUiRoute({
        parent: preview,
        path: "auth-flow",
        component: () => <AuthFlow />,
      }),
      createUiRoute({
        parent: preview,
        path: "code-research",
        component: () => <CodeResearch />,
      }),
      createUiRoute({
        parent: preview,
        path: "geo-demo",
        component: () => <GeoDemo />,
      }),
      createUiRoute({
        parent: preview,
        path: "geo-first-scan",
        component: () => <GeoFirstScan />,
      }),
      createUiRoute({
        parent: preview,
        path: "geo-gaps",
        component: () => <GeoGaps />,
      }),
      createUiRoute({
        parent: preview,
        path: "geo-traffic",
        component: () => <GeoTraffic />,
      }),
      createUiRoute({
        parent: preview,
        path: "icons",
        component: () => <Icons />,
      }),
      createUiRoute({
        parent: preview,
        path: "scan-filters",
        component: () => <ScanFilters />,
      }),
      ...(
        [
          "chatgpt",
          "claude-chat",
          "claude",
          "codex",
          "gemini",
          "opencode",
          "perplexity",
        ] as const
      ).map((name) =>
        createUiRoute({
          parent: preview,
          path: name,
          component: () => null,
          loader: async () => {
            const suffix =
              name === "claude" || name === "codex" || name === "opencode"
                ? "session"
                : "thread";
            throw redirect({ href: `/design-system#${name}-${suffix}` });
          },
        })
      ),
    ]),
  ];
}
