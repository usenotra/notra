import { db } from "@notra/db/drizzle";
import { siteDeployments, siteJobs, sites, users } from "@notra/db/schema";
import {
  SITE_BUILD_LIMITS,
  SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
  SITE_DEPLOYMENT_TRANSITIONS,
} from "@notra/sites-core/constants/sites";
import { hashBuildTarget } from "@notra/sites-core/utils/build-target";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";

import { SiteNotBuildableError } from "./errors";
import type {
  DeploymentExecutor,
  DeploymentTransitionValues,
  EnqueueDeploymentInput,
  EnqueuedDeployment,
  SiteDeployment,
  SiteDeploymentStatus,
  SiteStorageTransaction,
} from "./types/deployments";
import type { SettingsJobAttempt } from "./types/jobs";
import type { Site } from "./types/sites";
import { prefixedId } from "./utils/ids";
import { lockSiteOrganization } from "./utils/site-organization-lock";
import { buildTargetForDeployment } from "./utils/urls";

export async function allocateGeneration(
  executor: DeploymentExecutor,
  siteId: string,
  organizationId?: string
): Promise<Site> {
  const [site] = await executor
    .update(sites)
    .set({ lastGeneration: sql`${sites.lastGeneration} + 1` })
    .where(
      and(
        eq(sites.id, siteId),
        organizationId === undefined
          ? undefined
          : eq(sites.organizationId, organizationId)
      )
    )
    .returning();
  if (!site) {
    throw new SiteNotBuildableError("Site not found");
  }
  return site;
}

export async function transitionDeployment(
  id: string,
  to: SiteDeploymentStatus,
  values: DeploymentTransitionValues = {},
  executor: DeploymentExecutor = db
): Promise<boolean> {
  const updated = await executor
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
  previewKey: string,
  generation: number,
  executor: DeploymentExecutor = db
): Promise<void> {
  await executor
    .update(siteDeployments)
    .set({ status: "canceled", finishedAt: new Date() })
    .where(
      and(
        eq(siteDeployments.siteId, siteId),
        eq(siteDeployments.previewKey, previewKey),
        lte(siteDeployments.generation, generation),
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
    const organizationId = await lockSiteOrganization(tx, input.siteId);
    if (!organizationId) {
      throw new SiteNotBuildableError("Site workspace not found");
    }
    return await insertDeployment(tx, input, organizationId);
  });
}

async function insertDeployment(
  tx: SiteStorageTransaction,
  input: EnqueueDeploymentInput,
  organizationId: string,
  dedupeKey?: string
): Promise<EnqueuedDeployment> {
  const site = await allocateGeneration(tx, input.siteId, organizationId);
  if (site.status !== "active") {
    throw new SiteNotBuildableError("This site is suspended");
  }
  if (input.kind === "preview" && !site.previewsEnabled) {
    throw new SiteNotBuildableError("Previews are turned off for this site");
  }
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`sites-deployment-budget:${site.organizationId}`}, 0))`
  );
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
    (usage?.count ?? 0) >= SITE_BUILD_LIMITS.maxDeploymentsPerOrganizationPerDay
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
    dedupeKey: dedupeKey ?? `build:${deployment.id}`,
  });
  return { deployment, jobId };
}

export async function enqueueSettingsDeployment(
  input: EnqueueDeploymentInput,
  attempt: SettingsJobAttempt
): Promise<string | null> {
  return await db.transaction(async (tx) => {
    const organizationId = await lockSiteOrganization(tx, input.siteId);
    if (!organizationId) {
      return null;
    }
    const [job] = await tx
      .select()
      .from(siteJobs)
      .where(
        and(
          eq(siteJobs.id, attempt.id),
          eq(siteJobs.siteId, input.siteId),
          eq(siteJobs.kind, "sync_state"),
          eq(siteJobs.status, "running"),
          eq(siteJobs.attempts, attempt.attempts),
          gt(siteJobs.leaseUntil, sql`now()`)
        )
      )
      .for("update");
    if (!job) {
      return null;
    }
    const dedupeKey = `settings-build:${job.id}`;
    const [existing] = await tx
      .select({ id: siteJobs.id })
      .from(siteJobs)
      .where(eq(siteJobs.dedupeKey, dedupeKey));
    if (existing) {
      return existing.id;
    }
    const [site] = await tx
      .select()
      .from(sites)
      .where(
        and(
          eq(sites.id, input.siteId),
          eq(sites.organizationId, organizationId)
        )
      )
      .for("update");
    if (!site || site.status !== "active") {
      return null;
    }
    if (site.productionBranch !== input.branch) {
      throw new Error(
        "Site production branch changed while resolving its head"
      );
    }
    let requestedByUserId = input.requestedByUserId ?? null;
    if (requestedByUserId) {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, requestedByUserId))
        .for("key share");
      requestedByUserId = user?.id ?? null;
    }
    return (
      await insertDeployment(
        tx,
        { ...input, requestedByUserId },
        organizationId,
        dedupeKey
      )
    ).jobId;
  });
}

export async function enqueuePreviewRemoval(
  siteId: string,
  previewKey: string
): Promise<string> {
  const jobId = prefixedId("job");
  await db.transaction(async (tx) => {
    const { lastGeneration } = await allocateGeneration(tx, siteId);
    await tx.insert(siteJobs).values({
      id: jobId,
      siteId,
      kind: "remove_preview",
      payload: { previewKey, generation: lastGeneration },
    });
  });
  return jobId;
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

export async function getSite(
  id: string,
  executor: Pick<typeof db, "select"> = db
): Promise<Site | null> {
  const [site] = await executor
    .select()
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);
  return site ?? null;
}

export async function listSiteDeployments(
  siteId: string,
  limit = 50,
  referencedIds: readonly string[] = []
): Promise<SiteDeployment[]> {
  const recent = await db
    .select()
    .from(siteDeployments)
    .where(eq(siteDeployments.siteId, siteId))
    .orderBy(desc(siteDeployments.createdAt))
    .limit(limit);
  const known = new Set(recent.map((deployment) => deployment.id));
  const missing = [...new Set(referencedIds)].filter((id) => !known.has(id));
  if (missing.length === 0) {
    return recent;
  }
  const referenced = await db
    .select()
    .from(siteDeployments)
    .where(
      and(
        eq(siteDeployments.siteId, siteId),
        inArray(siteDeployments.id, missing)
      )
    );
  return [...recent, ...referenced].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
}
