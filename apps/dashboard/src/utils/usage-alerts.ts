import { USAGE_ALERT_THRESHOLD_TYPES } from "@notra/schemas/dashboard/usage-alerts";

import type {
  UsageAlert,
  UsageAlertThresholdType,
} from "@/types/billing/usage-alerts";

const THRESHOLD_TYPES = new Set<string>(USAGE_ALERT_THRESHOLD_TYPES);

export function isUsageAlertThresholdType(
  value: unknown
): value is UsageAlertThresholdType {
  return typeof value === "string" && THRESHOLD_TYPES.has(value);
}

export function normalizeUsageAlerts(value: unknown): UsageAlert[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (!(candidate && typeof candidate === "object")) {
      return [];
    }

    const alert = candidate as Record<string, unknown>;
    if (
      typeof alert.enabled !== "boolean" ||
      typeof alert.threshold !== "number" ||
      !Number.isFinite(alert.threshold) ||
      !isUsageAlertThresholdType(alert.thresholdType)
    ) {
      return [];
    }

    return [
      {
        enabled: alert.enabled,
        threshold: alert.threshold,
        thresholdType: alert.thresholdType,
        ...(typeof alert.featureId === "string"
          ? { featureId: alert.featureId }
          : {}),
        ...(typeof alert.name === "string" && alert.name.length > 0
          ? { name: alert.name }
          : {}),
      },
    ];
  });
}

export function usageAlertThresholdLabel(alert: UsageAlert) {
  const suffix = alert.thresholdType.endsWith("_percentage") ? "%" : "";
  const direction = alert.thresholdType.startsWith("remaining")
    ? "remaining"
    : "used";
  return `${alert.threshold}${suffix} ${direction}`;
}
