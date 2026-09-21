import { getTokenForIntegrationId } from "@notra/ai/integrations/github";
import type { RecordContentPublicationParams } from "@notra/ai/types/content-publication";
import {
  closeContentPublicationForPullRequest,
  reconcileContentPublication,
} from "@notra/ai/utils/content-publication";
import { createOctokit } from "@notra/ai/utils/octokit";

export async function reconcileContentPublicationStep(
  publication: RecordContentPublicationParams,
  publishedAt: string
) {
  "use step";
  const token = await getTokenForIntegrationId(publication.repositoryId, {
    organizationId: publication.organizationId,
  });
  const octokit = createOctokit(token ?? undefined);
  await reconcileContentPublication({ publication, publishedAt });
  const { data: pullRequest } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner: publication.owner,
      repo: publication.repo,
      pull_number: publication.pullRequestNumber,
    }
  );
  if (pullRequest.state !== "open") {
    await closeContentPublicationForPullRequest({
      owner: publication.owner,
      repo: publication.repo,
      pullRequestNumber: publication.pullRequestNumber,
      merged: Boolean(pullRequest.merged_at),
    });
  }
}

reconcileContentPublicationStep.maxRetries = 11;
