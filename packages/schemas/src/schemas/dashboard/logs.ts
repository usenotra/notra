import "zod/compile";
import { webhookLogsQuerySchema } from "@notra/schemas/dashboard/api-params";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const listWebhookLogsInputSchema = z.object({
  organizationId: organizationIdSchema,
  page: webhookLogsQuerySchema.shape.page,
  pageSize: webhookLogsQuerySchema.shape.pageSize,
  integrationType: webhookLogsQuerySchema.shape.integrationType,
  integrationId: z.string().nullish(),
  source: webhookLogsQuerySchema.shape.source,
  status: webhookLogsQuerySchema.shape.status,
  search: webhookLogsQuerySchema.shape.search,
});

export const webhookLogDetailInputSchema = z.object({
  organizationId: organizationIdSchema,
  logId: z.string().min(1),
});
