import { FEATURES } from "@notra/ai/billing/features";

import type { UsageFeatureId } from "@/types/billing/usage-feature";

const USAGE_FEATURE_IDS: readonly string[] = Object.values(FEATURES);

export function isUsageFeatureId(value: string): value is UsageFeatureId {
  return USAGE_FEATURE_IDS.includes(value);
}
