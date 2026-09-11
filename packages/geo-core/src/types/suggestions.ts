import type { geoPromptSuggestions } from "@notra/db/schema";

import type { GeoScopeInput } from "./geo";

export type GeoSuggestionRow = typeof geoPromptSuggestions.$inferSelect;
export interface GeoSuggestionInput extends GeoScopeInput {
  suggestionId: string;
}
