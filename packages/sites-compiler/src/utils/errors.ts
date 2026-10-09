import { ACORN_LOCATION_SUFFIX } from "../constants/errors";
import type { AcornSyntaxError, MicromarkErrorPlace } from "../types/errors";
import type { LineColumn } from "../types/paths";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function errorSummary(error: unknown): string {
  return errorMessage(error).split("\n")[0] ?? "";
}

export function acornSyntaxError(error: unknown): AcornSyntaxError {
  return {
    message: errorMessage(error).replace(ACORN_LOCATION_SUFFIX, ""),
    offset: (error as { pos?: number }).pos ?? 0,
  };
}

export function micromarkErrorPosition(error: unknown): Partial<LineColumn> {
  const place = (error as { place?: MicromarkErrorPlace }).place;
  const line = place?.line ?? place?.start?.line;
  const column = place?.column ?? place?.start?.column;
  return { ...(line ? { line } : {}), ...(column ? { column } : {}) };
}
