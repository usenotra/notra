import { db } from "@notra/db/drizzle";
import { demoRequestLog } from "@notra/db/schema";
import type { DemoRequestEvent } from "@notra/db/types/demo";
import { isDemoMode } from "@notra/utils/demo-mode";
import { desc, eq } from "drizzle-orm";

import { DEMO_REQUEST_FEED_LIMIT } from "@/constants/demo";
import { getCurrentDemoSandbox } from "@/lib/demo/session";

/** Newest entries of the visitor's request feed, without bodies. */
export async function GET() {
  if (!isDemoMode()) {
    return new Response(null, { status: 404 });
  }
  const sandbox = await getCurrentDemoSandbox();
  if (!sandbox) {
    return Response.json({ error: "No demo workspace" }, { status: 401 });
  }
  const rows = await db.query.demoRequestLog.findMany({
    columns: {
      id: true,
      source: true,
      method: true,
      path: true,
      status: true,
      durationMs: true,
      affected: true,
      createdAt: true,
    },
    where: eq(demoRequestLog.anonymousId, sandbox.anonymousId),
    orderBy: [desc(demoRequestLog.createdAt)],
    limit: DEMO_REQUEST_FEED_LIMIT,
  });
  const events: DemoRequestEvent[] = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
  return Response.json(events, { headers: { "Cache-Control": "no-store" } });
}
