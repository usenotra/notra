import {
  allowUnmeteredAiInDevelopment,
  autumn,
  AUTUMN_READ_TIMEOUT_MS,
} from "@notra/ai/billing/autumn";
import { FEATURES } from "@notra/ai/billing/features";
import type { GeoZdrEntitlement } from "@notra/geo-core/types/geo";

export async function resolveZdrEntitlement(
  organizationId: string
): Promise<GeoZdrEntitlement> {
  if (allowUnmeteredAiInDevelopment) {
    return "entitled";
  }
  if (!autumn) {
    return process.env.NODE_ENV === "production" ? "not_entitled" : "entitled";
  }
  try {
    const data = await autumn.check(
      {
        customerId: organizationId,
        featureId: FEATURES.ZDR,
      },
      { timeoutMs: AUTUMN_READ_TIMEOUT_MS }
    );
    return data.allowed === true ? "entitled" : "not_entitled";
  } catch {
    return "unknown";
  }
}
