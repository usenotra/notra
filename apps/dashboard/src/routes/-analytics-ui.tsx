import type { AnyRoute } from "@tanstack/react-router";

import { PageContainer } from "@/components/layout/container";
import { lazyPage } from "@/utils/lazy-page";

import { createUiRoute } from "./-ui-route";

const Overview = lazyPage(
  () => import("@/app/(dashboard)/[slug]/analytics/page-client")
);
const Leaderboard = lazyPage(
  () => import("@/app/(dashboard)/[slug]/analytics/leaderboard/page-client")
);
const AccountDetailView = lazyPage(() =>
  import("@/components/analytics/account-detail-view").then((module) => ({
    default: module.AccountDetailView,
  }))
);
const Loading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/analytics/loading")
);

export function createAnalyticsUiRoutes(parent: AnyRoute) {
  return [
    createUiRoute({
      parent,
      path: "/",
      title: { namespace: "common", key: "labels.analytics" },
      pendingComponent: Loading,
      preload: Overview.preload,
      component: () => <Overview />,
    }),
    createUiRoute({
      parent,
      path: "leaderboard",
      title: { namespace: "common", key: "labels.leaderboard" },
      pendingComponent: Loading,
      preload: Leaderboard.preload,
      component: () => <Leaderboard />,
    }),
    createUiRoute({
      parent,
      path: "accounts/$handle",
      title: { namespace: "common", key: "labels.account" },
      pendingComponent: Loading,
      preload: AccountDetailView.preload,
      component: ({ params }) => {
        // The router already decodes path params.
        const handle = params.handle;
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
