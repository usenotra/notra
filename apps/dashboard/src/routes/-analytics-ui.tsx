import type { AnyRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { AccountDetailView } from "@/components/analytics/account-detail-view";
import { PageContainer } from "@/components/layout/container";

import { createUiRoute } from "./-ui-route";

const Overview = lazy(
  () => import("@/app/(dashboard)/[slug]/analytics/page-client")
);
const Leaderboard = lazy(
  () => import("@/app/(dashboard)/[slug]/analytics/leaderboard/page-client")
);
const Loading = lazy(
  () => import("@/app/(dashboard)/[slug]/analytics/loading")
);

export function createAnalyticsUiRoutes(parent: AnyRoute) {
  return [
    createUiRoute({
      parent,
      path: "/",
      title: { namespace: "common", key: "labels.analytics" },
      pendingComponent: Loading,
      component: () => <Overview />,
    }),
    createUiRoute({
      parent,
      path: "leaderboard",
      title: { namespace: "common", key: "labels.leaderboard" },
      pendingComponent: Loading,
      component: () => <Leaderboard />,
    }),
    createUiRoute({
      parent,
      path: "accounts/$handle",
      title: { namespace: "common", key: "labels.account" },
      pendingComponent: Loading,
      component: ({ params }) => {
        const handle = decodeURIComponent(params.handle);
        return (
          <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="w-full px-4 lg:px-6">
              <AccountDetailView
                handle={handle}
                organizationSlug={params.slug}
                variant="page"
              />
            </div>
          </PageContainer>
        );
      },
    }),
  ];
}
