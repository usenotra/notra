import { useQuery } from "@tanstack/react-query";

import { SITE_DOMAIN_CONNECT_STALE_MS } from "@/constants/sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteDomain, SiteScope } from "@/types/sites";

/**
 * Asks whether the domain's DNS provider supports one-click setup (Domain Connect).
 * Discovery takes up to a second, so it runs once per pending subdomain and is cached.
 */
export function useSiteDomainConnect({
  organizationId,
  siteId,
  domain,
}: SiteScope & { domain: SiteDomain }) {
  return useQuery(
    dashboardOrpc.sites.domains.connect.queryOptions({
      input: { organizationId, siteId, domainId: domain.id },
      enabled: domain.kind === "subdomain" && domain.status !== "active",
      staleTime: SITE_DOMAIN_CONNECT_STALE_MS,
      retry: false,
      refetchOnWindowFocus: false,
    })
  );
}
