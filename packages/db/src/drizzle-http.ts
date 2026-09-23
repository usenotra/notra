import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// biome-ignore lint/performance/noNamespaceImport: Required for drizzle-kit
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  // Same reason as `drizzle.ts`: an attached Upstash cache invalidates on
  // every write, which is where the command volume came from.
  return drizzle(sql, {
    schema,
  });
}
