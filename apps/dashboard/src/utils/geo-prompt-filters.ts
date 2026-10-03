import { GEO_PROMPT_FILTER_ALL } from "@notra/schemas/constants/dashboard/geo-prompts";

import type { GeoPromptTableFilters } from "@/types/geo";

export function promptFiltersActive(filters: GeoPromptTableFilters): boolean {
  return (
    filters.q.trim().length > 0 ||
    filters.intent !== GEO_PROMPT_FILTER_ALL ||
    filters.tag !== GEO_PROMPT_FILTER_ALL ||
    filters.source !== GEO_PROMPT_FILTER_ALL
  );
}
