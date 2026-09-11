import "zod/compile";
import {
  contentGenerationWorkflowPayloadSchema,
  LOOKBACK_WINDOWS,
} from "@notra/content-generation/schemas";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import { triggerOutputConfigSchema } from "./integrations";

export const generateChangelogBodySchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

export type GenerateChangelogBody = z.infer<typeof generateChangelogBodySchema>;

export const scheduleWorkflowPayloadSchema = z.object({
  triggerId: z.string().min(1),
  manual: z.boolean().optional().default(false),
  executionId: z.string().min(1).optional(),
  delaySeconds: z.number().int().min(0).max(86_400).optional(),
});

export const onDemandContentWorkflowPayloadSchema =
  contentGenerationWorkflowPayloadSchema;

export type OnDemandContentWorkflowPayload = z.infer<
  typeof onDemandContentWorkflowPayloadSchema
>;

export type ScheduleWorkflowPayload = z.infer<
  typeof scheduleWorkflowPayloadSchema
>;

export const eventWorkflowPayloadSchema = z.object({
  triggerId: z.string().min(1),
  eventType: z.string().min(1),
  eventAction: z.string(),
  eventData: z.record(z.string(), z.json()),
  repositoryId: z.string().min(1),
  deliveryId: z.string().optional(),
  executionId: z.string().min(1).optional(),
});

export type EventWorkflowPayload = z.infer<typeof eventWorkflowPayloadSchema>;

export const contentEmailDigestPayloadSchema = z.object({
  digestKey: z.string().min(1),
  recipientEmail: z.email(),
  organizationId: z.string().min(1),
  kind: z.enum([
    "ai_credits_depleted",
    "scheduled_content_created",
    "scheduled_content_failed",
    "scheduled_content_skipped",
  ]),
});

export type ContentEmailDigestPayload = z.infer<
  typeof contentEmailDigestPayloadSchema
>;

export const automatedWorkflowFailureStateSchema = z.object({
  count: z.number().int().nonnegative(),
  firstFailedAt: z.iso.datetime(),
  lastFailedAt: z.iso.datetime(),
});

export type AutomatedWorkflowFailureState = z.infer<
  typeof automatedWorkflowFailureStateSchema
>;

export const workflowLookbackWindowSchema = z.enum(LOOKBACK_WINDOWS);

export const nullableTriggerOutputConfigSchema = z.union([
  triggerOutputConfigSchema,
  z.null(),
]);
