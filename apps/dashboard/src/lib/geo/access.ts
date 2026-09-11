import { assertOrganizationAccess } from "@/lib/auth/organization";
import {
  rejectGeoEntitlementDenied,
  resolveGeoEntitlement,
} from "@/lib/billing/subscription";

/**
 * The membership check and the billing lookup are independent, so they run
 * together. The denial itself (telemetry + 402) is only raised once membership
 * is confirmed: a non-member must neither learn about nor generate billing
 * events for an organization they do not belong to.
 */
export async function assertGeoAccess(
  params: Parameters<typeof assertOrganizationAccess>[0]
): Promise<void> {
  const [membership, entitlement] = await Promise.allSettled([
    assertOrganizationAccess(params),
    resolveGeoEntitlement(params.organizationId, params.headers),
  ]);

  if (membership.status === "rejected") {
    throw membership.reason;
  }
  if (entitlement.status === "rejected") {
    throw entitlement.reason;
  }
  if (entitlement.value === "denied") {
    rejectGeoEntitlementDenied(params.organizationId);
  }
}
