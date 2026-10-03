import {
  GEO_TRAFFIC_FLUSH_INTERVAL_ENV,
  GEO_TRAFFIC_FLUSH_INTERVAL_MS,
} from "../constants/cache";

/**
 * The geo traffic write window in ms, read from the same variable by the
 * ingest service and the query cache. `0` disables batching.
 */
export function getGeoTrafficFlushIntervalMs(): number {
  const raw = process.env[GEO_TRAFFIC_FLUSH_INTERVAL_ENV]?.trim();
  if (!raw) {
    return GEO_TRAFFIC_FLUSH_INTERVAL_MS;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0
    ? value
    : GEO_TRAFFIC_FLUSH_INTERVAL_MS;
}
