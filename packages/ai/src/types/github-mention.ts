import type { githubAppWebhookPayloadSchema } from "@notra/ai/schemas/github-mention";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type {
  ContentPublication,
  RecordContentPublicationParams as PublicationRecordParams,
} from "@notra/ai/types/content-publication";
import type { createOctokit } from "@notra/ai/utils/octokit";
import type { z } from "zod";

export type GitHubMentionOctokit = ReturnType<typeof createOctokit>;

export type GitHubAppWebhookPayload = z.infer<
  typeof githubAppWebhookPayloadSchema
>;

export type GitHubCommentKind = "issue" | "review";

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

/** Set when the mention was written in a review thread under "Files changed". */
export interface GitHubMentionReviewThread {
  path: string;
  line: number | null;
  /** First line of a multi-line comment. */
  startLine: number | null;
  /** Commit the line numbers refer to. */
  commitSha: string | null;
  diffHunk: string | null;
  /** Replies must target the thread's first comment. */
  rootCommentId: number;
}

export interface GitHubMentionComment {
  id: number;
  body: string;
  htmlUrl: string;
  review: GitHubMentionReviewThread | null;
}

export interface GitHubMentionPullRequest {
  number: number;
  title: string;
  body: string | null;
  htmlUrl: string;
  headRef: string;
  headSha: string;
  headRepoFullName: string | null;
  baseRef: string;
  draft: boolean;
}

export interface GitHubMentionPublication extends ContentPublication {}

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
  defaultBranch: string;
  issueNumber: number;
  comment: GitHubMentionComment;
  sender: GitHubMentionSender;
  pullRequest: GitHubMentionPullRequest | null;
  destination: GitHubMentionDestination;
  publication: GitHubMentionPublication | null;
}

/** Brand voice fields the mention agent writes in. */
export interface GitHubMentionVoice {
  name: string;
  companyName: string | null;
  companyDescription: string | null;
  toneProfile: string | null;
  customTone: string | null;
  customInstructions: string | null;
  audience: string | null;
  language: string | null;
}

export interface GitHubMentionThreadComment {
  id: number;
  kind: "issue" | "review";
  createdAt: string;
  /** Review comments only: the first comment of their thread. */
  threadRootId: number | null;
  authorLogin: string;
  authorIsBot: boolean;
  /** Owner, organization member, or collaborator of the repository. */
  authorIsTrusted: boolean;
  body: string;
}

export interface GitHubMentionChangedFile {
  path: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

/** Lines of the file on the pull request head, 1-based and inclusive. */
export interface GitHubMentionLineRange {
  startLine: number;
  line: number;
}

/** A proposed edit: `previousLines` on the head would become `replacement`. */
export interface GitHubMentionSuggestion extends GitHubMentionLineRange {
  path: string;
  previousLines: string[];
  replacement: string[];
}

/** What the agent proposed instead of committing, against one head commit. */
export interface GitHubMentionProposal {
  path: string;
  /** Head the line numbers refer to. */
  commitSha: string;
  previous: string;
  suggestions: GitHubMentionSuggestion[];
}

export interface GitHubMentionAgentResult {
  reply: string;
  /** The agent declined the request because a mention safeguard blocked it. */
  declined: boolean;
  committed: boolean;
  commitSha: string | null;
  pullRequestUrl: string | null;
  proposals: GitHubMentionProposal[];
  /** GitHub refused a tool call because the App lacks a permission. */
  permissionDenied: boolean;
  /** What the run cost, absent when the agent threw after it had committed. */
  usage: AgentTokenUsage | null;
}

/** One organization's remaining mention runs in the current window. */
export interface GitHubMentionRateLimit {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Epoch milliseconds at which the window rolls over. */
  resetAt: number;
}

export interface GitHubMentionProcessResult {
  status:
    | "ignored"
    | "unauthorized"
    | "accepted"
    | "replied"
    | "suggested"
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

export interface GitHubMentionWriteState {
  writeBranch: string | null;
  writePullNumber: number | null;
  writePullRequestUrl: string | null;
  commitSha?: string | null;
}

export interface GitHubMentionToolState extends GitHubMentionWriteState {
  committed: boolean;
  commitSha: string | null;
  pullRequestUrl: string | null;
  /** The published file on the pull request head, read once before the run. */
  publishedFile: string | null;
  /** Edits the agent proposed instead of committing, one per file. */
  proposals: GitHubMentionProposal[];
  /** GitHub refused a call for lack of permission. Retrying cannot fix that. */
  permissionDenied: boolean;
  /** Reports paid model work performed inside tools, such as the sandbox. */
  onUsage: (usage: AgentTokenUsage) => void;
}

export interface GitHubMentionFileChange {
  path: string;
  contents: string;
}

export interface GitHubMentionContentFinding {
  path: string;
  reason: string;
  line: string;
}

/** Old lines become `newLines`; a count of 0 inserts before `oldStart`. */
export interface GitHubMentionLineHunk {
  oldStart: number;
  oldCount: number;
  newLines: string[];
}

export interface GitHubCreateCommitOnBranchResult {
  createCommitOnBranch: {
    commit: { oid: string };
  } | null;
}

export interface RecordContentPublicationParams extends PublicationRecordParams {}

export interface CommitFilesToPullRequestParams {
  octokit: GitHubMentionOctokit;
  owner: string;
  repo: string;
  branch: string;
  expectedHeadOid: string;
  headline: string;
  files: GitHubMentionFileChange[];
  /** Paths to remove in the same commit. */
  deletions?: string[];
}
