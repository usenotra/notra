import {
  type AnyRoute,
  createRoute,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Suspense } from "react";

import { AutumnOrgProvider } from "@/components/providers/autumn-org-provider";
import { DatabaseProvider } from "@/components/providers/database-provider";
import { lazyPage } from "@/utils/lazy-page";

import { createUiRoute } from "./-ui-route";

export function createDevelopmentUiRoutes(parent: AnyRoute) {
  if (process.env.NODE_ENV !== "development") {
    return [];
  }

  const DesignSystem = lazyPage(() => import("@/app/design-system/page.dev"));
  const TwoFactor = lazyPage(
    () => import("@/app/design-system/2fa-preview/page.dev")
  );
  const AuthFlow = lazyPage(
    () => import("@/app/design-system/auth-flow/page.dev")
  );
  const CodeResearch = lazyPage(
    () => import("@/app/design-system/code-research/page.dev")
  );
  const GeoDemo = lazyPage(
    () => import("@/app/design-system/geo-demo/page.dev")
  );
  const GeoFirstScan = lazyPage(
    () => import("@/app/design-system/geo-first-scan/page.dev")
  );
  const GeoGaps = lazyPage(
    () => import("@/app/design-system/geo-gaps/page.dev")
  );
  const GeoTraffic = lazyPage(
    () => import("@/app/design-system/geo-traffic/page.dev")
  );
  const Icons = lazyPage(() => import("@/app/design-system/icons/page.dev"));
  const ScanFilters = lazyPage(
    () => import("@/app/design-system/scan-filters/page.dev")
  );
  const Webhooks = lazyPage(
    () => import("@/app/design-system/webhooks/page.dev")
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
        preload: DesignSystem.preload,
        component: () => <DesignSystem />,
      }),
      createUiRoute({
        parent: preview,
        path: "2fa-preview",
        preload: TwoFactor.preload,
        component: () => <TwoFactor />,
      }),
      createUiRoute({
        parent: preview,
        path: "auth-flow",
        preload: AuthFlow.preload,
        component: () => <AuthFlow />,
      }),
      createUiRoute({
        parent: preview,
        path: "code-research",
        preload: CodeResearch.preload,
        component: () => <CodeResearch />,
      }),
      createUiRoute({
        parent: preview,
        path: "geo-demo",
        preload: GeoDemo.preload,
        component: () => <GeoDemo />,
      }),
      createUiRoute({
        parent: preview,
        path: "geo-first-scan",
        preload: GeoFirstScan.preload,
        component: () => <GeoFirstScan />,
      }),
      createUiRoute({
        parent: preview,
        path: "geo-gaps",
        preload: GeoGaps.preload,
        component: () => <GeoGaps />,
      }),
      createUiRoute({
        parent: preview,
        path: "geo-traffic",
        preload: GeoTraffic.preload,
        component: () => <GeoTraffic />,
      }),
      createUiRoute({
        parent: preview,
        path: "icons",
        preload: Icons.preload,
        component: () => <Icons />,
      }),
      createUiRoute({
        parent: preview,
        path: "scan-filters",
        preload: ScanFilters.preload,
        component: () => <ScanFilters />,
      }),
      createUiRoute({
        parent: preview,
        path: "webhooks",
        preload: Webhooks.preload,
        component: () => <Webhooks />,
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
