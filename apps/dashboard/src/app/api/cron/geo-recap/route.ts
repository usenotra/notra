import { isDemoMode } from "@notra/utils/demo-mode";

import { runGeoRecapCron } from "@/lib/email/geo-recap";

/**
 * Vercel Cron entry point for opt-in GEO recap emails: the weekly recap on
 * Mondays, and on other days an alert only when visibility drops sharply.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  // The public demo runs no background jobs; scans start on demand. Checked
  // after auth so reading the request keeps this route dynamic (a static
  // 204 breaks the build).
  if (isDemoMode()) {
    return new Response(null, { status: 204 });
  }

  const result = await runGeoRecapCron();
  return Response.json(result, { status: result.failed > 0 ? 500 : 200 });
}
