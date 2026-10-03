import { isDemoMode } from "@notra/utils/demo-mode";

import { sweepSiteJobs } from "@/lib/sites/dispatch";

export const maxDuration = 60;

/** Re-dispatches Notra Sites outbox jobs whose dispatch was lost or whose worker died. */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (isDemoMode()) {
    return new Response(null, { status: 204 });
  }
  return Response.json(await sweepSiteJobs());
}
