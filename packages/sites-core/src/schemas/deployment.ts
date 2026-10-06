import { SITE_CSP_MAX_LENGTH } from "@notra/sites-core/constants/security";
import {
  SITE_AREAS,
  SITE_PREVIEW_PASSWORD_ALGORITHM,
  SITE_PREVIEW_VISIBILITIES,
  SITE_STATUSES,
} from "@notra/sites-core/constants/sites";
import { z } from "zod";

export const siteAreaSchema = z.enum(SITE_AREAS);

export const siteMountsSchema = z
  .object({
    blog: z.string().optional(),
    changelog: z.string().optional(),
  })
  .refine((mounts) => Boolean(mounts.blog ?? mounts.changelog), {
    message: "At least one area needs a mount",
  });

export const siteBuildTargetSchema = z.object({
  publicOrigin: z.url(),
  mounts: siteMountsSchema,
  noindex: z.boolean(),
  branding: z.boolean().default(true),
});

export const siteManifestFileSchema = z.object({
  path: z.string().startsWith("/"),
  size: z.number().int().nonnegative(),
  sha256: z.string().length(64),
  contentType: z.string(),
});

export const siteRedirectRuleSchema = z.object({
  source: z.string().startsWith("/"),
  destination: z.string(),
  status: z.union([
    z.literal(301),
    z.literal(302),
    z.literal(307),
    z.literal(308),
  ]),
});

export const siteContentSecurityPolicySchema = z
  .string()
  .min(1)
  .max(SITE_CSP_MAX_LENGTH)
  .regex(/^[\u0020-\u007E]+$/);

export const siteManifestSchema = z.object({
  version: z.literal(1),
  siteId: z.string(),
  deploymentId: z.string(),
  commitSha: z.string(),
  toolchainVersion: z.string(),
  target: siteBuildTargetSchema,
  configHash: z.string(),
  createdAt: z.string(),
  totalBytes: z.number().int().nonnegative(),
  files: z.array(siteManifestFileSchema),
  redirects: z.array(siteRedirectRuleSchema),
  contentSecurityPolicy: siteContentSecurityPolicySchema.optional(),
});

export const siteServingPointerSchema = z.object({
  deploymentId: z.string(),
  generation: z.number().int().nonnegative(),
  activatedAt: z.string(),
});

export const sitePreviewPointerSchema = z.object({
  deploymentId: z.string(),
  visibility: z.enum(SITE_PREVIEW_VISIBILITIES),
  sequence: z.number().int().nonnegative(),
  activatedAt: z.string(),
  expiresAt: z.string().nullable(),
});

export const sitePreviewPasswordSchema = z.object({
  algorithm: z.literal(SITE_PREVIEW_PASSWORD_ALGORITHM),
  iterations: z.number().int().positive(),
  salt: z.string().min(1),
  hash: z.string().min(1),
  version: z.string().min(1),
  updatedAt: z.string(),
});

export const siteServingStateSchema = z.object({
  version: z.literal(1),
  siteId: z.string(),
  slug: z.string(),
  status: z.enum(SITE_STATUSES),
  production: siteServingPointerSchema.nullable(),
  previews: z.record(z.string(), sitePreviewPointerSchema),
  removedPreviews: z
    .record(z.string(), z.number().int().nonnegative())
    .default({}),
  previewPassword: sitePreviewPasswordSchema.nullable().default(null),
  trafficToken: z.string().nullable().default(null),
  revokedSessions: z
    .record(
      z.string(),
      z.object({
        sessions: z.number().int().nonnegative().optional(),
        shareLinks: z.number().int().nonnegative().optional(),
      })
    )
    .default({}),
  updatedAt: z.string(),
});

export const siteHostRecordSchema = z.object({
  version: z.literal(1),
  siteId: z.string(),
  kind: z.enum(["alias", "custom"]),
});
