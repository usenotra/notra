import { branchPreviewKey } from "@notra/sites-core/utils/hosts";

import { deployBranchHead } from "./deploy";
import { enqueuePreviewRemoval } from "./deployments";
import { SiteInputError } from "./errors";
import type { BranchPreviewResult, Site } from "./types/sites";

export async function createBranchPreview(
  site: Site,
  branch: string,
  userId: string
): Promise<BranchPreviewResult> {
  if (!site.previewsEnabled) {
    throw new SiteInputError("Previews are turned off for this site");
  }
  if (branch === site.productionBranch) {
    throw new SiteInputError("The production branch is already deployed live");
  }
  const previewKey = branchPreviewKey(branch, site.slug);
  const jobId = await deployBranchHead(site, {
    trigger: "manual",
    userId,
    branch,
    previewKey,
  });
  return { jobId, previewKey };
}

export async function deletePreview(
  site: Site,
  previewKey: string
): Promise<string> {
  return await enqueuePreviewRemoval(site.id, previewKey);
}
