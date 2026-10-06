import { db } from "@notra/db/drizzle";
import { siteDeployments } from "@notra/db/schema";
import { SITE_DEPLOYMENT_IN_PROGRESS_STATUSES } from "@notra/sites-core/constants/sites";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";

import { readLiveDeployments } from "./activation";
import {
  DEPLOYMENT_SETTLE_MS,
  ROLLBACK_HISTORY,
} from "./constants/deployments";
import { getSite, transitionDeployment } from "./deployments";
import { r2DeletePrefix, r2ListPrefixes } from "./r2";
import type { SiteCleanupResult } from "./types/sites";

async function listUnsettledDeploymentIds(siteId: string) {
  const settledBefore = new Date(Date.now() - DEPLOYMENT_SETTLE_MS);
  return await db
    .select({ id: siteDeployments.id })
    .from(siteDeployments)
    .where(
      and(
        eq(siteDeployments.siteId, siteId),
        or(
          inArray(siteDeployments.status, [
            ...SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
          ]),
          and(
            eq(siteDeployments.status, "ready"),
            or(
              isNull(siteDeployments.finishedAt),
              gt(siteDeployments.finishedAt, settledBefore)
            )
          )
        )
      )
    );
}

async function listRollbackDeploymentIds(siteId: string) {
  return await db
    .select({ id: siteDeployments.id })
    .from(siteDeployments)
    .where(
      and(
        eq(siteDeployments.siteId, siteId),
        eq(siteDeployments.kind, "production"),
        eq(siteDeployments.status, "ready")
      )
    )
    .orderBy(desc(siteDeployments.generation))
    .limit(ROLLBACK_HISTORY);
}

export async function cleanupSiteDeployments(
  siteId: string
): Promise<SiteCleanupResult> {
  const site = await getSite(siteId);
  if (!site) {
    return { deleted: [] };
  }
  const [unsettled, history] = await Promise.all([
    listUnsettledDeploymentIds(site.id),
    listRollbackDeploymentIds(site.id),
  ]);
  const { ids: protectedIds } = await readLiveDeployments(site.id);
  for (const row of [...unsettled, ...history]) {
    protectedIds.add(row.id);
  }
  const root = `deployments/${site.id}/`;
  const deleted: string[] = [];
  for (const prefix of await r2ListPrefixes(root)) {
    const deploymentId = prefix.slice(root.length).replace(/\/$/, "");
    if (protectedIds.has(deploymentId)) {
      continue;
    }
    await r2DeletePrefix(prefix);
    await transitionDeployment(deploymentId, "expired");
    deleted.push(deploymentId);
  }
  return { deleted };
}
