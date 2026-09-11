import "zod/compile";
import { z } from "@hono/zod-openapi";
import { SUPPORTED_CONTENT_GENERATION_TYPES } from "@notra/content-generation/schemas";

import { splitCommaSeparatedValues } from "../../utils/query-params";
import { eventTriggerSourceConfigSchema as sharedEventTriggerSourceConfigSchema } from "../shared/automation";
import { organizationResponseSchema } from "./content";
import { resourceIdSchema } from "./ids";

export const eventTriggerParamsSchema = z.object({
  triggerId: resourceIdSchema("triggerId").openapi({
    param: {
      in: "path",
      name: "triggerId",
    },
    example: "trig_123",
  }),
});

export const getEventTriggersQuerySchema = z.object({
  repositoryIds: z
    .string()
    .optional()
    .transform((value) => splitCommaSeparatedValues(value))
    .openapi({
      description: "Filter by repository IDs using a comma-separated list",
      example: "repo_123,repo_456",
    }),
});

export const eventTriggerSourceConfigSchema =
  sharedEventTriggerSourceConfigSchema;

export const eventTriggerTargetsSchema = z.object({
  repositoryIds: z.array(z.string().trim().min(1)).min(1),
});

export const eventTriggerOutputConfigSchema = z
  .object({
    publishDestination: z.enum(["webflow", "framer", "custom"]).optional(),
    brandVoiceId: z.string().trim().min(1).optional(),
  })
  .optional();

export const createEventTriggerRequestSchema = z.object({
  sourceType: z.literal("github_webhook"),
  sourceConfig: eventTriggerSourceConfigSchema,
  targets: eventTriggerTargetsSchema,
  outputType: z.enum(SUPPORTED_CONTENT_GENERATION_TYPES),
  outputConfig: eventTriggerOutputConfigSchema,
  enabled: z.boolean(),
  autoPublish: z.boolean().default(false),
});

export const patchEventTriggerRequestSchema =
  createEventTriggerRequestSchema.openapi("PatchEventTriggerRequest");

const eventTriggerSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  sourceType: z.literal("github_webhook"),
  sourceConfig: eventTriggerSourceConfigSchema,
  targets: eventTriggerTargetsSchema,
  outputType: z.enum(SUPPORTED_CONTENT_GENERATION_TYPES),
  outputConfig: eventTriggerOutputConfigSchema.nullable().optional(),
  enabled: z.boolean(),
  autoPublish: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const getEventTriggersResponseSchema = z.object({
  eventTriggers: z.array(eventTriggerSchema),
  repositoryMap: z.record(z.string(), z.string()),
  organization: organizationResponseSchema,
});

export const eventTriggerResponseSchema = z.object({
  eventTrigger: eventTriggerSchema,
  organization: organizationResponseSchema,
});

export const deleteEventTriggerResponseSchema = z.object({
  id: z.string(),
  organization: organizationResponseSchema,
});
