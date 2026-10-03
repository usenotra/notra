import { flushGeoLog, geoLog } from "@notra/ai/evlog";
import type { GeoLogEvent } from "@notra/ai/types/evlog";
import { Cause, Effect } from "effect";
import { parseError } from "evlog";

import {
  GeoEmptyAnswerError,
  GeoJudgeError,
  GeoTranslationError,
} from "../geo/errors";
import type {
  GeoCheckFailureReason,
  GeoErrorFields,
  GeoSkipFields,
} from "../types/geo";

const DEFAULT_SKIP_EVENT = "geo.step.failed";
const CHECK_FAILED_EVENT = "geo.check.failed";

function errorName(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    typeof error._tag === "string"
  ) {
    return error._tag;
  }
  if (error instanceof Error) {
    return error.name;
  }
  return typeof error;
}

function errorCause(error: unknown): unknown {
  if (typeof error === "object" && error !== null && "cause" in error) {
    return error.cause;
  }
  return undefined;
}

export function describeGeoError(error: unknown): GeoErrorFields {
  const fields: GeoErrorFields = {
    errorName: errorName(error),
    errorMessage: parseError(error).message,
  };
  if (error instanceof GeoEmptyAnswerError) {
    fields.finishReason = error.finishReason;
    fields.usage = error.usage;
  }
  const cause = errorCause(error);
  if (cause !== undefined) {
    fields.causeName = errorName(cause);
    fields.causeMessage = parseError(cause).message;
  }
  return fields;
}

export function describeGeoCause(cause: Cause.Cause<unknown>): GeoErrorFields {
  return describeGeoError(Cause.squash(cause));
}

function geoCheckFailureReason(error: unknown): GeoCheckFailureReason {
  if (error instanceof GeoEmptyAnswerError) {
    return "empty_answer";
  }
  if (error instanceof GeoJudgeError) {
    return "judge_error";
  }
  if (error instanceof GeoTranslationError) {
    return "translation_error";
  }
  return "engine_error";
}

export function logGeoSkip(
  message: string,
  fields: GeoSkipFields | undefined,
  error: unknown
): void {
  const event = fields?.event ?? DEFAULT_SKIP_EVENT;
  const base: GeoLogEvent = {
    ...fields,
    event,
    message,
    ...describeGeoError(error),
  };
  if (event === CHECK_FAILED_EVENT) {
    geoLog.error({ ...base, reason: geoCheckFailureReason(error) });
  } else {
    geoLog.error(base);
  }
  console.error(`[GEO] ${message}:`, error);
}

export function geoLogInfo(event: GeoLogEvent): Effect.Effect<void> {
  return Effect.sync(() => geoLog.info(event));
}

export function geoLogWarn(event: GeoLogEvent): Effect.Effect<void> {
  return Effect.sync(() => geoLog.warn(event));
}

export function geoLogError(event: GeoLogEvent): Effect.Effect<void> {
  return Effect.sync(() => geoLog.error(event));
}

export const flushGeoLogEffect: Effect.Effect<void> = Effect.promise(() =>
  flushGeoLog()
);
