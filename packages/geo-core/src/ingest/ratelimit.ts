import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const geoIngestRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  prefix: "ratelimit:geo-ingest",
  limiter: Ratelimit.slidingWindow(1000, "1m"),
});
