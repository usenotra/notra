import { db } from "@notra/db/drizzle";
import { siteDeployments, siteJobs, sites } from "@notra/db/schema";
import {
  SITE_BUILD_LIMITS,
  SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
  SITE_DEPLOYMENT_TRANSITIONS,
} from "@notra/sites-core/constants/sites";
import { hashBuildTarget } from "@notra/sites-core/utils/build-target";
import { and, desc, eq, gt, inArray, notInArray, or, sql } from "drizzle-orm";

import { SiteNotBuildableError } from "./errors";
import type {
  DeploymentExecutor,
  DeploymentTransitionValues,
  EnqueueDeploymentInput,
  EnqueuedDeployment,
  SiteDeployment,
  SiteDeploymentStatus,
} from "./types/deployments";
import type { Site } from "./types/sites";
import { buildTargetForDeployment } from "./urls";
import { prefixedId } from "./utils/ids";

export async function allocateGeneration(
  executor: DeploymentExecutor,
  siteId: string
): Promise<Site> {
  const [site] = await executor
    .update(sites)
    .set({ lastGeneration: sql`${sites.lastGeneration} + 1` })
    .where(eq(sites.id, siteId))
    .returning();
  if (!site) {
    throw new SiteNotBuildableError("Site not found");
  }
  return site;
}

export async function transitionDeployment(
  id: string,
  to: SiteDeploymentStatus,
  values: DeploymentTransitionValues = {}
): Promise<boolean> {
  const updated = await db
    .update(siteDeployments)
    .set({ ...values, status: to })
    .where(
      and(
        eq(siteDeployments.id, id),
        inArray(siteDeployments.status, [...SITE_DEPLOYMENT_TRANSITIONS[to]])
      )
    )
    .returning({ id: siteDeployments.id });
  return updated.length > 0;
}

export async function cancelPreviewBuilds(
  siteId: string,
  previewKey: string
): Promise<void> {
  await db
    .update(siteDeployments)
    .set({ status: "canceled", finishedAt: new Date() })
    .where(
      and(
        eq(siteDeployments.siteId, siteId),
        eq(siteDeployments.previewKey, previewKey),
        inArray(siteDeployments.status, [
          ...SITE_DEPLOYMENT_TRANSITIONS.canceled,
        ])
      )
    );
}

export async function enqueueSiteDeployment(
  input: EnqueueDeploymentInput
): Promise<EnqueuedDeployment> {
  return await db.transaction(async (tx) => {
    const site = await allocateGeneration(tx, input.siteId);
    if (site.status !== "active") {
      throw new SiteNotBuildableError("This site is suspended");
    }
    const [usage] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(siteDeployments)
      .where(
        and(
          eq(siteDeployments.organizationId, site.organizationId),
          gt(siteDeployments.createdAt, sql`now() - interval '24 hours'`)
        )
      );
    if (
      (usage?.count ?? 0) >=
      SITE_BUILD_LIMITS.maxDeploymentsPerOrganizationPerDay
    ) {
      throw new SiteNotBuildableError(
        `This workspace reached ${SITE_BUILD_LIMITS.maxDeploymentsPerOrganizationPerDay} deployments in 24 hours. Try again later.`
      );
    }
    const target = buildTargetForDeployment({
      site,
      kind: input.kind,
      previewKey: input.previewKey,
    });
    const [deployment] = await tx
      .insert(siteDeployments)
      .values({
        id: prefixedId("dep"),
        siteId: site.id,
        organizationId: site.organizationId,
        kind: input.kind,
        previewKey: input.previewKey,
        trigger: input.trigger,
        status: "queued",
        generation: site.lastGeneration,
        branch: input.branch,
        commitSha: input.commitSha,
        commitMessage: input.commitMessage ?? null,
        commitAuthor: input.commitAuthor ?? null,
        pullRequestNumber: input.pullRequestNumber ?? null,
        target,
        configHash: await hashBuildTarget(target),
        requestedByUserId: input.requestedByUserId ?? null,
      })
      .returning();
    if (!deployment) {
      throw new Error("Could not create deployment");
    }
    const jobId = prefixedId("job");
    await tx.insert(siteJobs).values({
      id: jobId,
      siteId: site.id,
      deploymentId: deployment.id,
      kind: "build",
      dedupeKey: `build:${deployment.id}`,
    });
    return { deployment, jobId };
  });
}

export async function enqueuePreviewRemoval(
  siteId: string,
  previewKey: string
): Promise<string> {
  const jobId = prefixedId("job");
  await db.insert(siteJobs).values({
    id: jobId,
    siteId,
    kind: "remove_preview",
    payload: { previewKey },
  });
  return jobId;
}

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

export async function hasNewerDeployment(
  deployment: SiteDeployment,
  branchHead: string | null
): Promise<boolean> {
  const slot =
    deployment.kind === "production"
      ? eq(siteDeployments.kind, "production")
      : and(
          eq(siteDeployments.kind, "preview"),
          eq(siteDeployments.previewKey, deployment.previewKey ?? "")
        );
  const [newer] = await db
    .select({ id: siteDeployments.id })
    .from(siteDeployments)
    .where(
      and(
        eq(siteDeployments.siteId, deployment.siteId),
        slot,
        sql`${siteDeployments.generation} > ${deployment.generation}`,
        inArray(siteDeployments.status, [
          ...SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
          "ready",
        ]),
        branchHead
          ? or(
              notInArray(siteDeployments.trigger, ["push", "pull_request"]),
              eq(siteDeployments.commitSha, branchHead)
            )
          : undefined
      )
    )
    .limit(1);
  return Boolean(newer);
}

export async function getDeployment(
  id: string
): Promise<SiteDeployment | null> {
  const [deployment] = await db
    .select()
    .from(siteDeployments)
    .where(eq(siteDeployments.id, id))
    .limit(1);
  return deployment ?? null;
}

export async function getSite(id: string): Promise<Site | null> {
  const [site] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  return site ?? null;
}

export async function listSiteDeployments(
  siteId: string,
  limit = 50
): Promise<SiteDeployment[]> {
  return await db
    .select()
    .from(siteDeployments)
    .where(eq(siteDeployments.siteId, siteId))
    .orderBy(desc(siteDeployments.createdAt))
    .limit(limit);
}
