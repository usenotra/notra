import {
  DASHBOARD_LOCALES,
  DEFAULT_DASHBOARD_LOCALE,
} from "@notra/schemas/constants/dashboard/locales";

import type { DashboardLocale } from "@/types/i18n";

export function isDashboardLocale(value: unknown): value is DashboardLocale {
  return DASHBOARD_LOCALES.some((locale) => locale === value);
}

export function resolveDashboardLocale(value: unknown): DashboardLocale {
  return isDashboardLocale(value) ? value : DEFAULT_DASHBOARD_LOCALE;
}
