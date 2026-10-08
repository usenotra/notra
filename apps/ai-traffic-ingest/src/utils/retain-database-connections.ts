import type { db } from "@notra/db/drizzle";

export function retainIngestDatabaseConnections(pool: (typeof db)["$client"]) {
  // This is a long-running worker, not a suspended serverless instance. pg's
  // default 10s idle eviction makes sparse AI traffic reconnect on each hit.
  // Keep the existing connection limit, acquisition timeout and error handler.
  pool.options.idleTimeoutMillis = 0;
}
