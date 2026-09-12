import { GEO_DOMAIN_REGEX, GEO_MAX_DOMAINS } from "../constants/geo";
import { normalizeCompetitorDomain } from "../geo/domain";

export function normalizeProjectDomain(value: string): string | null {
  const domain = normalizeCompetitorDomain(value);
  if (!domain || !GEO_DOMAIN_REGEX.test(domain)) {
    return null;
  }
  return domain;
}

export function extraProjectDomains(
  values: readonly string[],
  brandHost: string | null | undefined,
  max = GEO_MAX_DOMAINS
): string[] {
  const extras = normalizeProjectDomains(values, max);
  const brand = brandHost ? normalizeProjectDomain(brandHost) : null;
  if (!brand) {
    return extras;
  }
  return extras.filter((domain) => domain !== brand);
}

export function normalizeProjectDomains(
  values: readonly string[],
  max = GEO_MAX_DOMAINS
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (result.length >= max) {
      break;
    }
    const domain = normalizeProjectDomain(value);
    if (!domain || seen.has(domain)) {
      continue;
    }
    seen.add(domain);
    result.push(domain);
  }
  return result;
}

/**
 * Hosts ingest will accept for a project: the brand website plus extra
 * tracked domains. The brand host is always included when it normalizes, even
 * if the extra list is empty. An empty result means ingest should drop every
 * event — there is nowhere legitimate traffic can come from.
 */
export function ingestAllowedHosts(
  websiteUrl: string | null | undefined,
  extraDomains: readonly string[] = []
): string[] {
  const seen = new Set<string>();
  const hosts: string[] = [];
  const websiteHost = websiteUrl ? normalizeProjectDomain(websiteUrl) : null;
  if (websiteHost) {
    seen.add(websiteHost);
    hosts.push(websiteHost);
  }
  for (const value of extraDomains) {
    const domain = normalizeProjectDomain(value);
    if (!domain || seen.has(domain)) {
      continue;
    }
    seen.add(domain);
    hosts.push(domain);
  }
  return hosts;
}

/**
 * `null` allowed hosts means the allowlist could not be loaded (infra
 * outage): fail open so a database blip does not drop real traffic. An empty
 * list is a loaded allowlist with nothing configured and rejects every host.
 * Invalid or empty hosts (data:, file://, localhost) are always rejected,
 * including on the fail-open path.
 */
export function acceptsIngestHost(
  host: string,
  allowedHosts: readonly string[] | null
): boolean {
  if (normalizeProjectDomain(host) === null) {
    return false;
  }
  if (allowedHosts === null) {
    return true;
  }
  return matchesProjectHost(host, allowedHosts);
}

export function matchesProjectHost(
  host: string,
  domains: readonly string[]
): boolean {
  const normalized = normalizeProjectDomain(host);
  if (!normalized) {
    return false;
  }
  return domains.some((domain) => {
    const candidate = normalizeProjectDomain(domain);
    if (!candidate) {
      return false;
    }
    return normalized === candidate || normalized.endsWith(`.${candidate}`);
  });
}

export function trafficLogHostFilter(host: string | undefined): string {
  const trimmed = host?.trim() ?? "";
  if (trimmed.length === 0 || trimmed === "all") {
    return "";
  }
  return normalizeProjectDomain(trimmed) ?? trimmed.toLowerCase();
}

export function isKnownTrafficHost(
  selected: string,
  hosts: readonly string[]
): boolean {
  const needle = selected.trim();
  if (needle.length === 0 || needle === "all") {
    return true;
  }
  return hosts.some(
    (host) =>
      host === needle ||
      matchesProjectHost(host, [needle]) ||
      matchesProjectHost(needle, [host])
  );
}

export function trafficQueryHost(
  host: string | undefined,
  knownHosts?: readonly string[],
  isReady = false
): string {
  const filtered = trafficLogHostFilter(host);
  if (filtered.length === 0) {
    return "";
  }
  if (!isReady) {
    return filtered;
  }
  if (knownHosts && !isKnownTrafficHost(host ?? "", knownHosts)) {
    return "";
  }
  return filtered;
}

export function formatTrafficLocation(host: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (host.length === 0) {
    return normalizedPath;
  }
  return `${host}${normalizedPath}`;
}
