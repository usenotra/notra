import "zod/compile";
import { z } from "@hono/zod-openapi";
import {
  CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS,
  CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS,
} from "@notra/ai/constants/schedule-interval";
import { parseUtcDate } from "@notra/ai/utils/schedule-interval";
import { SUPPORTED_CONTENT_GENERATION_TYPES } from "@notra/content-generation/schemas";
import { lookbackWindowEnum } from "@notra/db/schema";

import { splitCommaSeparatedValues } from "../../utils/query-params";
import {
  cronAnchorDateSchema,
  cronFrequencySchema,
  cronIntervalDaysSchema,
} from "../shared/automation";
import { organizationResponseSchema } from "./content";
import { resourceIdSchema } from "./ids";

const MAX_SCHEDULE_NAME_LENGTH = 120;
const MAX_SCHEDULE_INSTRUCTIONS_LENGTH = 2000;

export const scheduleParamsSchema = z.object({
  scheduleId: resourceIdSchema("scheduleId").openapi({
    param: {
      in: "path",
      name: "scheduleId",
    },
    example: "sched_123",
  }),
});

export const getSchedulesQuerySchema = z.object({
  repositoryIds: z
    .string()
    .optional()
    .transform((value) => splitCommaSeparatedValues(value))
    .openapi({
      description:
        "Filter by GitHub integration IDs using a comma-separated list. Only schedules targeting at least one of them are returned.",
      example:
        "51c2f3aa-efdd-4e28-8e69-23fa2dfd3561,7f9a2b3c-1d4e-4f5a-9b6c-8d7e6f5a4b3c",
    }),
});

const cronConfigSchema = z
  .object({
    frequency: cronFrequencySchema.openapi({
      description: "How often the schedule runs.",
      example: "weekly",
    }),
    hour: z.number().int().min(0).max(23).openapi({
      description: "Hour of the day to run, in UTC (0-23).",
      example: 9,
    }),
    minute: z.number().int().min(0).max(59).openapi({
      description: "Minute of the hour to run (0-59).",
      example: 0,
    }),
    dayOfWeek: z.number().int().min(0).max(6).optional().openapi({
      description:
        "Day of the week for weekly schedules, 0 (Sunday) to 6 (Saturday). Required when frequency is weekly.",
      example: 1,
    }),
    dayOfMonth: z.number().int().min(1).max(31).optional().openapi({
      description:
        "Day of the month for monthly schedules (1-31). Required when frequency is monthly.",
      example: 1,
    }),
    intervalDays: cronIntervalDaysSchema.optional().openapi({
      description: `Run every N days (${CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS}-${CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS}). Required when frequency is custom.`,
      example: 3,
    }),
    anchorDate: cronAnchorDateSchema
      .refine((value) => parseUtcDate(value) !== null, {
        message: "Expected a valid UTC calendar date",
      })
      .optional()
      .openapi({
        description:
          "UTC calendar date (YYYY-MM-DD) a custom interval counts from. Defaults to today.",
        example: "2026-09-03",
      }),
  })
  .superRefine((value, ctx) => {
    if (value.frequency === "custom" && value.intervalDays === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["intervalDays"],
        message: "intervalDays is required for custom schedules",
      });
    }

    if (value.frequency === "weekly" && value.dayOfWeek === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfWeek"],
        message: "dayOfWeek is required for weekly schedules",
      });
    }

    if (value.frequency === "monthly" && value.dayOfMonth === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfMonth"],
        message: "dayOfMonth is required for monthly schedules",
      });
    }
  });

export const scheduleSourceConfigSchema = z.object({
  cron: cronConfigSchema,
});

export const scheduleTargetsSchema = z.object({
  repositoryIds: z
    .array(z.string().trim().min(1))
    .min(1)
    .openapi({
      description:
        "GitHub integration IDs to generate from, as returned by GET /v1/integrations.",
      example: ["51c2f3aa-efdd-4e28-8e69-23fa2dfd3561"],
    }),
});

export const scheduleOutputConfigSchema = z
  .object({
    publishDestination: z
      .enum(["webflow", "framer", "custom"])
      .optional()
      .openapi({
        description: "Where auto-published posts are sent.",
      }),
    brandVoiceId: z.string().trim().min(1).optional().openapi({
      description:
        "Brand identity ID to write in. Defaults to the organization's default brand identity.",
      example: "51c2f3aa-efdd-4e28-8e69-23fa2dfd3561",
    }),
    instructions: z
      .string()
      .trim()
      .min(1)
      .max(MAX_SCHEDULE_INSTRUCTIONS_LENGTH)
      .optional()
      .openapi({
        description:
          "Free-text brief for this schedule, passed to the writer on every run on top of the brand's custom instructions. Use it to steer the angle of the content, for example tutorial-style blog posts.",
        example:
          "Write a tutorial-style post that walks through one feature shipped in this window, with code samples.",
      }),
  })
  .optional();

export const createScheduleRequestSchema = z.object({
  name: z.string().trim().min(1).max(MAX_SCHEDULE_NAME_LENGTH).openapi({
    description: "Display name shown in the dashboard.",
    example: "Weekly changelog",
  }),
  sourceType: z.literal("cron").openapi({
    description: "Always cron for schedules.",
  }),
  sourceConfig: scheduleSourceConfigSchema,
  targets: scheduleTargetsSchema,
  outputType: z.enum(SUPPORTED_CONTENT_GENERATION_TYPES).openapi({
    description: "Type of content each run generates.",
    example: "changelog",
  }),
  outputConfig: scheduleOutputConfigSchema,
  enabled: z.boolean().openapi({
    description:
      "Whether the schedule runs. Disabled schedules are stored but never fire.",
    example: true,
  }),
  autoPublish: z.boolean().default(false).openapi({
    description:
      "Publish generated posts automatically instead of saving them as drafts.",
    example: false,
  }),
  lookbackWindow: z
    .enum(lookbackWindowEnum.enumValues)
    .default("last_7_days")
    .openapi({
      description: "How far back each run collects source activity.",
      example: "last_7_days",
    }),
});

export const patchScheduleRequestSchema = createScheduleRequestSchema.openapi(
  "PatchScheduleRequest"
);

const scheduleSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  sourceType: z.literal("cron"),
  sourceConfig: scheduleSourceConfigSchema,
  targets: scheduleTargetsSchema,
  outputType: z.enum(SUPPORTED_CONTENT_GENERATION_TYPES),
  outputConfig: scheduleOutputConfigSchema.nullable().optional(),
  enabled: z.boolean(),
  autoPublish: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lookbackWindow: z.enum(lookbackWindowEnum.enumValues),
});

export const getSchedulesResponseSchema = z.object({
  schedules: z.array(scheduleSchema),
  repositoryMap: z.record(z.string(), z.string()),
  organization: organizationResponseSchema,
});

export const scheduleResponseSchema = z.object({
  schedule: scheduleSchema,
  organization: organizationResponseSchema,
});

export const deleteScheduleResponseSchema = z.object({
  id: z.string(),
  organization: organizationResponseSchema,
});

export const scheduleTargetsRepositoryIdsSchema = z.object({
  repositoryIds: z.array(z.string()),
});
