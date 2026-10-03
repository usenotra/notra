import { db } from "@notra/db/drizzle";
import {
  connectedSocialAccounts,
  githubIntegrations,
  posts,
  scheduledPublications,
} from "@notra/db/schema";
import type {
  ScheduledPublicationDestinationConfig,
  ScheduledPublicationResult,
} from "@notra/db/types/scheduled-publications";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";

import {
  SCHEDULED_PUBLICATION_ERROR_CODES,
  SCHEDULED_PUBLICATION_LEASE_MS,
  SCHEDULED_PUBLICATION_MAX_ATTEMPTS,
  SCHEDULED_PUBLICATION_MAX_LEAD_MS,
  SCHEDULED_PUBLICATION_PAST_GRACE_MS,
  SCHEDULED_PUBLICATION_RETRY_DELAYS_MS,
  SCHEDULED_PUBLICATION_START_BUDGET_MS,
  SCHEDULED_PUBLICATION_START_RETRY_MS,
  SCHEDULED_PUBLICATION_SWEEP_LIMIT,
} from "../constants/scheduled-publications";
import type {
  BegunScheduledPublicationAttempt,
  ClaimedScheduledPublication,
  PostScheduleView,
  ScheduleDestination,
  ScheduledPublicationFinish,
  ScheduledPublicationOutcome,
  ScheduledPublicationRowForView,
  ScheduledPublicationView,
  SchedulePostOutcome,
  SchedulePostParams,
  ScheduleReplaceOutcome,
} from "../types/scheduled-publications";
import { scheduleDestinationsForContentType } from "./schedule-destinations";

const LAST_ERROR_MAX_LENGTH = 1000;

/** The columns a schedule view is built from. */
export const scheduledPublicationViewColumns = {
  id: scheduledPublications.id,
  postId: scheduledPublications.postId,
  destination: scheduledPublications.destination,
  destinationConfig: scheduledPublications.destinationConfig,
  status: scheduledPublications.status,
  scheduledAt: scheduledPublications.scheduledAt,
  timeZone: scheduledPublications.timeZone,
  attempts: scheduledPublications.attempts,
  errorCode: scheduledPublications.errorCode,
  lastError: scheduledPublications.lastError,
  result: scheduledPublications.result,
  publishedAt: scheduledPublications.publishedAt,
  createdAt: scheduledPublications.createdAt,
};

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function toScheduledPublicationView(
  row: ScheduledPublicationRowForView
): ScheduledPublicationView {
  return {
    id: row.id,
    destination: row.destination,
    config: row.destinationConfig,
    status: row.status,
    scheduledAt: row.scheduledAt.toISOString(),
    timeZone: row.timeZone,
    attempts: row.attempts,
    errorCode: row.errorCode,
    lastError: row.lastError,
    resultUrl: row.result?.postUrl ?? row.result?.pullRequestUrl ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

/**
 * Groups rows into per-post schedules. Rows of one schedule share their slot;
 * a post can show up more than once when older slots left failed rows behind.
 */
export function groupPostSchedules(
  rows: ScheduledPublicationRowForView[]
): PostScheduleView[] {
  const groups = new Map<string, PostScheduleView>();
  for (const row of rows) {
    const key = `${row.postId}:${row.scheduledAt.toISOString()}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        postId: row.postId,
        scheduledAt: row.scheduledAt.toISOString(),
        timeZone: row.timeZone,
        publications: [],
      };
      groups.set(key, group);
    }
    group.publications.push(toScheduledPublicationView(row));
  }
  return [...groups.values()];
}

/**
 * The schedule a post page shows: the newest row per destination that is
 * still pending or needs attention. Canceled rows and old successes whose slot
 * was replaced by a newer schedule drop out.
 */
export async function getPostSchedule(params: {
  organizationId: string;
  postId: string;
}): Promise<PostScheduleView | null> {
  const rows = await db
    .select(scheduledPublicationViewColumns)
    .from(scheduledPublications)
    .where(
      and(
        eq(scheduledPublications.organizationId, params.organizationId),
        eq(scheduledPublications.postId, params.postId),
        ne(scheduledPublications.status, "canceled")
      )
    )
    .orderBy(desc(scheduledPublications.createdAt))
    .limit(20);
  const latest = rows.at(0);
  if (!latest) {
    return null;
  }
  // Rows written by one schedule call share the slot of the newest row.
  const current = rows.filter(
    (row) => row.scheduledAt.getTime() === latest.scheduledAt.getTime()
  );
  return groupPostSchedules(current).at(0) ?? null;
}

async function validateDestinations(
  organizationId: string,
  contentType: string,
  destinations: ScheduleDestination[]
): Promise<
  | { ok: true; configs: ScheduledPublicationDestinationConfig[] }
  | {
      ok: false;
      reason:
        | "destination_not_supported"
        | "repository_not_found"
        | "account_not_found";
    }
> {
  const supported = scheduleDestinationsForContentType(contentType);
  const configs: ScheduledPublicationDestinationConfig[] = [
    { destination: "notra" },
  ];
  for (const destination of destinations) {
    if (destination.destination === "github") {
      if (!supported.github) {
        return { ok: false, reason: "destination_not_supported" };
      }
      const repository = await db.query.githubIntegrations.findFirst({
        columns: { id: true },
        where: and(
          eq(githubIntegrations.id, destination.repositoryId),
          eq(githubIntegrations.organizationId, organizationId),
          eq(githubIntegrations.enabled, true),
          eq(githubIntegrations.repositoryEnabled, true)
        ),
      });
      if (!repository) {
        return { ok: false, reason: "repository_not_found" };
      }
      configs.push({
        destination: "github",
        repositoryId: destination.repositoryId,
        merge: destination.merge,
      });
      continue;
    }
    if (!supported.socialPlatform) {
      return { ok: false, reason: "destination_not_supported" };
    }
    const account = await db.query.connectedSocialAccounts.findFirst({
      columns: { id: true },
      where: and(
        eq(connectedSocialAccounts.id, destination.accountId),
        eq(connectedSocialAccounts.organizationId, organizationId),
        eq(connectedSocialAccounts.provider, supported.socialPlatform)
      ),
    });
    if (!account) {
      return { ok: false, reason: "account_not_found" };
    }
    configs.push({ destination: "social", accountId: destination.accountId });
  }
  return { ok: true, configs };
}

/**
 * A pull request opened ahead for the schedule being replaced stays valid
 * when the new one targets the same repository (a calendar move, say).
 */
function carriedPullRequest(
  current: {
    status: string;
    destinationConfig: ScheduledPublicationDestinationConfig;
    result: ScheduledPublicationResult | null;
  }[],
  config: ScheduledPublicationDestinationConfig
): ScheduledPublicationResult | null {
  if (config.destination !== "github") {
    return null;
  }
  const replaced = current.find(
    (row) =>
      row.status === "scheduled" &&
      row.destinationConfig.destination === "github" &&
      row.destinationConfig.repositoryId === config.repositoryId
  );
  return replaced?.result?.contentHash ? replaced.result : null;
}

/**
 * Schedules a post, replacing any schedule that has not started yet.
 *
 * Every schedule publishes the post in Notra; external destinations are added
 * on top. The replace runs in one transaction that locks the post's active
 * rows, so a sweep claiming a row concurrently either wins before (and the
 * call is rejected as `publishing_in_progress`) or after (and finds the row
 * canceled).
 */
export async function schedulePostPublication(
  params: SchedulePostParams
): Promise<SchedulePostOutcome> {
  const now = params.now ?? new Date();
  const slot = params.scheduledAt.getTime();
  if (
    Number.isNaN(slot) ||
    slot < now.getTime() - SCHEDULED_PUBLICATION_PAST_GRACE_MS ||
    slot > now.getTime() + SCHEDULED_PUBLICATION_MAX_LEAD_MS
  ) {
    return { ok: false, reason: "invalid_time" };
  }

  const post = await db.query.posts.findFirst({
    columns: { id: true, contentType: true },
    where: and(
      eq(posts.id, params.postId),
      eq(posts.organizationId, params.organizationId)
    ),
  });
  if (!post) {
    return { ok: false, reason: "post_not_found" };
  }

  const validated = await validateDestinations(
    params.organizationId,
    post.contentType,
    params.destinations
  );
  if (!validated.ok) {
    return validated;
  }

  try {
    const outcome = await db.transaction<ScheduleReplaceOutcome>(async (tx) => {
      const current = await tx
        .select({
          id: scheduledPublications.id,
          status: scheduledPublications.status,
          externalAttemptAt: scheduledPublications.externalAttemptAt,
          destinationConfig: scheduledPublications.destinationConfig,
          result: scheduledPublications.result,
        })
        .from(scheduledPublications)
        .where(
          and(
            eq(scheduledPublications.postId, params.postId),
            inArray(scheduledPublications.status, [
              "scheduled",
              "publishing",
              "failed",
            ])
          )
        )
        .for("update");
      if (current.some((row) => row.status === "publishing")) {
        return { ok: false, reason: "publishing_in_progress" };
      }
      // A social post that may already be live is never replaced silently:
      // a person checks the account, then retries or cancels it.
      if (current.some((row) => row.externalAttemptAt)) {
        return { ok: false, reason: "unconfirmed_social_post" };
      }
      // Posting the same text to the same account again is a second post,
      // not a reschedule. Another account of the platform is fine.
      const socialConfig = validated.configs.find(
        (config) => config.destination === "social"
      );
      if (socialConfig) {
        const [posted] = await tx
          .select({ id: scheduledPublications.id })
          .from(scheduledPublications)
          .where(
            and(
              eq(scheduledPublications.postId, params.postId),
              eq(scheduledPublications.destination, "social"),
              eq(scheduledPublications.status, "published"),
              sql`${scheduledPublications.destinationConfig}->>'accountId' = ${socialConfig.accountId}`
            )
          )
          .limit(1);
        if (posted) {
          return { ok: false, reason: "social_already_posted" };
        }
      }
      // The caller states which pending rows it is replacing. Anything else
      // (a row that published or failed since the user loaded the page) means
      // the user is looking at a stale schedule, and replacing it could send
      // a destination a second time.
      if (params.expectedScheduledIds) {
        const expected = new Set(params.expectedScheduledIds);
        const matches =
          current.length === expected.size &&
          current.every(
            (row) => row.status === "scheduled" && expected.has(row.id)
          );
        if (!matches) {
          return { ok: false, reason: "conflict" };
        }
      }
      // Failed rows of an earlier slot are superseded by the new schedule.
      await tx
        .update(scheduledPublications)
        .set({ status: "canceled", claimToken: null, leaseUntil: null })
        .where(
          and(
            eq(scheduledPublications.postId, params.postId),
            inArray(scheduledPublications.status, ["scheduled", "failed"])
          )
        );
      await tx.insert(scheduledPublications).values(
        validated.configs.map((config) => ({
          id: nanoid(),
          organizationId: params.organizationId,
          postId: params.postId,
          scheduledAt: params.scheduledAt,
          timeZone: params.timeZone,
          destination: config.destination,
          destinationConfig: config,
          status: "scheduled" as const,
          nextAttemptAt: params.scheduledAt,
          createdByUserId: params.userId,
          result: carriedPullRequest(current, config),
        }))
      );
      return { ok: true };
    });
    if (!outcome.ok) {
      return outcome;
    }
  } catch (error) {
    // Two schedule calls for the same post raced on the active-row index.
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "conflict" };
    }
    throw error;
  }

  const schedule = await getPostSchedule({
    organizationId: params.organizationId,
    postId: params.postId,
  });
  if (!schedule) {
    throw new Error("Scheduled publication rows vanished after insert");
  }
  return { ok: true, schedule };
}

/**
 * Cancels whatever of a post's schedule has not started and clears failed
 * rows. A destination already publishing cannot be stopped; its attempt is
 * told to end canceled instead of retrying, and it is reported in progress.
 *
 * One statement, so a row the sweep claims concurrently is re-read as
 * `publishing` and still gets the cancel request.
 */
export async function cancelPostSchedule(params: {
  organizationId: string;
  postId: string;
  now?: Date;
}): Promise<{ canceled: number; inProgress: boolean }> {
  const rows = await db
    .update(scheduledPublications)
    .set({
      status: sql`case when ${scheduledPublications.status} = 'publishing' then ${scheduledPublications.status} else 'canceled' end`,
      cancelRequestedAt: params.now ?? new Date(),
    })
    .where(
      and(
        eq(scheduledPublications.organizationId, params.organizationId),
        eq(scheduledPublications.postId, params.postId),
        inArray(scheduledPublications.status, [
          "scheduled",
          "publishing",
          "failed",
        ])
      )
    )
    .returning({ status: scheduledPublications.status });
  return {
    canceled: rows.filter((row) => row.status === "canceled").length,
    inProgress: rows.some((row) => row.status === "publishing"),
  };
}

/**
 * Remembers the pull request opened when the post was scheduled, so the run
 * at the slot merges it instead of pushing the same content again.
 */
export async function recordScheduledPullRequest(params: {
  organizationId: string;
  postId: string;
  repositoryId: string;
  result: ScheduledPublicationResult;
}): Promise<void> {
  await db
    .update(scheduledPublications)
    .set({ result: params.result })
    .where(
      and(
        eq(scheduledPublications.organizationId, params.organizationId),
        eq(scheduledPublications.postId, params.postId),
        eq(scheduledPublications.destination, "github"),
        eq(scheduledPublications.status, "scheduled"),
        // A run that already pushed (and failed to merge) knows better.
        isNull(scheduledPublications.result),
        // A schedule moved to another repository meanwhile keeps its own PR.
        sql`${scheduledPublications.destinationConfig}->>'repositoryId' = ${params.repositoryId}`
      )
    );
}

/** Moves a post's pending schedule to now; the next sweep publishes it. */
export async function publishPostScheduleNow(params: {
  organizationId: string;
  postId: string;
  now?: Date;
}): Promise<number> {
  const now = params.now ?? new Date();
  const moved = await db
    .update(scheduledPublications)
    .set({ scheduledAt: now, nextAttemptAt: now })
    .where(
      and(
        eq(scheduledPublications.organizationId, params.organizationId),
        eq(scheduledPublications.postId, params.postId),
        eq(scheduledPublications.status, "scheduled")
      )
    )
    .returning({ id: scheduledPublications.id });
  return moved.length;
}

/**
 * Re-arms one failed destination. This is the only way past an
 * `outcome_unknown` social post, so the caller must have made the user check
 * the platform first.
 */
export async function retryScheduledPublication(params: {
  organizationId: string;
  scheduledPublicationId: string;
  now?: Date;
}): Promise<
  { ok: true; postId: string } | { ok: false; reason: "not_found" | "conflict" }
> {
  const now = params.now ?? new Date();
  try {
    const [row] = await db
      .update(scheduledPublications)
      .set({
        status: "scheduled",
        nextAttemptAt: now,
        attempts: 0,
        externalAttemptAt: null,
        cancelRequestedAt: null,
        errorCode: null,
        lastError: null,
        claimToken: null,
        leaseUntil: null,
      })
      .where(
        and(
          eq(scheduledPublications.id, params.scheduledPublicationId),
          eq(scheduledPublications.organizationId, params.organizationId),
          eq(scheduledPublications.status, "failed")
        )
      )
      .returning({ postId: scheduledPublications.postId });
    return row
      ? { ok: true, postId: row.postId }
      : { ok: false, reason: "not_found" };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "conflict" };
    }
    throw error;
  }
}

/**
 * The row as one run claimed it. Once a newer sweep took it over, or the run
 * finished, the run's later writes match nothing.
 */
function claimFence(
  claim: Pick<ClaimedScheduledPublication, "id" | "claimToken">
) {
  return and(
    eq(scheduledPublications.id, claim.id),
    eq(scheduledPublications.claimToken, claim.claimToken),
    eq(scheduledPublications.status, "publishing")
  );
}

function dueCondition(now: Date) {
  return or(
    and(
      eq(scheduledPublications.status, "scheduled"),
      lte(scheduledPublications.nextAttemptAt, now)
    ),
    // A run that died (deploy, crash, lost hand-off) left its lease to expire.
    and(
      eq(scheduledPublications.status, "publishing"),
      or(
        isNull(scheduledPublications.leaseUntil),
        lte(scheduledPublications.leaseUntil, now)
      )
    )
  );
}

/**
 * Claims due rows for one sweep with a single compare-and-set.
 *
 * `FOR UPDATE SKIP LOCKED` lets overlapping sweeps split the backlog instead
 * of blocking on each other, and the due condition repeated in the update
 * makes a row that changed in between (canceled, rescheduled) drop out. The
 * claim token fences every later write of the run: once a newer sweep took a
 * row over, the old run can no longer touch it.
 */
export async function claimDueScheduledPublications(params?: {
  now?: Date;
  limit?: number;
  postId?: string;
}): Promise<ClaimedScheduledPublication[]> {
  const now = params?.now ?? new Date();
  const claimToken = crypto.randomUUID();
  // A locking CTE is evaluated exactly once. The same select as an `IN`
  // subquery may be re-run by the planner, and with SKIP LOCKED each run can
  // pick different rows, so one sweep could claim more than its limit.
  const due = db.$with("due_scheduled_publications").as(
    db
      .select({ dueId: scheduledPublications.id })
      .from(scheduledPublications)
      .where(
        and(
          dueCondition(now),
          params?.postId
            ? eq(scheduledPublications.postId, params.postId)
            : undefined
        )
      )
      .orderBy(asc(scheduledPublications.nextAttemptAt))
      .limit(params?.limit ?? SCHEDULED_PUBLICATION_SWEEP_LIMIT)
      .for("update", { skipLocked: true })
  );
  const claimed = await db
    .with(due)
    .update(scheduledPublications)
    .set({
      status: "publishing",
      claimToken,
      leaseUntil: new Date(now.getTime() + SCHEDULED_PUBLICATION_LEASE_MS),
      attempts: sql`${scheduledPublications.attempts} + 1`,
    })
    .from(due)
    .where(and(eq(scheduledPublications.id, due.dueId), dueCondition(now)))
    .returning({
      id: scheduledPublications.id,
      organizationId: scheduledPublications.organizationId,
      postId: scheduledPublications.postId,
      destination: scheduledPublications.destination,
    });
  return claimed.map((row) => ({ ...row, claimToken }));
}

/**
 * Hands a claim back when its workflow could not be started. The attempt is
 * not counted: a platform outage must not burn a post's retries. If the start
 * did go through after all, the run finds the token gone and exits.
 */
export async function releaseScheduledPublicationClaim(
  claim: ClaimedScheduledPublication,
  now = new Date()
): Promise<"released" | "failed" | "canceled" | "superseded"> {
  const fence = claimFence(claim);
  // Nothing went out yet, so a cancel that arrived meanwhile just wins.
  const canceled = await db
    .update(scheduledPublications)
    .set({ status: "canceled", claimToken: null, leaseUntil: null })
    .where(and(fence, isNotNull(scheduledPublications.cancelRequestedAt)))
    .returning({ id: scheduledPublications.id });
  if (canceled.length > 0) {
    return "canceled";
  }
  // A start that keeps failing (bad deploy, broken config) must surface
  // instead of cycling every minute forever.
  const givenUp = await db
    .update(scheduledPublications)
    .set({
      status: "failed",
      claimToken: null,
      leaseUntil: null,
      errorCode: SCHEDULED_PUBLICATION_ERROR_CODES.START_FAILED,
      lastError: "Publishing could not be started.",
    })
    .where(
      and(
        fence,
        lte(
          scheduledPublications.scheduledAt,
          new Date(now.getTime() - SCHEDULED_PUBLICATION_START_BUDGET_MS)
        )
      )
    )
    .returning({ id: scheduledPublications.id });
  if (givenUp.length > 0) {
    return "failed";
  }
  const released = await db
    .update(scheduledPublications)
    .set({
      status: "scheduled",
      claimToken: null,
      leaseUntil: null,
      attempts: sql`greatest(${scheduledPublications.attempts} - 1, 0)`,
      nextAttemptAt: new Date(
        now.getTime() + SCHEDULED_PUBLICATION_START_RETRY_MS
      ),
    })
    .where(fence)
    .returning({ id: scheduledPublications.id });
  return released.length > 0 ? "released" : "superseded";
}

/**
 * Starts an attempt for a claimed row: refreshes the lease under the claim
 * token and returns the row, or `null` when a newer claim or a cancel won. An
 * attempt that must not touch any destination comes back already decided.
 */
export async function beginScheduledPublicationAttempt(
  claim: Pick<ClaimedScheduledPublication, "id" | "claimToken">,
  now = new Date()
): Promise<BegunScheduledPublicationAttempt | null> {
  const [row] = await db
    .update(scheduledPublications)
    .set({
      leaseUntil: new Date(now.getTime() + SCHEDULED_PUBLICATION_LEASE_MS),
    })
    .where(claimFence(claim))
    .returning({
      id: scheduledPublications.id,
      organizationId: scheduledPublications.organizationId,
      postId: scheduledPublications.postId,
      destination: scheduledPublications.destination,
      destinationConfig: scheduledPublications.destinationConfig,
      scheduledAt: scheduledPublications.scheduledAt,
      attempts: scheduledPublications.attempts,
      externalAttemptAt: scheduledPublications.externalAttemptAt,
      cancelRequestedAt: scheduledPublications.cancelRequestedAt,
      createdByUserId: scheduledPublications.createdByUserId,
      createdAt: scheduledPublications.createdAt,
      result: scheduledPublications.result,
    });
  if (!row) {
    return null;
  }
  const { externalAttemptAt, cancelRequestedAt, ...attempt } = row;
  return {
    attempt,
    preempted: preemptedOutcome({
      externalAttemptAt,
      cancelRequestedAt,
      attempts: attempt.attempts,
    }),
  };
}

/**
 * What decides an attempt before any destination is touched: a social post
 * whose earlier attempt went out without a recorded outcome, a cancel that
 * arrived after the row was claimed, or a crash loop that used up the
 * attempts.
 */
function preemptedOutcome(row: {
  externalAttemptAt: Date | null;
  cancelRequestedAt: Date | null;
  attempts: number;
}): ScheduledPublicationOutcome | null {
  if (row.externalAttemptAt) {
    return {
      kind: "error",
      code: SCHEDULED_PUBLICATION_ERROR_CODES.OUTCOME_UNKNOWN,
      message:
        "An earlier attempt was interrupted after sending the post. Check the account before retrying so it is not posted twice.",
      retryable: false,
    };
  }
  if (row.cancelRequestedAt) {
    return {
      kind: "error",
      code: SCHEDULED_PUBLICATION_ERROR_CODES.CANCELED,
      message: "The schedule was canceled.",
      retryable: false,
    };
  }
  if (row.attempts > SCHEDULED_PUBLICATION_MAX_ATTEMPTS) {
    return {
      kind: "error",
      code: SCHEDULED_PUBLICATION_ERROR_CODES.TOO_MANY_ATTEMPTS,
      message: "Publishing was interrupted too many times.",
      retryable: false,
    };
  }
  return null;
}

/**
 * Records that a non-idempotent call is about to go out. Once this is set a
 * lost outcome can only be resolved by a person, never by an automatic retry.
 */
export async function markScheduledPublicationExternalAttempt(
  claim: Pick<ClaimedScheduledPublication, "id" | "claimToken">,
  now = new Date()
): Promise<boolean> {
  const marked = await db
    .update(scheduledPublications)
    .set({ externalAttemptAt: now })
    .where(
      and(claimFence(claim), isNull(scheduledPublications.externalAttemptAt))
    )
    .returning({ id: scheduledPublications.id });
  return marked.length > 0;
}

export function scheduledPublicationRetryDelayMs(attempts: number) {
  const delays = SCHEDULED_PUBLICATION_RETRY_DELAYS_MS;
  return delays[Math.min(Math.max(attempts - 1, 0), delays.length - 1)] ?? 0;
}

/**
 * Writes an attempt's outcome under the claim token. A retryable error goes
 * back to `scheduled` with a back-off until the attempts run out. A cancel
 * requested meanwhile turns any error into `canceled`, unless a social post
 * may already have gone out: that one stays failed for a person to check.
 */
export async function finishScheduledPublicationAttempt(
  claim: Pick<ClaimedScheduledPublication, "id" | "claimToken">,
  attempts: number,
  outcome: ScheduledPublicationOutcome,
  now = new Date()
): Promise<ScheduledPublicationFinish> {
  const fence = claimFence(claim);
  const released = { claimToken: null, leaseUntil: null };

  if (outcome.kind === "published") {
    const updated = await db
      .update(scheduledPublications)
      .set({
        ...released,
        status: "published",
        publishedAt: now,
        result: outcome.result,
        errorCode: null,
        lastError: null,
      })
      .where(fence)
      .returning({ id: scheduledPublications.id });
    return updated.length > 0 ? "published" : "superseded";
  }

  const retry =
    outcome.retryable && attempts < SCHEDULED_PUBLICATION_MAX_ATTEMPTS;
  const status = retry ? "scheduled" : "failed";
  // Only an unconfirmed send (or an error we can't place) may have reached
  // the platform. A definite failure clears the marker, so a later
  // reschedule or cancel is not treated as a possibly live post.
  const mayBeLive =
    outcome.code === SCHEDULED_PUBLICATION_ERROR_CODES.OUTCOME_UNKNOWN ||
    outcome.code === SCHEDULED_PUBLICATION_ERROR_CODES.UNEXPECTED;
  // A cancel requested meanwhile wins, except over a post that may be live.
  const canceled = mayBeLive
    ? and(
        isNotNull(scheduledPublications.cancelRequestedAt),
        isNull(scheduledPublications.externalAttemptAt)
      )
    : isNotNull(scheduledPublications.cancelRequestedAt);
  const [updated] = await db
    .update(scheduledPublications)
    .set({
      ...released,
      status: sql`case when ${canceled} then 'canceled'::scheduled_publication_status else ${status}::scheduled_publication_status end`,
      ...(mayBeLive ? {} : { externalAttemptAt: null }),
      nextAttemptAt: retry
        ? new Date(now.getTime() + scheduledPublicationRetryDelayMs(attempts))
        : undefined,
      errorCode: outcome.code,
      lastError: outcome.message.slice(0, LAST_ERROR_MAX_LENGTH),
      ...(outcome.result ? { result: outcome.result } : {}),
    })
    .where(fence)
    .returning({ status: scheduledPublications.status });
  if (!updated) {
    return "superseded";
  }
  if (updated.status === "canceled") {
    return "canceled";
  }
  return retry ? "retry_scheduled" : "failed";
}
