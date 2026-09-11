import { authClient } from "@/lib/auth/client";
import type { OrganizationRow } from "@/types/organizations/actions";
import { QUERY_KEYS } from "@/utils/query-keys";

const ORGANIZATION_STALE_TIME = 5 * 60 * 1000;
const ORGANIZATION_GC_TIME = 10 * 60 * 1000;

/**
 * Organization behind a `/[slug]` route. Seeded from the server-rendered layout
 * so the first paint needs no round trip.
 */
export function organizationSummaryQueryOptions(
  slug: string,
  initial?: OrganizationRow | null
) {
  return {
    queryKey: QUERY_KEYS.AUTH.organizationSummary(slug),
    initialData: initial?.slug === slug ? initial : undefined,
    queryFn: async () => {
      const result = await authClient.organization.getSummary(slug);
      return result.data ?? null;
    },
    staleTime: ORGANIZATION_STALE_TIME,
    gcTime: ORGANIZATION_GC_TIME,
  };
}

/** Session's active organization, for routes without a slug (e.g. `/account`). */
export function activeOrganizationQueryOptions() {
  return {
    queryKey: QUERY_KEYS.AUTH.activeOrganization,
    queryFn: async () => {
      const result = await authClient.organization.getFullOrganization();
      return result.data ?? null;
    },
    staleTime: ORGANIZATION_STALE_TIME,
    gcTime: ORGANIZATION_GC_TIME,
  };
}
