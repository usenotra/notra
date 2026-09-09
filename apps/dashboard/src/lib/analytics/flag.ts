import { Cache, Effect } from "effect";

import { makeAnalyticsFlagCache } from "@/lib/analytics/flag-client";

const clientId = process.env.NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID ?? "";
const flagCache = Effect.runSync(makeAnalyticsFlagCache(clientId));

export function isAnalyticsEnabledForOrganization(
  organizationId: string
): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    return Promise.resolve(true);
  }
  if (clientId.length === 0) {
    return Promise.resolve(false);
  }
  return Effect.runPromise(
    Cache.get(flagCache, organizationId).pipe(
      Effect.map((state) => state === "enabled")
    )
  );
}
