import { ANALYTICS_UNAVAILABLE_DESCRIPTION } from "@/constants/analytics";
import { isAnalyticsEnabledForOrganization } from "@/lib/analytics/flag";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { getORPCRequestMemo } from "@/lib/orpc/context";
import { forbidden } from "@/lib/orpc/utils/errors";

/**
 * Membership and the analytics flag are independent, so they run together.
 * When both fail, the membership error wins: a non-member must not learn
 * whether analytics is enabled for that organization.
 */
export async function assertAnalyticsAccess(
  params: Parameters<typeof assertOrganizationAccess>[0]
): Promise<void> {
  const [membership, enabled] = await Promise.allSettled([
    assertOrganizationAccess(params),
    assertAnalyticsEnabled(params.organizationId, params.headers),
  ]);

  if (membership.status === "rejected") {
    throw membership.reason;
  }
  if (enabled.status === "rejected") {
    throw enabled.reason;
  }
}

async function assertAnalyticsEnabled(
  organizationId: string,
  headers?: Headers
): Promise<void> {
  const memo = headers ? getORPCRequestMemo(headers) : undefined;
  let evaluation = memo?.analyticsEnabledByOrganization.get(organizationId);
  if (!evaluation) {
    evaluation = isAnalyticsEnabledForOrganization(organizationId);
    memo?.analyticsEnabledByOrganization.set(organizationId, evaluation);
  }
  const enabled = await evaluation;
  if (!enabled) {
    throw forbidden(ANALYTICS_UNAVAILABLE_DESCRIPTION);
  }
}
