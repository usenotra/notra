import { db } from "@notra/db/drizzle";
import { siteJobs } from "@notra/db/schema";
import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

import {
  CAPACITY_RETRY_MS,
  DEFAULT_LEASE_MS,
  DISPATCH_BATCH_SIZE,
  REDISPATCH_AFTER_MS,
  RETRY_BASE_MS,
} from "./constants/jobs";
import type { SiteStorageTransaction } from "./types/deployments";
import type { SiteJob } from "./types/jobs";
import { errorMessage } from "./utils/errors";

async function reserveBuildCapacity(
  tx: SiteStorageTransaction,
  job: SiteJob
): Promise<boolean> {
  const running = and(
    eq(siteJobs.status, "running"),
    eq(siteJobs.kind, "build"),
    gt(siteJobs.leaseUntil, sql`now()`)
  );
  const [counts] = await tx
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
  await tx
    .update(siteJobs)
    .set({
      status: "pending",
      leaseUntil: null,
      availableAt: new Date(Date.now() + CAPACITY_RETRY_MS),
      dispatchedAt: null,
    })
    .where(
      and(
        eq(siteJobs.id, job.id),
        eq(siteJobs.status, job.status),
        eq(siteJobs.attempts, job.attempts)
      )
    );
  return false;
}

export async function claimSiteJob(jobId: string): Promise<SiteJob | null> {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended('sites-build-capacity', 0))`
    );
    const claimable = and(
      eq(siteJobs.id, jobId),
      or(
        eq(siteJobs.kind, "sync_state"),
        lt(siteJobs.attempts, siteJobs.maxAttempts)
      ),
      or(
        and(
          eq(siteJobs.status, "pending"),
          lte(siteJobs.availableAt, sql`now()`)
        ),
        and(eq(siteJobs.status, "running"), lt(siteJobs.leaseUntil, sql`now()`))
      )
    );
    const [pending] = await tx
      .select()
      .from(siteJobs)
      .where(claimable)
      .limit(1);
    if (!pending) {
      return null;
    }
    if (
      pending.kind === "build" &&
      !(await reserveBuildCapacity(tx, pending))
    ) {
      return null;
    }
    const [job] = await tx
      .update(siteJobs)
      .set({
        status: "running",
        attempts: sql`${siteJobs.attempts} + 1`,
        leaseUntil: sql`now() + (${DEFAULT_LEASE_MS} * interval '1 millisecond')`,
      })
      .where(claimable)
      .returning();
    return job ?? null;
  });
}

export async function completeSiteJob(job: SiteJob): Promise<void> {
  await db
    .update(siteJobs)
    .set({ status: "done", leaseUntil: null, lastError: null })
    .where(
      and(
        eq(siteJobs.id, job.id),
        eq(siteJobs.status, "running"),
        eq(siteJobs.attempts, job.attempts)
      )
    );
}

export async function failSiteJob(
  job: SiteJob,
  error: unknown,
  permanent: boolean
): Promise<"retrying" | "failed" | "skipped"> {
  const exhausted =
    permanent || (job.kind !== "sync_state" && job.attempts >= job.maxAttempts);
  const updated = await db
    .update(siteJobs)
    .set({
      status: exhausted ? "failed" : "pending",
      leaseUntil: null,
      dispatchedAt: null,
      lastError: errorMessage(error).slice(0, 2000),
      availableAt: new Date(
        Date.now() +
          RETRY_BASE_MS * 2 ** Math.min(8, Math.max(0, job.attempts - 1))
      ),
    })
    .where(
      and(
        eq(siteJobs.id, job.id),
        eq(siteJobs.status, "running"),
        eq(siteJobs.attempts, job.attempts)
      )
    )
    .returning({ id: siteJobs.id });
  if (updated.length === 0) {
    return "skipped";
  }
  return exhausted ? "failed" : "retrying";
}

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
        sql`${siteJobs.kind} <> 'sync_state'`,
        lt(siteJobs.leaseUntil, sql`now()`),
        sql`${siteJobs.attempts} >= ${siteJobs.maxAttempts}`
      )
    )
    .returning();
}

export async function markSiteJobsDispatched(jobIds: string[]): Promise<void> {
  if (jobIds.length === 0) {
    return;
  }
  await db
    .update(siteJobs)
    .set({ dispatchedAt: new Date() })
    .where(inArray(siteJobs.id, jobIds));
}

export async function listDispatchableSiteJobs(): Promise<SiteJob[]> {
  const staleDispatch = new Date(Date.now() - REDISPATCH_AFTER_MS);
  return await db
    .select()
    .from(siteJobs)
    .where(
      and(
        or(
          eq(siteJobs.kind, "sync_state"),
          lt(siteJobs.attempts, siteJobs.maxAttempts)
        ),
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
    .limit(DISPATCH_BATCH_SIZE);
}
