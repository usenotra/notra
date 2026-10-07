import {
  type AnyRoute,
  createRoute,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { SiteLayout } from "@/components/sites/site-layout";
import type { SiteSectionUiPage } from "@/types/ui-route";
import { lazyPage } from "@/utils/lazy-page";
import { sitePreviewDeploymentsHref } from "@/utils/site-links";

import { loadSitesEnabled } from "./-sites-loaders";
import { createUiRoute } from "./-ui-route";

const Sites = lazyPage(
  () => import("@/app/(dashboard)/[slug]/sites/page-client")
);
const NewSite = lazyPage(
  () => import("@/app/(dashboard)/[slug]/sites/new/page-client")
);
const SitesLoading = lazyPage(() =>
  import("@/app/(dashboard)/[slug]/sites/skeleton").then((module) => ({
    default: module.SitesPageSkeleton,
  }))
);
const NewSiteLoading = lazyPage(() =>
  import("@/app/(dashboard)/[slug]/sites/new/skeleton").then((module) => ({
    default: module.NewSitePageSkeleton,
  }))
);
const SiteLoading = lazyPage(() =>
  import("@/components/sites/site-page-skeleton").then((module) => ({
    default: module.SitePageSkeleton,
  }))
);
const Overview = lazyPage(() =>
  import("@/components/sites/pages/site-overview-page").then((module) => ({
    default: module.SiteOverviewPage,
  }))
);
const Analytics = lazyPage(() =>
  import("@/components/sites/pages/site-analytics-page").then((module) => ({
    default: module.SiteAnalyticsPage,
  }))
);
const Deployments = lazyPage(() =>
  import("@/components/sites/pages/site-deployments-page").then((module) => ({
    default: module.SiteDeploymentsPage,
  }))
);
const DeploymentDetail = lazyPage(() =>
  import("@/components/sites/pages/site-deployment-detail-page").then(
    (module) => ({ default: module.SiteDeploymentDetailPage })
  )
);
const Domains = lazyPage(() =>
  import("@/components/sites/pages/site-domains-page").then((module) => ({
    default: module.SiteDomainsPage,
  }))
);
const Editor = lazyPage(() =>
  import("@/components/sites/pages/site-editor-page").then((module) => ({
    default: module.SiteEditorPage,
  }))
);
const Integrations = lazyPage(() =>
  import("@/components/sites/pages/site-integrations-page").then((module) => ({
    default: module.SiteIntegrationsPage,
  }))
);
const Settings = lazyPage(() =>
  import("@/components/sites/pages/site-settings-page").then((module) => ({
    default: module.SiteSettingsPage,
  }))
);

const SITE_SECTION_PAGES: readonly SiteSectionUiPage[] = [
  { section: "analytics", page: Analytics },
  { section: "deployments", page: Deployments },
  { section: "domains", page: Domains },
  { section: "editor", page: Editor },
  { section: "integrations", page: Integrations },
  { section: "settings", page: Settings },
];

export function createSitesUiRoutes(organization: AnyRoute) {
  const sites = createRoute({
    getParentRoute: () => organization,
    path: "sites",
    beforeLoad: async ({ params, search }) => {
      const enabled = await loadSitesEnabled({
        data: { params, searchParams: search },
      });
      if (!enabled) {
        throw notFound();
      }
    },
    component: Outlet,
  });
  function SiteRouteLayout() {
    const { slug, siteId } = site.useParams();
    return (
      <SiteLayout organizationSlug={slug} siteId={siteId}>
        <Outlet />
      </SiteLayout>
    );
  }

  const site = createRoute({
    getParentRoute: () => sites,
    path: "$siteId",
    pendingComponent: SiteLoading,
    component: SiteRouteLayout,
  });

  const siteRoutes = [
    createRoute({
      getParentRoute: () => site,
      path: "previews",
      beforeLoad: ({ params }) => {
        throw redirect({
          href: sitePreviewDeploymentsHref(params.slug, params.siteId),
          replace: true,
        });
      },
    }),
    createUiRoute({
      parent: site,
      path: "/",
      title: { namespace: "sites.detail.tabs", key: "overview" },
      pendingComponent: SiteLoading,
      preload: Overview.preload,
      component: () => <Overview />,
    }),
    ...SITE_SECTION_PAGES.map(({ section, page: Page }) =>
      createUiRoute({
        parent: site,
        path: section,
        title: { namespace: "sites.detail.tabs", key: section },
        pendingComponent: SiteLoading,
        preload: Page.preload,
        component: () => <Page />,
      })
    ),
    createUiRoute({
      parent: site,
      path: "deployments/$deploymentId",
      title: { namespace: "sites.deploymentPage", key: "title" },
      pendingComponent: SiteLoading,
      preload: DeploymentDetail.preload,
      component: ({ params }) => (
        <DeploymentDetail deploymentId={params.deploymentId} />
      ),
    }),
  ];

  return [
    sites.addChildren([
      createUiRoute({
        parent: sites,
        path: "/",
        title: { namespace: "sites", key: "title" },
        pendingComponent: SitesLoading,
        preload: Sites.preload,
        component: ({ params }) => <Sites organizationSlug={params.slug} />,
      }),
      createUiRoute({
        parent: sites,
        path: "new",
        title: { namespace: "sites.new", key: "title" },
        pendingComponent: NewSiteLoading,
        preload: NewSite.preload,
        component: ({ params }) => <NewSite organizationSlug={params.slug} />,
      }),
      site.addChildren(siteRoutes),
    ]),
  ];
}
