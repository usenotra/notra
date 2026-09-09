import { ANALYTICS_UNAVAILABLE_DESCRIPTION } from "@/constants/analytics";
import { isAnalyticsEnabledForOrganization } from "@/lib/analytics/flag";
import { getORPCRequestMemo } from "@/lib/orpc/context";
import { forbidden } from "@/lib/orpc/utils/errors";

export async function assertAnalyticsEnabled(
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
