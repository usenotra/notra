import {
  internalGeoSequenceRunResponseSchema,
  internalGeoWriterPlanResponseSchema,
} from "@notra/schemas/api/internal-geo";
import type { z } from "zod";

import {
  GEO_SEQUENCE_RUN_INTERNAL_PATH,
  GEO_WRITER_PLAN_INTERNAL_PATH,
} from "../constants/geo";
import type { GeoOutcome } from "../types/geo";
import {
  getInternalWorkflowUrl,
  SYNCHRONOUS_INTERNAL_CALL_TIMEOUT_MS,
} from "../utils/internal-workflow";
import { runRemoteGeoEffect } from "./geo";

interface InternalWorkflowEnv {
  WORKFLOW_BASE_URL?: string;
}

export interface RemoteGeoOperation<A> {
  readonly label: string;
  readonly path: string;
  readonly responseSchema: z.ZodType<A>;
  readonly timeoutMessage: string;
  readonly unavailableMessage: string;
}

type InternalGeoWriterPlanResponse = z.infer<
  typeof internalGeoWriterPlanResponseSchema
>;

type InternalGeoSequenceRunResponse = z.infer<
  typeof internalGeoSequenceRunResponseSchema
>;

/** Paid synchronous brief planning — dashboard-only billing gates. */
export const GEO_REMOTE_WRITER_PLAN: RemoteGeoOperation<InternalGeoWriterPlanResponse> =
  {
    label: "writerPlan",
    path: GEO_WRITER_PLAN_INTERNAL_PATH,
    responseSchema: internalGeoWriterPlanResponseSchema,
    timeoutMessage:
      "Brief planning is taking longer than expected and is still in progress. Do not retry. List the project's GEO briefs to find the result.",
    unavailableMessage: "Brief planning is unavailable",
  };

/** Paid synchronous sequence run — dashboard-only model credentials. */
export const GEO_REMOTE_SEQUENCE_RUN: RemoteGeoOperation<InternalGeoSequenceRunResponse> =
  {
    label: "sequenceRun",
    path: GEO_SEQUENCE_RUN_INTERNAL_PATH,
    responseSchema: internalGeoSequenceRunResponseSchema,
    timeoutMessage:
      "The sequence run is taking longer than expected and is still in progress. Do not retry. Check the project's GEO checks for the result.",
    unavailableMessage: "Sequence runs are unavailable",
  };

/** Resolves the dashboard URL for a configured remote GEO operation. */
export function resolveRemoteGeoUrl(
  env: InternalWorkflowEnv,
  operation: Pick<RemoteGeoOperation<unknown>, "path">
): string | null {
  return getInternalWorkflowUrl(env, operation.path);
}

/**
 * Runs a pre-configured remote GEO operation with the mandatory synchronous
 * timeout and caller-specific no-retry guidance.
 */
export async function runConfiguredRemoteGeoEffect<A>(
  operation: RemoteGeoOperation<A>,
  url: string,
  payload: unknown
): Promise<GeoOutcome<A>> {
  return runRemoteGeoEffect(operation.label, url, payload, {
    responseSchema: operation.responseSchema,
    timeoutMs: SYNCHRONOUS_INTERNAL_CALL_TIMEOUT_MS,
    timeoutMessage: operation.timeoutMessage,
  });
}
