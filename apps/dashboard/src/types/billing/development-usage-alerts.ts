import type { UsageAlertInput } from "@notra/schemas/dashboard/usage-alerts";

export type DevelopmentUsageAlertsGlobal = typeof globalThis & {
  __notraDevelopmentUsageAlerts?: UsageAlertInput[];
};
