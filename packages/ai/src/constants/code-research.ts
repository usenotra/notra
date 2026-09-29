import type { GitHubInstallationTokenScope } from "@notra/ai/types/github-operations";

export const CODE_RESEARCH_DISABLE_ENV = "NOTRA_CODE_RESEARCH";
export const CODE_RESEARCH_SESSION_ATTRIBUTE = "codeResearch";

export const CODE_RESEARCH_BOX_NAME_PREFIX = "notra-code-";
export const CODE_RESEARCH_BOX_TTL_SECONDS = 45 * 60;
// Reusing a box this close to its TTL risks it vanishing mid-research.
export const CODE_RESEARCH_BOX_REUSE_MARGIN_SECONDS = 5 * 60;
export const CODE_RESEARCH_BOX_REQUEST_TIMEOUT_MS = 240_000;
export const CODE_RESEARCH_BOX_VERIFY_INTERVAL_MS = 60_000;
// The box proxy injects the GitHub auth header, so git only ever talks to github.com.
export const CODE_RESEARCH_ALLOWED_DOMAINS = ["github.com"];
// GitHub App tokens are minted read-only for the one repository, so even the
// injected header cannot push or touch other repositories.
export const CODE_RESEARCH_TOKEN_SCOPE = {
  permissions: { contents: "read" },
} satisfies GitHubInstallationTokenScope;

export const CODE_RESEARCH_REPO_DIR = "/workspace/home/repo";
export const CODE_RESEARCH_HISTORY_DAYS = 90;
export const CODE_RESEARCH_FALLBACK_DEPTH = 200;
export const CODE_RESEARCH_CLONE_TIMEOUT_SECONDS = 180;
export const CODE_RESEARCH_COMMAND_TIMEOUT_SECONDS = 45;

// Covers box creation plus clone and checkout, each capped at 180 s.
export const CODE_RESEARCH_LEASE_TTL_SECONDS = 600;
export const CODE_RESEARCH_LEASE_RENEW_MS = 60_000;
export const CODE_RESEARCH_LEASE_WAIT_MS = 200_000;
export const CODE_RESEARCH_LEASE_POLL_MS = 1500;

export const CODE_RESEARCH_EXIT_MARKER = "__NOTRA_EXIT__";

export const CODE_RESEARCH_LIST_MAX_ENTRIES = 400;
export const CODE_RESEARCH_LIST_SCAN_LIMIT = 50_000;
// Extra history fetched when a branch forked below the shallow clone.
export const CODE_RESEARCH_DEEPEN_STEPS = [1000, 5000] as const;
export const CODE_RESEARCH_SEARCH_MAX_MATCHES = 120;
export const CODE_RESEARCH_SEARCH_MAX_PER_FILE = 8;
export const CODE_RESEARCH_LINE_MAX_CHARS = 300;
export const CODE_RESEARCH_READ_MAX_LINES = 400;
export const CODE_RESEARCH_READ_MAX_BYTES = 40_000;
export const CODE_RESEARCH_HISTORY_MAX_COMMITS = 100;
export const CODE_RESEARCH_DIFF_MAX_BYTES = 60_000;
export const CODE_RESEARCH_README_MAX_LINES = 60;
export const CODE_RESEARCH_OVERVIEW_COMMITS = 15;
export const CODE_RESEARCH_OVERVIEW_MANIFESTS = 40;

export const CODE_RESEARCH_DIFF_EXCLUDES = [
  "*.lock",
  "*.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "*.min.js",
  "*.min.css",
  "*.map",
  "*.snap",
  "*.svg",
];

// Paths the model may never read or see matches from, even though they are tracked.
export const CODE_RESEARCH_DENIED_PATH_PATTERNS: readonly RegExp[] = [
  /(^|\/)\.env(\.(?!example$|sample$|template$|defaults$)[^/]*)?$/i,
  /(^|\/)\.(npmrc|pypirc|netrc|git-credentials)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /\.(pem|key|p12|pfx|jks|keystore|kdbx)$/i,
  /(^|\/)secrets?\.[^/]+$/i,
  /(^|\/)credentials?\.[^/]+$/i,
];

export const CODE_RESEARCH_REDACTION_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
];

// These keep the key name so the model still learns which settings exist.
// Only literal values are redacted; `token = getToken()` stays readable.
export const CODE_RESEARCH_QUOTED_SECRET_PATTERN =
  /\b([A-Za-z0-9_.-]*(?:api[_-]?key|secret|password|passwd|token|private[_-]?key)[A-Za-z0-9_.-]*["'`]?\s*[:=]\s*)(["'`])([A-Za-z0-9_\-+/=.]{16,})\2/gi;
export const CODE_RESEARCH_ENV_SECRET_PATTERN =
  /^(\s*(?:export\s+)?[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD)[A-Z0-9_]*=)(\S{12,})$/gm;

export const CODE_RESEARCH_REDACTED = "[redacted]";

// Characters git refuses in ref names, plus whitespace. Control characters
// are checked by code point in assertSafeRef.
export const CODE_RESEARCH_INVALID_REF_CHARS = /[\s~^:?*[\\]/;
export const CODE_RESEARCH_MAX_REF_LENGTH = 200;
export const CODE_RESEARCH_FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export const CODE_RESEARCHER_TOOL_NAME = "code-researcher";
export const CODE_RESEARCHER_MAX_STEPS = 30;
export const CODE_RESEARCHER_STEP_MAX_STRING_CHARS = 300;
export const CODE_RESEARCHER_STEP_MAX_ARRAY_ITEMS = 20;
export const CODE_RESEARCHER_STEP_OMITTED_KEYS = new Set([
  "content",
  "patch",
  "excerpt",
]);

// Shared by the eve tools and the chat's code-researcher so both read the same.
export const CODE_RESEARCH_TOOL_DESCRIPTIONS = {
  open_repository:
    "Opens the connected GitHub repository in a read-only sandbox and checks out the default branch, a branch, a pull request head, or a commit. Returns the checked out commit, top-level layout, README excerpt, package manifests, and recent commits. Call this first; later calls on the same integration reuse the sandbox. Calling it again with another ref switches the checkout.",
  list_repository_files:
    "Lists tracked files in the repository sandbox under a path, optionally filtered by a glob. Large directories are collapsed into subdirectories with file counts; drill into one by passing it as path.",
  search_repository:
    "Searches the checked out repository with git grep and returns matching lines with file paths and line numbers. Use it to find where a feature lives: routes, UI strings, config keys, function or component names.",
  read_repository_file:
    "Reads a text file from the checked out repository, up to 400 lines per call. Use startLine and endLine to page through long files. Secret-bearing files like .env are blocked and credentials in output are redacted.",
  repository_history:
    "Lists commits reachable from the checked out head (about the last 90 days are available), optionally limited to a path, a date, or a message search. Use it to find the commits that built a feature, then inspect them with show_repository_change.",
  show_repository_change:
    "Shows a change as a commit message, a file stat, and a unified diff (lockfiles and generated files are left out, long diffs are truncated). Pass ref for a single commit, or omit it after open_repository with a branch or pull request to see everything that branch changed.",
} as const;
