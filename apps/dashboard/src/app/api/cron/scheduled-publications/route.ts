import { runScheduledPublicationSweep } from "@/lib/content/scheduled-publication-sweep";

/**
 * Vercel Cron safety net for scheduled publishing, every five minutes. Due
 * times normally arrive as QStash wakes; this sweep picks up whatever a lost
 * wake or an expired lease left behind. The due stamps live on
 * `scheduled_publications`, so nothing is lost between ticks.
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
