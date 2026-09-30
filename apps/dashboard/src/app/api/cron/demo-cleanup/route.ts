import { isDemoMode } from "@notra/utils/demo-mode";

import { DEMO_CLEANUP_BATCH_SIZE } from "@/constants/demo";
import { cleanupExpiredDemoSandboxes } from "@/lib/demo/sandbox";

export const maxDuration = 60;

/** Hourly: deletes demo sandboxes that expired (idle TTL or hard cap). */
export async function GET(request: Request) {
  if (!isDemoMode()) {
    return new Response(null, { status: 404 });
  }
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const deleted = await cleanupExpiredDemoSandboxes(DEMO_CLEANUP_BATCH_SIZE);
  return Response.json({ deleted });
}
