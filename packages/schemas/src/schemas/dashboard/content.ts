import "zod/compile";
import {
  chatIdSchema,
  UI_MESSAGES_MAX,
  uiMessageSchema,
} from "@notra/ai/schemas/chat";
import { contentTypeSchema } from "@notra/ai/schemas/content";
import {
  POST_MARKDOWN_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
} from "@notra/ai/schemas/limits";
import { POST_SLUG_MAX_LENGTH } from "@notra/ai/schemas/post";
import { createContentGenerationRequestSchema } from "@notra/content-generation/schemas";
import { BLOG_POST_SUBTYPES } from "@notra/db/constants/content";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import {
  GITHUB_CONTENT_PATH_MAX_LENGTH,
  GITHUB_PATH_INVALID_CHARACTERS_REGEX,
  GITHUB_PUBLISH_CONTENT_TYPES,
} from "../../constants/dashboard/github";
import {
  LOOKBACK_WINDOWS,
  SUPPORTED_AUTOMATION_OUTPUT_TYPES,
} from "./integrations";

export const postStatusSchema = z.enum(["draft", "published"]);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const sourceMetadataSchema = z
  .looseObject({
    triggerId: z.string().optional(),
    triggerSourceType: z.string().optional(),
    repositories: z
      .array(z.object({ owner: z.string(), repo: z.string() }))
      .optional(),
    linearIntegrations: z
      .array(z.object({ integrationId: z.string() }))
      .optional(),
    lookbackWindow: z.string().optional(),
    lookbackRange: z.object({ start: z.string(), end: z.string() }).optional(),
    brandVoiceName: z.string().optional(),
    brandVoiceId: z.string().optional(),
    selectedCommitShas: z.array(z.string()).optional(),
    selectedPullRequests: z
      .array(z.object({ repositoryId: z.string(), number: z.number() }))
      .optional(),
    selectedReleases: z
      .array(z.object({ repositoryId: z.string(), tagName: z.string() }))
      .optional(),
    selectedLinearIssues: z
      .array(z.object({ integrationId: z.string(), issueId: z.string() }))
      .optional(),
    type: z.literal("generated_image").optional(),
    chatId: z.string().nullable().optional(),
    briefId: z.string().optional(),
    projectId: z.string().optional(),
    sandbox: z
      .object({
        boxId: z.string().optional(),
        snapshotId: z.string().optional(),
        snapshotName: z.string().optional(),
        snapshotSizeBytes: z.number().optional(),
        snapshotCreatedAt: z.string().optional(),
      })
      .nullable()
      .optional(),
  })
  .nullable()
  .optional();

export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;

export const contentSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().nullable(),
  content: z.string(),
  htmlUrl: z.string().nullable(),
  markdown: z.string().nullable(),
  rawHtml: z.string().nullable(),
  recommendations: z.string().nullable(),
  contentType: contentTypeSchema,
  status: postStatusSchema,
  date: z.string(),
  sourceMetadata: sourceMetadataSchema,
});

export type ContentResponse = z.infer<typeof contentSchema>;

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().nullable(),
  content: z.string(),
  htmlUrl: z.string().nullable(),
  markdown: z.string().nullable(),
  rawHtml: z.string().nullable(),
  recommendations: z.string().nullable(),
  contentType: contentTypeSchema,
  contentSubtype: z.enum(BLOG_POST_SUBTYPES).nullable(),
  status: postStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Post = z.infer<typeof postSchema>;

export const postsPaginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
  totalPages: z.number().int().min(1),
});

export type PostsPagination = z.infer<typeof postsPaginationSchema>;

export const postsResponseSchema = z.object({
  posts: z.array(postSchema),
  pagination: postsPaginationSchema,
});

export type PostsResponse = z.infer<typeof postsResponseSchema>;

export const createChatPostSchema = z.object({
  chatId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).nullable().optional(),
  markdown: z.string().trim().min(1),
  contentType: contentTypeSchema,
  status: postStatusSchema,
});

export const contentOrganizationIdInputSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});

export const contentProjectIdInputSchema = z.object({
  projectId: z.string().min(1).optional(),
});

export const contentInputSchema = contentOrganizationIdInputSchema.extend({
  contentId: z.string().min(1, "Content ID is required"),
});

export const contentPreviewRequestSchema = z.object({
  repositoryIds: z.array(z.string().min(1)),
  lookbackWindow: z.enum(LOOKBACK_WINDOWS),
  timezone: z.string().min(1).optional(),
  includeCommits: z.boolean().default(true),
  includePullRequests: z.boolean().default(true),
  includeReleases: z.boolean().default(true),
  linearIntegrationIds: z.array(z.string().min(1)).optional(),
});

export const postCollectionSourceSchema = z.enum([
  "manual",
  "chat",
  "schedule",
  "automation",
  "api",
  "backfill",
]);
export type PostCollectionSource = z.infer<typeof postCollectionSourceSchema>;

export const postCollectionNameSourceSchema = z.enum([
  "generated",
  "user",
  "backfill",
]);
export type PostCollectionNameSource = z.infer<
  typeof postCollectionNameSourceSchema
>;

export const postCollectionStatusSummarySchema = z.object({
  total: z.number().int().min(0),
  draft: z.number().int().min(0),
  published: z.number().int().min(0),
});
export type PostCollectionStatusSummary = z.infer<
  typeof postCollectionStatusSummarySchema
>;

export const postCollectionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  source: postCollectionSourceSchema,
  nameSource: postCollectionNameSourceSchema,
  contentTypes: z.array(contentTypeSchema),
  postCount: z.number().int().min(0),
  expectedPostCount: z.number().int().nullable(),
  isGenerating: z.boolean(),
  statusSummary: postCollectionStatusSummarySchema,
  createdAt: z.string(),
});
export type PostCollectionSummary = z.infer<typeof postCollectionSummarySchema>;

export const postCollectionListResponseSchema = z.object({
  collections: z.array(postCollectionSummarySchema),
  pagination: postsPaginationSchema,
});
export type PostCollectionListResponse = z.infer<
  typeof postCollectionListResponseSchema
>;

export const groupPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  markdown: z.string().nullable(),
  contentType: contentTypeSchema,
  contentSubtype: z.enum(BLOG_POST_SUBTYPES).nullable(),
  status: postStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CollectionPost = z.infer<typeof groupPostSchema>;

export const postCollectionDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: postCollectionSourceSchema,
  nameSource: postCollectionNameSourceSchema,
  contentTypes: z.array(contentTypeSchema),
  expectedPostCount: z.number().int().nullable(),
  isGenerating: z.boolean(),
  createdAt: z.string(),
  posts: z.array(groupPostSchema),
});
export type PostCollectionDetail = z.infer<typeof postCollectionDetailSchema>;

export const postSiblingSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.string(),
  status: postStatusSchema,
});
export type PostSibling = z.infer<typeof postSiblingSchema>;

export const postCollectionContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: postCollectionSourceSchema,
  siblings: z.array(postSiblingSchema),
});
export type PostCollectionContext = z.infer<typeof postCollectionContextSchema>;

export const renameCollectionSchema = z.object({
  name: z.string().trim().min(1).max(200),
});
export type RenameCollectionInput = z.infer<typeof renameCollectionSchema>;

export const editContentSchema = z.object({
  instruction: z.string().min(1, "Instruction is required"),
  currentMarkdown: z.string(),
  selectedText: z.string().optional(),
});

export type EditContentInput = z.infer<typeof editContentSchema>;

export const contextItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("github-repo"),
    owner: z.string(),
    repo: z.string(),
    integrationId: z.string(),
  }),
  z.object({
    type: z.literal("linear-team"),
    integrationId: z.string(),
    teamName: z.string().optional(),
  }),
]);

export type ContextItem = z.infer<typeof contextItemSchema>;

export const textSelectionSchema = z.object({
  text: z.string(),
  startLine: z.number(),
  startChar: z.number(),
  endLine: z.number(),
  endChar: z.number(),
});

export type TextSelection = z.infer<typeof textSelectionSchema>;

const contentChatContextItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("github-repo"),
    owner: z.string(),
    repo: z.string(),
    integrationId: z.string(),
  }),
  z.object({
    type: z.literal("linear-team"),
    integrationId: z.string(),
    teamName: z.string().optional(),
  }),
  z.object({
    type: z.literal("mcp-server"),
    integrationId: z.string(),
    name: z.string(),
  }),
]);

export const contentChatMessageMetadataSchema = z.object({
  selection: textSelectionSchema.optional(),
  context: z.array(contentChatContextItemSchema).max(50).optional(),
});

export const chatRequestSchema = z.object({
  chatId: chatIdSchema,
  messages: z.array(uiMessageSchema).min(1).max(UI_MESSAGES_MAX),
  currentMarkdown: z.string().max(POST_MARKDOWN_MAX_LENGTH),
  contentType: z.string().max(100).optional(),
  documentMode: z.enum(["plan"]).optional(),
  selection: textSelectionSchema.optional(),
  context: z.array(contextItemSchema).max(50).optional(),
  timezone: z.string().min(1).max(100).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

const slugFieldSchema = z.string().slugify().min(1).max(POST_SLUG_MAX_LENGTH);

export const updateContentSchema = z
  .object({
    title: z.string().trim().min(1).max(POST_TITLE_MAX_LENGTH).optional(),
    slug: slugFieldSchema.nullable().optional(),
    markdown: z.string().max(POST_MARKDOWN_MAX_LENGTH).optional(),
    status: postStatusSchema.optional(),
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

export type UpdateContentInput = z.infer<typeof updateContentSchema>;

const githubMarkdownPathSchema = z
  .string()
  .trim()
  .min(1, "File path is required")
  .max(GITHUB_CONTENT_PATH_MAX_LENGTH - ".md".length, "File path is too long")
  .refine((path) => !path.startsWith("/"), "Enter a repository-relative path")
  .refine((path) => !path.endsWith("/"), "File path must include a file name")
  .refine((path) => !path.includes("\\"), "Use forward slashes in file paths")
  .refine(
    (path) => !GITHUB_PATH_INVALID_CHARACTERS_REGEX.test(path),
    "File path contains invalid characters"
  )
  .refine(
    (path) =>
      path
        .split("/")
        .every((segment) => segment && segment !== "." && segment !== ".."),
    "File path contains an invalid segment"
  )
  .transform((path) =>
    path.toLowerCase().endsWith(".md") ? path : `${path}.md`
  );

export const publishContentToGitHubSchema = z.object({
  contentType: z.enum(GITHUB_PUBLISH_CONTENT_TYPES).default("changelog"),
  repositoryId: z.string().min(1, "Repository is required"),
  path: githubMarkdownPathSchema.optional(),
});

export const onDemandContentTypeSchema = z.enum([
  ...SUPPORTED_AUTOMATION_OUTPUT_TYPES,
  "image",
] as const);
export type OnDemandContentType = z.infer<typeof onDemandContentTypeSchema>;

export const createPostCollectionInputSchema = contentOrganizationIdInputSchema
  .extend(contentProjectIdInputSchema.shape)
  .extend({
    contentTypes: z.array(onDemandContentTypeSchema).min(1),
    expectedPostCount: z.number().int().positive(),
  });

export const postCollectionsListInputSchema = contentOrganizationIdInputSchema
  .extend(contentProjectIdInputSchema.shape)
  .extend({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  });

export const postCollectionInputSchema =
  contentOrganizationIdInputSchema.extend({
    collectionId: z.string().min(1, "Collection ID is required"),
  });

export const renamePostCollectionInputSchema = postCollectionInputSchema.and(
  renameCollectionSchema
);

export const updateExpectedPostCountInputSchema =
  postCollectionInputSchema.extend({
    expectedPostCount: z.number().int().positive(),
  });

export const generateContentInputSchema = contentOrganizationIdInputSchema
  .and(createContentGenerationRequestSchema)
  .and(z.object({ collectionId: z.string().min(1) }));

export const contentDataPointSettingsSchema = z.object({
  includePullRequests: z.boolean().default(true),
  includeCommits: z.boolean().default(true),
  includeReleases: z.boolean().default(true),
  includeLinearData: z.boolean().default(false),
});

export type ContentDataPointSettings = z.infer<
  typeof contentDataPointSettingsSchema
>;

export const selectedItemsSchema = z.object({
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
});

export type SelectedItems = z.infer<typeof selectedItemsSchema> | undefined;

export const createOnDemandContentSchema = z.object({
  contentType: onDemandContentTypeSchema,
  lookbackWindow: z.enum(LOOKBACK_WINDOWS).default("last_7_days"),
  brandVoiceId: z.string().min(1).optional(),
  repositoryIds: z.array(z.string().min(1)).optional(),
  linearIntegrationIds: z.array(z.string().min(1)).optional(),
  dataPoints: contentDataPointSettingsSchema.prefault({}),
  selectedItems: selectedItemsSchema.optional(),
});

export type CreateOnDemandContentInput = z.infer<
  typeof createOnDemandContentSchema
>;
