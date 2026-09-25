export const GITHUB_MENTION_APP_WEBHOOK_SECRET_ENV =
  "GITHUB_APP_WEBHOOK_SECRET";

export const GITHUB_MENTION_DEFAULT_APP_SLUG = "notra";

export const GITHUB_MENTION_COMMENT_MAX_LENGTH = 65_536;

export const GITHUB_MENTION_AGENT_MAX_STEPS = 20;

export const GITHUB_MENTION_ITERATE_HINT = "mention me again to keep iterating";

/** Only replies inside a review thread are picked up without a mention. */
export const GITHUB_MENTION_THREAD_ITERATE_HINT =
  "reply here or mention me again to keep iterating";

export const GITHUB_MENTION_CHECK_RUN_NAME = "Notra";

export const GITHUB_MENTION_CHECK_RUN_CONCLUSION_BY_REACTION = {
  "+1": "success",
  "-1": "neutral",
  confused: "failure",
} as const;

export const GITHUB_MENTION_CHECK_RUN_SUMMARY = {
  in_progress: "Working on the request",
  success: "Replied",
  neutral: "Declined the request",
  failure: "Could not finish the request",
} as const;

export const GITHUB_MENTION_DECLINED_REPLY_MARKER = "<!-- notra:declined -->";

export const GITHUB_MENTION_SANDBOX_TIMEOUT_MS = 180_000;

export const GITHUB_MENTION_FILE_CONTENT_MAX_BYTES = 512_000;

/**
 * Where the sandbox box may talk to: GitHub for the shallow clone, and the AI
 * gateway for the agent running inside it. The box only edits content, so it
 * never needs a package registry or the open web. Private ranges are blocked
 * by Box itself, so this list is not about reaching internal services; it is
 * about where a prompt injection could send the gateway key that the harness
 * carries.
 */
export const GITHUB_MENTION_SANDBOX_ALLOWED_DOMAINS = [
  "github.com",
  "*.github.com",
  "*.githubusercontent.com",
  "ai-gateway.vercel.sh",
] as const;

export const GITHUB_MENTION_LOG_COMMENT_MAX_LENGTH = 280;

export const GITHUB_MENTION_LOG_EVENTS = {
  ingestRejected: "github.mention.ingest_rejected",
  ignored: "github.mention.ignored",
  unauthorized: "github.mention.unauthorized",
  accepted: "github.mention.accepted",
  processing: "github.mention.processing",
  completed: "github.mention.completed",
  sandboxStarted: "github.mention.sandbox.started",
  sandboxCompleted: "github.mention.sandbox.completed",
  changeBlocked: "github.mention.change.blocked",
  billingFailed: "github.mention.billing_failed",
} as const;

export const GITHUB_MENTION_SEPARATE_PR_PATTERNS = [
  /\b(?:open|create|start) (?:a |an )?(?:new |separate |own |different )(?:draft )?(?:pr|pull request)\b/gi,
  /\buse (?:a |an )?(?:new|separate|own|different) (?:pr|pull request|branch)\b/gi,
  /\b(?:put|move|send) (?:this|these|the changes?) (?:in|to|as) (?:a |an )?(?:new|separate|own|different) (?:pr|pull request|branch)\b/gi,
] as const;

export const GITHUB_MENTION_REPLY_DIFF = {
  /** Longer diffs collapse into a <details> block. */
  inlineLineLimit: 24,
  totalLineLimit: 120,
  lineLengthLimit: 240,
  fileLimit: 5,
} as const;

export const GITHUB_MENTION_SUGGESTION = {
  /** Changed regions this many unchanged lines apart become one suggestion. */
  mergeGap: 1,
  /** More separate regions than this read better as a commit. */
  maxSuggestions: 8,
  /** Line pairs the diff compares before it treats the middle as one rewrite. */
  diffCellLimit: 1_000_000,
} as const;

export const GITHUB_MENTION_PROMPT_CONTEXT = {
  pullRequestBodyLimit: 2000,
  voiceFieldLimit: 1500,
} as const;

export const GITHUB_MENTION_THREAD_CONTEXT = {
  commentLimit: 10,
  commentLengthLimit: 1500,
} as const;

/**
 * Mentions edit content, never code. Comments and repository text are
 * untrusted input to the agent, so every commit is checked against this
 * allowlist on the server, whatever the model decided to write.
 */
export const GITHUB_MENTION_WRITABLE_EXTENSIONS = {
  content: ["md", "mdx", "markdown", "txt"],
  /** Navigation and frontmatter data that sits next to content. */
  data: ["json", "yaml", "yml", "toml", "csv"],
} as const;

/** Data files that configure builds, deploys, or dependencies. */
export const GITHUB_MENTION_PROTECTED_DATA_FILE_PATTERN =
  /^(?:package(?:-lock)?|npm-shrinkwrap|composer|deno|bun|tsconfig(?:\..+)?|jsconfig|vercel|turbo|nx|lerna|netlify|wrangler|fly|render|railway|firebase|app|biome|renovate|action|serverless|cloudbuild|codecov|cargo|pyproject|mkdocs|pnpm-(?:workspace|lock)|(?:docker-)?compose(?:\..+)?|(?:azure|bitbucket)-pipelines|buildspec|skaffold|chart|values)\.(?:jsonc?|ya?ml|toml)$/i;

/** Markup that a site build renders, so new active content in it can execute. */
export const GITHUB_MENTION_MARKUP_EXTENSIONS = ["md", "mdx", "markdown"];

/** Tool result when a change adds active content; the agent relays it. */
export const GITHUB_MENTION_ACTIVE_CONTENT_BLOCKED_MESSAGE =
  "Nothing was committed. Mentions cannot add imports, exports, expressions, scripts, embeds, or event handlers to content; tell the commenter this needs a regular commit.";

/**
 * Whose earlier comments reach the agent as thread context. On a public
 * repository anyone can comment, and "yes, do that" must never resolve to a
 * stranger's suggestion.
 */
export const GITHUB_MENTION_TRUSTED_AUTHOR_ASSOCIATIONS = [
  "OWNER",
  "MEMBER",
  "COLLABORATOR",
];
