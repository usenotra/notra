import { attachDatabasePool } from "@vercel/functions";
import { upstashCache } from "drizzle-orm/cache/upstash";
import { drizzle } from "drizzle-orm/node-postgres";

// biome-ignore lint/performance/noNamespaceImport: Required for drizzle-kit
import * as schema from "./schema";
import type { Database } from "./types/database";

const databaseUrl = process.env.DATABASE_URL;
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const dbByUrl = new Map<string, Database>();

export function createDb(databaseUrl: string): Database {
  const cached = dbByUrl.get(databaseUrl);
  if (cached) {
    return cached;
  }

  const client = drizzle({
    connection: {
      connectionString: databaseUrl,
      connectionTimeoutMillis: 10_000,
    },
    cache:
      upstashUrl && upstashToken
        ? upstashCache({
            url: upstashUrl,
            token: upstashToken,
            // Opt-in only: with `global: true` a cache miss paid 2 Upstash HTTP
            // round trips (HGET, then a write-back pipeline of HSET + HEXPIRE +
            // SADD) for a 1 s TTL. Query hashing is local, not a Redis RT.
            // Expensive, slowly changing queries opt in via `.$withCache(...)`.
            global: false,
          })
        : undefined,
    schema,
  });
  // Fluid compute suspends idle instances; this closes idle clients first so a
  // resumed instance does not hand out connections the server already dropped.
  attachDatabasePool(client.$client);
  // pg emits "error" when the server drops an idle client. Without a listener
  // that is an uncaught exception and kills long-running processes.
  client.$client.on("error", (error) => {
    console.error("[db] Idle client error", error);
  });
  dbByUrl.set(databaseUrl, client);
  return client;
}

function createMissingDatabaseUrlProxy(): Database {
  return new Proxy({} as Database, {
    get() {
      throw new Error("[ENV]: DATABASE_URL is not defined");
    },
  });
}

export const db: Database = databaseUrl
  ? createDb(databaseUrl)
  : createMissingDatabaseUrlProxy();
