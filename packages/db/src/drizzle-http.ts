import { neon } from "@neondatabase/serverless";
import { upstashCache } from "drizzle-orm/cache/upstash";
import { drizzle } from "drizzle-orm/neon-http";

// biome-ignore lint/performance/noNamespaceImport: Required for drizzle-kit
import * as schema from "./schema";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, {
    cache:
      upstashUrl && upstashToken
        ? upstashCache({
            url: upstashUrl,
            token: upstashToken,
            // Opt-in only: with `global: true` every select builder query paid a
            // Redis GET plus a write-back pipeline for a 1 s default TTL, i.e.
            // three round trips instead of one with practically no hits.
            // Expensive, slowly changing queries opt in via `.$withCache(...)`.
            global: false,
          })
        : undefined,
    schema,
  });
}
