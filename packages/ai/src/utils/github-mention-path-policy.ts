import {
  GITHUB_MENTION_PROTECTED_DATA_FILE_PATTERN,
  GITHUB_MENTION_WRITABLE_EXTENSIONS,
} from "@notra/ai/constants/github-mention";

const CONTENT_EXTENSIONS = new Set<string>(
  GITHUB_MENTION_WRITABLE_EXTENSIONS.content
);
const DATA_EXTENSIONS = new Set<string>(
  GITHUB_MENTION_WRITABLE_EXTENSIONS.data
);

/**
 * Why a mention may not write or delete this path, or null when it may.
 * Allowlist first: only content and content data files pass, so application
 * code, scripts, CI, and tool configuration are out of reach by default.
 */
export function getGitHubMentionPathBlockReason(path: string) {
  const segments = path.split("/");
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    segments.some((segment) => !segment || segment === "..")
  ) {
    return "not a repository-relative path";
  }
  if (segments.some((segment) => segment.startsWith("."))) {
    return "dot files and dot directories are not editable";
  }
  const fileName = segments.at(-1) ?? "";
  const extension = fileName.includes(".")
    ? (fileName.split(".").at(-1) ?? "").toLowerCase()
    : "";
  if (CONTENT_EXTENSIONS.has(extension)) {
    return null;
  }
  if (!DATA_EXTENSIONS.has(extension)) {
    return "only content files (Markdown, text, JSON, YAML, TOML, CSV) are editable";
  }
  if (GITHUB_MENTION_PROTECTED_DATA_FILE_PATTERN.test(fileName)) {
    return "build and tool configuration is not editable";
  }
  return null;
}

export function partitionGitHubMentionPaths(paths: readonly string[]) {
  const allowed: string[] = [];
  const blocked: Array<{ path: string; reason: string }> = [];
  for (const path of paths) {
    const reason = getGitHubMentionPathBlockReason(path);
    if (reason) {
      blocked.push({ path, reason });
    } else {
      allowed.push(path);
    }
  }
  return { allowed, blocked };
}
