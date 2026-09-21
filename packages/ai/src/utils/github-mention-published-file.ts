import { GITHUB_MENTION_FILE_CONTENT_MAX_BYTES } from "@notra/ai/constants/github-mention";
import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";
import { getRepositoryFileContents } from "@notra/ai/utils/github-pr-commit";

const MARKDOWN_IMAGE_PATTERN = /(!\[[^\]]*\]\()(<[^>\n]*>|[^)\s]+)/g;
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

function unwrappedTarget(target: string) {
  return target.startsWith("<") && target.endsWith(">")
    ? target.slice(1, -1)
    : target;
}

function imageTargets(markdown: string) {
  return [...markdown.matchAll(MARKDOWN_IMAGE_PATTERN)].map(
    (match) => match[2] ?? ""
  );
}

/** Translate image identities using two versions known to be synchronized. */
export function carryOverImageTargets(
  next: string,
  originalSource: string,
  repositoryMarkdown: string
) {
  const sourceTargets = imageTargets(originalSource);
  const repositoryTargets = imageTargets(repositoryMarkdown);
  if (
    sourceTargets.length === 0 ||
    sourceTargets.length !== repositoryTargets.length
  ) {
    return next;
  }
  const targets = new Map<string, string | null>();
  for (const [index, sourceTarget] of sourceTargets.entries()) {
    const repositoryTarget = repositoryTargets[index];
    if (
      !repositoryTarget ||
      ABSOLUTE_URL_PATTERN.test(unwrappedTarget(sourceTarget)) ===
        ABSOLUTE_URL_PATTERN.test(unwrappedTarget(repositoryTarget))
    ) {
      continue;
    }
    const existing = targets.get(sourceTarget);
    targets.set(
      sourceTarget,
      existing === undefined || existing === repositoryTarget
        ? repositoryTarget
        : null
    );
  }
  return next.replace(MARKDOWN_IMAGE_PATTERN, (match, prefix, target) => {
    const repositoryTarget = targets.get(target);
    return repositoryTarget ? `${prefix}${repositoryTarget}` : match;
  });
}

/**
 * The published file as it is on the pull request head. Best effort: null when
 * there is no publication, the file is missing, or it is too large.
 */
export async function readPublishedFile(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
}) {
  const { publication, pullRequest, owner, repo } = params.context;
  if (!(publication && pullRequest)) {
    return null;
  }
  const contents = await getRepositoryFileContents({
    octokit: params.octokit,
    owner,
    repo,
    path: publication.path,
    ref: pullRequest.headSha,
  }).catch(() => null);
  if (
    contents === null ||
    Buffer.byteLength(contents, "utf8") > GITHUB_MENTION_FILE_CONTENT_MAX_BYTES
  ) {
    return null;
  }
  return contents;
}

/**
 * What the agent should edit. Normally that is the Notra post. When the pull
 * request head moved past the commit Notra recorded (someone pushed by hand, or
 * a post write was lost after a commit), the file on the pull request is newer
 * and wins, so the next commit does not revert those changes.
 */
export function resolveEditableMarkdown(params: {
  postMarkdown: string | null;
  publishedFile: string | null;
  recordedHeadSha: string | null;
  pullRequestHeadSha: string | null;
}) {
  const headMoved =
    params.pullRequestHeadSha !== null &&
    params.recordedHeadSha !== params.pullRequestHeadSha;
  if (!headMoved) {
    return { markdown: params.postMarkdown, fromPullRequest: false };
  }
  if (params.publishedFile === null) {
    throw new Error(
      "The pull request changed, but its published file could not be read. Retry once the current file is available; the stale Notra post cannot safely replace it."
    );
  }
  // The changed file is not an original source-to-repository mapping. Keep its
  // repository targets rather than guessing by image position and corrupting
  // replacements or reorders.
  const markdown = params.publishedFile;
  return { markdown, fromPullRequest: markdown !== params.postMarkdown };
}
