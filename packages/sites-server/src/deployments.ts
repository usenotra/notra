import { db } from "@notra/db/drizzle";
import { siteDeployments, siteJobs, sites } from "@notra/db/schema";
import {
  SITE_BUILD_LIMITS,
  SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
  SITE_DEPLOYMENT_TRANSITIONS,
} from "@notra/sites-core/constants/sites";
import { hashBuildTarget } from "@notra/sites-core/utils/build-target";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

import { buildTargetForDeployment } from "./urls";

export type Site = typeof sites.$inferSelect;
export type SiteDeployment = typeof siteDeployments.$inferSelect;
export type SiteDeploymentStatus = SiteDeployment["status"];
type Executor = Pick<typeof db, "update">;

export interface EnqueueDeploymentInput {
  siteId: string;
  kind: "production" | "preview";
  previewKey: string | null;
  trigger: SiteDeployment["trigger"];
  branch: string;
  commitSha: string;
  commitMessage?: string | null;
  commitAuthor?: string | null;
  pullRequestNumber?: number | null;
  requestedByUserId?: string | null;
}

export class SiteNotBuildableError extends Error {
  readonly name = "SiteNotBuildableError";
}

/**
 * Next generation for a site. Deployments, rollbacks and preview removals all
 * take one, and the serving state only ever moves to a higher one; the row
 * lock makes concurrent callers get distinct, ordered values.
 */
export async function allocateGeneration(
  executor: Executor,
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

/**
 * The only way a deployment's status changes: a conditional update from the
 * statuses `SITE_DEPLOYMENT_TRANSITIONS` allows. Returns false when the row was
 * not in an allowed status (e.g. a preview canceled while its build ran), so
 * callers never overwrite a concurrent decision.
 */
export async function transitionDeployment(
  id: string,
  to: SiteDeploymentStatus,
  values: Partial<Omit<typeof siteDeployments.$inferInsert, "status">> = {}
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

/** Stops every build of a preview that has not finished (PR closed, preview deleted). */
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

/**
 * Creates the deployment row and its build job in one transaction, under the
 * site row lock taken by `allocateGeneration`.
 */
export async function enqueueSiteDeployment(
  input: EnqueueDeploymentInput
): Promise<{ deployment: SiteDeployment; jobId: string }> {
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
        id: `dep_${crypto.randomUUID().replaceAll("-", "")}`,
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
    const jobId = `job_${crypto.randomUUID().replaceAll("-", "")}`;
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

/** Queues removal of a preview (PR closed, manual delete) through the same outbox. */
export async function enqueuePreviewRemoval(
  siteId: string,
  previewKey: string
): Promise<string> {
  const jobId = `job_${crypto.randomUUID().replaceAll("-", "")}`;
  await db.insert(siteJobs).values({
    id: jobId,
    siteId,
    kind: "remove_preview",
    payload: { previewKey },
  });
  return jobId;
}

/**
 * True when a newer deployment for the same slot (production, or the same
 * preview key) exists and has not failed. Building this one would be wasted.
 */
export async function hasNewerDeployment(
  deployment: SiteDeployment
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
        ])
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
