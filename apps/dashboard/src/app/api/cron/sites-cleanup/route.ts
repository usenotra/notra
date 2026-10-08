import { db } from "@notra/db/drizzle";
import { sites, siteWebhookDeliveries } from "@notra/db/schema";
import { cleanupSiteDeployments } from "@notra/sites-server/cleanup";
import { mapWithConcurrency } from "@notra/sites-server/utils/concurrency";
import { isDemoMode } from "@notra/utils/demo-mode";
import { lt, sql } from "drizzle-orm";

import { SITES_CLEANUP_CONCURRENCY } from "@/constants/sites";

export const maxDuration = 300;

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
  let deleted = 0;
  const failed: string[] = [];
  const allSites = await db.select({ id: sites.id }).from(sites);
  await mapWithConcurrency(
    allSites,
    SITES_CLEANUP_CONCURRENCY,
    async (site) => {
      try {
        deleted += (await cleanupSiteDeployments(site.id)).deleted.length;
      } catch (error) {
        failed.push(site.id);
        console.error("sites.cleanup_failed", {
          siteId: site.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
  );
  await db
    .delete(siteWebhookDeliveries)
    .where(
      lt(siteWebhookDeliveries.receivedAt, sql`now() - interval '14 days'`)
    );
  return Response.json(
    { deleted, failed },
    { status: failed.length > 0 ? 500 : 200 }
  );
}
