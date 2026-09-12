import "zod/compile";
import { GRANOLA_API_KEY_PREFIX } from "@notra/ai/constants/granola";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const granolaApiKeySchema = z
  .string()
  .trim()
  .min(1, "API key is required")
  .refine(
    (value) => value.startsWith(GRANOLA_API_KEY_PREFIX),
    "Enter a valid Granola API key (starts with grn_)"
  );

export const addGranolaIntegrationFormSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required"),
  apiKey: granolaApiKeySchema,
});
export type AddGranolaIntegrationFormValues = z.infer<
  typeof addGranolaIntegrationFormSchema
>;

export const createGranolaIntegrationRequestSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  displayName: z.string().trim().min(1, "Display name is required"),
  apiKey: granolaApiKeySchema,
  workspaceName: z.string().optional(),
});
export type CreateGranolaIntegrationRequest = z.infer<
  typeof createGranolaIntegrationRequestSchema
>;

export const updateGranolaIntegrationBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    displayName: z.string().trim().min(1).optional(),
    workspaceName: z.string().nullable().optional(),
  })
  .refine(
    (value) =>
      value.enabled !== undefined ||
      value.displayName !== undefined ||
      value.workspaceName !== undefined,
    {
      message: "At least one field must be provided",
    }
  );
export type UpdateGranolaIntegrationBody = z.infer<
  typeof updateGranolaIntegrationBodySchema
>;
