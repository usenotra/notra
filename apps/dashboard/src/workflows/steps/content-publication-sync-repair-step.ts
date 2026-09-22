import { getTokenForIntegrationId } from "@notra/ai/integrations/github";
import type { PublicationSyncRepair } from "@notra/ai/types/content-publication";
import {
  findOpenContentPublicationForPost,
  syncContentPublication,
} from "@notra/ai/utils/content-publication";
import { createOctokit } from "@notra/ai/utils/octokit";
import { preparePublicationSyncRepair } from "@notra/ai/utils/update-published-content";

export async function contentPublicationSyncRepairStep(
  repair: PublicationSyncRepair
) {
  "use step";
  const publication = await findOpenContentPublicationForPost({
    organizationId: repair.organizationId,
    postId: repair.postId,
  });
  if (!publication || publication.id !== repair.publicationId) {
    return "superseded";
  }
  const token = await getTokenForIntegrationId(publication.repositoryId, {
    organizationId: repair.organizationId,
  });
  const octokit = createOctokit(token ?? undefined);
  const prepared = await preparePublicationSyncRepair(repair, octokit);
  const result = await syncContentPublication(prepared, async (base, head) => {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/compare/{basehead}",
      {
        owner: publication.owner,
        repo: publication.repo,
        basehead: `${base}...${head}`,
      }
    );
    return data.status === "ahead" || data.status === "identical";
  });
  if (result.status === "retry") {
    throw new Error("Publication predecessor has not synchronized yet");
  }
  return result.status;
}

contentPublicationSyncRepairStep.maxRetries = 11;
