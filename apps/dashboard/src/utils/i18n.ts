import {
  DASHBOARD_LOCALES,
  DEFAULT_DASHBOARD_LOCALE,
} from "@notra/schemas/constants/dashboard/locales";

import type { DashboardLocale } from "@/types/i18n";

export function isDashboardLocale(value: unknown): value is DashboardLocale {
  return DASHBOARD_LOCALES.some((locale) => locale === value);
}

export function negotiateDashboardLocale(
  acceptLanguage: string | null
): DashboardLocale {
  if (!acceptLanguage) {
    return DEFAULT_DASHBOARD_LOCALE;
  }
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      return {
        language: tag.toLowerCase().split("-")[0] ?? "",
        quality: quality ? Number(quality.slice(2)) : 1,
      };
    })
    .filter(({ quality }) => Number.isFinite(quality) && quality > 0)
    .sort((a, b) => b.quality - a.quality);
  const match = ranked.find(({ language }) => isDashboardLocale(language));
  return match && isDashboardLocale(match.language)
    ? match.language
    : DEFAULT_DASHBOARD_LOCALE;
}
