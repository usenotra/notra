import { db } from "@notra/db/drizzle";
import { demoSandboxes } from "@notra/db/schema";
import { normalizeTimeZone } from "@notra/utils/demo-clock";
import { eq } from "drizzle-orm";

import { demoSandboxRoute } from "@/lib/demo/route";
import { demoSandboxCreateInputSchema } from "@/schemas/demo";

/**
 * Pooled sandboxes are seeded before anyone visits; the browser reports the
 * visitor's time zone on first load so "today" follows their clock.
 */
export const POST = demoSandboxRoute(async (sandbox, request: Request) => {
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
});
