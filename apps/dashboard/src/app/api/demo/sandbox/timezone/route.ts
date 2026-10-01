import { db } from "@notra/db/drizzle";
import { demoSandboxes } from "@notra/db/schema";
import { normalizeTimeZone } from "@notra/utils/demo-clock";
import { isDemoMode } from "@notra/utils/demo-mode";
import { eq } from "drizzle-orm";

import { getCurrentDemoSandbox } from "@/lib/demo/session";
import { demoSandboxCreateInputSchema } from "@/schemas/demo";

/**
 * Pooled sandboxes are seeded before anyone visits; the browser reports the
 * visitor's time zone on first load so "today" follows their clock.
 */
export async function POST(request: Request) {
  if (!isDemoMode()) {
    return new Response(null, { status: 404 });
  }
  const sandbox = await getCurrentDemoSandbox();
  if (!sandbox) {
    return Response.json({ error: "No demo workspace" }, { status: 401 });
  }
  const parsed = demoSandboxCreateInputSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  const timeZone = normalizeTimeZone(
    parsed.success ? (parsed.data.timeZone ?? null) : null
  );
  if (timeZone !== sandbox.timeZone) {
    await db
      .update(demoSandboxes)
      .set({ timeZone })
      .where(eq(demoSandboxes.anonymousId, sandbox.anonymousId));
  }
  return new Response(null, { status: 204 });
}
