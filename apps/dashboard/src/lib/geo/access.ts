import { assertOrganizationAccess } from "@/lib/auth/organization";
import {
  rejectGeoEntitlementDenied,
  resolveGeoEntitlement,
} from "@/lib/billing/subscription";

export async function assertGeoAccess(
  params: Parameters<typeof assertOrganizationAccess>[0]
): Promise<void> {
  await assertOrganizationAccess(params);
  const entitlement = await resolveGeoEntitlement(
    params.organizationId,
    params.headers
  );
  if (entitlement === "denied") {
    rejectGeoEntitlementDenied(params.organizationId);
  }
}
