import { HydrationBoundary } from "@tanstack/react-query";
import { type AnyRoute, redirect } from "@tanstack/react-router";

import { PageContainer } from "@/components/layout/container";
import { lazyPage } from "@/utils/lazy-page";
import { geoSettingsPath } from "@/utils/settings-path";

import { gateGeoPage, loadGeoPage } from "./-dashboard-loaders";
import { createUiRoute } from "./-ui-route";

const Overview = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/page-client")
);
const CompetitorDetailView = lazyPage(() =>
  import("@/components/geo/competitor-detail-view").then((module) => ({
    default: module.CompetitorDetailView,
  }))
);
const Traffic = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/traffic/page-client")
);
const Competitors = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/competitors/page-client")
);
const Readiness = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/agent-readiness/page-client")
);
const Directions = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/directions/page-client")
);
const Gaps = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/gaps/page-client")
);
const Personas = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/personas/page-client")
);
const Prompts = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/prompts/page-client")
);
const Shelf = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/shelf-space/page-client")
);
const Write = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/write/page-client")
);
const OverviewLoading = lazyPage(() =>
  import("@/app/(dashboard)/[slug]/geo/skeleton").then((module) => ({
    default: module.GeoPageSkeleton,
  }))
);
const TrafficLoading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/traffic/loading")
);
const CompetitorsLoading = lazyPage(() =>
  import("@/app/(dashboard)/[slug]/geo/competitors/skeleton").then(
    (module) => ({ default: module.GeoCompetitorsSkeleton })
  )
);
const CompetitorLoading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/competitors/[competitor]/loading")
);
const ReadinessLoading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/agent-readiness/loading")
);
const GapsLoading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/gaps/loading")
);
const PersonasLoading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/personas/loading")
);
const PromptsLoading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/prompts/loading")
);
const ShelfLoading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/shelf-space/loading")
);
const WriteLoading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/geo/write/loading")
);

export function createGeoUiRoutes(parent: AnyRoute) {
  return [
    createUiRoute({
      parent,
      path: "/",
      title: { namespace: "common", key: "labels.geo" },
      pendingComponent: OverviewLoading,
      loaderSearchKeys: ["project", "range"],
      loader: (input) => loadGeoPage({ data: { ...input, kind: "overview" } }),
      gate: (input) => gateGeoPage({ data: { ...input, kind: "overview" } }),
      stream: true,
      preload: Overview.preload,
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
      loaderSearchKeys: ["project", "range", "host"],
      loader: (input) => loadGeoPage({ data: { ...input, kind: "traffic" } }),
      gate: (input) => gateGeoPage({ data: { ...input, kind: "traffic" } }),
      stream: true,
      preload: Traffic.preload,
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
      preload: Competitors.preload,
      component: ({ params }) => <Competitors organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "competitors/$competitor",
      title: { namespace: "geo.shared", key: "competitor" },
      pendingComponent: CompetitorLoading,
      preload: CompetitorDetailView.preload,
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
      preload: Readiness.preload,
      component: ({ params }) => <Readiness organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "directions",
      title: { namespace: "geo.shared", key: "geoDirections" },
      pendingComponent: OverviewLoading,
      preload: Directions.preload,
      component: () => <Directions />,
    }),
    createUiRoute({
      parent,
      path: "gaps",
      title: { namespace: "geo.pages.gaps", key: "metaTitle" },
      pendingComponent: GapsLoading,
      preload: Gaps.preload,
      component: ({ params }) => <Gaps organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "personas",
      title: { namespace: "geo.pages.personas", key: "metaTitle" },
      pendingComponent: PersonasLoading,
      preload: Personas.preload,
      component: ({ params }) => <Personas organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "prompts",
      title: { namespace: "geo.pages.prompts", key: "metaTitle" },
      pendingComponent: PromptsLoading,
      preload: Prompts.preload,
      component: ({ params }) => <Prompts organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "shelf-space",
      title: { namespace: "geo.pages.shelfSpace", key: "metaTitle" },
      pendingComponent: ShelfLoading,
      preload: Shelf.preload,
      component: ({ params }) => <Shelf organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "write",
      title: { namespace: "geo.pages.write", key: "metaTitle" },
      pendingComponent: WriteLoading,
      preload: Write.preload,
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
