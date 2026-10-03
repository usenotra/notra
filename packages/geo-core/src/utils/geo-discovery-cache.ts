import { GEO_DISCOVERY_CACHE_PREFIX } from "../constants/geo";

export function geoDiscoveryCacheKey(
  organizationId: string,
  url: string,
  language: string
): string {
  const parsed = new URL(url);
  const host = parsed.host.replace(/^www\./, "");
  return `${GEO_DISCOVERY_CACHE_PREFIX}:${organizationId}:${language}:${parsed.protocol}//${host}${parsed.pathname.replace(/\/$/, "")}${parsed.search}`;
}
