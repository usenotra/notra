import { deleteStaleGeoOpenCodeBoxes } from "@notra/ai/utils/geo-opencode-box";
import { db } from "@notra/db/drizzle";
import { geoSettings } from "@notra/db/schema";
import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_SCAN_DUE_LIMIT_PER_SWEEP,
  GEO_SCAN_START_LEASE_MS,
  GEO_SCAN_STALE_MS,
} from "../constants/geo";
import type { DueGeoScanRow, GeoScanCronSweepResult } from "../types/geo";
import { describeGeoError, geoLogInfo, geoLogWarn } from "../utils/geo-log";
import { geoDb, geoSkip } from "./effect";
import { startClaimedGeoScanRun } from "./scan-handoff";
import { claimGeoScanRun, sweepStaleGeoScanRows } from "./scan-status";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

function geoScanIntervalMs(scanIntervalHours: number) {
  return scanIntervalHours * MS_PER_HOUR;
}

/**
 * Drops the sub-minute part of a schedule stamp.
 *
 * The cron sweep fires a few dozen seconds into each ten-minute slot, so a
 * stamp that carries the seconds of an earlier sweep can land a hair *after*
 * the tick that should have caught it and slip a whole slot. Every stamp this
 * module persists therefore sits on a whole minute, which is always strictly
 * before the tick of that minute.
 */
function truncateToMinute(date: Date) {
  return new Date(date.getTime() - (date.getTime() % MS_PER_MINUTE));
}

/**
 * Arms a schedule that has no usable anchor: one interval out from `from`, on
 * a whole minute (see `truncateToMinute`).
 */
export function nextGeoScanAt(scanIntervalHours: number, from = new Date()) {
  return truncateToMinute(
    new Date(from.getTime() + geoScanIntervalMs(scanIntervalHours))
  );
}

/**
 * The stamp that follows `dueAt` on a fixed cadence: the first
 * `dueAt + n × interval` past `now + leadMs` (one stale window by default).
 *
 * Anchoring on the previous stamp instead of on `now` is what keeps a daily
 * scan at the same time of day. The sweep polls every ten minutes, so `now`
 * is always a few seconds to minutes late; `now + interval` compounded that
 * lateness into a stamp that crept ~10 minutes later every single day.
 *
 * The lead of one stale window matters when a schedule catches up after a
 * long outage: a slot that would fall a minute after the catch-up scan starts
 * is skipped, because the claim of the scan just started would reject it as
 * `already_running` anyway and burn a full interval.
 */
export function nextGeoScanAtAfter(
  scanIntervalHours: number,
  dueAt: Date,
  now = new Date(),
  leadMs = GEO_SCAN_STALE_MS
) {
  const interval = geoScanIntervalMs(scanIntervalHours);
  const earliest = now.getTime() + leadMs;
  const elapsed = Math.max(0, earliest - dueAt.getTime());
  const steps = Math.floor(elapsed / interval) + 1;
  return truncateToMinute(new Date(dueAt.getTime() + steps * interval));
}

/**
 * The stamp a schedule gets when it is (re)armed from settings: the next slot
 * on the cadence after the last finished attempt (`last_scan_at` is stamped
 * for failed runs too — see `markGeoScanFinished`), or due immediately when
 * that slot has already passed (no scan yet, or the last one is older than the
 * interval). Enabling scans or shortening the interval therefore never pushes
 * the first scan a full interval away.
 */
export function rearmedGeoScanAt(
  scanIntervalHours: number,
  lastScanAt: Date | null,
  now = new Date()
) {
  const dueNow = truncateToMinute(now);
  if (!lastScanAt) {
    return dueNow;
  }
  const next = truncateToMinute(
    new Date(lastScanAt.getTime() + geoScanIntervalMs(scanIntervalHours))
  );
  return next > now ? next : dueNow;
}

/**
 * Takes a short lease on one due settings row with a compare-and-set on the
 * due condition, so overlapping cron ticks cannot both fire the same project.
 *
 * The lease lives in its own column: `next_scan_at` stays the true slot the
 * sweep is scanning for, and is only moved once a scan provably started (or
 * turned out to be covered). That is what makes a retry safe — it still knows
 * which slot it is serving, so the cadence keeps its time of day and a scan
 * that finished in between is still recognised as covering the slot.
 *
 * A tick whose scan never started therefore costs `GEO_SCAN_START_LEASE_MS`,
 * not a whole interval. That was the production failure: the stamp moved a
 * full day ahead *before* the hand-off, and an ambiguous hand-off (a
 * deployment cutting the request) made paying projects scan every second day.
 *
 * Returns the lease and stable slot it wrote, or `null` when another sweep
 * owns the row or settings changed after the due lookup.
 *
 * `next_scan_at IS NULL` counts as due: rows migrated from the message-based
 * schedule (and rows enabled before this column existed) catch up on the
 * first sweep after deploy and are armed one interval out; every later tick
 * stays on that cadence.
 */
const leaseDueGeoScanTick = Effect.fn("geo.leaseDueScanTick")(function* (
  row: DueGeoScanRow
) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + GEO_SCAN_START_LEASE_MS);
  // Persist a migrated row's first slot with its lease, so retries keep it.
  const nextScanAt = row.nextScanAt ?? truncateToMinute(now);
  const leased = yield* geoDb("scan tick lease failed", () =>
    db
      .update(geoSettings)
      .set({ scanLeaseUntil: leaseUntil, nextScanAt })
      .where(
        and(
          eq(geoSettings.id, row.id),
          eq(geoSettings.enabled, true),
          eq(geoSettings.scanIntervalHours, row.scanIntervalHours),
          row.nextScanAt
            ? eq(geoSettings.nextScanAt, row.nextScanAt)
            : isNull(geoSettings.nextScanAt),
          or(isNull(geoSettings.nextScanAt), lte(geoSettings.nextScanAt, now)),
          or(
            isNull(geoSettings.scanLeaseUntil),
            lte(geoSettings.scanLeaseUntil, now)
          )
        )
      )
      .returning({ id: geoSettings.id })
  );
  return leased.length > 0 ? { leaseUntil, nextScanAt } : null;
});

/**
 * Moves a leased row to the next slot on the cadence and hands the lease back.
 *
 * The compare-and-set on the exact lease stamp is what keeps this safe after a
 * slow hand-off: if our lease already expired and another sweep leased the
 * row, that sweep owns the schedule and our write must not clobber it. Losing
 * the race is reported, because it means this slot was advanced by someone
 * else and the project may be scanned twice for it.
 */
const advanceGeoScanSlot = Effect.fn("geo.advanceScanSlot")(function* (
  row: DueGeoScanRow,
  leaseUntil: Date,
  coveredAt?: Date
) {
  // A historical finish only covers slots through that finish, not through
  // this sweep. Leave later unserved slots due, even after a long outage.
  const nextScanAt = row.nextScanAt
    ? nextGeoScanAtAfter(
        row.scanIntervalHours,
        row.nextScanAt,
        coveredAt,
        coveredAt ? 0 : GEO_SCAN_STALE_MS
      )
    : nextGeoScanAt(row.scanIntervalHours);
  const advanced = yield* geoDb("scan slot advance failed", () =>
    db
      .update(geoSettings)
      .set({ nextScanAt, scanLeaseUntil: null })
      .where(
        and(
          eq(geoSettings.id, row.id),
          eq(geoSettings.scanLeaseUntil, leaseUntil)
        )
      )
      .returning({ id: geoSettings.id })
  );
  return advanced.length > 0;
});

/**
 * Stretches a failed tick's lease to a full stale window, with the same
 * compare-and-set as the advance.
 *
 * A hand-off the dashboard definitely refuses (a bad deploy, a route that 500s
 * for this project) releases the scan claim, so nothing throttles the retry:
 * on the 15-minute lease alone the project would burn 96 failed `geo_scans`
 * rows a day. Backing off to `GEO_SCAN_STALE_MS` bounds one slot to about
 * `interval / GEO_SCAN_STALE_MS` attempts (12 for a daily scan), and the slot
 * is given up entirely once it is a whole interval overdue.
 */
const backOffGeoScanLease = Effect.fn("geo.backOffScanLease")(function* (
  row: DueGeoScanRow,
  leaseUntil: Date
) {
  yield* geoDb("scan lease back-off failed", () =>
    db
      .update(geoSettings)
      .set({ scanLeaseUntil: new Date(Date.now() + GEO_SCAN_STALE_MS) })
      .where(
        and(
          eq(geoSettings.id, row.id),
          eq(geoSettings.scanLeaseUntil, leaseUntil)
        )
      )
  );
});

/**
 * One cron sweep: fails scan rows a killed run left on "running", then starts
 * a workflow for every project whose `next_scan_at` has passed.
 *
 * Each due row is leased for `GEO_SCAN_START_LEASE_MS` first and only moved to
 * its next slot once a scan provably started, so nothing that failed to start
 * silently waits a full interval. The three ways a row can keep its lease and
 * be retried by a later sweep are:
 *
 * - the project's scan slot is already claimed (a manual scan is in flight, or
 *   a ghost claim from an ambiguous hand-off still has to go stale),
 * - the hand-off failed (the lease then backs off to `GEO_SCAN_STALE_MS`, and
 *   the slot is abandoned once it is a whole interval overdue),
 * - the process died mid-sweep.
 *
 * A slot that an attempt finishing after it became due already covered (that
 * manual scan, or an ambiguous hand-off that did start after all) is advanced
 * without starting anything, so a project is never scanned twice for one slot.
 */
export const runGeoScanCronSweep = Effect.fn("geo.runScanCronSweep")(
  function* () {
    yield* Effect.tryPromise({
      try: deleteStaleGeoOpenCodeBoxes,
      catch: (cause) => cause,
    }).pipe(geoSkip("stale OpenCode box sweep failed"));

    const staleScansFailed = yield* sweepStaleGeoScanRows().pipe(
      geoSkip("stale scan sweep failed"),
      Effect.map((count) => count ?? 0)
    );

    const now = new Date();
    const dueRows = yield* geoDb("due scan lookup failed", () =>
      db.query.geoSettings.findMany({
        columns: {
          id: true,
          organizationId: true,
          projectId: true,
          scanIntervalHours: true,
          nextScanAt: true,
          lastScanAt: true,
        },
        where: and(
          eq(geoSettings.enabled, true),
          or(isNull(geoSettings.nextScanAt), lte(geoSettings.nextScanAt, now)),
          or(
            isNull(geoSettings.scanLeaseUntil),
            lte(geoSettings.scanLeaseUntil, now)
          )
        ),
        orderBy: [
          desc(isNull(geoSettings.nextScanAt)),
          asc(geoSettings.nextScanAt),
        ],
        limit: GEO_SCAN_DUE_LIMIT_PER_SWEEP,
      })
    );

    let started = 0;
    let covered = 0;
    let leaseLost = 0;
    let alreadyRunning = 0;
    let failed = 0;
    let advanceLost = 0;

    // Advancing is the only write that can silently lose its row (another
    // sweep leased it after our lease expired), so every call goes through
    // this counter instead of assuming the slot moved.
    const advance = (row: DueGeoScanRow, leaseUntil: Date, coveredAt?: Date) =>
      Effect.gen(function* () {
        const advanced = yield* advanceGeoScanSlot(
          row,
          leaseUntil,
          coveredAt
        ).pipe(
          geoSkip("scan slot advance failed", {
            event: "geo.scan.slot_advance_failed",
            organizationId: row.organizationId,
            projectId: row.projectId,
          })
        );
        // A database error was logged above; only a successful zero-row
        // update proves that another sweep took ownership of the lease.
        if (advanced === null) {
          return null;
        }
        if (advanced) {
          return true;
        }
        advanceLost += 1;
        yield* geoLogWarn({
          event: "geo.scan.slot_advance_lost",
          organizationId: row.organizationId,
          projectId: row.projectId,
          nextScanAt: row.nextScanAt?.toISOString() ?? null,
        });
        return false;
      });

    for (const candidate of dueRows) {
      const lease = yield* leaseDueGeoScanTick(candidate).pipe(
        geoSkip("scan tick lease failed")
      );
      if (!lease) {
        leaseLost += 1;
        continue;
      }
      const { leaseUntil } = lease;
      const row = { ...candidate, nextScanAt: lease.nextScanAt };

      // An attempt that finished after this slot became due already answers
      // for it: starting another one would bill the organization twice for the
      // same slot. `last_scan_at` marks the last *attempt* (failed runs stamp
      // it too), which deliberately caps a slot at one scan. The check rides
      // inside the claim statement, because a scan finishing between a
      // separate read and the claim would free the slot and slip through.
      const anchor = row.nextScanAt;
      const claim = yield* claimGeoScanRun(row.projectId, {
        unlessFinishedAfter: anchor,
      }).pipe(geoSkip("scan claim failed"));
      if (!claim) {
        const current = yield* geoDb("scan coverage lookup failed", () =>
          db.query.geoSettings.findFirst({
            columns: { lastScanAt: true },
            where: eq(geoSettings.id, row.id),
          })
        ).pipe(geoSkip("scan coverage lookup failed"));
        if (current?.lastScanAt && current.lastScanAt > anchor) {
          const advanced = yield* advance(row, leaseUntil, current.lastScanAt);
          if (advanced) {
            covered += 1;
            yield* geoLogInfo({
              event: "geo.scan.slot_covered",
              organizationId: row.organizationId,
              projectId: row.projectId,
            });
          }
          continue;
        }
        // Keep the lease: the row retries once it expires, by which time the
        // running scan has either stamped `last_scan_at` past the anchor (the
        // slot is then covered) or its ghost claim has gone stale.
        alreadyRunning += 1;
        yield* geoLogWarn({
          event: "geo.scan.skipped",
          reason: "already_running",
          organizationId: row.organizationId,
          projectId: row.projectId,
        });
        continue;
      }

      const startResult = yield* startClaimedGeoScanRun(
        row.organizationId,
        row.projectId,
        claim.claimedAt
      ).pipe(
        Effect.catch((error) =>
          geoLogWarn({
            event: "geo.scan.start_failed",
            organizationId: row.organizationId,
            projectId: row.projectId,
            ...describeGeoError(error),
          }).pipe(Effect.as(null))
        )
      );
      if (startResult) {
        // The scan is running and billed either way, so it counts as started
        // even when another sweep took the row's schedule from under us.
        yield* advance(row, leaseUntil);
        started += 1;
        continue;
      }

      failed += 1;
      const overdueBy = now.getTime() - anchor.getTime();
      if (overdueBy >= geoScanIntervalMs(row.scanIntervalHours)) {
        // The slot is a whole interval behind: retrying it forever only piles
        // up failed scan rows, and the next slot is the one worth scanning.
        yield* advance(row, leaseUntil);
        yield* geoLogWarn({
          event: "geo.scan.slot_abandoned",
          organizationId: row.organizationId,
          projectId: row.projectId,
          anchor: anchor.toISOString(),
        });
        continue;
      }
      yield* backOffGeoScanLease(row, leaseUntil).pipe(
        geoSkip("scan lease back-off failed")
      );
    }

    const result: GeoScanCronSweepResult = {
      due: dueRows.length,
      started,
      covered,
      leaseLost,
      alreadyRunning,
      failed,
      advanceLost,
      staleScansFailed,
    };
    yield* geoLogInfo({
      event: "geo.scan.sweep",
      ...result,
      projectIds: dueRows.map((row) => row.projectId),
    });
    return result;
  }
);
