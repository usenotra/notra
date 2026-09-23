import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

// biome-ignore lint/performance/noNamespaceImport: Required for drizzle-kit
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

const dbByUrl = new Map<string, NodePgDatabase<typeof schema>>();

export function createDb(databaseUrl: string): NodePgDatabase<typeof schema> {
  const cached = dbByUrl.get(databaseUrl);
  if (cached) {
    return cached;
  }

  // No Upstash query cache. Drizzle runs an invalidation script on every
  // insert, update, and delete once a cache is attached, and a scan writes
  // one row per prompt per engine. That script was the write side of the
  // cache. The aggregates it covered are index-only scans now.
  const client = drizzle({
    connection: {
      connectionString: databaseUrl,
      connectionTimeoutMillis: 10_000,
    },
    schema,
  });
  // Fluid compute suspends idle instances; this closes idle clients first so a
  // resumed instance does not hand out connections the server already dropped.
  attachDatabasePool(client.$client);
  dbByUrl.set(databaseUrl, client);
  return client;
}

function createMissingDatabaseUrlProxy(): NodePgDatabase<typeof schema> {
  return new Proxy({} as NodePgDatabase<typeof schema>, {
    get() {
      throw new Error("[ENV]: DATABASE_URL is not defined");
    },
  });
}

export const db = databaseUrl
  ? createDb(databaseUrl)
  : createMissingDatabaseUrlProxy();
