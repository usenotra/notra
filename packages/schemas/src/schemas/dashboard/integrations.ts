import "zod/compile";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import {
  GITHUB_PATH_INVALID_CHARACTERS_REGEX,
  GITHUB_PUBLISH_CONTENT_TYPES,
  GITHUB_URL_PATTERNS,
} from "../../constants/dashboard/github";
import {
  cronAnchorDateSchema as sharedCronAnchorDateSchema,
  cronFrequencySchema,
  cronIntervalDaysSchema as sharedCronIntervalDaysSchema,
  eventTriggerSourceConfigSchema,
  webhookEventTypeSchema,
} from "../shared/automation";

export const INTEGRATION_CATEGORIES = ["input", "output"] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INPUT_INTEGRATION_TYPES = [
  "github",
  "slack",
  "linear",
  "granola",
  "google-search-console",
] as const;
export type InputIntegrationType = (typeof INPUT_INTEGRATION_TYPES)[number];

export const OUTPUT_INTEGRATION_TYPES = ["webflow", "framer"] as const;

export const EXTENSION_INTEGRATION_TYPES = ["raycast"] as const;
export type ExtensionIntegrationType =
  (typeof EXTENSION_INTEGRATION_TYPES)[number];
export type OutputIntegrationType = (typeof OUTPUT_INTEGRATION_TYPES)[number];

export const INTEGRATION_TYPES = [
  ...INPUT_INTEGRATION_TYPES,
  ...OUTPUT_INTEGRATION_TYPES,
  ...EXTENSION_INTEGRATION_TYPES,
] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

const STORE_INTEGRATION_DEEPLINK_SLUG_MAX_LENGTH = 120;
const STORE_INTEGRATION_DEEPLINK_SLUG_PATTERN = /^[a-zA-Z0-9._-]+$/;

export const storeIntegrationDeeplinkSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(STORE_INTEGRATION_DEEPLINK_SLUG_MAX_LENGTH)
  .regex(STORE_INTEGRATION_DEEPLINK_SLUG_PATTERN);

export const OUTPUT_CONTENT_TYPES = [
  "changelog",
  "blog_post",
  "twitter_post",
  "linkedin_post",
  "investor_update",
  "image",
] as const;
export type OutputContentType = (typeof OUTPUT_CONTENT_TYPES)[number];

function isValidGitHubUrl(url: string): boolean {
  const trimmed = url.trim();
  return GITHUB_URL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

const GITHUB_PAT_PREFIXES = [
  "ghp_",
  "github_pat_",
  "gho_",
  "ghu_",
  "ghs_",
  "ghr_",
] as const;

export const githubPersonalAccessTokenSchema = z
  .string()
  .trim()
  .min(1, "Personal access token is required")
  .max(255, "Personal access token is too long")
  .refine(
    (value) => GITHUB_PAT_PREFIXES.some((prefix) => value.startsWith(prefix)),
    "Enter a valid GitHub personal access token"
  );

export const addGitHubIntegrationFormSchema = z.object({
  repoUrl: z
    .string()
    .min(1, "Repository URL is required")
    .refine(
      (value) => isValidGitHubUrl(value),
      "Invalid GitHub repository URL or format. Use: https://github.com/owner/repo, git@github.com:owner/repo, or owner/repo"
    ),
  branch: z.string().optional().nullable(),
  token: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, githubPersonalAccessTokenSchema.optional().nullable()),
});
export type AddGitHubIntegrationFormValues = z.infer<
  typeof addGitHubIntegrationFormSchema
>;

export const createGitHubIntegrationRequestSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  owner: z.string().min(1, "Repository owner is required"),
  repo: z.string().min(1, "Repository name is required"),
  branch: z.string().optional().nullable(),
  token: githubPersonalAccessTokenSchema.optional().nullable(),
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
      })
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

export const integrationInputSchema = organizationIdInputSchema.extend({
  integrationId: integrationIdParamSchema.shape.integrationId,
});

export const repositoryIdParamSchema = z.object({
  repositoryId: z.string().min(1, "Repository ID is required"),
});
export type RepositoryIdParam = z.infer<typeof repositoryIdParamSchema>;

export const repositoryInputSchema = organizationIdInputSchema.extend({
  repositoryId: repositoryIdParamSchema.shape.repositoryId,
});

export const outputIdParamSchema = z.object({
  outputId: z.string().min(1, "Output ID is required"),
});
export type OutputIdParam = z.infer<typeof outputIdParamSchema>;

export const outputInputSchema = organizationIdInputSchema.extend({
  outputId: outputIdParamSchema.shape.outputId,
});

const repoIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !value.includes("/"), "Cannot contain '/'");

export const updateIntegrationBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    displayName: z.string().trim().min(1).optional(),
    owner: repoIdentifierSchema.optional(),
    repo: repoIdentifierSchema.optional(),
    branch: z.string().trim().min(1).nullable().optional(),
    token: githubPersonalAccessTokenSchema.optional(),
  })
  .refine(
    (value) =>
      value.enabled !== undefined ||
      value.displayName !== undefined ||
      value.owner !== undefined ||
      value.repo !== undefined ||
      value.branch !== undefined ||
      value.token !== undefined,
    {
      message: "At least one field must be provided",
    }
  );
export type UpdateIntegrationBody = z.infer<typeof updateIntegrationBodySchema>;

export const editGitHubIntegrationFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  enabled: z.boolean(),
  owner: z.string().trim().min(1, "Owner is required"),
  repo: z.string().trim().min(1, "Repository name is required"),
  branch: z.string().optional().nullable(),
});
export type EditGitHubIntegrationFormValues = z.infer<
  typeof editGitHubIntegrationFormSchema
>;

export const editGitHubTokenFormSchema = z.object({
  token: githubPersonalAccessTokenSchema,
});
export type EditGitHubTokenFormValues = z.infer<
  typeof editGitHubTokenFormSchema
>;

export const updateRepositoryBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    defaultBranch: z.string().trim().min(1).optional().nullable(),
  })
  .refine(
    (value) => value.enabled !== undefined || value.defaultBranch !== undefined,
    {
      message: "At least one field must be provided",
    }
  );
export type UpdateRepositoryBody = z.infer<typeof updateRepositoryBodySchema>;

export const repositoryContentDirectorySchema = z
  .string()
  .trim()
  .max(1024, "Directory is too long")
  .refine(
    (directory) => !directory.startsWith("/"),
    "Enter a repository-relative directory"
  )
  .refine((directory) => !directory.endsWith("/"), "Remove the trailing slash")
  .refine(
    (directory) => !directory.includes("\\"),
    "Use forward slashes in directories"
  )
  .refine(
    (directory) => !GITHUB_PATH_INVALID_CHARACTERS_REGEX.test(directory),
    "Directory contains invalid characters"
  )
  .refine(
    (directory) =>
      directory === "" ||
      directory
        .split("/")
        .every((segment) => segment && segment !== "." && segment !== ".."),
    "Directory contains an invalid segment"
  );

export const repositoryContentDirectoryConfigSchema = z.looseObject({
  directory: repositoryContentDirectorySchema,
});

export const repositoryContentDirectoryInputSchema = z.object({
  contentType: z.enum(GITHUB_PUBLISH_CONTENT_TYPES),
});

export const updateRepositoryContentDirectoryBodySchema =
  repositoryContentDirectoryInputSchema.extend({
    directory: repositoryContentDirectorySchema,
  });

export const listRepositoryDirectoriesInputSchema = z.object({
  directory: repositoryContentDirectorySchema.default(""),
});

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

export const WEBHOOK_EVENT_TYPES = webhookEventTypeSchema.options;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const CRON_FREQUENCIES = cronFrequencySchema.options;
export type CronFrequency = (typeof CRON_FREQUENCIES)[number];

export const cronIntervalDaysSchema = sharedCronIntervalDaysSchema;
export const cronAnchorDateSchema = sharedCronAnchorDateSchema;

export const LOOKBACK_WINDOWS = [
  "current_day",
  "yesterday",
  "last_7_days",
  "last_14_days",
  "last_30_days",
] as const;
export type LookbackWindow = (typeof LOOKBACK_WINDOWS)[number];

export const MAX_SCHEDULE_NAME_LENGTH = 120;

export const triggerSourceTypeSchema = z.enum([
  "github_webhook",
  "linear_webhook",
  "cron",
  "manual",
]);

export const triggerSourceConfigSchema = z.object({
  eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).optional(),
  includePreReleases: z.boolean().optional(),
  cron: z
    .object({
      frequency: z.enum(CRON_FREQUENCIES),
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      intervalDays: cronIntervalDaysSchema.optional(),
      anchorDate: cronAnchorDateSchema.optional(),
    })
    .optional(),
});

export const triggerTargetsSchema = z.object({
  repositoryIds: z.array(z.string()).min(1),
});

export const MAX_SCHEDULE_INSTRUCTIONS_LENGTH = 2000;

export const triggerOutputConfigSchema = z
  .object({
    publishDestination: z.enum(["webflow", "framer", "custom"]).optional(),
    brandVoiceId: z.string().optional(),
    instructions: z
      .string()
      .trim()
      .min(1)
      .max(MAX_SCHEDULE_INSTRUCTIONS_LENGTH)
      .optional(),
  })
  .optional();

export const configureTriggerBodySchema = z.object({
  sourceType: triggerSourceTypeSchema,
  sourceConfig: triggerSourceConfigSchema,
  targets: triggerTargetsSchema,
  outputType: z.enum(OUTPUT_CONTENT_TYPES),
  outputConfig: triggerOutputConfigSchema,
  enabled: z.boolean(),
  autoPublish: z.boolean().default(false),
});
export type ConfigureTriggerBody = z.infer<typeof configureTriggerBodySchema>;

export const SUPPORTED_AUTOMATION_OUTPUT_TYPES = [
  "changelog",
  "blog_post",
  "linkedin_post",
  "twitter_post",
  "image",
] as const;
export type AutomationOutputType =
  (typeof SUPPORTED_AUTOMATION_OUTPUT_TYPES)[number];

export type ScheduleOutputType =
  (typeof SUPPORTED_AUTOMATION_OUTPUT_TYPES)[number];

export const configureEventTriggerBodySchema =
  configureTriggerBodySchema.extend({
    sourceType: z.literal("github_webhook"),
    sourceConfig: eventTriggerSourceConfigSchema,
    outputType: z.enum(SUPPORTED_AUTOMATION_OUTPUT_TYPES),
  });
export type ConfigureEventTriggerBody = z.infer<
  typeof configureEventTriggerBodySchema
>;

export const configureScheduleBodySchema = configureTriggerBodySchema.extend({
  name: z.string().trim().min(1).max(MAX_SCHEDULE_NAME_LENGTH),
  sourceType: z.literal("cron"),
  sourceConfig: z.object({
    cron: z.object({
      frequency: z.enum(CRON_FREQUENCIES),
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      intervalDays: cronIntervalDaysSchema.optional(),
      anchorDate: cronAnchorDateSchema.optional(),
    }),
  }),
  outputType: z.enum(SUPPORTED_AUTOMATION_OUTPUT_TYPES),
  lookbackWindow: z.enum(LOOKBACK_WINDOWS).default("last_7_days"),
});
export type ConfigureScheduleBody = z.infer<typeof configureScheduleBodySchema>;

export const getSchedulesQuerySchema = z.object({
  repositoryIds: z.array(z.string().min(1)).optional(),
});
export type GetSchedulesQuery = z.infer<typeof getSchedulesQuerySchema>;

export const triggerInputSchema = organizationIdInputSchema.extend({
  triggerId: z.string().min(1, "Trigger ID is required"),
});

export const schedulesListInputSchema = organizationIdInputSchema.and(
  getSchedulesQuerySchema
);

export const affectedTriggerSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
});
export type AffectedTrigger = z.infer<typeof affectedTriggerSchema>;

export const affectedTriggersDataSchema = z.object({
  affectedSchedules: z.array(affectedTriggerSchema).optional(),
  affectedEvents: z.array(affectedTriggerSchema).optional(),
});
export type AffectedTriggersData = z.infer<typeof affectedTriggersDataSchema>;

export const deleteResourceResponseSchema = z.object({
  success: z.boolean(),
  disabledSchedules: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .optional(),
  disabledEvents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .optional(),
});
export type DeleteResourceResponse = z.infer<
  typeof deleteResourceResponseSchema
>;

export const MCP_URL_PROTOCOL_REGEX = /^https?:\/\//i;

export const mcpUrlSchema = z
  .string()
  .trim()
  .min(1, "Server URL is required")
  .max(2048, "Server URL is too long")
  .pipe(z.url({ protocol: /^https$/ }));

export const mcpFormUrlSchema = z
  .string()
  .trim()
  .min(1, "Server URL is required")
  .refine(
    (value) =>
      mcpUrlSchema.safeParse(
        `https://${value.replace(MCP_URL_PROTOCOL_REGEX, "")}`
      ).success,
    "Enter a valid URL"
  );

export const mcpHeaderNameSchema = z
  .string()
  .trim()
  .max(128, "Header name is too long")
  .regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]*$/, "Invalid header name");

export const mcpHeaderValueSchema = z
  .string()
  .trim()
  .max(4096, "Header value is too long");

export const MAX_MCP_HEADERS = 5;

export const mcpHeadersSchema = z
  .record(
    mcpHeaderNameSchema.pipe(z.string().min(1, "Header name is required")),
    mcpHeaderValueSchema.pipe(z.string().min(1, "Header value is required"))
  )
  .refine((headers) => Object.keys(headers).length <= MAX_MCP_HEADERS, {
    message: `You can add up to ${MAX_MCP_HEADERS} headers`,
  })
  .default({});

export const mcpHeaderRowSchema = z.object({
  name: mcpHeaderNameSchema,
  value: mcpHeaderValueSchema,
});
export type McpHeaderRow = z.infer<typeof mcpHeaderRowSchema>;

export const addMcpServerFormFieldsSchema = z.object({
  authType: z.enum(["none", "headers", "oauth"]),
  name: z.string().trim().min(1, "Name is required").max(120),
  url: mcpFormUrlSchema,
  description: z.string().trim().max(1000, "Description is too long"),
  headers: z
    .array(mcpHeaderRowSchema)
    .max(MAX_MCP_HEADERS, `You can add up to ${MAX_MCP_HEADERS} headers`),
});

export const addMcpServerFormSchema = addMcpServerFormFieldsSchema.superRefine(
  (value, ctx) => {
    if (value.authType !== "headers") {
      return;
    }

    let hasCompleteHeader = false;
    value.headers.forEach((row, index) => {
      const hasName = row.name.trim() !== "";
      const hasValue = row.value.trim() !== "";
      hasCompleteHeader ||= hasName && hasValue;
      if (hasName !== hasValue) {
        ctx.addIssue({
          code: "custom",
          message: "Header name and value are required together",
          path: ["headers", index, hasValue ? "name" : "value"],
        });
      }
    });
    if (!hasCompleteHeader) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one authentication header",
        path: ["headers"],
      });
    }
  }
);

export type AddMcpServerFormValues = z.infer<
  typeof addMcpServerFormFieldsSchema
>;

const createMcpServerRequestFieldsSchema = z.object({
  authType: z.enum(["none", "headers"]),
  organizationId: z.string().min(1, "Organization ID is required"),
  name: addMcpServerFormFieldsSchema.shape.name,
  url: mcpUrlSchema,
  description: z
    .string()
    .trim()
    .max(1000, "Description is too long")
    .optional()
    .nullable(),
  storeIntegrationId: z.string().min(1).optional(),
  headers: mcpHeadersSchema,
});

const mcpOAuthCallbackPathSchema = z
  .string()
  .trim()
  .startsWith("/")
  .refine((path) => !path.startsWith("//"), "Invalid callback path");

export const createMcpServerRequestSchema =
  createMcpServerRequestFieldsSchema.superRefine((value, ctx) => {
    if (
      value.authType === "headers" &&
      Object.keys(value.headers).length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one authentication header",
        path: ["headers"],
      });
    }
  });
export type CreateMcpServerRequest = z.infer<
  typeof createMcpServerRequestSchema
>;

export const beginMcpOAuthRequestSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  storeIntegrationId: z.string().min(1).optional(),
  name: addMcpServerFormFieldsSchema.shape.name,
  url: mcpUrlSchema,
  description: createMcpServerRequestFieldsSchema.shape.description,
  callbackPath: mcpOAuthCallbackPathSchema,
});

export const reauthorizeMcpOAuthRequestSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  serverId: z.string().min(1, "MCP server ID is required"),
  callbackPath: mcpOAuthCallbackPathSchema,
});

export const mcpOAuthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  state: z.string().min(1),
});

export const updateMcpServerBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    url: mcpUrlSchema.optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    headers: mcpHeadersSchema.optional(),
    authType: z.enum(["none", "headers"]).optional(),
    enabled: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.authType === "headers" &&
      (!value.headers || Object.keys(value.headers).length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one authentication header",
        path: ["headers"],
      });
    }
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.url !== undefined ||
      value.description !== undefined ||
      value.headers !== undefined ||
      value.authType !== undefined ||
      value.enabled !== undefined,
    {
      message: "At least one field must be provided",
    }
  );
export type UpdateMcpServerBody = z.infer<typeof updateMcpServerBodySchema>;

export const mcpServerIdParamSchema = z.object({
  serverId: z.string().min(1, "MCP server ID is required"),
});

export const mcpServerInputSchema = organizationIdInputSchema.extend({
  serverId: mcpServerIdParamSchema.shape.serverId,
});

export const testMcpServerRequestSchema =
  createMcpServerRequestFieldsSchema.pick({
    organizationId: true,
    url: true,
    headers: true,
  });
export type TestMcpServerRequest = z.infer<typeof testMcpServerRequestSchema>;
