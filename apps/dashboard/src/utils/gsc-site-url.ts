import type { GscSite } from "@notra/ai/types/google-search-console";
import type { GeoSearchConsoleStatus } from "@notra/geo-core/types/google-search-console";

const SC_DOMAIN_PREFIX = "sc-domain:";

export function formatGscSiteUrl(siteUrl: string): string {
  return siteUrl.startsWith(SC_DOMAIN_PREFIX)
    ? `${siteUrl.slice(SC_DOMAIN_PREFIX.length)} (domain)`
    : siteUrl;
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function parseUrl(siteUrl: string): URL | null {
  try {
    return new URL(siteUrl);
  } catch {
    return null;
  }
}

export function getGscSiteDomain(siteUrl: string): string | null {
  if (siteUrl.startsWith(SC_DOMAIN_PREFIX)) {
    const hostname = normalizeHostname(siteUrl.slice(SC_DOMAIN_PREFIX.length));
    return hostname || null;
  }

  const site = parseUrl(siteUrl);
  return site ? normalizeHostname(site.hostname) : null;
}

export function findMatchingGscSiteUrl(
  sites: GscSite[],
  websiteUrl: string | null
): string | null {
  if (!websiteUrl) {
    return null;
  }

  const website = parseUrl(websiteUrl);
  if (!website) {
    return null;
  }

  const websiteHostname = normalizeHostname(website.hostname);
  let domainMatch: GscSite | null = null;
  let domainMatchLength = -1;

  for (const site of sites) {
    if (!site.siteUrl.startsWith(SC_DOMAIN_PREFIX)) {
      continue;
    }

    const propertyHostname = normalizeHostname(
      site.siteUrl.slice(SC_DOMAIN_PREFIX.length)
    );
    const coversWebsite =
      websiteHostname === propertyHostname ||
      websiteHostname.endsWith(`.${propertyHostname}`);

    if (coversWebsite && propertyHostname.length > domainMatchLength) {
      domainMatch = site;
      domainMatchLength = propertyHostname.length;
    }
  }

  if (domainMatch) {
    return domainMatch.siteUrl;
  }

  const websiteHref = website.href;
  let prefixMatch: string | null = null;
  let prefixMatchLength = -1;
  for (const site of sites) {
    const propertyUrl = parseUrl(site.siteUrl);
    if (
      !propertyUrl ||
      propertyUrl.origin !== website.origin ||
      !websiteHref.startsWith(propertyUrl.href)
    ) {
      continue;
    }

    if (propertyUrl.href.length > prefixMatchLength) {
      prefixMatch = site.siteUrl;
      prefixMatchLength = propertyUrl.href.length;
    }
  }

  return prefixMatch;
}

/** True once Google access is active and a property feeds suggestions. */
export function isSearchConsoleSynced(
  status: GeoSearchConsoleStatus | undefined
): boolean {
  return Boolean(
    status?.connected && status.status === "active" && status.siteUrl
  );
}
