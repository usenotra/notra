import { cache } from "react";

import { ANALYTICS_UNAVAILABLE_DESCRIPTION } from "@/constants/analytics";
import { isAnalyticsEnabledForOrganization } from "@/lib/analytics/flag";
import { forbidden } from "@/lib/orpc/utils/errors";

/**
 * Batched oRPC requests run many analytics procedures inside one server
 * request; they share a single flag evaluation per organization.
 */
const isAnalyticsEnabledForRequest = cache(isAnalyticsEnabledForOrganization);

export async function assertAnalyticsEnabled(
  organizationId: string
): Promise<void> {
  const enabled = await isAnalyticsEnabledForRequest(organizationId);
  if (!enabled) {
    throw forbidden(ANALYTICS_UNAVAILABLE_DESCRIPTION);
  }
}
