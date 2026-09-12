import "zod/compile";
import { z } from "@hono/zod-openapi";
import {
  GEO_CONVERSION_PATH_MAX_LENGTH,
  GEO_MAX_ALIASES,
  GEO_MAX_CONVERSION_PATHS,
  GEO_MAX_ENGINES,
  GEO_MAX_LANGUAGES,
  GEO_MAX_PROMPTS,
  GEO_SCAN_HOURS_PER_DAY,
  GEO_SCAN_INTERVAL_HOURS,
  GEO_SCAN_MAX_INTERVAL_HOURS,
  GEO_SCAN_MIN_INTERVAL_HOURS,
  GEO_SHORT_FIELD_MAX_LENGTH,
} from "@notra/geo-core/constants/geo";

import { organizationResponseSchema } from "./content";
import { createGeoShortTextSchema } from "./geo-fields";

const settingsSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    projectId: z.string(),
    companyName: z.string(),
    aliases: z.array(z.string()),
    conversionPaths: z.array(z.string()),
    competitors: z.array(z.string()),
    languages: z.array(z.string()),
    engines: z.array(z.string()),
    enforceZdr: z.boolean(),
    nonZdrApprovedEngines: z.array(z.string()),
    pausedAutoPromptIds: z.array(z.string()),
    removedAutoPromptIds: z.array(z.string()),
    enabled: z.boolean(),
    scanIntervalHours: z.number().int(),
    scanStartedAt: z.string().nullable(),
    lastScanAt: z.string().nullable(),
    isScanning: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("GeoSettings");

export const settingsResponseSchema = z
  .object({
    configured: z.boolean().openapi({
      description: "Whether the analytics backend is configured.",
    }),
    settings: settingsSchema.nullable(),
    organization: organizationResponseSchema,
  })
  .openapi("GeoSettingsResponse");

export const patchSettingsRequestSchema = z
  .object({
    companyName: z.string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
    aliases: z.array(createGeoShortTextSchema()).max(GEO_MAX_ALIASES),
    conversionPaths: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(GEO_CONVERSION_PATH_MAX_LENGTH)
          .refine((value) => value.startsWith("/"), {
            message: "Conversion paths must start with /",
          })
      )
      .max(GEO_MAX_CONVERSION_PATHS)
      .optional()
      .openapi({
        description:
          "Paths that count as a conversion when an AI referral reaches them. Prefix match. Omit to keep the stored list.",
      }),
    languages: z
      .array(createGeoShortTextSchema())
      .min(1)
      .max(GEO_MAX_LANGUAGES),
    engines: z.array(createGeoShortTextSchema()).min(1).max(GEO_MAX_ENGINES),
    enforceZdr: z.boolean(),
    nonZdrApprovedEngines: z
      .array(createGeoShortTextSchema())
      .max(GEO_MAX_ENGINES),
    pausedAutoPromptIds: z
      .array(createGeoShortTextSchema())
      .max(GEO_MAX_PROMPTS)
      .optional()
      .openapi({
        description:
          "Ids of auto-generated prompts to skip in scans. Omit to keep the current list.",
      }),
    removedAutoPromptIds: z
      .array(createGeoShortTextSchema())
      .max(GEO_MAX_PROMPTS)
      .optional()
      .openapi({
        description:
          "Ids of auto-generated prompts removed from tracking. Omit to keep the current list.",
      }),
    enabled: z.boolean(),
    scanIntervalHours: z
      .number()
      .int()
      .min(GEO_SCAN_MIN_INTERVAL_HOURS)
      .max(GEO_SCAN_MAX_INTERVAL_HOURS)
      .multipleOf(GEO_SCAN_HOURS_PER_DAY, {
        message: `scanIntervalHours must be a whole number of days (multiple of ${GEO_SCAN_HOURS_PER_DAY})`,
      })
      .openapi({
        description: `Hours between automatic scans, ${GEO_SCAN_MIN_INTERVAL_HOURS}-${GEO_SCAN_MAX_INTERVAL_HOURS}, in whole days (multiple of ${GEO_SCAN_HOURS_PER_DAY}). Presets: ${GEO_SCAN_INTERVAL_HOURS.join(", ")}.`,
      }),
  })
  .openapi("PatchGeoSettingsRequest");
