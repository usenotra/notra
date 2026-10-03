/**
 * Returns the origin of a usable `GEO_INGEST_URL`, or null to keep ingest on
 * the app itself. Rejects values without an http(s) scheme, which would throw
 * in `new URL`, and the app's own origin, which would make the dashboard
 * rewrite proxy `/api/geo/ingest` back to itself.
 */
export function resolveGeoIngestOrigin(
  value: string | undefined,
  appUrl: string | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  let origin: string;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    origin = url.origin;
  } catch {
    return null;
  }
  try {
    if (appUrl && new URL(appUrl).origin === origin) {
      return null;
    }
  } catch {
    // An unparseable app URL cannot match; keep the ingest origin.
  }
  return origin;
}
