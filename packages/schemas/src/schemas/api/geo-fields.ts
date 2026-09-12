import "zod/compile";
import { z } from "@hono/zod-openapi";
import {
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MIN_LENGTH,
  GEO_SHORT_FIELD_MAX_LENGTH,
} from "@notra/geo-core/constants/geo";

export const createGeoShortTextSchema = () =>
  z.string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH);

export const geoPromptTextSchema = z
  .string()
  .trim()
  .min(GEO_PROMPT_MIN_LENGTH)
  .max(GEO_PROMPT_MAX_LENGTH);
