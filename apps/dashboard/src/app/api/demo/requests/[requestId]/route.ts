import { db } from "@notra/db/drizzle";
import { demoRequestLog } from "@notra/db/schema";
import { isDemoMode } from "@notra/utils/demo-mode";
import { and, eq } from "drizzle-orm";

import { getCurrentDemoSandbox } from "@/lib/demo/session";
import type { DemoRequestDetail } from "@/types/demo";

/** Request and response bodies of one feed entry, own sandbox only. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  if (!isDemoMode()) {
    return new Response(null, { status: 404 });
  }
  const sandbox = await getCurrentDemoSandbox();
  if (!sandbox) {
    return Response.json({ error: "No demo workspace" }, { status: 401 });
  }
  const { requestId } = await params;
  const row = await db.query.demoRequestLog.findFirst({
    columns: { id: true, requestBody: true, responseBody: true },
    where: and(
      eq(demoRequestLog.id, requestId),
      eq(demoRequestLog.anonymousId, sandbox.anonymousId)
    ),
  });
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const body: DemoRequestDetail = row;
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
