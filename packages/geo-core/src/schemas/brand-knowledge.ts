import { GEO_BRAND_FACT_CATEGORIES } from "@notra/db/types/geo-accuracy";
import { z } from "zod";

import { KNOWLEDGE_MAX_RECORDS } from "../constants/brand-knowledge";
import { geoOrganizationInputSchema } from "./geo";

export const brandKnowledgeVoiceInputSchema = geoOrganizationInputSchema.extend(
  {
    voiceId: z.string().trim().min(1),
  }
);

export const brandKnowledgeRecordSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    statement: z.string().trim().min(1).max(240),
    category: z.enum(GEO_BRAND_FACT_CATEGORIES),
    origin: z.enum(["github", "website", "manual"]),
    sourceUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
    sourcePath: z.string().trim().max(500).optional().or(z.literal("")),
    pinned: z.boolean().optional(),
  })
  .strict();

export const brandKnowledgeSaveInputSchema =
  brandKnowledgeVoiceInputSchema.extend({
    githubIntegrationId: z.string().trim().min(1).nullable().optional(),
    records: z.array(brandKnowledgeRecordSchema).max(KNOWLEDGE_MAX_RECORDS),
  });

export const brandKnowledgeScanInputSchema =
  brandKnowledgeVoiceInputSchema.extend({
    githubIntegrationId: z.string().trim().min(1).nullable().optional(),
  });

export const knowledgeScanOutputSchema = z
  .object({
    facts: z
      .array(
        z
          .object({
            statement: z.string().trim().min(1).max(240),
            category: z.enum(GEO_BRAND_FACT_CATEGORIES),
            origin: z.enum(["github", "website"]),
            // Azure structured output rejects format "uri" and optional keys.
            sourceUrl: z.string().trim().min(8).max(500),
          })
          .strict()
      )
      .max(KNOWLEDGE_MAX_RECORDS),
  })
  .strict();
