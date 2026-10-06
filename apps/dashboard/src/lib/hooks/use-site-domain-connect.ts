import { useQuery } from "@tanstack/react-query";

import { SITE_DOMAIN_CONNECT_STALE_MS } from "@/constants/sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { UseSiteDomainConnectParams } from "@/types/hooks/sites";

export function useSiteDomainConnect({
  organizationId,
  siteId,
  domain,
}: UseSiteDomainConnectParams) {
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
