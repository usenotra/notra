import { z } from "zod";

import {
  webhookEventsInputSchema,
  webhookStatusFilterSchema,
  webhookUrlInputSchema,
} from "../api/webhooks";
import { organizationIdInputSchema } from "./auth/organization";

export const webhookListInputSchema = organizationIdInputSchema.extend({
  offset: z.number().int().min(0).max(100000).default(0),
  status: webhookStatusFilterSchema.default("all"),
});
export const webhookCreateInputSchema = organizationIdInputSchema.extend({
  url: webhookUrlInputSchema,
  events: webhookEventsInputSchema,
});
export const webhookEndpointInputSchema = organizationIdInputSchema.extend({
  endpointId: z.string().min(1),
});
export const webhookDeliveryInputSchema = organizationIdInputSchema.extend({
  deliveryId: z.string().min(1),
});
