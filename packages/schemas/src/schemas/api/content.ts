import "zod/compile";
import { z } from "@hono/zod-openapi";
import { supportedLanguageSchema } from "@notra/ai/schemas/language";
import {
  BRAND_AUDIENCE_MAX_LENGTH,
  BRAND_AUDIENCE_MIN_LENGTH,
  BRAND_COMPANY_DESCRIPTION_MAX_LENGTH,
  BRAND_COMPANY_DESCRIPTION_MIN_LENGTH,
  BRAND_COMPANY_NAME_MAX_LENGTH,
  BRAND_CUSTOM_INSTRUCTIONS_MAX_LENGTH,
  BRAND_CUSTOM_TONE_MAX_LENGTH,
  BRAND_NAME_MAX_LENGTH,
  POST_MARKDOWN_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
} from "@notra/ai/schemas/limits";
import { POST_SLUG_MAX_LENGTH, POST_SLUG_REGEX } from "@notra/ai/schemas/post";
import { toneProfileSchema } from "@notra/ai/schemas/tone";
import { SUPPORTED_CONTENT_GENERATION_TYPES } from "@notra/content-generation/schemas";
import { lookbackWindowEnum, postStatusEnum } from "@notra/db/schema";
import { assertPublicHttpUrl } from "@notra/utils/url";

import { resourceIdSchema } from "./ids";

const HTTP_PROTOCOL_REGEX = /^https?:\/\//i;
export const getPostsParamsSchema = z.object({});

const postStatusSchema = z.enum(postStatusEnum.enumValues);
const postContentTypeSchema = z.enum([
  "changelog",
  "linkedin_post",
  "twitter_post",
  "blog_post",
  "investor_update",
  "image",
]);

export const ALL_POST_STATUSES = postStatusSchema.options;
export const ALL_POST_CONTENT_TYPES = postContentTypeSchema.options;

function normalizeFilterValues<T extends string>(
  values: T | T[] | undefined,
  defaultValues: readonly T[]
): T[] {
  if (!values) {
    return [...defaultValues];
  }

  const normalized = Array.isArray(values) ? values : [values];
  if (normalized.length === 0) {
    return [...defaultValues];
  }

  return Array.from(new Set(normalized));
}

function splitQueryFilterValues(values: string | undefined): string[] {
  if (!values) {
    return [];
  }

  return values
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function validateFilterItemCount(
  parsedValues: readonly string[],
  maxItems: number,
  ctx: z.RefinementCtx
) {
  if (parsedValues.length > maxItems) {
    ctx.addIssue({
      code: "custom",
      message: `Expected at most ${maxItems} items`,
    });
  }
}

function validateEnumFilterValues<T extends string>(
  parsedValues: readonly string[],
  valueSchema: z.ZodType<T>,
  ctx: z.RefinementCtx
) {
  for (const value of parsedValues) {
    const parsedValue = valueSchema.safeParse(value);

    if (!parsedValue.success) {
      const message = parsedValue.error.issues[0]?.message ?? "Invalid value";
      ctx.addIssue({
        code: "custom",
        message,
      });
    }
  }
}

function createBaseEnumFilterSchema<T extends string>(
  valueSchema: z.ZodType<T>,
  defaultValues: readonly T[],
  maxItems: number
) {
  return z
    .string()
    .optional()
    .superRefine((values, ctx) => {
      const parsedValues = splitQueryFilterValues(values);
      validateFilterItemCount(parsedValues, maxItems, ctx);
      validateEnumFilterValues(parsedValues, valueSchema, ctx);
    })
    .transform((values: string | undefined) => {
      const parsedValues = splitQueryFilterValues(values);

      return normalizeFilterValues(
        parsedValues.map((value) => valueSchema.parse(value)),
        defaultValues
      );
    });
}

function createOpenApiEnumFilterSchema<T extends string>(
  valueSchema: z.ZodType<T>,
  defaultValues: readonly T[],
  maxItems: number,
  description: string
) {
  return createBaseEnumFilterSchema(
    valueSchema,
    defaultValues,
    maxItems
  ).openapi({ description });
}

function createBaseStringFilterSchema(maxItems: number) {
  return z
    .string()
    .optional()
    .superRefine((values, ctx) => {
      validateFilterItemCount(splitQueryFilterValues(values), maxItems, ctx);
    })
    .transform((values: string | undefined) => {
      const parsedValues = splitQueryFilterValues(values);

      return Array.from(new Set(parsedValues));
    });
}

function createOpenApiStringFilterSchema(
  maxItems: number,
  description: string
) {
  return createBaseStringFilterSchema(maxItems).openapi({ description });
}

const openApiStatusFilterSchema = createOpenApiEnumFilterSchema(
  postStatusSchema,
  ["published"],
  ALL_POST_STATUSES.length,
  "Filter by status using a comma-separated list."
);

const openApiContentTypeFilterSchema = createOpenApiEnumFilterSchema(
  postContentTypeSchema,
  ALL_POST_CONTENT_TYPES,
  ALL_POST_CONTENT_TYPES.length,
  "Filter by content type using a comma-separated list."
);

const openApiBrandIdentityIdFilterSchema = createOpenApiStringFilterSchema(
  100,
  "Filter by brand identity ID using a comma-separated list."
);

export const getPostsOpenApiQuerySchema = z.object({
  sort: z.enum(["asc", "desc"]).default("desc").openapi({
    description: "Sort by creation date",
    example: "desc",
  }),
  limit: z.coerce.number().int().min(1).max(100).default(10).openapi({
    description: "Items per page",
    example: 10,
  }),
  page: z.coerce.number().int().min(1).default(1).openapi({
    description: "Page number",
    example: 1,
  }),
  status: openApiStatusFilterSchema,
  contentType: openApiContentTypeFilterSchema,
  brandIdentityId: openApiBrandIdentityIdFilterSchema,
});

export const getPostParamsSchema = z.object({
  postId: resourceIdSchema("postId").openapi({
    param: {
      in: "path",
      name: "postId",
    },
    example: "post_123",
  }),
});

export const getBrandIdentityParamsSchema = z.object({
  brandIdentityId: resourceIdSchema("brandIdentityId").openapi({
    param: {
      in: "path",
      name: "brandIdentityId",
    },
    example: "51c2f3aa-efdd-4e28-8e69-23fa2dfd3561",
  }),
});

export const getIntegrationParamsSchema = z.object({
  integrationId: resourceIdSchema("integrationId").openapi({
    param: {
      in: "path",
      name: "integrationId",
    },
    example: "51c2f3aa-efdd-4e28-8e69-23fa2dfd3561",
  }),
});

export const errorResponseSchema = z
  .object({
    error: z.string(),
    code: z.string().optional(),
    recovery: z.string().optional(),
  })
  .openapi("ErrorResponse");

export const organizationResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
});

const websiteUrlSchema = z
  .string()
  .trim()
  .min(1, "websiteUrl is required")
  .transform((value) =>
    HTTP_PROTOCOL_REGEX.test(value) ? value : `https://${value}`
  )
  .pipe(z.string().url("Invalid website URL"))
  .superRefine((value, ctx) => {
    try {
      assertPublicHttpUrl(value);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Invalid website URL",
      });
    }
  });

const brandIdentityResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  websiteUrl: z.string(),
  companyName: z.string().nullable(),
  companyDescription: z.string().nullable(),
  toneProfile: z.string().nullable(),
  customTone: z.string().nullable(),
  customInstructions: z.string().nullable(),
  audience: z.string().nullable(),
  language: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const githubIntegrationResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  owner: z.string().nullable(),
  repo: z.string().nullable(),
  defaultBranch: z.string().nullable(),
});

const linearIntegrationResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  linearOrganizationId: z.string(),
  linearOrganizationName: z.string().nullable(),
  linearTeamId: z.string().nullable(),
  linearTeamName: z.string().nullable(),
});

const GITHUB_PAT_PREFIXES = [
  "ghp_",
  "github_pat_",
  "gho_",
  "ghu_",
  "ghs_",
  "ghr_",
] as const;

const githubPersonalAccessTokenSchema = z
  .string()
  .trim()
  .min(1, "Personal access token is required")
  .refine(
    (value) => GITHUB_PAT_PREFIXES.some((prefix) => value.startsWith(prefix)),
    "Enter a valid GitHub personal access token"
  );

export const createGitHubIntegrationRequestSchema = z.object({
  owner: z.string().trim().min(1, "Repository owner is required").openapi({
    description: "GitHub user or organization that owns the repository.",
    example: "usenotra",
  }),
  repo: z.string().trim().min(1, "Repository name is required").openapi({
    description: "Repository name without the owner.",
    example: "notra",
  }),
  branch: z.string().trim().min(1).nullable().optional().openapi({
    description:
      "Branch to read activity from. Defaults to the repository's default branch.",
    example: "main",
  }),
  token: z
    .preprocess((value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }, githubPersonalAccessTokenSchema.optional().nullable())
    .openapi({
      description:
        "GitHub personal access token with read access to the repository. Required for private repositories; public repositories work without one.",
      example: "github_pat_11ABCDEFG...",
    }),
});

export const createGitHubIntegrationResponseSchema = z.object({
  github: githubIntegrationResponseSchema,
  organization: organizationResponseSchema,
});

const postResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().nullable(),
  content: z.string().openapi({
    description:
      "Rendered HTML for text posts. For image posts, this is the public CDN URL of the rendered image.",
  }),
  htmlUrl: z.string().nullable().openapi({
    description:
      "Public CDN URL of the generated HTML artifact for image posts. Null for non-image posts.",
  }),
  markdown: z.string().nullable().openapi({
    description: "Markdown source for text posts. Null for image posts.",
  }),
  rawHtml: z.string().nullable().openapi({
    description:
      "Legacy inline generated HTML for image posts. New generated image HTML is stored as htmlUrl. Null for non-image posts.",
  }),
  recommendations: z.string().nullable(),
  contentType: postContentTypeSchema,
  sourceMetadata: z.unknown().nullable(),
  status: postStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const postsPaginationSchema = z.object({
  limit: z.number().int().min(1),
  currentPage: z.number().int().min(1),
  nextPage: z.number().int().min(1).nullable(),
  previousPage: z.number().int().min(1).nullable(),
  totalPages: z.number().int().min(1),
  totalItems: z.number().int().min(0),
});

export const getPostsResponseSchema = z.object({
  organization: organizationResponseSchema,
  posts: z.array(postResponseSchema),
  pagination: postsPaginationSchema,
});

export const getPostResponseSchema = z.object({
  organization: organizationResponseSchema,
  post: postResponseSchema.nullable(),
});

export const patchPostRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(POST_TITLE_MAX_LENGTH)
      .optional()
      .openapi({
        example: "Ship notes for week 11",
      }),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(POST_SLUG_MAX_LENGTH)
      .regex(
        POST_SLUG_REGEX,
        "Slug must contain lowercase letters, numbers, and hyphens only"
      )
      .nullable()
      .optional()
      .openapi({
        example: "ship-notes-week-11",
      }),
    markdown: z
      .string()
      .min(1)
      .max(POST_MARKDOWN_MAX_LENGTH)
      .optional()
      .openapi({
        example: "# Ship notes\n\nWe shipped a faster editor.",
      }),
    status: postStatusSchema.optional().openapi({
      example: "published",
    }),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.slug !== undefined ||
      data.markdown !== undefined ||
      data.status !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export const patchPostResponseSchema = z.object({
  organization: organizationResponseSchema,
  post: postResponseSchema,
});

export const createBrandIdentityRequestSchema = z.object({
  name: z.string().trim().min(1).max(BRAND_NAME_MAX_LENGTH).optional().openapi({
    description:
      'Display name. Must be unique within the organization. Defaults to "Untitled Brand Voice".',
    example: "Notra",
  }),
  websiteUrl: websiteUrlSchema.openapi({
    description:
      "Public website to analyze for company details, tone, and audience. The scheme is optional; https is assumed.",
    example: "https://usenotra.com",
  }),
});

const brandAnalysisJobSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  brandIdentityId: z.string().openapi({
    description:
      "ID of the brand identity being analyzed. The identity is created immediately and its details are filled in as the job completes.",
  }),
  status: z.enum(["queued", "running", "completed", "failed"]).openapi({
    description: "Job state. Stop polling once it is completed or failed.",
  }),
  step: z.enum(["scraping", "extracting", "saving"]).nullable().openapi({
    description: "Current analysis step while the job is running.",
  }),
  currentStep: z.number().int().min(0),
  totalSteps: z.number().int().min(1),
  workflowRunId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const createBrandIdentityResponseSchema = z.object({
  organization: organizationResponseSchema,
  job: brandAnalysisJobSchema,
});

export const getBrandAnalysisJobParamsSchema = z.object({
  jobId: resourceIdSchema("jobId").openapi({
    param: {
      in: "path",
      name: "jobId",
    },
    description: "Job ID returned by POST /v1/brand-identities/generate.",
    example: "brand_job_5f0c3b2a9d4e4c1f8a7b6c5d4e3f2a1b",
  }),
});

export const getBrandAnalysisJobResponseSchema = z.object({
  organization: organizationResponseSchema,
  job: brandAnalysisJobSchema,
});

export const patchBrandIdentityRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(BRAND_NAME_MAX_LENGTH)
      .optional()
      .openapi({
        example: "Notra",
      }),
    websiteUrl: websiteUrlSchema.optional().openapi({
      example: "https://usenotra.com",
    }),
    companyName: z
      .string()
      .trim()
      .min(1)
      .max(BRAND_COMPANY_NAME_MAX_LENGTH)
      .optional()
      .nullable()
      .openapi({
        example: "Notra",
      }),
    companyDescription: z
      .string()
      .trim()
      .min(BRAND_COMPANY_DESCRIPTION_MIN_LENGTH)
      .max(BRAND_COMPANY_DESCRIPTION_MAX_LENGTH)
      .optional()
      .nullable()
      .openapi({
        example: "AI-native content workflows for software teams.",
      }),
    toneProfile: toneProfileSchema.optional().nullable().openapi({
      example: "Professional",
      description:
        "Set a preset tone profile. When provided without customTone, any saved custom tone is cleared.",
    }),
    customTone: z
      .string()
      .trim()
      .max(BRAND_CUSTOM_TONE_MAX_LENGTH)
      .optional()
      .nullable()
      .openapi({
        example: "Clear, direct, and technically confident",
        description:
          "Provide a custom tone override. Send an empty string or null to clear it.",
      }),
    customInstructions: z
      .string()
      .trim()
      .max(BRAND_CUSTOM_INSTRUCTIONS_MAX_LENGTH)
      .optional()
      .nullable()
      .openapi({
        example: "Avoid hype. Prioritize concrete examples.",
      }),
    audience: z
      .string()
      .trim()
      .min(BRAND_AUDIENCE_MIN_LENGTH)
      .max(BRAND_AUDIENCE_MAX_LENGTH)
      .optional()
      .nullable()
      .openapi({
        example: "Engineering leaders and developer tooling teams.",
      }),
    language: supportedLanguageSchema.optional().nullable().openapi({
      example: "English",
    }),
    isDefault: z.literal(true).optional().openapi({
      example: true,
      description:
        "Set this brand identity as the organization's default. Only true is accepted.",
    }),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.websiteUrl !== undefined ||
      data.companyName !== undefined ||
      data.companyDescription !== undefined ||
      data.toneProfile !== undefined ||
      data.customTone !== undefined ||
      data.customInstructions !== undefined ||
      data.audience !== undefined ||
      data.language !== undefined ||
      data.isDefault !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export const patchBrandIdentityResponseSchema = z.object({
  organization: organizationResponseSchema,
  brandIdentity: brandIdentityResponseSchema,
});

const disabledTriggerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const deleteBrandIdentityResponseSchema = z.object({
  id: z.string(),
  organization: organizationResponseSchema,
  disabledSchedules: z.array(disabledTriggerSchema),
  disabledEvents: z.array(disabledTriggerSchema),
});

export const deletePostResponseSchema = z.object({
  id: z.string(),
  organization: organizationResponseSchema,
});

export const deleteIntegrationResponseSchema = z.object({
  id: z.string(),
  organization: organizationResponseSchema,
  disabledSchedules: z.array(disabledTriggerSchema),
  disabledEvents: z.array(disabledTriggerSchema),
});

export const getBrandIdentitiesResponseSchema = z.object({
  organization: organizationResponseSchema,
  brandIdentities: z.array(brandIdentityResponseSchema),
});

export const getBrandIdentityResponseSchema = z.object({
  brandIdentity: brandIdentityResponseSchema.nullable(),
  organization: organizationResponseSchema,
});

export const getIntegrationsResponseSchema = z.object({
  github: z.array(githubIntegrationResponseSchema).openapi({
    description:
      "Enabled GitHub integrations. One entry per connected repository.",
  }),
  slack: z.array(z.unknown()).openapi({
    description:
      "Always empty. Slack is connected from the dashboard and is not exposed through the API.",
  }),
  linear: z.array(linearIntegrationResponseSchema).openapi({
    description: "Enabled Linear integrations.",
  }),
  organization: organizationResponseSchema,
});

export const generationQueueErrorResponseSchema = z.object({
  error: z.string(),
  jobId: z.string().optional(),
});

const contentGenerationStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "skipped",
]);

const contentGenerationLookbackWindowSchema = z.enum(
  lookbackWindowEnum.enumValues
);

const contentGenerationTypeSchema = z.enum(SUPPORTED_CONTENT_GENERATION_TYPES);

export const createPostGenerationRequestSchema = z
  .object({
    contentType: contentGenerationTypeSchema.openapi({
      description: "Type of content to generate.",
      example: "blog_post",
    }),
    lookbackWindow: contentGenerationLookbackWindowSchema
      .default("last_7_days")
      .openapi({
        description:
          "How far back to collect source activity (commits, pull requests, releases, Linear issues).",
        example: "last_7_days",
      }),
    brandVoiceId: z.string().min(1).optional().openapi({
      description: "Deprecated. Use brandIdentityId instead.",
      example: "51c2f3aa-efdd-4e28-8e69-23fa2dfd3561",
    }),
    brandIdentityId: z.string().min(1).nullable().optional().openapi({
      description:
        "Brand identity to write in. Defaults to the organization's default brand identity.",
      example: "51c2f3aa-efdd-4e28-8e69-23fa2dfd3561",
    }),
    repositoryIds: z
      .array(z.string().min(1))
      .optional()
      .openapi({
        example: ["repo_1", "repo_2"],
        description:
          "Deprecated. Use integrations.github with GitHub integration IDs instead.",
      }),
    linearIntegrationIds: z
      .array(z.string().min(1))
      .optional()
      .openapi({
        example: ["linear_integration_1"],
        description:
          "Deprecated. Use integrations.linear with Linear integration IDs instead.",
      }),
    integrations: z
      .object({
        github: z
          .array(z.string().min(1))
          .min(1)
          .optional()
          .openapi({
            description:
              "GitHub integration IDs to use as sources, as returned by GET /v1/integrations.",
            example: ["integration_1", "integration_2"],
          }),
        linear: z
          .array(z.string().min(1))
          .min(1)
          .optional()
          .openapi({
            description:
              "Linear integration IDs to use as sources, as returned by GET /v1/integrations.",
            example: ["linear_integration_1"],
          }),
      })
      .optional()
      .openapi({
        description:
          "Source integrations to draw activity from. Omit this and github.repositories to use every connected GitHub integration.",
      }),
    github: z
      .object({
        repositories: z
          .array(
            z.object({
              owner: z.string().min(1),
              repo: z.string().min(1),
            })
          )
          .min(1),
      })
      .optional()
      .openapi({
        description:
          "Select connected repositories by owner and name instead of integration ID. Cannot be combined with integrations.github.",
        example: {
          repositories: [{ owner: "usenotra", repo: "notra" }],
        },
      }),
    dataPoints: z
      .object({
        includePullRequests: z.boolean().default(true),
        includeCommits: z.boolean().default(true),
        includeReleases: z.boolean().default(true),
        includeLinearData: z.boolean().default(false),
      })
      .default({
        includePullRequests: true,
        includeCommits: true,
        includeReleases: true,
        includeLinearData: false,
      })
      .openapi({
        description:
          "Which kinds of activity to collect from the selected sources.",
      }),
    selectedItems: z
      .object({
        commitShas: z.array(z.string()).optional(),
        pullRequestNumbers: z
          .array(
            z.object({
              repositoryId: z.string(),
              number: z.number(),
            })
          )
          .optional(),
        releaseTagNames: z
          .array(
            z.union([
              z.string(),
              z.object({
                repositoryId: z.string(),
                tagName: z.string(),
              }),
            ])
          )
          .optional(),
        linearIssueIds: z
          .array(
            z.object({
              integrationId: z.string(),
              issueId: z.string(),
            })
          )
          .optional(),
      })
      .optional()
      .openapi({
        description:
          "Restrict generation to specific commits, pull requests, releases, or Linear issues instead of everything in the lookback window.",
      }),
  })
  .refine(
    (value) => {
      const repositorySourceCount = [
        value.repositoryIds?.length ? 1 : 0,
        value.integrations?.github?.length ? 1 : 0,
        value.github?.repositories?.length ? 1 : 0,
      ].reduce((sum, count) => sum + count, 0);

      return repositorySourceCount <= 1;
    },
    {
      message:
        "Provide only one GitHub source selector: integrations.github or github.repositories. repositoryIds is deprecated.",
      path: ["integrations"],
    }
  )
  .refine(
    (value) => {
      const linearSourceCount = [
        value.linearIntegrationIds?.length ? 1 : 0,
        value.integrations?.linear?.length ? 1 : 0,
      ].reduce((sum, count) => sum + count, 0);

      return linearSourceCount <= 1;
    },
    {
      message:
        "Provide only one Linear source selector: integrations.linear. linearIntegrationIds is deprecated.",
      path: ["integrations"],
    }
  )
  .refine(
    (value) =>
      value.brandVoiceId === undefined || value.brandIdentityId === undefined,
    {
      message: "Provide either brandVoiceId or brandIdentityId, not both",
      path: ["brandIdentityId"],
    }
  );

const contentGenerationJobEventSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  type: z.enum([
    "queued",
    "workflow_triggered",
    "running",
    "fetching_repositories",
    "generating_content",
    "post_created",
    "completed",
    "failed",
    "skipped",
  ]),
  message: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

const contentGenerationJobSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: contentGenerationStatusSchema.openapi({
    description:
      "Job state. Terminal states are completed, failed, and skipped.",
  }),
  contentType: contentGenerationTypeSchema,
  lookbackWindow: contentGenerationLookbackWindowSchema,
  repositoryIds: z.array(z.string()),
  brandVoiceId: z.string().nullable(),
  workflowRunId: z.string().nullable(),
  postId: z.string().nullable().openapi({
    description:
      "ID of the generated post. Set once the job reaches completed.",
  }),
  error: z.string().nullable().openapi({
    description: "Failure reason when status is failed.",
  }),
  source: z.enum(["api", "dashboard"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const createPostGenerationResponseSchema = z.object({
  organization: organizationResponseSchema,
  job: contentGenerationJobSchema,
});

export const getPostGenerationParamsSchema = z.object({
  jobId: resourceIdSchema("jobId").openapi({
    param: {
      in: "path",
      name: "jobId",
    },
    description: "Job ID returned by POST /v1/posts/generate.",
    example: "job_5f0c3b2a9d4e4c1f8a7b6c5d4e3f2a1b",
  }),
});

export const getPostGenerationResponseSchema = z.object({
  job: contentGenerationJobSchema,
  events: z.array(contentGenerationJobEventSchema),
});
