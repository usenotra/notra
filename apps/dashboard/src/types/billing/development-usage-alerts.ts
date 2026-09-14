import type { UsageAlertInput } from "@notra/schemas/dashboard/usage-alerts";

export type DevelopmentUsageAlertsGlobal = typeof globalThis & {
  __notraDevelopmentUsageAlerts?: Record<string, UsageAlertInput[]>;
};

export type DevelopmentBillingCustomerIdResolver = (
  request: Request
) => Promise<string | null>;
