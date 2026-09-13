import { z } from "zod";

export const webhookEventTypeSchema = z.enum([
  "post.generation.completed",
  "post.generation.failed",
  "post.generation.skipped",
]);
export const createWebhookRequestSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(webhookEventTypeSchema).min(1).max(3),
});
export const webhookEndpointParamsSchema = z.object({
  endpointId: z.string().min(1),
});
export const webhookDeliveryParamsSchema = z.object({
  deliveryId: z.string().min(1),
});
export const webhookDeliveryQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  status: z
    .enum([
      "all",
      "pending",
      "sending",
      "retrying",
      "succeeded",
      "failed",
      "cancelled",
    ])
    .default("all"),
});
export const webhookEndpointSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  url: z.string(),
  events: z.array(webhookEventTypeSchema),
  enabled: z.boolean(),
  createdAt: z.string(),
});
export const webhookIdentifierSchema = z.object({ id: z.string() });
export const webhookDeliverySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  endpointId: z.string(),
  url: z.string(),
  eventType: webhookEventTypeSchema,
  status: z.enum([
    "pending",
    "sending",
    "retrying",
    "succeeded",
    "failed",
    "cancelled",
  ]),
  attemptCount: z.number(),
  nextAttemptAt: z.string(),
  createdAt: z.string(),
  statusCode: z.number().nullable(),
  error: z.string().nullable(),
});
export const webhookAttemptSchema = z.object({
  id: z.string(),
  deliveryId: z.string(),
  attemptNumber: z.number(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  statusCode: z.number().nullable(),
  error: z.string().nullable(),
  durationMs: z.number().nullable(),
});
export const webhookListResponseSchema = z.object({
  endpoints: z.array(webhookEndpointSchema),
});
export const webhookCreateResponseSchema = z.object({
  endpoint: webhookEndpointSchema,
  secret: z.string(),
});
export const webhookDeliveriesResponseSchema = z.object({
  deliveries: z.array(webhookDeliverySchema),
  hasMore: z.boolean(),
});
export const webhookDetailResponseSchema = z.object({
  delivery: webhookDeliverySchema.extend({ payload: z.string() }),
  attempts: z.array(webhookAttemptSchema),
});
