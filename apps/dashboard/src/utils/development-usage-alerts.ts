import type { UsageAlertInput } from "@notra/schemas/dashboard/usage-alerts";

import type { DevelopmentUsageAlertsGlobal } from "@/types/billing/development-usage-alerts";

function developmentGlobal() {
  return globalThis as DevelopmentUsageAlertsGlobal;
}

export function getDevelopmentUsageAlerts(): UsageAlertInput[] {
  return developmentGlobal().__notraDevelopmentUsageAlerts ?? [];
}

export function setDevelopmentUsageAlerts(
  alerts: readonly UsageAlertInput[]
): UsageAlertInput[] {
  const saved = alerts.map((alert) => ({ ...alert }));
  developmentGlobal().__notraDevelopmentUsageAlerts = saved;
  return saved;
}
