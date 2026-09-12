import "zod/compile";
import { z } from "@hono/zod-openapi";
import {
  GEO_COMPETITOR_MAX_SYNONYMS,
  GEO_MAX_COMPETITORS,
  GEO_SHORT_FIELD_MAX_LENGTH,
} from "@notra/geo-core/constants/geo";
import { GEO_CSV_IMPORT_MAX_BYTES } from "@notra/geo-core/constants/geo-import";
import { geoCompetitorDomainSchema } from "@notra/geo-core/schemas/geo-import";

import { organizationResponseSchema } from "./content";
import { createGeoShortTextSchema } from "./geo-fields";
import { geoImportIssueSchema } from "./geo-import";

const competitorSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    domain: z.string().nullable(),
    synonyms: z.array(z.string()),
    kind: z.enum(["direct", "indirect"]),
    color: z.string().nullable(),
  })
  .openapi("GeoCompetitor");

export const listCompetitorsResponseSchema = z
  .object({
    competitors: z.array(competitorSchema),
    organization: organizationResponseSchema,
  })
  .openapi("ListGeoCompetitorsResponse");

export const competitorSuggestionsQuerySchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1)
    .max(GEO_SHORT_FIELD_MAX_LENGTH)
    .openapi({
      param: { name: "domain", in: "query" },
      description: "Website domain, for example `example.com`.",
      example: "example.com",
    }),
});

export const competitorSuggestionsResponseSchema = z
  .object({
    domain: z.string(),
    field: z.string().nullable(),
    competitors: z.array(
      z.object({
        name: z.string(),
        domain: z.string().nullable(),
        description: z.string().nullable(),
        confidence: z.enum(["high", "medium"]).nullable(),
      })
    ),
    organization: organizationResponseSchema,
  })
  .openapi("GeoCompetitorSuggestionsResponse");

export const putCompetitorRequestSchema = z
  .object({
    name: createGeoShortTextSchema(),
    previousName: createGeoShortTextSchema().optional().openapi({
      description: "Set to rename an existing competitor.",
    }),
    domain: geoCompetitorDomainSchema.nullable(),
    synonyms: z
      .array(createGeoShortTextSchema())
      .max(GEO_COMPETITOR_MAX_SYNONYMS)
      .optional(),
    kind: z.enum(["direct", "indirect"]).optional(),
    color: z
      .string()
      .trim()
      .max(GEO_SHORT_FIELD_MAX_LENGTH)
      .nullable()
      .optional(),
  })
  .openapi("PutGeoCompetitorRequest");

const competitorImportRowSchema = z.object({
  name: createGeoShortTextSchema(),
  domain: geoCompetitorDomainSchema.nullable().optional(),
  kind: z.enum(["direct", "indirect"]).optional(),
  synonyms: z
    .array(createGeoShortTextSchema())
    .max(GEO_COMPETITOR_MAX_SYNONYMS)
    .optional(),
});

export const importCompetitorsRequestSchema = z
  .object({
    rows: z
      .array(competitorImportRowSchema)
      .min(1)
      .max(GEO_MAX_COMPETITORS)
      .optional(),
    // See `importPromptsRequestSchema`: a code-unit cap, not a byte count.
    csv: z.string().min(1).max(GEO_CSV_IMPORT_MAX_BYTES).optional().openapi({
      description:
        "Raw CSV text with a `name` column (optionally `domain`, `kind`, `synonyms`). Used when `rows` is omitted.",
    }),
  })
  .refine((value) => value.rows !== undefined || value.csv !== undefined, {
    message: "Provide either rows or csv",
  })
  .openapi("ImportGeoCompetitorsRequest");

export const importCompetitorsResponseSchema = z
  .object({
    imported: z.number().int(),
    updated: z.number().int(),
    skipped: z.number().int(),
    issues: z.array(geoImportIssueSchema),
    competitors: z.array(competitorSchema),
    organization: organizationResponseSchema,
  })
  .openapi("ImportGeoCompetitorsResponse");
