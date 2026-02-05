// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { INPUT_INTEGRATION_TYPES } from "./integrations";

export const webhookParamsSchema = z.object({
  provider: z.enum(INPUT_INTEGRATION_TYPES),
  organizationId: z.string().min(1),
  integrationId: z.string().min(1),
});

export type WebhookParams = z.infer<typeof webhookParamsSchema>;

export const webhookParamsWithRepoSchema = z.object({
  provider: z.enum(INPUT_INTEGRATION_TYPES),
  organizationId: z.string().min(1),
  integrationId: z.string().min(1),
  repositoryId: z.string().min(1),
});

export type WebhookParamsWithRepo = z.infer<typeof webhookParamsWithRepoSchema>;
