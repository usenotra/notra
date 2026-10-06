import { db } from "@notra/db/drizzle";
import { siteDeployments } from "@notra/db/schema";
import { SITE_DEPLOYMENT_IN_PROGRESS_STATUSES } from "@notra/sites-core/constants/sites";
import { branchPreviewKey } from "@notra/sites-core/utils/hosts";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { readLiveDeployments } from "./activation";
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

export async function closeAllPreviews(site: Site): Promise<string[]> {
  const [live, building] = await Promise.all([
    readLiveDeployments(site.id),
    db
      .selectDistinct({ previewKey: siteDeployments.previewKey })
      .from(siteDeployments)
      .where(
        and(
          eq(siteDeployments.siteId, site.id),
          isNotNull(siteDeployments.previewKey),
          inArray(siteDeployments.status, [
            ...SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
          ])
        )
      ),
  ]);
  const keys = new Set(Object.keys(live.previews));
  for (const row of building) {
    if (row.previewKey) {
      keys.add(row.previewKey);
    }
  }
  return await Promise.all(
    [...keys].map((previewKey) => enqueuePreviewRemoval(site.id, previewKey))
  );
}
