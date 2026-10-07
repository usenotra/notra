import type { FEATURES } from "@notra/ai/billing/features";

export type UsageFeatureId = (typeof FEATURES)[keyof typeof FEATURES];
