import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  SITE_ACTIVE_POLL_INTERVAL_MS,
  SITE_IDLE_POLL_INTERVAL_MS,
} from "@/constants/sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteDetail, SiteListResult } from "@/types/sites";
import { hasDeploymentInProgress } from "@/utils/site-deployments";

/** Org id for the page's slug; empty until the organization list loads. */
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
      refetchInterval: (query: { state: { data?: SiteListResult } }) => {
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

/** Site detail; polls every 2s while any build runs, otherwise every 15s. */
export function useSiteDetail(organizationId: string, siteId: string) {
  return useQuery(
    dashboardOrpc.sites.get.queryOptions({
      input: { organizationId, siteId },
      enabled: organizationId.length > 0,
      refetchInterval: (query: { state: { data?: SiteDetail } }) =>
        hasDeploymentInProgress(query.state.data?.deployments ?? [])
          ? SITE_ACTIVE_POLL_INTERVAL_MS
          : SITE_IDLE_POLL_INTERVAL_MS,
      refetchIntervalInBackground: false,
    })
  );
}

export function useInvalidateSites() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: dashboardOrpc.sites.key() });
}
