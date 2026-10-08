import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  GEO_INGEST_ADMISSION_RATELIMIT_MAX_REQUESTS,
  GEO_INGEST_ADMISSION_RATELIMIT_PREFIX,
  GEO_INGEST_RATELIMIT_TIMEOUT_MS,
  GEO_INGEST_REDIS_RETRIES,
  WEB_INGEST_RATELIMIT_MAX_REQUESTS,
  WEB_INGEST_RATELIMIT_PREFIX,
} from "../constants/ingest";

const redis = Redis.fromEnv({ retry: { retries: GEO_INGEST_REDIS_RETRIES } });

// Redis is a hard dependency: the pipeline rejects on transport errors and
// timeouts. Fail fast so an outage answers 502 quickly instead of holding
// requests through the default 5 retries and 5 s limiter timeout.
export const geoIngestRatelimit = new Ratelimit({
  redis,
  prefix: "ratelimit:geo-ingest",
  limiter: Ratelimit.slidingWindow(1000, "1m"),
  timeout: GEO_INGEST_RATELIMIT_TIMEOUT_MS,
});

export const geoIngestAdmissionRatelimit = new Ratelimit({
  redis,
  prefix: GEO_INGEST_ADMISSION_RATELIMIT_PREFIX,
  limiter: Ratelimit.slidingWindow(
    GEO_INGEST_ADMISSION_RATELIMIT_MAX_REQUESTS,
    "1m"
  ),
  timeout: GEO_INGEST_RATELIMIT_TIMEOUT_MS,
});

export const webIngestRatelimit = new Ratelimit({
  redis,
  prefix: WEB_INGEST_RATELIMIT_PREFIX,
  limiter: Ratelimit.slidingWindow(WEB_INGEST_RATELIMIT_MAX_REQUESTS, "1m"),
  timeout: GEO_INGEST_RATELIMIT_TIMEOUT_MS,
});
