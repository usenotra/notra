import type {
  GitHubCallbackErrorMessageKey,
  GitHubPublishContentType,
} from "@/types/integrations/github";

export const GITHUB_INSTALL_STATE_TTL_SECONDS = 1800;

export const GITHUB_PULL_REQUEST_CLOSED_ACTION = "closed";

export const GITHUB_OAUTH_SCOPES = [
  "read:user",
  "user:email",
  "read:org",
] as const;

export const GITHUB_CALLBACK_ERROR_MESSAGE_KEYS: Record<
  string,
  GitHubCallbackErrorMessageKey
> = {
  install_cancelled: "installCancelled",
  invalid_callback: "invalidCallback",
  expired_state: "expiredState",
  session_mismatch: "sessionMismatch",
  github_installation_forbidden: "installationForbidden",
  github_reauthorization_required: "reauthorizationRequired",
  github_callback_failed: "callbackFailed",
  too_many_requests: "tooManyRequests",
};

export const DEFAULT_GITHUB_CONTENT_DIRECTORIES = {
  changelog: "changelogs",
  blog_post: "blog",
} as const satisfies Record<GitHubPublishContentType, string>;

export const GITHUB_DEFAULT_PUBLIC_DIRECTORY = "public";

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
/** Commit message trailer that records the files a Notra publication owns. */
export const GITHUB_CONTENT_COMMIT_METADATA_PREFIX = "Notra-Publication: ";
/** Leaves one comparison slot for the content file below GitHub's 300-file cap. */
export const GITHUB_CONTENT_MAX_ASSET_COUNT = 298;
/**
 * The GraphQL endpoint rejects request bodies of roughly 20 MB and more with
 * HTTP 499. Assets travel base64-encoded inside that body, so ~12 MB of raw
 * bytes is the largest total that reliably commits in one request.
 */
export const GITHUB_CONTENT_MAX_ASSET_BYTES = 12 * 1024 * 1024;
export const GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES = 10 * 1024 * 1024;

/** GitHub rejects issue and pull request bodies longer than this. */
export const GITHUB_PULL_REQUEST_BODY_MAX_LENGTH = 65_536;

export const GITHUB_INSTALLATION_ID_REGEX = /^\d+$/;

export const GITHUB_APP_PERMISSIONS = [
  "readMetadata",
  "createCommits",
  "comment",
  "webhooks",
  "scopedAccess",
] as const;

export const PENDING_OUTPUT_ID_PREFIX = "pending-output:";

export const REPOSITORY_ALREADY_CONNECTED_CODE = "REPOSITORY_ALREADY_CONNECTED";

export const REPOSITORY_PROBE_UNAVAILABLE_CODE = "REPOSITORY_PROBE_UNAVAILABLE";
