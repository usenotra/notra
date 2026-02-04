// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { GITHUB_URL_PATTERNS } from "@/utils/constants";

export const INTEGRATION_CATEGORIES = ["input", "output"] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INPUT_INTEGRATION_TYPES = ["github", "slack", "linear"] as const;
export type InputIntegrationType = (typeof INPUT_INTEGRATION_TYPES)[number];

export const OUTPUT_INTEGRATION_TYPES = [
  "marble",
  "webflow",
  "framer",
] as const;
export type OutputIntegrationType = (typeof OUTPUT_INTEGRATION_TYPES)[number];

export const INTEGRATION_TYPES = [
  ...INPUT_INTEGRATION_TYPES,
  ...OUTPUT_INTEGRATION_TYPES,
] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const OUTPUT_CONTENT_TYPES = [
  "changelog",
  "blog_post",
  "twitter_post",
  "linkedin_post",
  "investor_update",
] as const;
export type OutputContentType = (typeof OUTPUT_CONTENT_TYPES)[number];

function isValidGitHubUrl(url: string): boolean {
  const trimmed = url.trim();
  return GITHUB_URL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export const addGitHubIntegrationFormSchema = z.object({
  repoUrl: z
    .string()
    .min(1, "Repository URL is required")
    .refine(
      (value) => isValidGitHubUrl(value),
      "Invalid GitHub repository URL or format. Use: https://github.com/owner/repo, git@github.com:owner/repo, or owner/repo",
    ),
  token: z.string().optional().nullable(),
});
export type AddGitHubIntegrationFormValues = z.infer<
  typeof addGitHubIntegrationFormSchema
>;

export const createGitHubIntegrationRequestSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  owner: z.string().min(1, "Repository owner is required"),
  repo: z.string().min(1, "Repository name is required"),
  token: z.string().optional().nullable(),
});
export type CreateGitHubIntegrationRequest = z.infer<
  typeof createGitHubIntegrationRequestSchema
>;

export const addRepositoryFormSchema = z.object({
  repository: z
    .string()
    .min(1, "Please select a repository")
    .regex(/^[^/]+\/[^/]+$/, "Invalid repository format. Expected: owner/repo"),
});
export type AddRepositoryFormValues = z.infer<typeof addRepositoryFormSchema>;

export const addRepositoryRequestSchema = z.object({
  owner: z
    .string()
    .min(1, "Repository owner is required")
    .transform((value) => value.trim()),
  repo: z
    .string()
    .min(1, "Repository name is required")
    .transform((value) => value.trim()),
  outputs: z
    .array(
      z.object({
        type: z.enum(OUTPUT_CONTENT_TYPES),
        enabled: z.boolean(),
      }),
    )
    .optional()
    .default([
      { type: "changelog", enabled: true },
      { type: "blog_post", enabled: false },
      { type: "twitter_post", enabled: false },
      { type: "linkedin_post", enabled: false },
      { type: "investor_update", enabled: false },
    ]),
});
export type AddRepositoryRequest = z.infer<typeof addRepositoryRequestSchema>;

export const getIntegrationsQuerySchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});
export type GetIntegrationsQuery = z.infer<typeof getIntegrationsQuerySchema>;

export const integrationIdParamSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
});
export type IntegrationIdParam = z.infer<typeof integrationIdParamSchema>;

export const repositoryIdParamSchema = z.object({
  repositoryId: z.string().min(1, "Repository ID is required"),
});
export type RepositoryIdParam = z.infer<typeof repositoryIdParamSchema>;

export const outputIdParamSchema = z.object({
  outputId: z.string().min(1, "Output ID is required"),
});
export type OutputIdParam = z.infer<typeof outputIdParamSchema>;

export const updateIntegrationBodySchema = z.object({
  enabled: z.boolean(),
  displayName: z.string().optional(),
});
export type UpdateIntegrationBody = z.infer<typeof updateIntegrationBodySchema>;

export const editGitHubIntegrationFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  enabled: z.boolean(),
});
export type EditGitHubIntegrationFormValues = z.infer<
  typeof editGitHubIntegrationFormSchema
>;

export const updateRepositoryBodySchema = z.object({
  enabled: z.boolean(),
});
export type UpdateRepositoryBody = z.infer<typeof updateRepositoryBodySchema>;

export const updateOutputBodySchema = z.object({
  enabled: z.boolean(),
});
export type UpdateOutputBody = z.infer<typeof updateOutputBodySchema>;

export const configureOutputBodySchema = z.object({
  outputType: z.enum(OUTPUT_CONTENT_TYPES),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type ConfigureOutputBody = z.infer<typeof configureOutputBodySchema>;

export const WEBHOOK_EVENT_TYPES = ["release", "push", "star"] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const CRON_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type CronFrequency = (typeof CRON_FREQUENCIES)[number];

export const triggerSourceTypeSchema = z.enum([
  "github_webhook",
  "linear_webhook",
  "cron",
  "manual",
]);

export const triggerSourceConfigSchema = z.object({
  eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).optional(),
  cron: z
    .object({
      frequency: z.enum(CRON_FREQUENCIES),
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
    })
    .optional(),
});

export const triggerTargetsSchema = z.object({
  repositoryIds: z.array(z.string()).min(1),
});

export const triggerOutputConfigSchema = z
  .object({
    publishDestination: z.enum(["webflow", "framer", "custom"]).optional(),
  })
  .optional();

export const configureTriggerBodySchema = z.object({
  sourceType: triggerSourceTypeSchema,
  sourceConfig: triggerSourceConfigSchema,
  targets: triggerTargetsSchema,
  outputType: z.enum(OUTPUT_CONTENT_TYPES),
  outputConfig: triggerOutputConfigSchema,
  enabled: z.boolean(),
});
export type ConfigureTriggerBody = z.infer<typeof configureTriggerBodySchema>;
