import type { UsageAlertInput } from "@notra/schemas/dashboard/usage-alerts";

import type { DevelopmentUsageAlertsGlobal } from "@/types/billing/development-usage-alerts";

function developmentGlobal() {
  return globalThis as DevelopmentUsageAlertsGlobal;
}

export function getDevelopmentUsageAlerts(
  customerId: string
): UsageAlertInput[] {
  return developmentGlobal().__notraDevelopmentUsageAlerts?.[customerId] ?? [];
}

export function setDevelopmentUsageAlerts(
  customerId: string,
  alerts: readonly UsageAlertInput[]
): UsageAlertInput[] {
  const saved = alerts.map((alert) => ({ ...alert }));
  const current = developmentGlobal().__notraDevelopmentUsageAlerts ?? {};
  developmentGlobal().__notraDevelopmentUsageAlerts = {
    ...current,
    [customerId]: saved,
  };
  return saved;
}
