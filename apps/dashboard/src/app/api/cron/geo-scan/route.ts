import { flushGeoLog } from "@notra/ai/evlog";
import { runGeoScanCronSweep } from "@notra/geo-core/geo/scan-schedule";
import { Effect } from "effect";

import { geoCoreDashboardLayer } from "@/lib/geo/configure";

// One sweep starts up to GEO_SCAN_DUE_LIMIT_PER_SWEEP workflows in sequence;
// the platform default would cut a busy catch-up sweep short.
export const maxDuration = 300;

/**
 * Vercel Cron entry point for scheduled GEO scans. The schedule is a due
 * stamp (`geo_settings.next_scan_at`) this sweep polls, so there is no
 * external message chain that can die and silently stop a project's scans:
 * a project the sweep misses is simply picked up on the next tick.
 *
 * The sweep result is logged as `geo.scan.sweep` so a stalled schedule can
 * be diagnosed from the log drain instead of the database.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await Effect.runPromise(
      runGeoScanCronSweep().pipe(Effect.provide(geoCoreDashboardLayer))
    );
    return Response.json(result);
  } finally {
    await flushGeoLog();
  }
}
