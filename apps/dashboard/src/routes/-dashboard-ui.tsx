import { HydrationBoundary } from "@tanstack/react-query";
import {
  type AnyRoute,
  createRoute,
  Outlet,
  redirect,
  type Router,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { AnalyticsProvider } from "@/components/analytics/analytics-context";
import { AnalyticsShell } from "@/components/analytics/analytics-shell";
import { DashboardClientWrapper } from "@/components/dashboard/dashboard-client-wrapper";
import { StudioUpgradeGate } from "@/components/dashboard/studio-upgrade-gate";
import { GeoCatalogWarmer } from "@/components/geo/geo-catalog-warmer";
import { GeoPageGate } from "@/components/geo/geo-page-gate";
import { IntegrationsBackLink } from "@/components/integrations/integrations-back-link";
import { GeoLiveProvider } from "@/components/providers/geo-live-provider";
import { GeoProjectQueryProvider } from "@/components/providers/geo-project-provider";
import { LOGS_SETTINGS_SEARCH_KEYS } from "@/constants/settings";
import {
  firstSearchParamValue,
  settingsPath,
  settingsQueryFromSearchParams,
} from "@/utils/settings-path";

import { createAnalyticsUiRoutes } from "./-analytics-ui";
import {
  gateDashboardHome,
  loadDashboardHome,
  loadGeoScope,
  loadOrganizationPage,
  loadOrganizationShell,
} from "./-dashboard-loaders";
import { createGeoUiRoutes } from "./-geo-ui";
import { createIntegrationUiRoutes } from "./-integrations-ui";
import { UiModalProvider } from "./-ui-modal";
import { createUiRoute, uiRouteSearch } from "./-ui-route";

const Home = lazy(() => import("@/app/(dashboard)/[slug]/page-client"));
const Content = lazy(
  () => import("@/app/(dashboard)/[slug]/content/page-client")
);
const ContentDetail = lazy(
  () => import("@/app/(dashboard)/[slug]/content/[id]/page-client")
);
const Collection = lazy(
  () => import("@/app/(dashboard)/[slug]/collection/[id]/page-client")
);
const Skills = lazy(
  () => import("@/app/(dashboard)/[slug]/skills/page-client")
);
const SkillDetail = lazy(
  () => import("@/app/(dashboard)/[slug]/skills/[name]/page-client")
);
const Chat = lazy(() => import("@/app/(dashboard)/[slug]/chat/page-client"));
const ApiKeys = lazy(() => import("@/app/(dashboard)/[slug]/api-keys/page"));
const Events = lazy(
  () => import("@/app/(dashboard)/[slug]/automation/events/page-client")
);
const Schedules = lazy(
  () => import("@/app/(dashboard)/[slug]/automation/schedules/page-client")
);
const Brand = lazy(
  () => import("@/app/(dashboard)/[slug]/brand/identity/page-client")
);
const Feedback = lazy(
  () => import("@/app/(dashboard)/[slug]/feedback/page-client")
);
const Iris = lazy(() => import("@/app/(dashboard)/[slug]/iris/page-client"));
const BillingSuccess = lazy(
  () => import("@/app/(dashboard)/[slug]/settings/billing/success/page")
);
const DashboardLoading = lazy(() => import("@/app/(dashboard)/[slug]/loading"));
const ContentLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/content/loading")
);
const ContentDetailLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/content/[id]/loading")
);
const CollectionLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/collection/[id]/loading")
);
const SkillsLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/skills/loading")
);
const SkillDetailLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/skills/[name]/loading")
);
const ChatLoading = lazy(() => import("@/app/(dashboard)/[slug]/chat/loading"));
const EventsLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/automation/events/loading")
);
const SchedulesLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/automation/schedules/loading")
);
const BrandLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/brand/identity/loading")
);
const FeedbackLoading = lazy(
  () => import("@/app/(dashboard)/[slug]/feedback/loading")
);
const IrisLoading = lazy(() => import("@/app/(dashboard)/[slug]/iris/loading"));

type OrganizationShell = Awaited<ReturnType<typeof loadOrganizationShell>>;

let clientShellCache: { slug: string; shell: OrganizationShell } | undefined;

export function createDashboardUiRoutes(parent: AnyRoute) {
  function OrganizationLayout() {
    const { organizationShell } =
      organization.useRouteContext<Router<typeof organization>>();
    return (
      <DashboardClientWrapper {...organizationShell}>
        <Suspense fallback={<DashboardLoading />}>
          <Outlet />
        </Suspense>
      </DashboardClientWrapper>
    );
  }

  function AnalyticsLayout() {
    const { slug } = organization.useParams<Router<typeof organization>>();
    return (
      <AnalyticsProvider organizationSlug={slug}>
        <AnalyticsShell>
          <UiModalProvider>
            <Outlet />
          </UiModalProvider>
        </AnalyticsShell>
      </AnalyticsProvider>
    );
  }

  function GeoLayout() {
    const { slug } = organization.useParams<Router<typeof organization>>();
    const { organizationShell } =
      organization.useRouteContext<Router<typeof organization>>();
    const { projectId } = geo.useLoaderData<Router<typeof geo>>();
    return (
      <>
        <GeoCatalogWarmer organizationSlug={slug} />
        <GeoProjectQueryProvider initialProjectId={projectId} key={slug}>
          <GeoLiveProvider
            organizationId={organizationShell.initialActiveOrganization.id}
          >
            <GeoPageGate fallback={<DashboardLoading />}>
              <UiModalProvider>
                <Outlet />
              </UiModalProvider>
            </GeoPageGate>
          </GeoLiveProvider>
        </GeoProjectQueryProvider>
      </>
    );
  }

  const organization = createRoute({
    getParentRoute: () => parent,
    path: "$slug",
    validateSearch: uiRouteSearch,
    beforeLoad: async ({ params, search, cause }) => {
      // The shell only seeds client state (sidebar, active organization), like
      // the Next layout that stayed mounted between pages. Reuse it while the
      // user stays in this workspace; entering a workspace fetches it again.
      // Page loaders still check access on every request.
      const cached = clientShellCache;
      if (cause !== "enter" && cached?.slug === params.slug) {
        return { organizationShell: cached.shell };
      }
      const shell = await loadOrganizationShell({
        data: { params, searchParams: search },
      });
      // Never on the server: a module-level cache there would be shared
      // between users.
      if (typeof window !== "undefined") {
        clientShellCache = { slug: params.slug, shell };
      }
      return { organizationShell: shell };
    },
    pendingComponent: DashboardLoading,
    component: OrganizationLayout,
  });

  const analytics = createRoute({
    getParentRoute: () => organization,
    path: "analytics",
    component: AnalyticsLayout,
  });

  const geo = createRoute({
    getParentRoute: () => organization,
    path: "geo",
    loader: ({ params }) =>
      loadGeoScope({ data: { params, searchParams: {} } }),
    component: GeoLayout,
  });

  const integrations = createRoute({
    getParentRoute: () => organization,
    path: "integrations",
    component: () => (
      <>
        <IntegrationsBackLink />
        <UiModalProvider>
          <Outlet />
        </UiModalProvider>
      </>
    ),
  });

  const routes = [
    createUiRoute({
      parent: organization,
      path: "/",
      title: { namespace: "dashboard", key: "metaTitle" },
      loader: (input) => loadDashboardHome({ data: input }),
      gate: (input) => gateDashboardHome({ data: input }),
      stream: true,
      pendingComponent: DashboardLoading,
      component: ({ params, data }) =>
        data.hasAccess ? (
          <HydrationBoundary state={data.state}>
            <Home
              greetingText={data.greetingText}
              organizationSlug={params.slug}
            />
          </HydrationBoundary>
        ) : (
          <StudioUpgradeGate slug={params.slug} />
        ),
    }),
    createUiRoute({
      parent: organization,
      path: "content",
      title: { namespace: "common", key: "labels.content" },
      loader: (input) =>
        loadOrganizationPage({ data: { ...input, kind: "content" } }),
      stream: true,
      pendingComponent: ContentLoading,
      component: ({ params, data }) => (
        <HydrationBoundary state={data.state}>
          <Content
            initialProjectId={data.projectId ?? null}
            organizationSlug={params.slug}
          />
        </HydrationBoundary>
      ),
    }),
    createUiRoute({
      parent: organization,
      path: "content/$id",
      title: {
        namespace: "content.detail",
        key: "metaTitle",
        descriptionKey: "metaDescription",
      },
      loader: (input) =>
        loadOrganizationPage({ data: { ...input, kind: "content-detail" } }),
      stream: true,
      pendingComponent: ContentDetailLoading,
      component: ({ params, data }) => (
        <HydrationBoundary state={data.state}>
          <ContentDetail
            contentId={params.id}
            key={`${data.organizationId}:${params.id}`}
            organizationId={data.organizationId}
            organizationSlug={params.slug}
          />
        </HydrationBoundary>
      ),
    }),
    createUiRoute({
      parent: organization,
      path: "collection/$id",
      title: {
        namespace: "content.collections.detail",
        key: "metaTitle",
        descriptionKey: "metaDescription",
      },
      loader: (input) =>
        loadOrganizationPage({ data: { ...input, kind: "collection" } }),
      pendingComponent: CollectionLoading,
      component: ({ params, data }) => (
        <Collection
          collectionId={params.id}
          organizationId={data.organizationId}
          organizationSlug={params.slug}
        />
      ),
    }),
    createUiRoute({
      parent: organization,
      path: "skills",
      title: { namespace: "common", key: "labels.skills" },
      loader: (input) =>
        loadOrganizationPage({ data: { ...input, kind: "skills" } }),
      stream: true,
      pendingComponent: SkillsLoading,
      component: ({ params, data }) => (
        <HydrationBoundary state={data.state}>
          <Skills organizationId={data.organizationId} slug={params.slug} />
        </HydrationBoundary>
      ),
    }),
    createUiRoute({
      parent: organization,
      path: "skills/$name",
      title: { namespace: "skills.detail", key: "metaTitle" },
      loader: (input) =>
        loadOrganizationPage({ data: { ...input, kind: "skill-detail" } }),
      stream: true,
      pendingComponent: SkillDetailLoading,
      component: ({ params, data }) => (
        <HydrationBoundary state={data.state}>
          <SkillDetail
            key={`${data.organizationId}:${params.name}`}
            name={params.name}
            organizationId={data.organizationId}
            slug={params.slug}
          />
        </HydrationBoundary>
      ),
    }),
    createUiRoute({
      parent: organization,
      path: "chat",
      title: { title: "Chat" },
      pendingComponent: ChatLoading,
      component: ({ params }) => <Chat organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent: organization,
      path: "chat/$chatId",
      title: { title: "Chat" },
      pendingComponent: ChatLoading,
      component: ({ params }) => (
        <Chat
          chatId={params.chatId}
          key={params.chatId}
          organizationSlug={params.slug}
        />
      ),
    }),
    createUiRoute({
      parent: organization,
      path: "api-keys",
      component: () => <ApiKeys />,
    }),
    createUiRoute({
      parent: organization,
      path: "automation/events",
      title: { namespace: "automation", key: "eventsMetaTitle" },
      pendingComponent: EventsLoading,
      component: ({ params }) => <Events organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent: organization,
      path: "automation/schedules",
      title: { namespace: "automation", key: "schedulesMetaTitle" },
      pendingComponent: SchedulesLoading,
      component: ({ params }) => <Schedules organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent: organization,
      path: "brand/identity",
      title: { namespace: "common", key: "labels.brandIdentity" },
      pendingComponent: BrandLoading,
      component: ({ params }) => <Brand organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent: organization,
      path: "feedback",
      title: { namespace: "common", key: "labels.feedback" },
      pendingComponent: FeedbackLoading,
      component: ({ params }) => <Feedback organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent: organization,
      path: "iris",
      title: { title: "Iris" },
      pendingComponent: IrisLoading,
      component: ({ params }) => <Iris organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent: organization,
      path: "settings/billing/success",
      component: () => <BillingSuccess />,
    }),
    ...(
      [
        "account",
        "appearance",
        "attachments",
        "billing",
        "credits",
        "general",
        "logs",
        "members",
        "notifications",
        "usage",
        "usage-alerts",
      ] as const
    ).map((section) =>
      createUiRoute({
        parent: organization,
        path: `settings/${section}`,
        component: () => null,
        loader: async ({ params, searchParams }) => {
          let extras: Record<string, string | undefined> | undefined;
          if (section === "logs") {
            extras = settingsQueryFromSearchParams(
              searchParams,
              LOGS_SETTINGS_SEARCH_KEYS
            );
          } else if (section === "credits" && searchParams.success === "true") {
            extras = { success: "true" };
          }
          const target =
            section === "billing" &&
            firstSearchParamValue(searchParams.tab) === "usage"
              ? "usage"
              : section;
          throw redirect({
            href: settingsPath(params.slug ?? "", target, extras),
          });
        },
      })
    ),
    createUiRoute({
      parent: organization,
      path: "settings/billing/usage",
      component: () => null,
      loader: async ({ params }) => {
        throw redirect({ href: settingsPath(params.slug ?? "", "usage") });
      },
    }),
    createUiRoute({
      parent: organization,
      path: "settings",
      component: () => null,
      loader: async ({ params }) => {
        throw redirect({ href: settingsPath(params.slug ?? "", "general") });
      },
    }),
    createUiRoute({
      parent: organization,
      path: "schedules",
      component: () => null,
      loader: async ({ params }) => {
        throw redirect({
          href: `/${params.slug}/automation/schedules`,
          statusCode: 308,
        });
      },
    }),
    createUiRoute({
      parent: organization,
      path: "automation/schedule",
      component: () => null,
      loader: async ({ params }) => {
        throw redirect({
          href: `/${params.slug}/automation/schedules`,
          statusCode: 308,
        });
      },
    }),
    createUiRoute({
      parent: organization,
      path: "logs",
      component: () => null,
      loader: async ({ params }) => {
        throw redirect({ href: settingsPath(params.slug ?? "", "logs") });
      },
    }),
    analytics.addChildren(createAnalyticsUiRoutes(analytics)),
    geo.addChildren(createGeoUiRoutes(geo)),
    integrations.addChildren(createIntegrationUiRoutes(integrations)),
  ];

  return [organization.addChildren(routes)];
}
