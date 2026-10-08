import type { GeoIngestSitePrefix } from "@notra/geo-core/types/geo";

export function isServedBySite(
  url: URL,
  prefixes: GeoIngestSitePrefix[]
): boolean {
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  return prefixes.some(
    (prefix) =>
      prefix.host === host &&
      prefix.mounts.some(
        (mount) =>
          mount === "/" || path === mount || path.startsWith(`${mount}/`)
      )
  );
}
