import { db } from "@notra/db/drizzle";
import { demoRequestLog } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import { demoSandboxRoute } from "@/lib/demo/route";
import type { DemoRequestDetail } from "@/types/demo";

/** Request and response bodies of one feed entry, own sandbox only. */
export const GET = demoSandboxRoute(
  async (
    sandbox,
    _request: Request,
    { params }: { params: Promise<{ requestId: string }> }
  ) => {
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
);
