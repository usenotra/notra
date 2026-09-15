import type { UsageAlertThresholdType } from "@/types/billing/usage-alerts";

export const USAGE_ALERT_THRESHOLD_OPTIONS: readonly {
  description: string;
  label: string;
  value: UsageAlertThresholdType;
}[] = [
  {
    value: "usage_percentage",
    label: "Usage percentage",
    description: "Alert when usage reaches this percentage of the allowance.",
  },
  {
    value: "remaining_percentage",
    label: "Remaining percentage",
    description: "Alert when the remaining balance falls to this percentage.",
  },
  {
    value: "usage",
    label: "Usage (absolute value)",
    description: "Alert when usage reaches this amount.",
  },
  {
    value: "remaining",
    label: "Remaining (absolute value)",
    description: "Alert when the remaining balance falls to this amount.",
  },
];

export const DEFAULT_USAGE_ALERT = {
  enabled: true,
  threshold: 80,
  thresholdType: "usage_percentage",
} as const;

export const ALL_USAGE_FEATURES_VALUE = "__all_usage_features__";
