import type { GitHubMentionDestination } from "@notra/ai/types/github-mention";
import type { GitHubAppPublishAccess } from "@notra/ai/types/github-operations";

const PERMISSION_ERROR_MESSAGES = [
  "resource not accessible by integration",
  "resource not accessible by personal access token",
  "permission to the resource",
  "insufficient scope",
] as const;

/**
 * GitHub refused the call because the App (or token) lacks a permission. Rate
 * limits also answer 403, but those pass with time, so they do not count.
 */
export function isGitHubPermissionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  if (message.includes("rate limit")) {
    return false;
  }
  return PERMISSION_ERROR_MESSAGES.some((part) => message.includes(part));
}

/**
 * GitHub accepts Issues write or Pull requests write for PR conversation
 * comments and their reactions, so Issues alone covers a plain answer. Review
 * replies, suggestions and follow-up pull requests need Pull requests write,
 * and commits also need Contents.
 */
export function findMissingGitHubMentionPermissions(params: {
  access: GitHubAppPublishAccess | null;
  mode: GitHubMentionDestination["mode"];
  commentKind: "issue" | "review";
}) {
  if (!params.access) {
    return [];
  }
  const missing: string[] = [];
  if (params.mode !== "reply_only" && params.access.contents !== "write") {
    missing.push("Contents: Read and write");
  }
  const issuesCoverTheReply =
    params.commentKind === "issue" &&
    params.mode === "reply_only" &&
    params.access.issues === "write";
  if (!issuesCoverTheReply && params.access.pullRequests !== "write") {
    missing.push("Pull requests: Read and write");
  }
  return missing;
}

export function buildGitHubMentionPermissionReply(params: {
  missing: readonly string[];
  settingsUrl: string | null;
}) {
  const what =
    params.missing.length > 0
      ? `the configured GitHub credential is missing ${params.missing.length > 1 ? "permissions" : "a permission"} on this repository: ${params.missing.map((permission) => `**${permission}**`).join(" and ")}`
      : "GitHub refused the request: the configured GitHub credential does not have the access it needs on this repository";
  const where = params.settingsUrl
    ? `An owner of the account can review and approve the App's permissions in the [installation settings](${params.settingsUrl}).`
    : "An owner can review the configured GitHub credential and grant the required repository access.";
  return `I could not do this because ${what}. ${where} Mention me again once that is done.`;
}
