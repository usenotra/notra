import { z } from "zod";

import { organizationIdInputSchema } from "./auth/organization";

export const webhookEventTypeSchema = z.enum([
  "post.generation.completed",
  "post.generation.failed",
  "post.generation.skipped",
]);
export const webhookListInputSchema = organizationIdInputSchema.extend({
  offset: z.number().int().min(0).max(100000).default(0),
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
export const webhookCreateInputSchema = organizationIdInputSchema.extend({
  url: z.string().url().max(2048),
  events: z.array(webhookEventTypeSchema).min(1).max(3),
});
export const webhookEndpointInputSchema = organizationIdInputSchema.extend({
  endpointId: z.string().min(1),
});
export const webhookDeliveryInputSchema = organizationIdInputSchema.extend({
  deliveryId: z.string().min(1),
});
