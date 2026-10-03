import type { GeoIngestRuntime } from "../types/ingest";

export function getGeoIngestRuntime(): GeoIngestRuntime {
  if (process.env.RAILWAY_SERVICE_ID) {
    return "railway";
  }
  if (process.env.VERCEL) {
    return "vercel";
  }
  return "local";
}

export function getGeoIngestRegion(): string | undefined {
  return process.env.RAILWAY_REPLICA_REGION ?? process.env.VERCEL_REGION;
}
