import { hashBuildTarget } from "@notra/sites-core/utils/build-target";

import { restoreProductionDeployment } from "./activation";
import { enqueueSiteDeployment, getDeployment } from "./deployments";
import { SiteInputError } from "./errors";
import { getBranchHead, siteRepositoryAccess } from "./github";
import type { DeployBranchHeadOptions, Site } from "./types/sites";
import { redeploymentInput } from "./utils/deployments";
import { buildTargetForDeployment } from "./utils/urls";

export async function deployBranchHead(
  site: Site,
  options: DeployBranchHeadOptions
): Promise<string> {
  const { repository, token } = await siteRepositoryAccess(site, {
    contents: "read",
  });
  const branch = options.branch ?? site.productionBranch;
  const head = await getBranchHead(repository, token, branch);
  const previewKey = options.previewKey ?? null;
  const { jobId } = await enqueueSiteDeployment({
    siteId: site.id,
    kind: previewKey ? "preview" : "production",
    previewKey,
    trigger: options.trigger,
    branch,
    commitSha: head.sha,
    commitMessage: head.message,
    commitAuthor: head.author,
    requestedByUserId: options.userId ?? null,
  });
  return jobId;
}

export async function redeploy(
  site: Site,
  deploymentId: string,
  userId: string
): Promise<string> {
  const previous = await getDeployment(deploymentId);
  if (previous?.siteId !== site.id) {
    throw new SiteInputError("Deployment not found");
  }
  const { jobId } = await enqueueSiteDeployment(
    redeploymentInput(previous, userId)
  );
  return jobId;
}

export async function rollbackToDeployment(
  site: Site,
  deploymentId: string
): Promise<void> {
  const target = await getDeployment(deploymentId);
  if (
    !(
      target &&
      target.siteId === site.id &&
      target.kind === "production" &&
      target.status === "ready"
    )
  ) {
    throw new SiteInputError(
      "Only finished production deployments can be restored"
    );
  }
  const currentTarget = buildTargetForDeployment({
    site,
    kind: "production",
    previewKey: null,
  });
  if ((await hashBuildTarget(currentTarget)) !== target.configHash) {
    throw new SiteInputError(
      "This deployment was built for a different domain, path or branding setting. Redeploy its commit instead."
    );
  }
  if ((await restoreProductionDeployment(site, target)) !== "live") {
    throw new SiteInputError(
      "This deployment's files were already cleaned up. Redeploy its commit instead."
    );
  }
}
