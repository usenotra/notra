import { HydrationBoundary } from "@tanstack/react-query";
import { type AnyRoute, redirect } from "@tanstack/react-router";
import { lazy } from "react";

import { PageContainer } from "@/components/layout/container";
import { geoSettingsPath } from "@/utils/settings-path";

import { loadGeoPage } from "./-dashboard-loaders";
import { createUiRoute } from "./-ui-route";

const Overview = lazy(() => import("@/app/(dashboard)/[slug]/geo/page-client"));
const CompetitorDetailView = lazy(() =>
  import("@/components/geo/competitor-detail-view").then((module) => ({
    default: module.CompetitorDetailView,
  }))
);
const Traffic = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/traffic/page-client")
);
const Competitors = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/competitors/page-client")
);
const Readiness = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/agent-readiness/page-client")
);
const Directions = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/directions/page-client")
);
const Gaps = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/gaps/page-client")
);
const Personas = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/personas/page-client")
);
const Prompts = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/prompts/page-client")
);
const Shelf = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/shelf-space/page-client")
);
const Write = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/write/page-client")
);
const OverviewLoading = lazy(() =>
  import("@/app/(dashboard)/[slug]/geo/skeleton").then((module) => ({
    default: module.GeoPageSkeleton,
  }))
);
const TrafficLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/traffic/loading")
);
const CompetitorsLoading = lazy(() =>
  import("@/app/(dashboard)/[slug]/geo/competitors/skeleton").then(
    (module) => ({ default: module.GeoCompetitorsSkeleton })
  )
);
const CompetitorLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/competitors/[competitor]/loading")
);
const ReadinessLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/agent-readiness/loading")
);
const GapsLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/gaps/loading")
);
const PersonasLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/personas/loading")
);
const PromptsLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/prompts/loading")
);
const ShelfLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/shelf-space/loading")
);
const WriteLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/geo/write/loading")
);

export function createGeoUiRoutes(parent: AnyRoute) {
  return [
    createUiRoute({
      parent,
      path: "/",
      title: { namespace: "common", key: "labels.geo" },
      pendingComponent: OverviewLoading,
      loader: (input) => loadGeoPage({ data: { ...input, kind: "overview" } }),
      component: ({ data, params }) => (
        <HydrationBoundary state={data.state}>
          <Overview organizationSlug={params.slug} />
        </HydrationBoundary>
      ),
    }),
    createUiRoute({
      parent,
      path: "traffic",
      title: { namespace: "geo.pages.traffic", key: "metaTitle" },
      pendingComponent: TrafficLoading,
      loader: (input) => loadGeoPage({ data: { ...input, kind: "traffic" } }),
      component: ({ data, params }) => (
        <HydrationBoundary state={data.state}>
          <Traffic organizationSlug={params.slug} />
        </HydrationBoundary>
      ),
    }),
    createUiRoute({
      parent,
      path: "competitors",
      title: { namespace: "geo.pages.competitors", key: "metaTitle" },
      pendingComponent: CompetitorsLoading,
      component: ({ params }) => <Competitors organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "competitors/$competitor",
      title: { namespace: "geo.shared", key: "competitor" },
      pendingComponent: CompetitorLoading,
      component: ({ params }) => {
        // The router already decodes path params.
        const competitor = params.competitor;
        return (
          <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="w-full px-4 lg:px-6">
              <CompetitorDetailView
                competitor={competitor}
                organizationSlug={params.slug}
                variant="page"
              />
            </div>
          </PageContainer>
        );
      },
    }),
    createUiRoute({
      parent,
      path: "agent-readiness",
      title: { namespace: "common", key: "labels.agentReadiness" },
      pendingComponent: ReadinessLoading,
      component: ({ params }) => <Readiness organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "directions",
      title: { namespace: "geo.shared", key: "geoDirections" },
      pendingComponent: OverviewLoading,
      component: () => <Directions />,
    }),
    createUiRoute({
      parent,
      path: "gaps",
      title: { namespace: "geo.pages.gaps", key: "metaTitle" },
      pendingComponent: GapsLoading,
      component: ({ params }) => <Gaps organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "personas",
      title: { namespace: "geo.pages.personas", key: "metaTitle" },
      pendingComponent: PersonasLoading,
      component: ({ params }) => <Personas organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "prompts",
      title: { namespace: "geo.pages.prompts", key: "metaTitle" },
      pendingComponent: PromptsLoading,
      component: ({ params }) => <Prompts organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "shelf-space",
      title: { namespace: "geo.pages.shelfSpace", key: "metaTitle" },
      pendingComponent: ShelfLoading,
      component: ({ params }) => <Shelf organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "write",
      title: { namespace: "geo.pages.write", key: "metaTitle" },
      pendingComponent: WriteLoading,
      component: ({ params }) => <Write organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "settings",
      title: { namespace: "common", key: "labels.geoSettings" },
      component: () => null,
      loader: async ({ params, searchParams }) => {
        throw redirect({
          href: geoSettingsPath(params.slug ?? "", {
            project:
              typeof searchParams.project === "string"
                ? searchParams.project
                : undefined,
          }),
        });
      },
    }),
  ];
}
