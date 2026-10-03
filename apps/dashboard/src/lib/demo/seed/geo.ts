import { GEO_DEMO_PROFILE } from "@notra/geo-core/constants/geo-demo";
import { seedGeoSampleData } from "@notra/geo-core/geo/sample-data";
import { Effect } from "effect";

import { geoCoreDashboardLayer } from "@/lib/geo/configure";
import type { DemoSeedContext } from "@/types/demo";
import { personalizeGeoProfile } from "@/utils/demo-personalize";

export async function seedDemoGeo(context: DemoSeedContext): Promise<string> {
  const result = await Effect.runPromise(
    seedGeoSampleData({
      organizationId: context.organizationId,
      profile: personalizeGeoProfile(GEO_DEMO_PROFILE, context.companyName),
      now: context.now,
    }).pipe(Effect.provide(geoCoreDashboardLayer))
  );
  return result.projectId;
}
