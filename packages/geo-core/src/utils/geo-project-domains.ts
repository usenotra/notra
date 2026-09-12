import { GEO_DOMAIN_REGEX, GEO_MAX_DOMAINS } from "../constants/geo";
import { normalizeCompetitorDomain } from "../geo/domain";

export function normalizeProjectDomain(value: string): string | null {
  const domain = normalizeCompetitorDomain(value);
  if (!domain || !GEO_DOMAIN_REGEX.test(domain)) {
    return null;
  }
  return domain;
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
