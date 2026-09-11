import type { GitHubMentionOctokit } from "@notra/ai/types/github-mention";
import { updateContentPublicationHead } from "@notra/ai/utils/content-publication";
import { commitFilesToPullRequest } from "@notra/ai/utils/github-pr-commit";
import { updatePostRecord } from "@notra/ai/utils/post-service";

export async function updatePublishedContentAndCommit(params: {
  octokit: GitHubMentionOctokit;
  organizationId: string;
  postId: string;
  markdown: string;
  title?: string;
  owner: string;
  repo: string;
  branch: string;
  expectedHeadOid: string;
  path: string;
  publicationId: string;
  commitMessage: string;
}) {
  await updatePostRecord({
    organizationId: params.organizationId,
    postId: params.postId,
    markdown: params.markdown,
    title: params.title,
  });
  const commitSha = await commitFilesToPullRequest({
    octokit: params.octokit,
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    expectedHeadOid: params.expectedHeadOid,
    headline: params.commitMessage,
    files: [{ path: params.path, contents: params.markdown }],
  });
  await updateContentPublicationHead({
    publicationId: params.publicationId,
    organizationId: params.organizationId,
    headSha: commitSha,
    branch: params.branch,
  });
  return { commitSha, postId: params.postId, path: params.path };
}
