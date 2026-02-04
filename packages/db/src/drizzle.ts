import { neon } from "@neondatabase/serverless";
import { upstashCache } from "drizzle-orm/cache/upstash";
import { drizzle } from "drizzle-orm/neon-http";
// biome-ignore lint/performance/noNamespaceImport: Required for drizzle-kit
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("[ENV]: DATABASE_URL is not defined");
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const sql = neon(databaseUrl);

export const db = drizzle({
  client: sql,
  schema,
  cache:
    upstashUrl && upstashToken
      ? upstashCache({
          url: upstashUrl,
          token: upstashToken,
          global: true,
        })
      : undefined,
});
