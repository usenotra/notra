import type { GeoScopeInput } from "@notra/geo-core/types/geo";

import { syncGeoShelfCitationsForScope } from "@/lib/geo-shelf/service";

export async function syncGeoShelfCitationsStep(
  input: GeoScopeInput
): Promise<number> {
  "use step";
  return await syncGeoShelfCitationsForScope(input);
}
