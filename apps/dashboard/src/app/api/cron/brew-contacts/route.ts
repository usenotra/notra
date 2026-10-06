import { isBrewConfigured } from "@notra/email/utils/brew";
import { isDemoMode } from "@notra/utils/demo-mode";

import { pruneBrewContacts, syncBrewContacts } from "@/lib/email/brew-contacts";

/**
 * Vercel Cron entry point that upserts every user into Brew and deletes
 * contacts of removed users. Signups, preference changes and deletions sync
 * right away; this catches the rest (role changes, membership changes, failed
 * syncs) and backfills on the first run.
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
  // A missing key would make every sync a silent no-op; fail loudly instead.
  if (!isBrewConfigured()) {
    return Response.json({ error: "BREW_API_KEY is not set" }, { status: 503 });
  }

  const result = await syncBrewContacts();
  const { pruned } = await pruneBrewContacts();
  return Response.json(
    { ...result, pruned },
    { status: result.failed > 0 ? 500 : 200 }
  );
}
