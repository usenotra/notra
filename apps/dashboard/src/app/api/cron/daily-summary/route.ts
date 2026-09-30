import { isDemoMode } from "@notra/utils/demo-mode";

import { runDailySummaryCron } from "@/lib/email/daily-summary";

export const maxDuration = 60;

/**
 * Vercel Cron entry point for opt-in GEO daily summary emails. Quiet or
 * unchanged days are skipped so owners only hear from us when GEO moved.
 */
export async function GET(request: Request) {
  // The public demo runs no background jobs; scans start on demand.
  if (isDemoMode()) {
    return new Response(null, { status: 204 });
  }
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runDailySummaryCron();
  return Response.json(result, { status: result.failed > 0 ? 500 : 200 });
}
