import "zod/compile";
import { z } from "@hono/zod-openapi";
import {
  GEO_PROMPT_MAX_TAGS,
  GEO_PROMPT_TAG_MAX_LENGTH,
} from "@notra/geo-core/constants/geo";
import {
  GEO_CSV_IMPORT_MAX_BYTES,
  GEO_CSV_IMPORT_MAX_ROWS,
} from "@notra/geo-core/constants/geo-import";

import { organizationResponseSchema } from "./content";
import { geoPromptTextSchema } from "./geo-fields";
import { geoImportIssueSchema } from "./geo-import";

const promptTagsSchema = z
  .array(z.string().trim().min(1).max(GEO_PROMPT_TAG_MAX_LENGTH))
  .max(GEO_PROMPT_MAX_TAGS)
  .openapi({
    description:
      "Free-form labels for grouping custom prompts. Lowercased and deduplicated on save.",
  });

const promptSchema = z
  .object({
    id: z.string(),
    prompt: z.string(),
    enabled: z.boolean(),
    source: z.enum(["custom", "auto"]),
    tags: z.array(z.string()),
    createdAt: z.string().nullable(),
  })
  .openapi("GeoPrompt");

export const listPromptsResponseSchema = z
  .object({
    configured: z.boolean(),
    prompts: z.array(promptSchema),
    organization: organizationResponseSchema,
  })
  .openapi("ListGeoPromptsResponse");

export const promptResponseSchema = z
  .object({
    prompt: promptSchema,
    organization: organizationResponseSchema,
  })
  .openapi("GeoPromptResponse");

export const createPromptRequestSchema = z
  .object({
    prompt: geoPromptTextSchema,
    tags: promptTagsSchema.optional(),
  })
  .openapi("CreateGeoPromptRequest");

export const patchPromptRequestSchema = z
  .object({
    enabled: z.boolean().optional(),
    tags: promptTagsSchema.optional(),
  })
  .refine((value) => value.enabled !== undefined || value.tags !== undefined, {
    message: "Provide enabled or tags",
  })
  .openapi("PatchGeoPromptRequest");

export const deletePromptResponseSchema = z
  .object({
    id: z.string(),
    organization: organizationResponseSchema,
  })
  .openapi("DeleteGeoPromptResponse");

const promptImportRowSchema = z.object({
  prompt: geoPromptTextSchema,
  enabled: z.boolean().optional(),
});

export const importPromptsRequestSchema = z
  .object({
    rows: z
      .array(promptImportRowSchema)
      .min(1)
      .max(GEO_CSV_IMPORT_MAX_ROWS)
      .optional(),
    // `.max` counts UTF-16 code units, not bytes, so this is a cap rather than
    // an exact byte limit — good enough to keep an unbounded body out of the
    // CSV parser, and it matches the dashboard's upload limit.
    csv: z.string().min(1).max(GEO_CSV_IMPORT_MAX_BYTES).optional().openapi({
      description:
        "Raw CSV text with a `prompt` column (optionally `enabled`). Used when `rows` is omitted.",
    }),
  })
  .refine((value) => value.rows !== undefined || value.csv !== undefined, {
    message: "Provide either rows or csv",
  })
  .openapi("ImportGeoPromptsRequest");

export const importPromptsResponseSchema = z
  .object({
    imported: z.number().int(),
    updated: z.number().int(),
    skipped: z.number().int(),
    issues: z.array(geoImportIssueSchema).openapi({
      description: "Rows rejected while parsing CSV. Always empty for `rows`.",
    }),
    organization: organizationResponseSchema,
  })
  .openapi("ImportGeoPromptsResponse");
