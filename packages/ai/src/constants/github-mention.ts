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

export const GITHUB_MENTION_SEPARATE_PR_PATTERNS = [
  /\bopen (?:a |an )?(?:new |separate |own |different )(?:draft )?pr\b/i,
  /\b(?:new|separate|own|different) pull request\b/i,
  /\b(?:new|separate|own|different) pr\b/i,
  /\bdon'?t (?:commit|push|change) (?:on |to |in )?(?:this |the )pr\b/i,
  /\bnot (?:on|in) this pr\b/i,
  /\bseparate branch\b/i,
] as const;
