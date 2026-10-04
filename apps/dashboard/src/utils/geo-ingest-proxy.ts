export function getGeoIngestProxyRules(
  ingestUrl = process.env.GEO_INGEST_URL,
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL
): Record<string, { proxy: string }> {
  const value = ingestUrl?.trim();
  const origin = value ? URL.parse(value) : null;
  if (
    !origin ||
    !["http:", "https:"].includes(origin.protocol) ||
    (appUrl && URL.parse(appUrl)?.origin === origin.origin)
  ) {
    return {};
  }
  return {
    "/api/geo/ingest": {
      proxy: new URL("/api/geo/ingest", origin.origin).toString(),
    },
  };
}
