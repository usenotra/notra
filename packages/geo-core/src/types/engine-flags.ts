import { Data } from "effect";

import type { GeoFeatureFlagServiceShape } from "./deps";

export class GeoEngineFlagCacheKey extends Data.Class<{
  readonly organizationId: string;
  readonly featureFlags: GeoFeatureFlagServiceShape;
}> {}

export interface GeoEngineFlags {
  readonly cursorEnabled: boolean;
  readonly openCodeEnabled: boolean;
  /**
   * `false` when the flag provider could not answer. Both flags then read as
   * disabled (fail closed) and the result is not cached, so the next caller
   * retries the provider.
   */
  readonly available: boolean;
}
