import type {
  SiteDeployment,
  EnqueueDeploymentInput,
} from "../types/deployments";

export function redeploymentInput(
  previous: SiteDeployment,
  requestedByUserId: string | null
): EnqueueDeploymentInput {
  return {
    siteId: previous.siteId,
    kind: previous.kind,
    previewKey: previous.previewKey,
    trigger: "redeploy",
    branch: previous.branch,
    commitSha: previous.commitSha,
    commitMessage: previous.commitMessage,
    commitAuthor: previous.commitAuthor,
    pullRequestNumber: previous.pullRequestNumber,
    requestedByUserId,
  };
}
