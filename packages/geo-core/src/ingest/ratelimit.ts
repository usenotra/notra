import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  GEO_INGEST_RATELIMIT_TIMEOUT_MS,
  GEO_INGEST_REDIS_RETRIES,
} from "../constants/ingest";

// Redis is a hard dependency: the pipeline rejects on transport errors and
// timeouts. Fail fast so an outage answers 502 quickly instead of holding
// requests through the default 5 retries and 5 s limiter timeout.
export const geoIngestRatelimit = new Ratelimit({
  redis: Redis.fromEnv({ retry: { retries: GEO_INGEST_REDIS_RETRIES } }),
  prefix: "ratelimit:geo-ingest",
  limiter: Ratelimit.slidingWindow(1000, "1m"),
  timeout: GEO_INGEST_RATELIMIT_TIMEOUT_MS,
});
