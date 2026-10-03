import {
  SITE_AREAS,
  SITE_PREVIEW_VISIBILITIES,
  SITE_STATUSES,
} from "@notra/sites-core/constants/sites";
import { z } from "zod";

export const siteAreaSchema = z.enum(SITE_AREAS);

/** Normalized mount per area, e.g. `{ blog: "/blog", changelog: "/changelog" }`. */
export const siteMountsSchema = z
  .object({
    blog: z.string().optional(),
    changelog: z.string().optional(),
  })
  .refine((mounts) => Boolean(mounts.blog ?? mounts.changelog), {
    message: "At least one area needs a mount",
  });

/** The build inputs that decide URLs. Equal hashes mean a deployment can be rolled back to. */
export const siteBuildTargetSchema = z.object({
  publicOrigin: z.url(),
  mounts: siteMountsSchema,
  /** Previews and direct alias visits must never be indexed. */
  noindex: z.boolean(),
});

export const siteManifestFileSchema = z.object({
  /** Absolute URL path, e.g. `/blog/hello/index.html`. */
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
});

export const siteServingPointerSchema = z.object({
  deploymentId: z.string(),
  /** Production ordering: a pointer only moves to a higher generation. */
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

/** `sites/{siteId}/state.json`, the only object the worker trusts for what to serve. */
export const siteServingStateSchema = z.object({
  version: z.literal(1),
  siteId: z.string(),
  slug: z.string(),
  status: z.enum(SITE_STATUSES),
  production: siteServingPointerSchema.nullable(),
  previews: z.record(z.string(), sitePreviewPointerSchema),
  /** previewKey → generation of its removal. Builds older than that can never bring the preview back. */
  removedPreviews: z
    .record(z.string(), z.number().int().nonnegative())
    .default({}),
  updatedAt: z.string(),
});

export const siteHostRecordSchema = z.object({
  version: z.literal(1),
  siteId: z.string(),
  kind: z.enum(["alias", "custom"]),
});

export type SiteArea = z.infer<typeof siteAreaSchema>;
export type SiteMounts = z.infer<typeof siteMountsSchema>;
export type SiteBuildTarget = z.infer<typeof siteBuildTargetSchema>;
export type SiteManifestFile = z.infer<typeof siteManifestFileSchema>;
export type SiteManifest = z.infer<typeof siteManifestSchema>;
export type SiteRedirectRule = z.infer<typeof siteRedirectRuleSchema>;
export type SiteServingState = z.infer<typeof siteServingStateSchema>;
export type SiteServingPointer = z.infer<typeof siteServingPointerSchema>;
export type SitePreviewPointer = z.infer<typeof sitePreviewPointerSchema>;
export type SiteHostRecord = z.infer<typeof siteHostRecordSchema>;
