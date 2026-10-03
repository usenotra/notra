import { geoLog } from "@notra/ai/evlog";
import type { GeoLogEvent } from "@notra/ai/types/evlog";
import { Effect } from "effect";

import {
  GEO_INGEST_DROPPED_LOG_SAMPLE_RATE,
  GEO_INGEST_ERROR_MESSAGE_MAX_LENGTH,
} from "../constants/ingest";
import type { GeoIngestDefer, GeoIngestResult } from "../types/ingest";
import {
  getGeoIngestRegion,
  getGeoIngestRuntime,
} from "../utils/ingest-runtime";
import { type GeoIngestError, GeoIngestFailedError } from "./errors";
import { runGeoIngest } from "./pipeline";
import {
  toGeoIngestAcceptedResponse,
  toGeoIngestErrorResponse,
} from "./response";

type IngestLogFields = Omit<GeoLogEvent, "event">;

const FAILURE_REASONS = {
  GeoIngestMissingToken: "missing_token",
  GeoIngestInvalidToken: "invalid_token",
  GeoIngestRateLimited: "rate_limited",
  GeoIngestInvalidPayload: "invalid_payload",
  GeoIngestUnparseableUrl: "invalid_url",
  GeoIngestFailed: "failed",
} as const satisfies Record<GeoIngestError["_tag"], string>;

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, GEO_INGEST_ERROR_MESSAGE_MAX_LENGTH);
}

function describeResult(result: GeoIngestResult): IngestLogFields {
  return { ...result, projectId: result.projectId ?? "" };
}

function describeFailure(failure: GeoIngestError): IngestLogFields {
  const fields: IngestLogFields = {
    outcome: failure._tag === "GeoIngestFailed" ? "failed" : "rejected",
    reason: FAILURE_REASONS[failure._tag],
  };
  if (failure._tag === "GeoIngestRateLimited") {
    fields.organizationId = failure.organizationId;
  }
  if (failure._tag === "GeoIngestFailed") {
    fields.errorMessage = errorMessage(failure.cause);
  }
  return fields;
}

function sampleRateFor(fields: IngestLogFields): number {
  return fields.outcome === "dropped" && fields.reason === "visitor_type"
    ? GEO_INGEST_DROPPED_LOG_SAMPLE_RATE
    : 1;
}

/**
 * Runs one ingest request and emits exactly one `geo.ingest` event for it,
 * whatever the outcome, so Axiom can chart throughput, status mix and latency
 * for the dashboard route and the Railway service alike.
 */
export async function handleGeoIngestRequest(
  request: Request,
  defer: GeoIngestDefer
): Promise<Response> {
  const startedAt = performance.now();
  let response: Response;
  let fields: IngestLogFields;

  try {
    const outcome = await Effect.runPromise(
      Effect.result(runGeoIngest(request, defer))
    );
    if (outcome._tag === "Failure") {
      response = toGeoIngestErrorResponse(outcome.failure);
      fields = describeFailure(outcome.failure);
    } else {
      response = toGeoIngestAcceptedResponse();
      fields = describeResult(outcome.success);
    }
  } catch (error) {
    // Defects (thrown outside the typed error channel) must still answer and
    // still be counted instead of surfacing as an opaque framework 500.
    response = toGeoIngestErrorResponse(
      new GeoIngestFailedError({ cause: error })
    );
    fields = {
      outcome: "failed",
      reason: "defect",
      errorMessage: errorMessage(error),
    };
  }

  const sampleRate = sampleRateFor(fields);
  if (sampleRate >= 1 || Math.random() < sampleRate) {
    geoLog.info({
      event: "geo.ingest",
      ...fields,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      weight: Math.round(1 / sampleRate),
      runtime: getGeoIngestRuntime(),
      region: getGeoIngestRegion(),
    });
  }

  return response;
}
