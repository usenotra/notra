import type { AbstractIntlMessages } from "use-intl";

import type { DashboardLocale } from "@/types/i18n";
import { isDashboardLocale } from "@/utils/i18n";

import deCatalogUrl from "../../../messages/de.json?url";
import enCatalogUrl from "../../../messages/en.json?url";

/**
 * The message catalog (~300 KB) is a hashed static asset instead of root
 * loader data: in loader data it was serialized into every HTML response and
 * cost ~8 ms of server CPU per request. Browsers fetch it once and cache it.
 */
const CATALOG_URLS: Record<DashboardLocale, string> = {
  de: deCatalogUrl,
  en: enCatalogUrl,
};

const catalogs = new Map<DashboardLocale, AbstractIntlMessages>();
const pending = new Map<DashboardLocale, Promise<AbstractIntlMessages>>();

async function fetchCatalog(
  locale: DashboardLocale
): Promise<AbstractIntlMessages> {
  if (import.meta.env.SSR) {
    const catalog =
      locale === "de"
        ? await import("../../../messages/de.json")
        : await import("../../../messages/en.json");
    return catalog.default;
  }
  const response = await fetch(CATALOG_URLS[locale]);
  if (!response.ok) {
    throw new Error(
      `Failed to load the ${locale} message catalog (${response.status})`
    );
  }
  return (await response.json()) as AbstractIntlMessages;
}

export function catalogUrl(locale: DashboardLocale) {
  return CATALOG_URLS[locale];
}

export function getCatalog(locale: DashboardLocale) {
  return catalogs.get(locale);
}

export function loadCatalog(locale: DashboardLocale) {
  const existing = pending.get(locale);
  if (existing) {
    return existing;
  }
  const request = fetchCatalog(locale).then(
    (catalog) => {
      catalogs.set(locale, catalog);
      return catalog;
    },
    (error: unknown) => {
      pending.delete(locale);
      throw error;
    }
  );
  pending.set(locale, request);
  return request;
}

/** Client entry: the catalog of the server-rendered locale, before hydrating. */
export async function loadDocumentCatalog() {
  const locale = document.documentElement.lang;
  if (isDashboardLocale(locale)) {
    await loadCatalog(locale);
  }
}
