import { GEO_PROMPT_TAG_MAX_LENGTH } from "@notra/geo-core/constants/geo";
import { array, enum as enumType, object, string } from "zod";

import {
  GEO_PROMPT_INTENT_FILTER_VALUES,
  GEO_PROMPT_SAVED_VIEWS_MAX,
  GEO_PROMPT_SOURCE_FILTER_VALUES,
  GEO_PROMPT_VIEW_NAME_MAX_LENGTH,
} from "../../constants/dashboard/geo-prompts";

export const geoPromptTableFiltersSchema = object({
  q: string().max(GEO_PROMPT_VIEW_NAME_MAX_LENGTH * 4),
  intent: enumType(GEO_PROMPT_INTENT_FILTER_VALUES),
  tag: string().max(GEO_PROMPT_TAG_MAX_LENGTH),
  source: enumType(GEO_PROMPT_SOURCE_FILTER_VALUES),
});

export const geoPromptSavedViewSchema = object({
  id: string().min(1),
  name: string().trim().min(1).max(GEO_PROMPT_VIEW_NAME_MAX_LENGTH),
  query: geoPromptTableFiltersSchema,
});

export const geoPromptSavedViewsSchema = array(geoPromptSavedViewSchema).max(
  GEO_PROMPT_SAVED_VIEWS_MAX
);

export const geoPromptViewNameSchema = string()
  .trim()
  .min(1)
  .max(GEO_PROMPT_VIEW_NAME_MAX_LENGTH);
