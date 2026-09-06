import type { GeoRouterError } from "@notra/geo-core/geo/errors";
import {
  type GeoFailureWire,
  toGeoFailureWire,
} from "@notra/geo-core/geo/failure-wire";
import { Effect } from "effect";

import { geoCoreApiLayer } from "../lib/geo/configure";
import { remoteGeoFailureBodySchema } from "../schemas/internal-geo";
import type {
  GeoApiRuntime,
  GeoFailure,
  GeoOutcome,
  RemoteGeoEffectOptions,
} from "../types/geo";
import {
  callDashboardInternal,
  InternalDashboardError,
  InternalDashboardTimeoutError,
} from "./internal-workflow";
import { logError } from "./logging";

/**
 * Maps a tagged GEO failure onto an HTTP status and a client-safe message.
 *
 * Mirrors the dashboard's `toGeoOrpcError` so the same domain failure reads
 * the same on both surfaces; only the transport differs (status codes here,
 * ORPCError there).
 *
 * Takes the wire shape rather than the error instance so that a program the
 * dashboard ran on our behalf lands on the same status as one we ran here.
 */
function toGeoFailure(failure: GeoFailureWire): GeoFailure {
  switch (failure._tag) {
    case "GeoProjectNotFoundError":
      return { status: 404, error: "Project not found" };
    case "GeoProjectDeleteBlockedError":
      return {
        status: 409,
        error:
          "Cannot delete the organization's last project. Create another project first.",
      };
    case "GeoPromptNotFoundError":
      return { status: 404, error: "Prompt not found" };
    case "GeoSequenceNotFoundError":
      return { status: 404, error: "Sequence not found" };
    case "GeoContentBriefNotFoundError":
      return { status: 404, error: "Content brief not found" };
    case "GeoBrandIdentityNotFoundError":
      return { status: 404, error: "Brand identity not found" };
    case "GeoBrandIdentityMissingError":
      return {
        status: 400,
        error: "Create a brand identity before creating a project",
      };
    case "GeoSettingsMissingError":
      return {
        status: 404,
        error: "GEO settings are not configured for this project",
      };
    case "GeoSettingsDisabledError":
      return {
        status: 400,
        error: "Enable brand tracking before starting a scan",
      };
    case "GeoPromptDuplicateError":
      return { status: 409, error: "That prompt is already tracked" };
    case "GeoScanAlreadyRunningError":
      return {
        status: 409,
        error: "A scan is already running for this project",
      };
    case "GeoScanEnginesEmptyError":
      return {
        status: 400,
        error: "Select at least one tracked engine to scan",
      };
    case "GeoCompetitorLimitError":
      return {
        status: 400,
        error:
          failure.limit === undefined
            ? "Too many competitors."
            : `Too many competitors. The limit is ${failure.limit}.`,
      };
    case "GeoSequenceRunUnavailableError":
      return {
        status: 400,
        error: "No engine is available for this project's retention policy",
      };
    case "GeoWriterCreditsExhaustedError":
      return {
        status: 402,
        error: failure.message ?? "AI credits are exhausted",
      };
    case "GeoContentBriefStateError":
      return {
        status: 409,
        error: `Content brief is ${failure.status ?? "in another state"} and cannot be changed`,
      };
    case "GeoDiscoveryError":
    case "GeoSequenceRunError":
    case "GeoWriterPlanError":
      return { status: 400, error: failure.message ?? "Invalid request" };
    case "GeoSampleDataDisabledError":
      return { status: 400, error: "Sample data is disabled" };
    case "GeoProjectCreateFailedError":
      return { status: 500, error: "Failed to create the project" };
    case "GeoSequenceCreateFailedError":
      return { status: 500, error: "Failed to create the sequence" };
    case "GeoScanStartError":
      return { status: 500, error: "Failed to start the scan" };
    case "GeoWriterStartError":
      return { status: 500, error: "Failed to start the writer" };
    default:
      return { status: 500, error: "Internal server error" };
  }
}

/**
 * Runs a GEO program and normalizes both failure channels.
 *
 * The API's host capabilities are provided here explicitly. Some adapters use
 * `Effect.promise`, so a rejection there surfaces as a *defect* rather than a
 * typed failure and would escape `Effect.result`. Both channels are caught and
 * reported as a 500 so no route leaks a raw stack trace.
 */
export async function runGeoEffect<A, E extends GeoRouterError>(
  label: string,
  effect: Effect.Effect<A, E, GeoApiRuntime>
): Promise<GeoOutcome<A>> {
  try {
    const outcome = await Effect.runPromise(
      Effect.result(Effect.provide(effect, geoCoreApiLayer))
    );

    if (outcome._tag === "Failure") {
      const failure = toGeoFailure(toGeoFailureWire(outcome.failure));
      if (failure.status === 500) {
        logError(`[GEO] ${label}`, outcome.failure);
      }
      return { ok: false, failure };
    }

    return { ok: true, value: outcome.success };
  } catch (error) {
    logError(`[GEO] ${label} (defect)`, error);
    return {
      ok: false,
      failure: { status: 500, error: "Internal server error" },
    };
  }
}

function readRemoteFailure(detail: string): GeoFailureWire | null {
  try {
    const parsed = remoteGeoFailureBodySchema.safeParse(JSON.parse(detail));
    return parsed.success ? parsed.data.failure : null;
  } catch {
    return null;
  }
}

/**
 * Runs a GEO program that only the dashboard can execute, and normalizes the
 * answer into the same outcome `runGeoEffect` produces.
 *
 * Some programs reach capabilities the API process does not have — the planner
 * model and the `"use step"` billing gates, in particular. Those run behind an
 * internal dashboard route, which returns the tagged domain failure verbatim so
 * the mapping to a status happens here, once, for both execution loci.
 * Every such call is paid synchronous work, so its timeout and operation-specific
 * no-retry guidance are mandatory.
 */
export async function runRemoteGeoEffect<A>(
  label: string,
  url: string,
  payload: unknown,
  options: RemoteGeoEffectOptions<A>
): Promise<GeoOutcome<A>> {
  try {
    return {
      ok: true,
      value: await callDashboardInternal(
        url,
        payload,
        options.responseSchema,
        options.timeoutMs
      ),
    };
  } catch (error) {
    if (error instanceof InternalDashboardTimeoutError) {
      logError(`[GEO] ${label} (remote timeout)`, error);
      // The dashboard is still working and still billing, so tell the client
      // not to fire the same request again.
      return {
        ok: false,
        failure: {
          // The paid operation may still be running, so this is not a
          // retryable service outage. 409 makes that transport distinction
          // machine-readable until these calls have durable job resources.
          status: 409,
          error: options.timeoutMessage,
        },
      };
    }

    const remote =
      error instanceof InternalDashboardError
        ? readRemoteFailure(error.body)
        : null;
    if (remote) {
      const failure = toGeoFailure(remote);
      if (failure.status === 500) {
        logError(`[GEO] ${label} (remote)`, error);
      }
      return { ok: false, failure };
    }

    logError(`[GEO] ${label} (remote)`, error);
    return {
      ok: false,
      failure: { status: 500, error: "Internal server error" },
    };
  }
}
