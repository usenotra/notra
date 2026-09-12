import "zod/compile";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const socialConnectPlatformSchema = z.enum(["twitter", "linkedin"]);

export type SocialConnectPlatform = z.infer<typeof socialConnectPlatformSchema>;

export const socialConnectOAuthStateSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  callbackPath: z.string(),
  platform: socialConnectPlatformSchema,
});

export type SocialConnectOAuthState = z.infer<
  typeof socialConnectOAuthStateSchema
>;

const PUBLISH_CONTENT_MAX_LENGTH = 25_000;

export const socialPublishSurfaceSchema = z.enum(["editor", "chat_preview"]);

export type SocialPublishSurface = z.infer<typeof socialPublishSurfaceSchema>;

export const publishSocialPostBodySchema = z.object({
  accountId: z.string().min(1),
  content: z
    .string()
    .trim()
    .min(1, "Post content is required")
    .max(PUBLISH_CONTENT_MAX_LENGTH, "Post content is too long"),
  from: socialPublishSurfaceSchema.optional(),
});

export const socialAccountsOrganizationInputSchema = z.object({
  organizationId: organizationIdSchema,
});

export const refreshSocialAccountsInputSchema = z.object({
  organizationId: organizationIdSchema,
  accountId: z.string().min(1).optional(),
});

export const disconnectSocialAccountInputSchema =
  socialAccountsOrganizationInputSchema.extend({
    accountId: z.string().min(1),
  });

export const beginConnectInputSchema =
  socialAccountsOrganizationInputSchema.extend({
    platform: socialConnectPlatformSchema,
    callbackPath: z.string().default("/"),
  });

export const publishSocialPostInputSchema =
  socialAccountsOrganizationInputSchema.extend(
    publishSocialPostBodySchema.shape
  );

export const socialConnectCallbackQuerySchema = z.object({
  provider: z.string().optional(),
  isSuccess: z.string().optional(),
  accountIds: z.array(z.string().min(1).max(128)).max(20).default([]),
  error: z.string().optional(),
});

export const linkedinSelectionGetInputSchema = z.object({
  token: z.string().min(1),
});

export const linkedinSelectionCompleteInputSchema = z.object({
  token: z.string().min(1),
  accountIds: z.array(z.string().min(1)).min(1).max(20),
});

export const linkedInSelectionStashSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  callbackPath: z.string(),
  accounts: z.array(
    z.object({
      providerAccountId: z.string().min(1),
      username: z.string().min(1),
      profileImageUrl: z.string().nullable(),
      connectionType: z.enum(["personal", "page"]),
      profileUrl: z.string().nullable(),
    })
  ),
});
