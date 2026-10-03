import type { UsageAlertThresholdType } from "@/types/billing/usage-alerts";

export const USAGE_ALERT_THRESHOLD_OPTIONS: readonly UsageAlertThresholdType[] =
  ["usage_percentage", "remaining_percentage", "usage", "remaining"];

export const DEFAULT_USAGE_ALERT = {
  enabled: true,
  threshold: 80,
  thresholdType: "usage_percentage",
} as const;

export const ALL_USAGE_FEATURES_VALUE = "__all_usage_features__";
