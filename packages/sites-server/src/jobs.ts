import { db } from "@notra/db/drizzle";
import { siteJobs } from "@notra/db/schema";
import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import { and, asc, eq, gt, isNull, lt, lte, or, sql } from "drizzle-orm";

const DEFAULT_LEASE_MS = 15 * 60 * 1000;
/** A dispatched job that has not been claimed after this long is dispatched again. */
const REDISPATCH_AFTER_MS = 2 * 60 * 1000;
const RETRY_BASE_MS = 30 * 1000;

export type SiteJob = typeof siteJobs.$inferSelect;

const CAPACITY_RETRY_MS = 20 * 1000;

/**
 * Builds wait (instead of failing) when the global or per-site sandbox budget
 * is used up. Returns false and pushes the job back a little when over budget.
 */
export async function reserveBuildCapacity(
  job: Pick<SiteJob, "id" | "siteId">
): Promise<boolean> {
  const running = and(
    eq(siteJobs.status, "running"),
    eq(siteJobs.kind, "build"),
    gt(siteJobs.leaseUntil, sql`now()`)
  );
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      site: sql<number>`count(*) filter (where ${siteJobs.siteId} = ${job.siteId})::int`,
    })
    .from(siteJobs)
    .where(running);
  const overGlobal =
    (counts?.total ?? 0) >= SITE_BUILD_LIMITS.maxConcurrentBuilds;
  const overSite =
    (counts?.site ?? 0) >= SITE_BUILD_LIMITS.maxConcurrentBuildsPerSite;
  if (!(overGlobal || overSite)) {
    return true;
  }
  await db
    .update(siteJobs)
    .set({
      availableAt: new Date(Date.now() + CAPACITY_RETRY_MS),
      dispatchedAt: null,
    })
    .where(and(eq(siteJobs.id, job.id), eq(siteJobs.status, "pending")));
  return false;
}

/**
 * Claims a job for one worker. A running job whose lease expired (crashed
 * function, lost workflow step) can be claimed again; attempts are capped.
 */
export async function claimSiteJob(
  jobId: string,
  leaseMs = DEFAULT_LEASE_MS
): Promise<SiteJob | null> {
  const [job] = await db
    .update(siteJobs)
    .set({
      status: "running",
      attempts: sql`${siteJobs.attempts} + 1`,
      leaseUntil: sql`now() + (${leaseMs} * interval '1 millisecond')`,
    })
    .where(
      and(
        eq(siteJobs.id, jobId),
        lt(siteJobs.attempts, siteJobs.maxAttempts),
        or(
          and(
            eq(siteJobs.status, "pending"),
            lte(siteJobs.availableAt, sql`now()`)
          ),
          and(
            eq(siteJobs.status, "running"),
            lt(siteJobs.leaseUntil, sql`now()`)
          )
        )
      )
    )
    .returning();
  return job ?? null;
}

export async function completeSiteJob(jobId: string): Promise<void> {
  await db
    .update(siteJobs)
    .set({ status: "done", leaseUntil: null, lastError: null })
    .where(eq(siteJobs.id, jobId));
}

/** Transient failure: back off and let the sweep dispatch it again, until attempts run out. */
export async function failSiteJob(
  job: SiteJob,
  error: unknown,
  options: { permanent?: boolean } = {}
): Promise<"retrying" | "failed"> {
  const message = error instanceof Error ? error.message : String(error);
  const exhausted =
    options.permanent === true || job.attempts >= job.maxAttempts;
  await db
    .update(siteJobs)
    .set({
      status: exhausted ? "failed" : "pending",
      leaseUntil: null,
      dispatchedAt: null,
      lastError: message.slice(0, 2000),
      availableAt: new Date(
        Date.now() + RETRY_BASE_MS * 2 ** Math.max(0, job.attempts - 1)
      ),
    })
    .where(eq(siteJobs.id, job.id));
  return exhausted ? "failed" : "retrying";
}

/**
 * A worker that died during its last attempt leaves the job `running` with an
 * expired lease that nobody may claim again. Close those out as failed so the
 * deployment and its GitHub check do not stay "in progress" forever.
 */
export async function takeExhaustedSiteJobs(): Promise<SiteJob[]> {
  return await db
    .update(siteJobs)
    .set({
      status: "failed",
      leaseUntil: null,
      lastError: "The build stopped responding on its last attempt",
    })
    .where(
      and(
        eq(siteJobs.status, "running"),
        lt(siteJobs.leaseUntil, sql`now()`),
        sql`${siteJobs.attempts} >= ${siteJobs.maxAttempts}`
      )
    )
    .returning();
}

export async function markSiteJobsDispatched(jobIds: string[]): Promise<void> {
  for (const id of jobIds) {
    await db
      .update(siteJobs)
      .set({ dispatchedAt: new Date() })
      .where(eq(siteJobs.id, id));
  }
}

/** Jobs the sweep should (re)dispatch: due and never dispatched, dispatched but unclaimed, or with an expired lease. */
export async function listDispatchableSiteJobs(limit = 25): Promise<SiteJob[]> {
  const staleDispatch = new Date(Date.now() - REDISPATCH_AFTER_MS);
  return await db
    .select()
    .from(siteJobs)
    .where(
      and(
        lt(siteJobs.attempts, siteJobs.maxAttempts),
        or(
          and(
            eq(siteJobs.status, "pending"),
            lte(siteJobs.availableAt, sql`now()`),
            or(
              isNull(siteJobs.dispatchedAt),
              lt(siteJobs.dispatchedAt, staleDispatch)
            )
          ),
          and(
            eq(siteJobs.status, "running"),
            lt(siteJobs.leaseUntil, sql`now()`)
          )
        )
      )
    )
    .orderBy(asc(siteJobs.availableAt))
    .limit(limit);
}
