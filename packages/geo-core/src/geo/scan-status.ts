import { db } from "@notra/db/drizzle";
import { geoScans, geoSettings } from "@notra/db/schema";
import { and, eq, gte, isNull, lt, notExists, or } from "drizzle-orm";
import { Effect, Exit, Schedule } from "effect";

import {
  GEO_SCAN_CLAIM_RENEW_AFTER_MS,
  GEO_SCAN_STALE_MS,
} from "../constants/geo";
import { describeGeoCause, geoLogError } from "../utils/geo-log";
import { geoDb, geoSkip } from "./effect";
import {
  type GeoDatabaseError,
  GeoScanError,
  GeoScanStartError,
} from "./errors";

/**
 * Atomically claims the project's scan slot, returning `null` when another
 * scan already holds it and the claim token when it does not.
 *
 * This single conditional `UPDATE … RETURNING` *is* the guard, and every entry
 * point that starts a scan (public API, dashboard trigger, cron sweep)
 * has to go through it. A read-then-check cannot work: concurrent triggers all
 * read "idle" before any of them writes, so they all proceed and the
 * organization gets billed for duplicate scans. Postgres instead serializes
 * concurrent updates of the same row and re-evaluates the `WHERE` clause
 * against the committed version, so exactly one claimant sees a returned row.
 *
 * The returned `claimedAt` is the stamp this claim wrote, and it doubles as
 * ownership proof: every later write that ends the run (`releaseGeoScanRun`,
 * `markGeoScanFinished`) compares-and-sets on it, so a straggler from a
 * previous, already-stale run cannot free a claim it no longer owns.
 *
 * The predicate is deliberately narrow — claimable only when nothing ever
 * started or when the stamp went stale. It used to also accept
 * `scan_started_at <= last_scan_at`, which is precisely what let a stale
 * finisher hand a *fresh* claim away: it stamped `last_scan_at = now`, which
 * is newer than the fresh `scan_started_at`, and the next trigger walked
 * straight in. `markGeoScanFinished` now clears `scan_started_at` in the same
 * statement, so a finished run is claimable through the `IS NULL` arm and the
 * comparison arm is no longer needed.
 */
export const claimGeoScanRun = Effect.fn("geo.claimScanRun")(function* (
  projectId: string
) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - GEO_SCAN_STALE_MS);
  const claimed = yield* geoDb("scan claim failed", () =>
    db
      .update(geoSettings)
      .set({ scanStartedAt: now })
      .where(
        and(
          eq(geoSettings.projectId, projectId),
          or(
            isNull(geoSettings.scanStartedAt),
            lt(geoSettings.scanStartedAt, staleBefore)
          )
        )
      )
      .returning({ id: geoSettings.id })
  );

  if (claimed.length === 0) {
    return null;
  }
  return { claimedAt: now };
});

/**
 * Revalidates a claim handed to a delayed workflow and rotates its ownership
 * token atomically. Exactly one duplicate delivery can move the old token;
 * every other delivery, and every workflow whose stale claim was reclaimed,
 * gets `null` and must stop before billing or model calls.
 */
export const renewGeoScanRun = Effect.fn("geo.renewScanRun")(function* (
  projectId: string,
  claimedAt: Date,
  renewalToken?: Date
) {
  const renewedAt =
    renewalToken ?? new Date(Math.max(Date.now(), claimedAt.getTime() + 1));
  const renewed = yield* geoDb("scan claim renewal failed", () =>
    db
      .update(geoSettings)
      .set({ scanStartedAt: renewedAt })
      .where(
        and(
          eq(geoSettings.projectId, projectId),
          renewalToken
            ? or(
                eq(geoSettings.scanStartedAt, claimedAt),
                eq(geoSettings.scanStartedAt, renewalToken)
              )
            : eq(geoSettings.scanStartedAt, claimedAt)
        )
      )
      .returning({ id: geoSettings.id })
  );
  return renewed.length > 0 ? { claimedAt: renewedAt } : null;
});

/**
 * Rotates the claim token only once it has aged past the renew threshold.
 * The workflow supplies the replacement token as step input, so replaying a
 * committed step repeats the same update. The compare-and-set accepts either
 * the old token or that exact replacement, making the replay idempotent while
 * still rejecting a claim acquired by another run.
 */
export const renewGeoScanClaimIfDue = Effect.fn("geo.renewScanClaimIfDue")(
  function* (projectId: string, claimToken: string, renewalToken: string) {
    const claimedAt = new Date(claimToken);
    if (Number.isNaN(claimedAt.getTime())) {
      return yield* Effect.fail(
        new GeoScanError({ message: `Invalid scan claim token: ${claimToken}` })
      );
    }
    if (Date.now() - claimedAt.getTime() < GEO_SCAN_CLAIM_RENEW_AFTER_MS) {
      return claimToken;
    }
    const renewedAt = new Date(renewalToken);
    if (
      Number.isNaN(renewedAt.getTime()) ||
      renewedAt.getTime() <= claimedAt.getTime()
    ) {
      return yield* Effect.fail(
        new GeoScanError({
          message: `Invalid scan claim renewal token: ${renewalToken}`,
        })
      );
    }
    const renewed = yield* renewGeoScanRun(projectId, claimedAt, renewedAt);
    if (!renewed) {
      return yield* Effect.fail(
        new GeoScanError({
          message: `Lost the scan claim for project ${projectId}`,
        })
      );
    }
    return renewed.claimedAt.toISOString();
  }
);

/**
 * Hands a claim back without pretending a scan finished.
 *
 * Clearing `scan_started_at` (rather than stamping `last_scan_at`) is what
 * keeps "when did this project last actually scan" honest, and it releases the
 * slot immediately instead of leaving the UI on "Scanning…" for
 * `GEO_SCAN_STALE_MS`.
 *
 * Pass the `claimedAt` token from `claimGeoScanRun` whenever it is available:
 * the release then only lands while this claim is still the one in the row.
 * Without it the release is unconditional, which is only safe for callers that
 * provably own the row (the tokenless legacy path, and rows already read as
 * not-running).
 */
export const releaseGeoScanRun = Effect.fn("geo.releaseScanRun")(function* (
  projectId: string,
  claimedAt?: Date
) {
  yield* geoDb("scan claim release failed", () =>
    db
      .update(geoSettings)
      .set({ scanStartedAt: null })
      .where(
        claimedAt
          ? and(
              eq(geoSettings.projectId, projectId),
              eq(geoSettings.scanStartedAt, claimedAt)
            )
          : eq(geoSettings.projectId, projectId)
      )
  );
});

/**
 * Stamps a completed run: records `last_scan_at` *and* frees the slot in one
 * statement, so the row can never sit in the half-state where the scan is over
 * but `scan_started_at` still reads as owned.
 *
 * With a `claimedAt` token the write is compare-and-set on it, so a straggler
 * whose claim already went stale cannot stamp over a run that started since.
 * Without a token it keeps the historical single-field behaviour
 * (`last_scan_at` only): tokenless callers are workflows queued before claim
 * tokens existed, and letting them clear `scan_started_at` unconditionally
 * would re-introduce exactly the stale-finisher bug the token prevents.
 */
export const markGeoScanFinished = Effect.fn("geo.markScanFinished")(function* (
  projectId: string,
  claimedAt?: Date
) {
  yield* geoDb("scan finish stamp failed", () =>
    db
      .update(geoSettings)
      .set(
        claimedAt
          ? { lastScanAt: new Date(), scanStartedAt: null }
          : { lastScanAt: new Date() }
      )
      .where(
        claimedAt
          ? and(
              eq(geoSettings.projectId, projectId),
              eq(geoSettings.scanStartedAt, claimedAt)
            )
          : eq(geoSettings.projectId, projectId)
      )
  );
});

function finishStamp(projectId: string, claimedAt?: Date) {
  return markGeoScanFinished(projectId, claimedAt).pipe(
    geoSkip("scan finish stamp failed", {
      event: "geo.scan.stamp_failed",
      projectId,
      stamp: "finished",
    })
  );
}

/**
 * Runs `effect` under the project's scan status stamps.
 *
 * With a claim token the slot is already owned, so this does *not* re-stamp
 * the start: the claim wrote `scan_started_at`, and stamping again would move
 * the stale-out deadline and overwrite the very value every compare-and-set
 * downstream keys on. It only ends the run, on any exit.
 *
 * Without a token it tries to claim the slot itself; a blind start stamp here
 * would overwrite a fresh claim held by a concurrent run, and its finish would
 * then hand that claim away. When the claim is lost (or claiming errors), the
 * effect still runs but leaves `geo_settings` untouched, so it cannot end a
 * claim it never owned.
 *
 * Stamp failures are logged and swallowed and never affect the wrapped
 * effect's result or error.
 */
function withGeoScanStatus<A, E, R>(
  projectId: string,
  effect: Effect.Effect<A, E, R>,
  claimedAt?: Date,
  finishStatusStamp?: Effect.Effect<void>
): Effect.Effect<A, E, R> {
  if (claimedAt) {
    return effect.pipe(
      Effect.ensuring(finishStatusStamp ?? finishStamp(projectId, claimedAt))
    );
  }

  return Effect.gen(function* () {
    const claim = yield* claimGeoScanRun(projectId).pipe(
      geoSkip("scan claim failed")
    );
    if (!claim) {
      return yield* effect;
    }
    return yield* effect.pipe(
      Effect.ensuring(finishStamp(projectId, claim.claimedAt))
    );
  });
}

export interface GeoScanRunScope {
  organizationId: string;
  projectId: string;
}

interface GeoScanRunOptions {
  /**
   * Ownership token from `claimGeoScanRun`. The run ends the claim with a
   * compare-and-set on it and never re-stamps the start.
   */
  claimedAt?: Date;
  /** Finalizes the latest token when a long-running scan renews its lease. */
  finishStatusStamp?: Effect.Effect<void>;
  /**
   * Id of a `geo_scans` row the trigger already inserted, so the client that
   * triggered the scan can poll it. The run adopts that id instead of minting
   * one; see `createGeoScanRow` for why re-inserting it is harmless.
   */
  scanId?: string;
  /**
   * Leave `geo_settings` untouched, for a run that does not own the slot —
   * a conversation replay that lost the claim to a scan already in flight.
   * Stamping there would let this run's finish free that scan's claim.
   */
  skipStatusStamps?: boolean;
}

/**
 * Inserts the `geo_scans` row a run writes its checks against, returning its
 * id.
 *
 * `scanId` lets a trigger mint the id *before* the run exists — the public API
 * hands that id straight back so a client can poll the scan instead of
 * guessing which row the workflow eventually created. The insert is therefore
 * idempotent: the trigger already wrote this row, and the run re-issuing the
 * same values must not fail on the primary key. Without an id the row is new
 * by construction and the conflict arm never fires.
 */
export const createGeoScanRow = Effect.fn("geo.createScanRow")(function* (
  scope: GeoScanRunScope,
  scanId?: string
) {
  const id = scanId ?? crypto.randomUUID();
  yield* geoDb("scan row insert failed", () =>
    db
      .insert(geoScans)
      .values({
        id,
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        status: "running",
        startedAt: new Date(),
      })
      .onConflictDoNothing({ target: geoScans.id })
  );

  // A supplied id may already exist because the trigger inserted the row
  // before handing the workflow off. Adopt it only when it belongs to this
  // exact run scope; an id collision from another project must fail closed.
  const row = yield* geoDb("scan row ownership verification failed", () =>
    db.query.geoScans.findFirst({
      columns: { id: true },
      where: and(
        eq(geoScans.id, id),
        eq(geoScans.organizationId, scope.organizationId),
        eq(geoScans.projectId, scope.projectId),
        eq(geoScans.status, "running")
      ),
    })
  );
  if (!row) {
    return yield* Effect.fail(
      new GeoScanStartError({
        cause: new Error(
          "The scan row is not pending for this organization and project"
        ),
      })
    );
  }
  return id;
});

/**
 * Ends a pre-created scan row whose run never happened — a hand-off the
 * dashboard definitely refused, or a workflow that skipped the project.
 *
 * Guarded on `status = 'running'`, so it can never overwrite the verdict a run
 * that *did* execute already wrote. That makes it safe as a catch-all
 * finalizer and keeps a phantom "running" scan from lingering for clients that
 * poll the id the trigger handed them.
 */
/**
 * Fails every `geo_scans` row still `running` past the claim stale window
 * whose project's scan-slot claim has also gone stale. A run in that state
 * was killed without reaching its own finalizer (function timeout, crashed
 * instance) and only misleads clients polling it.
 *
 * The row's own `started_at` is immutable, so age alone cannot distinguish a
 * dead run from a legitimately long one: an alive batched scan renews
 * `geo_settings.scan_started_at` as it goes. Rows are therefore left alone
 * while their project's claim stamp is fresh — a dead run stops renewing and
 * gets swept one stale window later.
 */
export const sweepStaleGeoScanRows = Effect.fn("geo.sweepStaleScanRows")(
  function* (scope?: GeoScanRunScope) {
    const staleBefore = new Date(Date.now() - GEO_SCAN_STALE_MS);
    const failed = yield* geoDb("stale scan sweep failed", () =>
      db
        .update(geoScans)
        .set({ status: "failed", finishedAt: new Date() })
        .where(
          and(
            eq(geoScans.status, "running"),
            lt(geoScans.startedAt, staleBefore),
            scope
              ? eq(geoScans.organizationId, scope.organizationId)
              : undefined,
            scope ? eq(geoScans.projectId, scope.projectId) : undefined,
            notExists(
              db
                .select({ id: geoSettings.id })
                .from(geoSettings)
                .where(
                  and(
                    eq(geoSettings.projectId, geoScans.projectId),
                    gte(geoSettings.scanStartedAt, staleBefore)
                  )
                )
            )
          )
        )
        .returning({
          id: geoScans.id,
          organizationId: geoScans.organizationId,
          projectId: geoScans.projectId,
        })
    );
    for (const row of failed) {
      yield* geoLogError({
        event: "geo.scan.failed",
        reason: "stale_running_row",
        organizationId: row.organizationId,
        projectId: row.projectId,
        scanId: row.id,
      });
    }
    return failed.length;
  }
);

export const failPendingGeoScanRow = Effect.fn("geo.failPendingScanRow")(
  function* (scope: GeoScanRunScope, scanId: string) {
    yield* geoDb("scan row fail stamp failed", () =>
      db
        .update(geoScans)
        .set({ status: "failed", finishedAt: new Date() })
        .where(
          and(
            eq(geoScans.id, scanId),
            eq(geoScans.organizationId, scope.organizationId),
            eq(geoScans.projectId, scope.projectId),
            eq(geoScans.status, "running")
          )
        )
    );
  }
);

export const finishGeoScanRow = Effect.fn("geo.finishScanRow")(function* (
  scope: GeoScanRunScope,
  scanId: string,
  status: "completed" | "failed"
) {
  yield* geoDb("scan row finish failed", () =>
    db
      .update(geoScans)
      .set({ status, finishedAt: new Date() })
      .where(
        and(
          eq(geoScans.id, scanId),
          eq(geoScans.organizationId, scope.organizationId),
          eq(geoScans.projectId, scope.projectId),
          eq(geoScans.status, "running")
        )
      )
  ).pipe(
    // Only retry this idempotent status write, never the surrounding scan or
    // billing settlement. The running predicate also handles a lost DB reply.
    Effect.retry(
      Schedule.exponential("100 millis").pipe(Schedule.upTo({ times: 3 }))
    )
  );
});

/**
 * Runs one persisted scan: inserts a `geo_scans` row (or adopts the one the
 * trigger pre-created, via `options.scanId`), hands its id to `run`, and
 * stamps the row `completed` on success or `failed` on error or interruption.
 * Also maintains the `geo_settings` started/finished stamps the dashboard
 * polls. Insert failure aborts the scan — checks FK to `geo_scans`, so a
 * synthetic id would only waste model calls.
 *
 * The status finalizer covers the whole wrapped effect, including the
 * `geo_scans` insert, so a failure there still ends the claim.
 */
export function withGeoScanRun<A, E, R>(
  scope: GeoScanRunScope,
  run: (scanId: string) => Effect.Effect<A, E, R>,
  options?: GeoScanRunOptions
): Effect.Effect<A, E | GeoDatabaseError | GeoScanStartError, R> {
  const tracked = Effect.gen(function* () {
    const scanId = yield* createGeoScanRow(scope, options?.scanId);
    return yield* run(scanId).pipe(
      Effect.onExit((exit) =>
        Effect.gen(function* () {
          if (Exit.isFailure(exit)) {
            yield* geoLogError({
              event: "geo.scan.failed",
              organizationId: scope.organizationId,
              projectId: scope.projectId,
              scanId,
              ...describeGeoCause(exit.cause),
            });
          }
          const status = Exit.isSuccess(exit) ? "completed" : "failed";
          yield* finishGeoScanRow(scope, scanId, status).pipe(
            geoSkip("scan row finish failed", {
              event: "geo.scan.stamp_failed",
              projectId: scope.projectId,
              scanId,
              stamp: status,
            })
          );
        })
      )
    );
  });
  if (options?.skipStatusStamps) {
    return tracked;
  }
  return withGeoScanStatus(
    scope.projectId,
    tracked,
    options?.claimedAt,
    options?.finishStatusStamp
  );
}
