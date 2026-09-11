import type { ContentType } from "@notra/ai/schemas/content";
import type { createOctokit } from "@notra/ai/utils/octokit";
import type { ContentPublicationStatus } from "@notra/db/types/content";

export type GitHubMentionOctokit = ReturnType<typeof createOctokit>;

export interface GitHubMentionSender {
  id: number;
  login: string;
  type?: string;
}

export interface GitHubMentionRepository {
  id: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  owner: string;
}

export interface GitHubMentionComment {
  id: number;
  body: string;
  htmlUrl: string;
}

export interface GitHubMentionPullRequest {
  number: number;
  title: string;
  body: string | null;
  htmlUrl: string;
  headRef: string;
  headSha: string;
  baseRef: string;
  draft: boolean;
}

export interface GitHubMentionPublication {
  id: string;
  postId: string;
  repositoryId: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
  headSha: string | null;
  status: ContentPublicationStatus;
  contentType: ContentType | null;
  title: string | null;
  markdown: string | null;
}

export interface GitHubMentionAuth {
  userId: string;
  organizationId: string;
}

export interface GitHubMentionDestination {
  mode: "same_pull_request" | "new_pull_request" | "reply_only";
  pullRequestNumber: number | null;
  headRef: string | null;
  headSha: string | null;
}

export interface GitHubMentionContext {
  deliveryId: string | null;
  installationId: string;
  organizationId: string;
  userId: string;
  integrationId: string;
  owner: string;
  repo: string;
  issueNumber: number;
  comment: GitHubMentionComment;
  sender: GitHubMentionSender;
  pullRequest: GitHubMentionPullRequest | null;
  destination: GitHubMentionDestination;
  publication: GitHubMentionPublication | null;
}

export interface GitHubMentionAgentResult {
  reply: string;
  committed: boolean;
  commitSha: string | null;
  pullRequestUrl: string | null;
}

export interface GitHubMentionProcessResult {
  status:
    | "ignored"
    | "unauthorized"
    | "accepted"
    | "replied"
    | "committed"
    | "failed";
  reason?: string;
  reply?: string;
  commitSha?: string | null;
  pullRequestUrl?: string | null;
}

export interface GitHubMentionLogTarget {
  organizationId: string;
  integrationId: string;
  owner: string;
  repo: string;
}

export type GitHubMentionWebhookLogStatus =
  | "pending"
  | "success"
  | "failed"
  | "skipped";

export interface GitHubMentionWebhookLog {
  organizationId: string;
  integrationId: string;
  title: string;
  status: GitHubMentionWebhookLogStatus;
  statusCode: number;
  errorMessage?: string | null;
  payload: Record<string, unknown>;
}

export type GitHubMentionResolveResult =
  | { status: "ignored"; reason: string }
  | {
      status: "unauthorized";
      reason: string;
      logTarget?: GitHubMentionLogTarget;
    }
  | { status: "ready"; context: GitHubMentionContext };

export interface GitHubMentionWriteTarget {
  branch: string;
  expectedHeadOid: string;
  pullNumber: number;
  pullRequestUrl: string;
}

export interface GitHubMentionFileChange {
  path: string;
  contents: string;
}

export interface GitHubCreateCommitOnBranchResult {
  createCommitOnBranch: {
    commit: { oid: string };
  } | null;
}

export interface RecordContentPublicationParams {
  organizationId: string;
  postId: string;
  repositoryId: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
  headSha?: string | null;
  status?: ContentPublicationStatus;
}

export interface CommitFilesToPullRequestParams {
  octokit: GitHubMentionOctokit;
  owner: string;
  repo: string;
  branch: string;
  expectedHeadOid: string;
  headline: string;
  files: GitHubMentionFileChange[];
}
