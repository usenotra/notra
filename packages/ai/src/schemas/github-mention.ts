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
