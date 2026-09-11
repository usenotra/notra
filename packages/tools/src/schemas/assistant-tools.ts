import { POST_SLUG_MAX_LENGTH, POST_SLUG_REGEX } from "@notra/ai/schemas/post";
import { editOperationSchema } from "@notra/ai/schemas/tools";
import { z } from "zod";

const POST_TITLE_MAX_LENGTH = 120;

const postSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(POST_SLUG_MAX_LENGTH)
  .regex(
    POST_SLUG_REGEX,
    "Slug must contain lowercase letters, numbers, and hyphens only"
  );

const createPostBaseShape = {
  title: z
    .string()
    .max(POST_TITLE_MAX_LENGTH)
    .describe("The post title, plain text without markdown"),
  markdown: z
    .string()
    .describe(
      "The full post content body as markdown/MDX, without the title heading"
    ),
  recommendations: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional actionable publishing recommendations as markdown: best time to post, audience targeting, distribution channels, or cross-posting ideas"
    ),
};

export const createPostInputSchema = z.object(createPostBaseShape);

export const createPostWithSlugInputSchema = z.object({
  ...createPostBaseShape,
  slug: postSlugSchema
    .nullable()
    .optional()
    .default(null)
    .describe(
      "Optional URL slug for blog posts and changelogs. Use lowercase letters, numbers, and hyphens."
    ),
});

export const updatePostInputSchema = z.object({
  postId: z.string().describe("The ID of the post to update"),
  title: z
    .string()
    .max(POST_TITLE_MAX_LENGTH)
    .optional()
    .describe("Updated title, plain text without markdown"),
  slug: postSlugSchema
    .nullable()
    .optional()
    .describe(
      "Updated optional URL slug for blog posts and changelogs. Pass null to clear it."
    ),
  markdown: z
    .string()
    .optional()
    .describe("Updated content body as markdown/MDX"),
  recommendations: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Updated optional recommendations as markdown. Pass null to clear them."
    ),
});

export const updatePublishedContentInputSchema = z.object({
  postId: z.string().describe("The ID of the published Notra post to update"),
  markdown: z
    .string()
    .describe("Updated markdown for the published GitHub file"),
  title: z
    .string()
    .max(POST_TITLE_MAX_LENGTH)
    .optional()
    .describe("Optional updated title"),
  commitMessage: z
    .string()
    .optional()
    .describe("Commit headline for the GitHub content pull request"),
});

export const viewPostInputSchema = z.object({
  postId: z.string().describe("The ID of the post to view"),
});

export const getAvailablePostsInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  contentType: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const getPostInputSchema = z.object({
  identifier: z
    .string()
    .describe("The ID, slug, or exact title of the post to fetch"),
});

export const listBrandIdentitiesInputSchema = z.object({});

export const getBrandIdentityInputSchema = z.object({
  brandIdentityId: z
    .string()
    .min(1)
    .describe(
      'The brand identity id, or "default" for the default brand identity.'
    ),
});

export const getAvailableIntegrationsInputSchema = z.object({});

export const getAvailableBrandReferencesInputSchema = z.object({
  brandIdentityId: z
    .string()
    .optional()
    .describe(
      "Optional brand identity id. Defaults to the default brand identity."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of references to return."),
});

export const getBrandReferencesInputSchema = z.object({});

export const searchBrandReferencesInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(10).default(5),
});

export const listAvailableSkillsInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("The number of skills to list"),
  offset: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .default(0)
    .describe("The offset to start listing skills from"),
});

export const getSkillByNameInputSchema = z.object({
  name: z.string().describe("The name of the skill to load."),
});

export const searchWebInputSchema = z.object({
  query: z.string().min(1).max(1000).describe("The web search query."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(5)
    .describe("Maximum number of results to return. Prefer 5 by default."),
  includeDomains: z
    .array(z.string().min(1))
    .optional()
    .describe("Optional list of domains to include."),
  excludeDomains: z
    .array(z.string().min(1))
    .optional()
    .describe("Optional list of domains to exclude."),
  freshness: z
    .enum(["last_24_hours", "last_week", "last_month", "last_year"])
    .optional()
    .describe("Optional freshness window for recently published content."),
});

export const fetchWebpageInputSchema = z.object({
  url: z
    .url({ protocol: /^https?$/ })
    .describe("The full public HTTP or HTTPS URL to fetch."),
  includeLinks: z
    .boolean()
    .default(true)
    .describe("Preserve hyperlinks in the returned markdown."),
  onlyMainContent: z
    .boolean()
    .default(true)
    .describe("Extract only the primary page content when possible."),
});

export const editMarkdownInputSchema = z.object({
  baseHash: z
    .string()
    .describe(
      "The document hash provided alongside the current document in this turn."
    ),
  operations: z.array(editOperationSchema),
});

export const getPullRequestsInputSchema = z.object({
  integrationId: z
    .string()
    .describe("The integration ID for the configured repository"),
  pull_number: z
    .number()
    .describe("The number of the pull request to get the details for"),
});

export const getReleaseByTagInputSchema = z.object({
  integrationId: z
    .string()
    .describe("The integration ID for the configured repository"),
  tag: z
    .string()
    .default("latest")
    .describe(
      "The tag of the release to get the details for. Use 'latest' if you don't know the tag"
    ),
});

export const getCommitsByTimeframeInputSchema = z.object({
  integrationId: z
    .string()
    .describe("The integration ID for the configured repository"),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("The page number to retrieve (starts at 1)"),
  since: z.iso
    .datetime()
    .optional()
    .describe("UTC ISO timestamp for the start of the range"),
  until: z.iso
    .datetime()
    .optional()
    .describe("UTC ISO timestamp for the end of the range"),
  days: z
    .number()
    .default(7)
    .optional()
    .describe(
      "Deprecated fallback. Prefer since/until timestamps for exact windows."
    ),
});

export const getLinearIssuesInputSchema = z.object({
  integrationId: z
    .string()
    .describe("The integration ID for the configured Linear workspace"),
  since: z.iso
    .datetime()
    .optional()
    .describe("Only include issues updated at or after this ISO timestamp"),
  until: z.iso
    .datetime()
    .optional()
    .describe("Only include issues updated at or before this ISO timestamp"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor from a previous response"),
  includeCompleted: z
    .boolean()
    .default(true)
    .describe("Whether to include completed issues"),
});

export const getLinearProjectsInputSchema = z.object({
  integrationId: z
    .string()
    .describe("The integration ID for the configured Linear workspace"),
  includeCompleted: z
    .boolean()
    .default(false)
    .describe("Whether to include completed projects"),
});

export const getLinearCyclesInputSchema = z.object({
  integrationId: z
    .string()
    .describe("The integration ID for the configured Linear workspace"),
});

export const getGranolaNotesInputSchema = z.object({
  integrationId: z
    .string()
    .describe("The integration ID for the configured Granola workspace"),
  createdAfter: z
    .string()
    .optional()
    .describe("Only return notes created after this ISO timestamp"),
  createdBefore: z
    .string()
    .optional()
    .describe("Only return notes created before this ISO timestamp"),
  folderId: z
    .string()
    .optional()
    .describe("Only return notes in this folder and its child folders"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor from a previous response"),
});

export const getGranolaNoteInputSchema = z.object({
  integrationId: z
    .string()
    .describe("The integration ID for the configured Granola workspace"),
  noteId: z.string().describe("The ID of the Granola note to fetch"),
  includeTranscript: z
    .boolean()
    .default(false)
    .describe("Whether to include the full meeting transcript"),
});

export const getGranolaFoldersInputSchema = z.object({
  integrationId: z
    .string()
    .describe("The integration ID for the configured Granola workspace"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor from a previous response"),
});
