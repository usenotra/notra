import { GEO_DOMAIN_REGEX, GEO_MAX_DOMAINS } from "../constants/geo";

const HAS_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Parse a user-entered host or URL to an ASCII hostname (IDNA/punycode)
 * before allowlist checks. `https://bücher.de` and `xn--bcher-kva.de` must
 * land on the same value, matching how `new URL(event.url)` yields hosts.
 */
function canonicalHostnameFromInput(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let hostname: string;
  try {
    const withScheme = HAS_SCHEME_REGEX.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    hostname = new URL(withScheme).hostname;
  } catch {
    return null;
  }

  hostname = hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (hostname.startsWith("www.")) {
    hostname = hostname.slice(4);
  }
  return hostname.length === 0 ? null : hostname;
}

export function normalizeProjectDomain(value: string): string | null {
  const domain = canonicalHostnameFromInput(value);
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

export function unionTrafficHosts(
  configured: readonly string[],
  observed: readonly string[]
): string[] {
  const unique = new Set<string>();
  for (const host of [...configured, ...observed]) {
    const trimmed = host.trim();
    if (trimmed.length === 0 || trimmed === "all") {
      continue;
    }
    unique.add(trimmed);
  }
  return [...unique].toSorted((left, right) => left.localeCompare(right));
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

export function formatTrafficLocation(host: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (host.length === 0) {
    return normalizedPath;
  }
  return `${host}${normalizedPath}`;
}
