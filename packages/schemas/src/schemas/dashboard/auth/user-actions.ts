import "zod/compile";
import { RETURN_TO_MAX_LENGTH } from "@notra/schemas/dashboard/auth/return-to";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const USER_NAME_MAX_LENGTH = 100;
const USER_IMAGE_URL_MAX_LENGTH = 2048;
const PROVIDER_ID_MAX_LENGTH = 64;

export const userNameSchema = z.string().trim().min(1, "Name cannot be empty");

export const updateUserInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(USER_NAME_MAX_LENGTH, "Name must be at most 100 characters")
    .optional(),
  image: z
    .string()
    .trim()
    .url("Image must be a valid URL")
    .max(USER_IMAGE_URL_MAX_LENGTH, "Image URL is too long")
    .nullable()
    .optional(),
  hidePersonalData: z.boolean().optional(),
  showAgentStats: z.boolean().optional(),
});

export const unlinkAccountInputSchema = z.object({
  providerId: z.string().trim().min(1).max(PROVIDER_ID_MAX_LENGTH),
});

export const signOutOptionsSchema = z
  .object({
    returnTo: z.string().min(1).max(RETURN_TO_MAX_LENGTH).optional(),
  })
  .optional();
