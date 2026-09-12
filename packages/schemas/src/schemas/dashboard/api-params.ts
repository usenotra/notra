import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const triggerIdQuerySchema = z.object({
  triggerId: z.string().min(1),
});

export const webhookLogSourceFilterSchema = z.enum([
  "all",
  "github",
  "linear",
  "webhook",
  "manual",
  "schedule",
  "events",
  "geo",
  "agent-readiness",
  "search-console",
  "brand",
]);

export const webhookLogStatusFilterSchema = z.enum([
  "all",
  "success",
  "failed",
  "pending",
  "skipped",
]);

export const webhookLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  integrationType: z
    .enum([
      "github",
      "linear",
      "slack",
      "webhook",
      "manual",
      "schedule",
      "events",
      "geo",
      "agent-readiness",
      "search-console",
      "brand",
    ])
    .default("github"),
  integrationId: z.string().nullish(),
  source: webhookLogSourceFilterSchema.default("all"),
  status: webhookLogStatusFilterSchema.default("all"),
  search: z.string().max(200).default(""),
});

export const contentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  date: z.string().optional(),
  projectId: z.string().min(1).optional(),
});

export const deleteWithTransfersSchema = z.object({
  transfers: z.array(
    z.object({
      orgId: z.string().min(1),
      action: z.enum(["transfer", "delete"]),
    })
  ),
});

export const organizationMembershipActionSchema = z.object({
  organizationId: z.string().min(1),
  action: z.enum(["leave", "delete"]),
});
