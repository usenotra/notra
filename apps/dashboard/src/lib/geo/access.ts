import { assertOrganizationAccess } from "@/lib/auth/organization";
import { assertGeoEntitlement } from "@/lib/billing/subscription";

/**
 * Confirm membership before the billing lookup. `assertGeoEntitlement` can
 * contact Autumn; starting it in parallel with membership would leak org
 * billing checks (and 402 vs 403 races) to non-members. Rate-limited GEO
 * procedures already follow the same order, then parallelize entitlement
 * with subscription and ratelimit.
 */
export async function assertGeoAccess(
  params: Parameters<typeof assertOrganizationAccess>[0]
): Promise<void> {
  await assertOrganizationAccess(params);
  await assertGeoEntitlement(params.organizationId, params.headers);
}
