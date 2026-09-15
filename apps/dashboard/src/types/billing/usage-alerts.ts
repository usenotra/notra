import type { UsageAlertInput } from "@notra/schemas/dashboard/usage-alerts";

import type { FeatureData } from "@/types/hooks/billing";

export type UsageAlert = UsageAlertInput;
export type UsageAlertThresholdType = UsageAlert["thresholdType"];

export interface UsageAlertFormProps {
  features: readonly FeatureData[];
  initialAlert?: UsageAlert;
  onCancel: () => void;
  onSubmit: (alert: UsageAlert) => Promise<boolean>;
  pending: boolean;
}

export type UsageAlertsView = "form" | "list";

export interface UsageAlertsSectionProps {
  alerts: readonly UsageAlert[];
  features: readonly FeatureData[];
  loading: boolean;
  onUpdated: () => Promise<unknown> | void;
}
