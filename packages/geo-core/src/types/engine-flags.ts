import { Data } from "effect";

import type { GeoFeatureFlagServiceShape } from "./deps";

export class GeoEngineFlagCacheKey extends Data.Class<{
  readonly organizationId: string;
  readonly featureFlags: GeoFeatureFlagServiceShape;
}> {}

export interface GeoEngineFlags {
  readonly cursorEnabled: boolean;
  readonly openCodeEnabled: boolean;
}
