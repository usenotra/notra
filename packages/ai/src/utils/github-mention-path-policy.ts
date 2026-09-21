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
const CONTENT_DATA_ROOTS = new Set([
  "blog",
  "content",
  "data",
  "docs",
  "documentation",
  "pages",
  "posts",
]);
const EXECUTABLE_TEXT_FILE_PATTERN =
  /^(?:cmakelists|constraints|pipfile|requirements)(?:[._-].*)?\.txt$/i;
const CONFIG_PATH_SEGMENT_PATTERN = /^(?:config|configuration|settings)$/i;
const CONFIG_DATA_FILE_PATTERN =
  /(?:^|\.)(?:config|configuration|settings)\.(?:jsonc?|ya?ml|toml)$/i;

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
    if (extension === "txt" && EXECUTABLE_TEXT_FILE_PATTERN.test(fileName)) {
      return "executable and dependency text files are not editable";
    }
    return null;
  }
  if (!DATA_EXTENSIONS.has(extension)) {
    return "only content files (Markdown, text, JSON, YAML, TOML, CSV) are editable";
  }
  if (GITHUB_MENTION_PROTECTED_DATA_FILE_PATTERN.test(fileName)) {
    return "build and tool configuration is not editable";
  }
  if (
    CONFIG_DATA_FILE_PATTERN.test(fileName) ||
    segments
      .slice(1, -1)
      .some((segment) => CONFIG_PATH_SEGMENT_PATTERN.test(segment))
  ) {
    return "configuration paths are not editable";
  }
  if (!CONTENT_DATA_ROOTS.has(segments[0]?.toLowerCase() ?? "")) {
    return "structured data is editable only in an explicit content data directory";
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
