import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

const repositoryOwnerSchema = z.object({
  login: z.string(),
});

const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  default_branch: z.string(),
  owner: repositoryOwnerSchema,
  stargazers_count: z.number().optional(),
});

const senderSchema = z.object({
  login: z.string(),
  id: z.number(),
});

const releaseSchema = z.object({
  tag_name: z.string(),
  name: z.string().nullable(),
  body: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.string().nullable(),
  html_url: z.string(),
});

const commitAuthorSchema = z.object({
  name: z.string(),
  email: z.string(),
  username: z.string().optional(),
});

const commitSchema = z.object({
  id: z.string(),
  message: z.string(),
  author: commitAuthorSchema,
  timestamp: z.string(),
  url: z.string(),
});

const headCommitSchema = z.object({
  id: z.string(),
  message: z.string(),
});

const pullRequestUserSchema = z.object({
  login: z.string(),
});

const pullRequestBaseSchema = z.object({
  ref: z.string(),
});

const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  html_url: z.string(),
  merged: z.boolean().optional(),
  merged_at: z.string().nullable().optional(),
  merge_commit_sha: z.string().nullable().optional(),
  user: pullRequestUserSchema.optional(),
  base: pullRequestBaseSchema.optional(),
});

export const githubWebhookPayloadSchema = z.object({
  action: z.string().optional(),
  ref: z.string().optional(),
  ref_type: z.string().optional(),
  repository: repositorySchema.optional(),
  star_count: z.number().optional(),
  sender: senderSchema.optional(),
  release: releaseSchema.optional(),
  pull_request: pullRequestSchema.optional(),
  commits: z.array(commitSchema).optional(),
  head_commit: headCommitSchema.nullable().optional(),
  starred_at: z.string().optional(),
});

export type GitHubWebhookPayload = z.infer<typeof githubWebhookPayloadSchema>;

export const GITHUB_EVENT_TYPES = [
  "release",
  "push",
  "pull_request",
  "ping",
] as const;
export type GitHubEventType = (typeof GITHUB_EVENT_TYPES)[number];

export function isGitHubEventType(event: string): event is GitHubEventType {
  return GITHUB_EVENT_TYPES.includes(event as GitHubEventType);
}
