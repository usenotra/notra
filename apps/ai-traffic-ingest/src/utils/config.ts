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
