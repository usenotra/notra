import {
  GITHUB_MENTION_DEFAULT_APP_SLUG,
  GITHUB_MENTION_SEPARATE_PR_PATTERNS,
} from "@notra/ai/constants/github-mention";

const MENTION_HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

function normalizeHandle(value: string) {
  return value
    .trim()
    .replace(/\[bot\]$/i, "")
    .toLowerCase();
}

export function getGitHubMentionAppHandles() {
  const slug = (
    process.env.GITHUB_APP_SLUG ??
    process.env.GITHUB_APP_NAME ??
    GITHUB_MENTION_DEFAULT_APP_SLUG
  ).trim();
  const handles = new Set<string>([
    GITHUB_MENTION_DEFAULT_APP_SLUG,
    normalizeHandle(slug),
  ]);
  return [...handles].filter((handle) => MENTION_HANDLE_PATTERN.test(handle));
}

export function commentMentionsNotra(
  body: string,
  handles: readonly string[] = getGitHubMentionAppHandles()
) {
  const mentioned = new Set(
    [...body.matchAll(/@([a-z0-9][a-z0-9-]*)(?:\[bot\])?/gi)].map((match) =>
      normalizeHandle(match[1] ?? "")
    )
  );
  return handles.some((handle) => mentioned.has(handle));
}

export function isGitHubBotSender(sender: { login: string; type?: string }) {
  return (
    sender.type === "Bot" ||
    sender.login.toLowerCase().endsWith("[bot]") ||
    getGitHubMentionAppHandles().includes(normalizeHandle(sender.login))
  );
}

export function wantsSeparatePullRequest(body: string) {
  return GITHUB_MENTION_SEPARATE_PR_PATTERNS.some((pattern) =>
    pattern.test(body)
  );
}
