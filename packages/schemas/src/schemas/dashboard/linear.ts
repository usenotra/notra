import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const createLinearIntegrationRequestSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
  linearOrganizationId: z.string().min(1, "Linear organization ID is required"),
  linearOrganizationName: z.string().optional(),
  linearTeamId: z.string().optional(),
  linearTeamName: z.string().optional(),
  displayName: z.string().min(1, "Display name is required"),
});
export type CreateLinearIntegrationRequest = z.infer<
  typeof createLinearIntegrationRequestSchema
>;

export const updateLinearIntegrationBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    displayName: z.string().trim().min(1).optional(),
    linearTeamId: z.string().nullable().optional(),
    linearTeamName: z.string().nullable().optional(),
  })
  .refine(
    (value) =>
      value.enabled !== undefined ||
      value.displayName !== undefined ||
      value.linearTeamId !== undefined ||
      value.linearTeamName !== undefined,
    {
      message: "At least one field must be provided",
    }
  );
export type UpdateLinearIntegrationBody = z.infer<
  typeof updateLinearIntegrationBodySchema
>;

export const linearIntegrationIdParamSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
});
export type LinearIntegrationIdParam = z.infer<
  typeof linearIntegrationIdParamSchema
>;

export const linearAuthorizeQuerySchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  callbackPath: z.string().min(1).default("/"),
});
export type LinearAuthorizeQuery = z.infer<typeof linearAuthorizeQuerySchema>;

export const linearWebhookPayloadSchema = z.object({
  action: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type LinearWebhookPayload = z.infer<typeof linearWebhookPayloadSchema>;
