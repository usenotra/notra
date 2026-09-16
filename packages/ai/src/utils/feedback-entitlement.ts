import type { Autumn } from "autumn-js";

import { AUTUMN_READ_TIMEOUT_MS } from "../billing/autumn";
import { FEATURES } from "../billing/features";

export async function hasFeedbackEntitlement(
  autumn: Autumn,
  organizationId: string
): Promise<boolean> {
  const data = await autumn.check(
    { customerId: organizationId, featureId: FEATURES.AGENT_FEEDBACK },
    { timeoutMs: AUTUMN_READ_TIMEOUT_MS }
  );

  // Autumn can return synthetic grants during outages. Boolean access must
  // include the actual customer's feature flag, not just `allowed: true`.
  if (
    data.customerId !== organizationId ||
    (data.allowed && data.flag?.featureId !== FEATURES.AGENT_FEEDBACK)
  ) {
    throw new Error("Feedback entitlement could not be verified");
  }

  return data.allowed;
}
