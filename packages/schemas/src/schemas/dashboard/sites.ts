import { SITE_INTEGRATION_NAMES } from "@notra/sites-core/constants/integrations";
import {
  SITE_PREVIEW_PASSWORD_MAX_LENGTH,
  SITE_PREVIEW_PASSWORD_MIN_LENGTH,
} from "@notra/sites-core/constants/sites";
import z from "zod";

const organizationId = z.string().min(1);
const siteId = z.string().startsWith("site_");
const deploymentId = z.string().startsWith("dep_");
const mountPath = z.string().trim().max(80);
const previewPassword = z
  .string()
  .min(SITE_PREVIEW_PASSWORD_MIN_LENGTH)
  .max(SITE_PREVIEW_PASSWORD_MAX_LENGTH)
  .nullable();

export const siteMountsInputSchema = z
  .object({
    blog: mountPath.optional(),
    changelog: mountPath.optional(),
  })
  .refine((mounts) => Boolean(mounts.blog ?? mounts.changelog), {
    message: "Enable the blog, the changelog, or both",
  });

export const siteScopeInputSchema = z.object({ organizationId, siteId });

const analyticsDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const siteAnalyticsInputSchema = siteScopeInputSchema.extend({
  days: z.number().int().min(1).max(365).optional(),
  from: analyticsDay.optional(),
  to: analyticsDay.optional(),
});

const suggestionRef = z.string().trim().max(250).optional();

export const repositorySuggestionsInputSchema = z.object({
  organizationId,
  repositoryId: z.string().min(1),
  ref: suggestionRef,
});

export const siteRepositorySuggestionsInputSchema = siteScopeInputSchema.extend(
  { ref: suggestionRef }
);

export const createSiteInputSchema = z.object({
  organizationId,
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().toLowerCase().max(40).optional(),
  repositoryId: z.string().min(1),
  productionBranch: z.string().trim().min(1).max(250).optional(),
  rootDirectory: z.string().trim().max(200).optional(),
  mounts: siteMountsInputSchema,
  previewVisibility: z.enum(["public", "protected"]).default("protected"),
  publishMode: z.enum(["pull_request", "direct"]).default("pull_request"),
  projectId: z.string().min(1).optional(),
});

export const updateSiteInputSchema = siteScopeInputSchema.extend({
  name: z.string().trim().min(1).max(80).optional(),
  productionBranch: z.string().trim().min(1).max(250).optional(),
  rootDirectory: z.string().trim().max(200).optional(),
  mounts: siteMountsInputSchema.optional(),
  previewsEnabled: z.boolean().optional(),
  previewVisibility: z.enum(["public", "protected"]).optional(),
  publishMode: z.enum(["pull_request", "direct"]).optional(),
  showBranding: z.boolean().optional(),
  previewPassword: previewPassword.optional(),
});

export const setSiteSuspendedInputSchema = siteScopeInputSchema.extend({
  suspended: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export const siteDeploymentInputSchema = siteScopeInputSchema.extend({
  deploymentId,
});

export const listSiteDeploymentsInputSchema = siteScopeInputSchema.extend({
  limit: z.number().int().min(1).max(100).default(30),
});

export const siteBranchPreviewInputSchema = siteScopeInputSchema.extend({
  branch: z.string().trim().min(1).max(250),
});

export const sitePreviewInputSchema = siteScopeInputSchema.extend({
  previewKey: z.string().regex(/^(?:pr|br)-[a-z0-9-]{1,40}$/),
});

export const sitePreviewAccessInputSchema = sitePreviewInputSchema.extend({
  kind: z.enum(["member", "share"]).default("member"),
  next: z.string().max(500).optional(),
});

export const siteSetPreviewPasswordInputSchema = siteScopeInputSchema.extend({
  password: previewPassword,
});

export const addSiteDomainInputSchema = siteScopeInputSchema.extend({
  kind: z.enum(["subdomain", "proxy"]),
  value: z.string().trim().min(3).max(253),
});

export const siteDomainInputSchema = siteScopeInputSchema.extend({
  domainId: z.string().startsWith("dom_"),
});

export const siteFilePathInputSchema = siteScopeInputSchema.extend({
  path: z.string().trim().min(1).max(400),
});

export const saveSiteDraftInputSchema = siteFilePathInputSchema.extend({
  content: z.string().max(512 * 1024),
  baseBlobSha: z.string().nullable(),
  baseCommitSha: z.string().nullable(),
  deleted: z.boolean().optional(),
});

export const publishSiteDraftsInputSchema = siteScopeInputSchema.extend({
  message: z.string().trim().min(1).max(200),
  mode: z.enum(["direct", "pull_request"]),
});

export const saveSiteIntegrationInputSchema = siteScopeInputSchema.extend({
  provider: z.enum(SITE_INTEGRATION_NAMES),
  settings: z.record(z.string(), z.unknown()).nullable(),
});

export const connectSiteRepositoryInputSchema = z.object({
  organizationId,
  githubRepositoryId: z.string().trim().min(1).max(40),
});

export const siteStarterInputSchema = z.object({
  organizationId,
  repositoryId: z.string().min(1),
  branch: z.string().trim().max(250).default(""),
  rootDirectory: z.string().trim().max(250).default(""),
});
