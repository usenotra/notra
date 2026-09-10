import type {
  GitHubPublishContentType,
  GitHubPublishRecovery,
} from "@/types/integrations/github";

export const GITHUB_INSTALL_STATE_TTL_SECONDS = 1800;

export const GITHUB_PULL_REQUEST_CLOSED_ACTION = "closed";

export const GITHUB_OAUTH_SCOPES = [
  "read:user",
  "user:email",
  "read:org",
] as const;

export const GITHUB_CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  install_cancelled: "The GitHub installation was cancelled.",
  invalid_callback:
    "The GitHub callback was missing required parameters. Please try again.",
  expired_state:
    "The GitHub installation link expired. Please try connecting again.",
  session_mismatch:
    "The installation finished under a different login session. Please try again.",
  forbidden: "You do not have access to this organization.",
  github_installation_forbidden:
    "You need to be an admin of the GitHub account that owns this installation.",
  github_reauthorization_required:
    "GitHub needs to be reconnected to authorize organization access.",
  github_callback_failed: "Connecting GitHub failed. Please try again.",
  too_many_requests:
    "Too many GitHub connection attempts. Please wait a moment and try again.",
};

export const DEFAULT_GITHUB_CONTENT_DIRECTORIES = {
  changelog: "changelogs",
  blog_post: "blog",
} as const satisfies Record<GitHubPublishContentType, string>;

export const DEFAULT_GITHUB_CONTENT_OUTPUT_ENABLED = {
  changelog: true,
  blog_post: true,
} as const satisfies Record<GitHubPublishContentType, boolean>;

export const GITHUB_API_VERSION_HEADERS = {
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

export const GITHUB_PULL_REQUEST_BODY_SECTION_START =
  "<!-- notra:content:start -->";
export const GITHUB_PULL_REQUEST_BODY_SECTION_END =
  "<!-- notra:content:end -->";

/** GitHub rejects issue and pull request bodies longer than this. */
export const GITHUB_PULL_REQUEST_BODY_MAX_LENGTH = 65_536;

/** GitHub App installation tokens author this commit as `{slug}[bot]`. */
export const GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION = `
  mutation CreateCommitOnBranch($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) {
      commit {
        oid
      }
    }
  }
`;

export const GITHUB_INSTALLATION_ID_REGEX = /^\d+$/;

export const GITHUB_RECOVERY_COPY = {
  github_app_permissions_required: {
    description:
      "Allow read and write access to Contents and Pull requests. An organization admin may need to approve this.",
    title: "GitHub permissions needed",
  },
  github_authentication_required: {
    description:
      "Review the GitHub App installation, then select and save this repository in the GitHub integration settings.",
    title: "Review the GitHub App connection",
  },
  github_repository_connection_required: {
    description:
      "This repository has no saved credentials. Connect the GitHub App, then select and save this repository to publish.",
    title: "Connect this repository to publish",
  },
  github_token_authentication_required: {
    description:
      "The saved personal access token was rejected. Update it in the GitHub integration settings, or connect this repository through the GitHub App.",
    title: "Update the GitHub token",
  },
  github_token_permissions_required: {
    description:
      "Allow the saved personal access token to write repository contents and pull requests, or connect this repository through the GitHub App.",
    title: "GitHub token permissions needed",
  },
  github_content_publishing_paused: {
    description:
      "Publishing was paused after three failed attempts. Review the GitHub integration before resuming.",
    title: "GitHub publishing paused",
  },
} as const satisfies Record<
  GitHubPublishRecovery["code"],
  { description: string; title: string }
>;

export const GITHUB_APP_PERMISSIONS = [
  "Read repository metadata, branches, and releases",
  "Create branches, commits, and draft pull requests",
  "Receive webhook events for the repositories you choose",
  "Access only the repositories you grant during installation",
] as const;
