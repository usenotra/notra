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
});

const issuePullRequestSchema = z
  .object({
    url: z.string().optional(),
    html_url: z.string().optional(),
  })
  .passthrough();

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
});

const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  html_url: z.string(),
  draft: z.boolean().optional(),
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

export type GitHubAppWebhookPayload = z.infer<
  typeof githubAppWebhookPayloadSchema
>;
