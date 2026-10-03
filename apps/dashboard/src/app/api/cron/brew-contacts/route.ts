import { isDemoMode } from "@notra/utils/demo-mode";

import { syncBrewContacts } from "@/lib/email/brew-contacts";

export const maxDuration = 300;

/**
 * Vercel Cron entry point that upserts every user into Brew. Signups and
 * preference changes sync right away; this catches the rest (role changes,
 * membership changes, failed syncs) and backfills on the first run.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Checked after auth so reading the request keeps this route dynamic.
  if (isDemoMode()) {
    return new Response(null, { status: 204 });
  }

  const result = await syncBrewContacts();
  return Response.json(result, { status: result.failed > 0 ? 500 : 200 });
}
