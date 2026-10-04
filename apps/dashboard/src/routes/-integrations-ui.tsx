import { HydrationBoundary } from "@tanstack/react-query";
import { type AnyRoute, redirect } from "@tanstack/react-router";

import { GeoProjectQueryProvider } from "@/components/providers/geo-project-provider";
import type { UiPageProps } from "@/types/migration-routes";
import { lazyPage } from "@/utils/lazy-page";

import {
  loadGeoPage,
  loadIntegrationConnect,
  loadLinearDetail,
  loadOrganizationPage,
} from "./-dashboard-loaders";
import { createUiRoute } from "./-ui-route";

const Integrations = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/page-client")
);
const Framer = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/framer/page-client")
);
const Raycast = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/raycast/page-client")
);
const Github = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/github/page-client")
);
const Gsc = lazyPage(
  () =>
    import("@/app/(dashboard)/[slug]/integrations/google-search-console/page-client")
);
const Granola = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/granola/page-client")
);
const Linear = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/linear/page-client")
);
const LinearDetail = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/linear/[id]/page-client")
);
const Mcp = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/mcp/page-client")
);
const Slack = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/slack/page-client")
);
const Loading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/loading")
);
const GithubLoading = lazyPage(
  () => import("@/app/(dashboard)/[slug]/integrations/github/loading")
);
const GscLoading = lazyPage(
  () =>
    import("@/app/(dashboard)/[slug]/integrations/google-search-console/loading")
);

function FramerPage({ params }: UiPageProps<undefined>) {
  return <Framer organizationSlug={params.slug} />;
}

function RaycastPage({ params }: UiPageProps<undefined>) {
  return <Raycast organizationSlug={params.slug} />;
}

export function createIntegrationUiRoutes(parent: AnyRoute) {
  return [
    createUiRoute({
      parent,
      path: "/",
      title: { namespace: "common", key: "labels.integrations" },
      pendingComponent: Loading,
      loaderSearchKeys: ["project", "page"],
      loader: (input) =>
        loadOrganizationPage({ data: { ...input, kind: "integrations" } }),
      stream: true,
      preload: Integrations.preload,
      component: ({ data, params }) => (
        <HydrationBoundary state={data.state}>
          <Integrations organizationSlug={params.slug} />
        </HydrationBoundary>
      ),
    }),
    createUiRoute({
      parent,
      path: "$integrationSlug",
      title: { namespace: "common", key: "labels.integrations" },
      pendingComponent: Loading,
      loader: (input) => loadIntegrationConnect({ data: input }),
      preload: Integrations.preload,
      component: ({ data, params }) => (
        <Integrations
          connectSlug={data.connectSlug}
          organizationSlug={params.slug}
        />
      ),
    }),
    createUiRoute({
      parent,
      path: "framer",
      title: { namespace: "integrations.framer", key: "metaTitle" },
      pendingComponent: Loading,
      component: FramerPage,
    }),
    createUiRoute({
      parent,
      path: "raycast",
      title: { namespace: "integrations.raycast", key: "metaTitle" },
      pendingComponent: Loading,
      component: RaycastPage,
    }),
    createUiRoute({
      parent,
      path: "github",
      title: { namespace: "integrations.github.page", key: "metaTitle" },
      pendingComponent: GithubLoading,
      preload: Github.preload,
      component: ({ params }) => <Github organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "github/$id",
      component: () => null,
      loader: async ({ params, searchParams }) => {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(searchParams)) {
          for (const item of Array.isArray(value) ? value : [value]) {
            if (item !== undefined) {
              query.append(key, item);
            }
          }
        }
        throw redirect({
          href: `/${encodeURIComponent(params.slug ?? "")}/integrations/github${query.size ? `?${query}` : ""}#repository-${encodeURIComponent(params.id ?? "")}`,
        });
      },
    }),
    createUiRoute({
      parent,
      path: "google-search-console",
      title: { title: "Google Search Console" },
      pendingComponent: GscLoading,
      loaderSearchKeys: ["project", "range"],
      loader: (input) => loadGeoPage({ data: { ...input, kind: "gsc" } }),
      preload: Gsc.preload,
      component: ({ data, params }) => (
        <GeoProjectQueryProvider initialProjectId={data.projectId}>
          <Gsc organizationSlug={params.slug} />
        </GeoProjectQueryProvider>
      ),
    }),
    createUiRoute({
      parent,
      path: "granola",
      title: { namespace: "integrations.shared", key: "granolaIntegration" },
      pendingComponent: Loading,
      preload: Granola.preload,
      component: ({ params }) => <Granola organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "linear",
      title: { namespace: "integrations.shared", key: "linearIntegrations" },
      pendingComponent: Loading,
      preload: Linear.preload,
      component: ({ params }) => <Linear organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "linear/$id",
      loader: (input) => loadLinearDetail({ data: input }),
      pageTitle: (data) => data.title,
      pendingComponent: Loading,
      preload: LinearDetail.preload,
      component: ({ params }) => <LinearDetail integrationId={params.id} />,
    }),
    createUiRoute({
      parent,
      path: "mcp",
      title: { namespace: "integrations.shared", key: "mcpServers" },
      pendingComponent: Loading,
      preload: Mcp.preload,
      component: ({ params }) => <Mcp organizationSlug={params.slug} />,
    }),
    createUiRoute({
      parent,
      path: "slack",
      title: { namespace: "integrations.shared", key: "slackIntegration" },
      pendingComponent: Loading,
      preload: Slack.preload,
      component: ({ params }) => <Slack organizationSlug={params.slug} />,
    }),
  ];
}
