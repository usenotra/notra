import { runScheduledPublicationSweep } from "@/lib/content/scheduled-publication-sweep";

export const maxDuration = 60;

/**
 * Vercel Cron entry point for scheduled publishing, every minute. The due
 * stamps live on `scheduled_publications`, so a missed tick only delays a
 * post until the next one.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runScheduledPublicationSweep();
  if (result.claimed > 0) {
    console.info("[ScheduledPublication] Sweep", result);
  }
  return Response.json(result);
}
