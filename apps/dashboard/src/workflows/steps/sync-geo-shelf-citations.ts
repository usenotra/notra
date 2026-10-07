import type { GeoScopeInput } from "@notra/geo-core/types/geo";

import { syncGeoShelfCitationsForScope } from "@/lib/geo-shelf/service";
import { registerWorkflowRuntime } from "@/workflows/runtime";

export async function syncGeoShelfCitationsStep(
  input: GeoScopeInput
): Promise<number> {
  "use step";
  await registerWorkflowRuntime();
  return await syncGeoShelfCitationsForScope(input);
}
