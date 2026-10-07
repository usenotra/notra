import { GITHUB_MENTION_REPOSITORY_READ_LIMITS } from "@notra/ai/constants/github-mention";
import { CONTENT_PUBLICATION_STATUSES } from "@notra/db/constants/content";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const senderSchema = z.object({
  id: z.number(),
  login: z.string(),
  type: z.string().optional(),
});

const repositoryOwnerSchema = z.object({
  login: z.string(),
});

const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  default_branch: z.string(),
  owner: repositoryOwnerSchema,
});

const commentSchema = z.object({
  id: z.number(),
  body: z.string(),
  html_url: z.string(),
  user: senderSchema.optional(),
  // Present on pull_request_review_comment events only.
  path: z.string().optional(),
  line: z.number().nullable().optional(),
  start_line: z.number().nullable().optional(),
  commit_id: z.string().optional(),
  diff_hunk: z.string().optional(),
  in_reply_to_id: z.number().optional(),
});

const issuePullRequestSchema = z.looseObject({
  url: z.string().optional(),
  html_url: z.string().optional(),
});

const issueSchema = z.object({
  number: z.number(),
  title: z.string().optional(),
  body: z.string().nullable().optional(),
  html_url: z.string().optional(),
  pull_request: issuePullRequestSchema.optional(),
});

const pullRequestRefSchema = z.object({
  ref: z.string(),
  sha: z.string(),
  repo: z.object({ full_name: z.string() }).nullable().optional(),
});

const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  html_url: z.string(),
  draft: z.boolean().optional(),
  merged: z.boolean().nullable().optional(),
  head: pullRequestRefSchema,
  base: pullRequestRefSchema,
});

const installationSchema = z.object({
  id: z.number(),
});

export const githubAppWebhookPayloadSchema = z.object({
  action: z.string().optional(),
  comment: commentSchema.optional(),
  issue: issueSchema.optional(),
  pull_request: pullRequestSchema.optional(),
  repository: repositorySchema.optional(),
  sender: senderSchema.optional(),
  installation: installationSchema.optional(),
});

export const contentPublicationStatusSchema = z.enum(
  CONTENT_PUBLICATION_STATUSES
);

export const githubMentionDestinationModeSchema = z.enum([
  "same_pull_request",
  "new_pull_request",
  "reply_only",
]);

export const githubMentionDirectorySchema = z.object({
  path: z
    .string()
    .max(4096)
    .refine(
      (path) =>
        path === "" ||
        (!path.includes("\\") &&
          path
            .split("/")
            .every(
              (segment) => segment !== "" && segment !== "." && segment !== ".."
            )),
      "Use a repository-relative directory without trailing slashes, or an empty string for the root"
    )
    .default("")
    .describe(
      "Directory to open, e.g. apps/web/src/content. Empty string lists the repository root. Only immediate children are returned, never a recursive tree."
    ),
  entryType: z
    .enum(["all", "directories", "files"])
    .default("all")
    .describe(
      "Use directories to navigate without listing posts or other files"
    ),
  nameContains: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "Case-insensitive name filter within this directory, not a repository-wide search"
    ),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      "Entry offset. Use nextOffset from the previous page with the same path and filters."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(GITHUB_MENTION_REPOSITORY_READ_LIMITS.directoryMax)
    .default(GITHUB_MENTION_REPOSITORY_READ_LIMITS.directoryDefault)
    .describe("Maximum entries per page; defaults to 30, at most 50"),
});

export const githubMentionFileReadSchema = z.object({
  path: z.string().min(1).describe("Repository-relative file path"),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      "Character offset; use nextOffset to continue reading the same file"
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(GITHUB_MENTION_REPOSITORY_READ_LIMITS.fileMax)
    .default(GITHUB_MENTION_REPOSITORY_READ_LIMITS.fileDefault)
    .describe(
      "Maximum characters to return; defaults to 6000, at most 16000. Long lines can be read across pages."
    ),
});

export const githubMentionMoveSchema = z.strictObject({
  fromPath: z.string().min(1).describe("Existing content file to move"),
  toPath: z
    .string()
    .min(1)
    .describe("New repository-relative content path; must not exist"),
  headline: z.string().trim().min(1).describe("Commit headline"),
});
