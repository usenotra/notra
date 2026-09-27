// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { de, en } from "zod/locales";

import type { DashboardLocale } from "@/types/i18n";

const ZOD_LOCALES = { en, de } satisfies Record<DashboardLocale, typeof en>;

let configuredLocale: DashboardLocale | null = null;

export function configureZodLocale(locale: DashboardLocale) {
  if (typeof window === "undefined" || configuredLocale === locale) {
    return;
  }
  configuredLocale = locale;
  z.config(ZOD_LOCALES[locale]());
}
