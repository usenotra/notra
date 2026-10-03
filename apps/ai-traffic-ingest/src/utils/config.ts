import { GEO_INGEST_FLUSH_INTERVAL_MS } from "@notra/geo-core/constants/ingest";
import { getGeoIngestSecret } from "@notra/geo-core/geo/ingest";

import { INGEST_REQUIRED_ENV } from "../constants/server";

export function missingIngestEnvironment(): string[] {
  const missing: string[] = INGEST_REQUIRED_ENV.filter(
    (name) => !process.env[name]?.trim()
  );
  if (!getGeoIngestSecret()?.trim()) {
    missing.push("GEO_INGEST_SECRET");
  }
  return missing;
}

/** Batch flush interval; `0` writes every event to Tinybird on arrival. */
export function ingestFlushIntervalMs(): number {
  const raw = process.env.GEO_INGEST_FLUSH_INTERVAL_MS?.trim();
  if (!raw) {
    return GEO_INGEST_FLUSH_INTERVAL_MS;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0
    ? value
    : GEO_INGEST_FLUSH_INTERVAL_MS;
}
