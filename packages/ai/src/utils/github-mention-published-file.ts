import { GITHUB_MENTION_FILE_CONTENT_MAX_BYTES } from "@notra/ai/constants/github-mention";
import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";
import { getRepositoryFileContents } from "@notra/ai/utils/github-pr-commit";

const MARKDOWN_IMAGE_PATTERN = /(!\[[^\]]*\]\()([^)\s]+)/g;
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

function imageTargets(markdown: string) {
  return [...markdown.matchAll(MARKDOWN_IMAGE_PATTERN)].map(
    (match) => match[2] ?? ""
  );
}

/**
 * Publishing can rewrite image URLs to files committed next to the content, so
 * the file on the pull request and the Notra post differ only in their image
 * targets. When text moves from one side to the other, this keeps the targets
 * of the side being written. Images are matched by position, and only when both
 * sides have the same number of them; otherwise the text is left untouched.
 */
export function carryOverImageTargets(next: string, reference: string) {
  const referenceTargets = imageTargets(reference);
  if (
    referenceTargets.length === 0 ||
    referenceTargets.length !== imageTargets(next).length
  ) {
    return next;
  }
  let index = 0;
  return next.replace(MARKDOWN_IMAGE_PATTERN, (match, prefix, target) => {
    const referenceTarget = referenceTargets[index] ?? target;
    index += 1;
    const onlyOneIsAbsolute =
      ABSOLUTE_URL_PATTERN.test(target) !==
      ABSOLUTE_URL_PATTERN.test(referenceTarget);
    return onlyOneIsAbsolute ? `${prefix}${referenceTarget}` : match;
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
    params.recordedHeadSha !== null &&
    params.pullRequestHeadSha !== null &&
    params.recordedHeadSha !== params.pullRequestHeadSha;
  if (!(headMoved && params.publishedFile !== null)) {
    return { markdown: params.postMarkdown, fromPullRequest: false };
  }
  const markdown = carryOverImageTargets(
    params.publishedFile,
    params.postMarkdown ?? ""
  );
  return { markdown, fromPullRequest: markdown !== params.postMarkdown };
}
