import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  SITE_ACTIVE_POLL_INTERVAL_MS,
  SITE_ANALYTICS_POLL_INTERVAL_MS,
  SITE_IDLE_POLL_INTERVAL_MS,
  SITE_REPOSITORY_OVERVIEW_STALE_MS,
} from "@/constants/sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SitePollingQuery,
  SiteAnalyticsWindow,
} from "@/types/hooks/sites";
import type { SiteDetail, SiteListResult } from "@/types/sites";
import { hasDeploymentInProgress } from "@/utils/site-deployments";

export function useSitesOrganizationId(organizationSlug: string): string {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : getOrganization(organizationSlug);
  return organization?.id ?? "";
}

export function useSitesStatus(organizationId: string) {
  return useQuery(
    dashboardOrpc.sites.status.queryOptions({
      input: { organizationId },
      enabled: organizationId.length > 0,
      staleTime: Number.POSITIVE_INFINITY,
    })
  );
}

export function useSitesList(organizationId: string) {
  return useQuery(
    dashboardOrpc.sites.list.queryOptions({
      input: { organizationId },
      enabled: organizationId.length > 0,
      refetchInterval: (query: SitePollingQuery<SiteListResult>) => {
        const latest = (query.state.data?.sites ?? []).flatMap((site) =>
          site.latestDeployment ? [site.latestDeployment] : []
        );
        return hasDeploymentInProgress(latest)
          ? SITE_ACTIVE_POLL_INTERVAL_MS
          : SITE_IDLE_POLL_INTERVAL_MS;
      },
      refetchIntervalInBackground: false,
    })
  );
}

export function useSiteDetail(organizationId: string, siteId: string) {
  return useQuery(
    dashboardOrpc.sites.get.queryOptions({
      input: { organizationId, siteId },
      enabled: organizationId.length > 0,
      refetchInterval: (query: SitePollingQuery<SiteDetail>) =>
        hasDeploymentInProgress(query.state.data?.deployments ?? [])
          ? SITE_ACTIVE_POLL_INTERVAL_MS
          : SITE_IDLE_POLL_INTERVAL_MS,
      refetchIntervalInBackground: false,
    })
  );
}

export function useSiteAnalytics(
  organizationId: string,
  siteId: string,
  window: SiteAnalyticsWindow
) {
  return useQuery({
    ...dashboardOrpc.sites.analytics.queryOptions({
      input: { organizationId, siteId, ...window },
      enabled: organizationId.length > 0,
      refetchInterval: SITE_ANALYTICS_POLL_INTERVAL_MS,
      refetchIntervalInBackground: false,
    }),
    placeholderData: keepPreviousData,
  });
}

/** Loads a site's GitHub details only while their hover card is open. */
export function useSiteRepositoryOverview(
  organizationId: string,
  siteId: string,
  enabled: boolean
) {
  return useQuery(
    dashboardOrpc.sites.repository.queryOptions({
      input: { organizationId, siteId },
      enabled: enabled && organizationId.length > 0,
      staleTime: SITE_REPOSITORY_OVERVIEW_STALE_MS,
    })
  );
}

export function useInvalidateSites() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: dashboardOrpc.sites.key() });
}
