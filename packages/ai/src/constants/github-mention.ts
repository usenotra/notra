export const GITHUB_MENTION_APP_WEBHOOK_SECRET_ENV =
  "GITHUB_APP_WEBHOOK_SECRET";

export const GITHUB_MENTION_DEFAULT_APP_SLUG = "notra";

export const GITHUB_MENTION_COMMENT_MAX_LENGTH = 65_536;

export const GITHUB_MENTION_AGENT_MAX_STEPS = 20;

export const GITHUB_MENTION_SANDBOX_TIMEOUT_MS = 180_000;

export const GITHUB_MENTION_FILE_CONTENT_MAX_BYTES = 512_000;

export const GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION = `
  mutation CreateCommitOnBranch($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) {
      commit {
        oid
      }
    }
  }
`;

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
} as const;

export const GITHUB_MENTION_SEPARATE_PR_PATTERNS = [
  /\bopen (?:a |an )?(?:new |separate |own |different )(?:draft )?pr\b/i,
  /\b(?:new|separate|own|different) pull request\b/i,
  /\b(?:new|separate|own|different) pr\b/i,
  /\bdon'?t (?:commit|push|change) (?:on |to |in )?(?:this |the )pr\b/i,
  /\bnot (?:on|in) this pr\b/i,
  /\bseparate branch\b/i,
] as const;

export const GITHUB_MENTION_REPLY_DIFF = {
  /** Longer diffs collapse into a <details> block. */
  inlineLineLimit: 24,
  totalLineLimit: 120,
  lineLengthLimit: 240,
  fileLimit: 5,
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
  content: ["md", "mdx", "markdown", "txt", "rst", "adoc"],
  /** Navigation and frontmatter data that sits next to content. */
  data: ["json", "yaml", "yml", "toml", "csv"],
} as const;

/** Data files that configure builds, deploys, or dependencies. */
export const GITHUB_MENTION_PROTECTED_DATA_FILE_PATTERN =
  /^(?:package(?:-lock)?|composer|deno|bun|tsconfig(?:\..+)?|jsconfig|vercel|turbo|nx|lerna|netlify|wrangler|fly|render|railway|firebase|app|biome|renovate|action|serverless|cloudbuild|codecov|cargo|pyproject|pnpm-(?:workspace|lock)|(?:docker-)?compose(?:\..+)?|(?:azure|bitbucket)-pipelines|buildspec|skaffold|chart|values)\.(?:jsonc?|ya?ml|toml)$/i;

/** Markup that a site build renders, so new active content in it can execute. */
export const GITHUB_MENTION_MARKUP_EXTENSIONS = ["md", "mdx", "markdown"];

/**
 * Content a mention may keep but never add: it runs at build time (MDX module
 * code) or in the reader's browser. `mdxOnly` rules would flag prose elsewhere.
 */
export const GITHUB_MENTION_ACTIVE_CONTENT_RULES = [
  {
    reason: "adds an MDX import or export",
    pattern: /^\s*(?:import|export)\s/,
    mdxOnly: true,
  },
  {
    reason: "adds a script tag",
    pattern: /<script(?:[\s>/]|$)/i,
    mdxOnly: false,
  },
  {
    reason: "adds an embedded frame or object",
    pattern: /<(?:iframe|object|embed)(?:[\s>/]|$)/i,
    mdxOnly: false,
  },
  {
    reason: "adds a javascript: URL",
    pattern: /javascript\s*:/i,
    mdxOnly: false,
  },
  {
    reason: "adds an inline event handler",
    pattern: /(?:^|\s)on[a-z]+\s*=\s*["'{]/i,
    mdxOnly: false,
  },
] as const;

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
