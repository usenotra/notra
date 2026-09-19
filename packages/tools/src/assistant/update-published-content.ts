import { getGitHubPublishToken } from "@notra/ai/integrations/github-publish-auth";
import { findOpenContentPublicationForPost } from "@notra/ai/utils/content-publication";
import { getPullRequestHead } from "@notra/ai/utils/github-pr-commit";
import { createOctokit } from "@notra/ai/utils/octokit";
import { updatePublishedContentAndCommit } from "@notra/ai/utils/update-published-content";
import { defineTool } from "eve/tools";

import { updatePublishedContentInputSchema } from "../schemas/assistant-tools";
import { withGitHubRateLimitHandling } from "../utils/github";
import { requireOrganizationId } from "../utils/organization";

export function createUpdatePublishedContentTool() {
  return defineTool({
    description:
      "Updates a published Notra post and commits the file onto its existing GitHub content pull request. Use this when the user wants the live GitHub draft changed. Does not open a new pull request.",
    inputSchema: updatePublishedContentInputSchema,
    async execute(input, ctx) {
      const organizationId = requireOrganizationId(ctx);
      const publication = await findOpenContentPublicationForPost({
        organizationId,
        postId: input.postId,
      });
      if (!publication) {
        return {
          updated: false,
          error: "No open GitHub publication is linked to this post.",
        };
      }

      const token = await getGitHubPublishToken(publication.repositoryId, {
        organizationId,
      });
      if (!token) {
        return {
          updated: false,
          error: "GitHub credentials are not available for this repository.",
        };
      }

      const octokit = createOctokit(token);
      const head = await withGitHubRateLimitHandling(() =>
        getPullRequestHead({
          octokit,
          owner: publication.owner,
          repo: publication.repo,
          pullNumber: publication.pullRequestNumber,
        })
      );
      const result = await withGitHubRateLimitHandling(() =>
        updatePublishedContentAndCommit({
          octokit,
          organizationId,
          postId: input.postId,
          markdown: input.markdown,
          title: input.title,
          owner: publication.owner,
          repo: publication.repo,
          branch: head.headRef,
          expectedHeadOid: head.headSha,
          path: publication.path,
          publicationId: publication.id,
          commitMessage:
            input.commitMessage ??
            `docs: update ${publication.title ?? publication.path}`,
        })
      );

      return {
        updated: true,
        postId: result.postId,
        path: result.path,
        commitSha: result.commitSha,
        pullRequestUrl: publication.pullRequestUrl,
        pullRequestNumber: publication.pullRequestNumber,
      };
    },
  });
}
