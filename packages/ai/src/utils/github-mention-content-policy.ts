import { GITHUB_MENTION_MARKUP_EXTENSIONS } from "@notra/ai/constants/github-mention";
import {
  GITHUB_MENTION_CONTENT_POLICY_REASONS,
  GITHUB_MENTION_FINDING_SNIPPET_LENGTH,
} from "@notra/ai/constants/github-mention-content-policy";
import type { GitHubMentionContentFinding } from "@notra/ai/types/github-mention";
import { parseGitHubMentionContent } from "@notra/ai/utils/parse-github-mention-content";

const MARKUP_EXTENSIONS = new Set<string>(GITHUB_MENTION_MARKUP_EXTENSIONS);

function extensionOf(path: string) {
  return path.split(".").at(-1)?.toLowerCase() ?? "";
}

/** Rejects newly introduced executable AST constructs while preserving exact
 * constructs already present in the old file. Parser failures are blocked.
 */
export function findNewActiveContent(params: {
  path: string;
  previous: string | null;
  next: string;
}): GitHubMentionContentFinding[] {
  const extension = extensionOf(params.path);
  if (!MARKUP_EXTENSIONS.has(extension)) {
    return [];
  }

  const isMdx = extension === "mdx";
  const previous = parseGitHubMentionContent(params.previous ?? "", isMdx);
  const next = parseGitHubMentionContent(params.next, isMdx);
  if (previous.error || next.error) {
    return [
      {
        path: params.path,
        reason: GITHUB_MENTION_CONTENT_POLICY_REASONS.malformed,
        line: (next.error ?? previous.error ?? "parse error").slice(
          0,
          GITHUB_MENTION_FINDING_SNIPPET_LENGTH
        ),
      },
    ];
  }

  const known = new Map<string, number>();
  for (const { reason, source } of previous.constructs) {
    const key = `${reason}\0${source}`;
    known.set(key, (known.get(key) ?? 0) + 1);
  }
  const findings: GitHubMentionContentFinding[] = [];
  for (const construct of next.constructs) {
    const key = `${construct.reason}\0${construct.source}`;
    const remaining = known.get(key) ?? 0;
    if (remaining > 0) {
      known.set(key, remaining - 1);
      continue;
    }
    findings.push({
      path: params.path,
      reason: construct.reason,
      line: construct.source.slice(0, GITHUB_MENTION_FINDING_SNIPPET_LENGTH),
    });
  }
  return findings;
}
