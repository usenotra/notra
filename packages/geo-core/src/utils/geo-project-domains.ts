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
  return domains.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`)
  );
}

export function formatTrafficLocation(host: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (host.length === 0) {
    return normalizedPath;
  }
  return `${host}${normalizedPath}`;
}
