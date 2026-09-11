import "zod/compile";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import {
  API_KEY_ACCESS_MODE_VALUES,
  API_KEY_EXPIRATION_VALUES,
  API_KEY_GRANULAR_PERMISSIONS,
} from "../../constants/dashboard/api-keys";

const scopesSchema = z
  .array(z.enum(API_KEY_GRANULAR_PERMISSIONS))
  .min(1, "Select at least one permission");

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  accessMode: z.enum(API_KEY_ACCESS_MODE_VALUES).default("restricted"),
  scopes: scopesSchema,
  expiration: z.enum(API_KEY_EXPIRATION_VALUES),
});

export const updateApiKeySchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
  name: z.string().min(1, "Name is required").max(100).trim(),
  accessMode: z.enum(API_KEY_ACCESS_MODE_VALUES).optional(),
  scopes: scopesSchema,
  expiration: z.enum(API_KEY_EXPIRATION_VALUES),
});

export const deleteApiKeySchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
});

export const updateKeyInputSchema = z.object({
  keyIdParam: z.string().min(1),
  organizationId: organizationIdSchema,
  payload: updateApiKeySchema,
});

export const deleteKeyInputSchema = z.object({
  keyIdParam: z.string().min(1),
  organizationId: organizationIdSchema,
  payload: deleteApiKeySchema,
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type DeleteApiKeyInput = z.infer<typeof deleteApiKeySchema>;
