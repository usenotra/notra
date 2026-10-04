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

// The dev server resolves `?url` imports to app paths, which the auth
// middleware redirects to /login, so dev imports the catalog like the server.
const SERVES_CATALOG_ASSETS = !import.meta.env.DEV;

async function fetchCatalog(
  locale: DashboardLocale
): Promise<AbstractIntlMessages> {
  if (import.meta.env.SSR || !SERVES_CATALOG_ASSETS) {
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

/** `<head>` preload for the hashed catalog asset, in builds that serve one. */
export function catalogPreloadLinks(locale: DashboardLocale | undefined) {
  if (!(locale && SERVES_CATALOG_ASSETS)) {
    return [];
  }
  return [
    {
      rel: "preload",
      href: CATALOG_URLS[locale],
      as: "fetch",
      crossOrigin: "anonymous" as const,
    },
  ];
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
