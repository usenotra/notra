import { Effect } from "effect";

import { GeoEntitlementService, GeoWorkflowService } from "../deps";
import { isDefiniteGeoScanHandoffRejection } from "../utils/geo-scan";
import { geoSkip } from "./effect";
import { GeoScanStartError } from "./errors";
import {
  createGeoScanRow,
  failPendingGeoScanRow,
  releaseGeoScanRun,
} from "./scan-status";

/**
 * The billing gate's denial for a scan nobody has claimed yet, or `null` when
 * the scan may start.
 *
 * The workflow reserves billing in its first step, after the trigger already
 * claimed the slot, inserted a `geo_scans` row and started a run. Without this
 * check an organization out of credits got a 202 and a scan that failed a
 * moment later, and every schedule tick left another failed row behind.
 *
 * A check that errors returns `null`: the workflow's own gate still decides,
 * so a billing outage cannot stop scans that would have been allowed.
 */
export const findGeoScanBillingDenial = Effect.fn("geo.findScanBillingDenial")(
  function* (organizationId: string, projectId: string) {
    const entitlements = yield* GeoEntitlementService;
    const gate = yield* entitlements.checkScanBilling(organizationId).pipe(
      geoSkip("scan billing precheck failed", {
        event: "geo.scan.billing_precheck_failed",
        organizationId,
        projectId,
      })
    );
    return gate && !gate.allowed ? gate : null;
  }
);

/**
 * Materializes the `geo_scans` row a *claimed* scan will be known by, hands the
 * scan to the host's workflow starter, and decides what the claim owes when the
 * hand-off fails.
 *
 * The row is inserted here, before the hand-off, because the run's `runId`
 * identifies a workflow execution and never mapped to anything a client can
 * read. Callers therefore get a `scanId` that
 * `GET /v1/projects/{id}/geo/scans/{scanId}` already answers for, instead of
 * racing the workflow to see which row it eventually created. The started run
 * adopts the id rather than minting one. A failed insert provably started
 * nothing, so the claim goes straight back.
 *
 * The claim token travels with the payload too, so the run that starts here is
 * the only writer allowed to end this claim.
 *
 * The failure split is the whole point:
 *
 * - Definitely refused (an explicit non-2xx from the internal route, or a
 *   connection that was never established): nothing is running, so hand the
 *   slot straight back instead of blocking the next trigger for
 *   `GEO_SCAN_STALE_MS`, and stamp the pre-created scan row `failed` so a
 *   client polling it is not left waiting on a scan that never started.
 * - Ambiguous (a timeout or a dropped socket after the request went out, a
 *   success whose body we could not read): the workflow may have been accepted
 *   and may be scanning right now. Releasing would let the next trigger start a
 *   second scan the organization pays for, so hold the claim and let it go
 *   stale — and leave the scan row `running`, because the run that may own it
 *   is the one entitled to write its verdict. The compare-and-set on
 *   `claimedAt` narrows the blast radius of the opposite mistake but cannot
 *   rule it out, which is exactly why the ambiguous case must not release.
 */
export const startClaimedGeoScanRun = Effect.fn("geo.startClaimedScanRun")(
  function* (
    organizationId: string,
    projectId: string,
    claimedAt: Date,
    promptIds?: readonly string[],
    engines?: readonly string[]
  ) {
    const workflows = yield* GeoWorkflowService;
    const scanId = yield* createGeoScanRow({ organizationId, projectId }).pipe(
      Effect.tapError(() =>
        releaseGeoScanRun(projectId, claimedAt).pipe(
          geoSkip("scan claim release failed")
        )
      )
    );

    const { runId } = yield* workflows
      .startGeoScanRun({
        organizationId,
        projectId,
        claimedAt: claimedAt.toISOString(),
        scanId,
        ...(promptIds ? { promptIds: [...promptIds] } : {}),
        ...(engines ? { engines: [...engines] } : {}),
      })
      .pipe(
        Effect.mapError((cause) => new GeoScanStartError({ cause })),
        Effect.tapError((error) => {
          if (isDefiniteGeoScanHandoffRejection(error.cause)) {
            return Effect.all(
              [
                releaseGeoScanRun(projectId, claimedAt).pipe(
                  geoSkip("scan claim release failed")
                ),
                failPendingGeoScanRow(
                  { organizationId, projectId },
                  scanId
                ).pipe(geoSkip("scan row fail stamp failed")),
              ],
              { discard: true }
            );
          }
          return Effect.logWarning(
            `geo: scan hand-off for project ${projectId} failed with an unknown outcome; holding the claim until it goes stale`
          );
        })
      );

    return { runId, scanId };
  }
);
