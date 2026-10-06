import { ACORN_LOCATION_SUFFIX } from "../constants/errors";
import type { AcornSyntaxError, MicromarkErrorPlace } from "../types/errors";
import type { LineColumn } from "../types/paths";

export function errorSummary(error: unknown): string {
  return (error as Error).message.split("\n")[0] ?? "";
}

export function acornSyntaxError(error: unknown): AcornSyntaxError {
  return {
    message: (error as Error).message.replace(ACORN_LOCATION_SUFFIX, ""),
    offset: (error as { pos?: number }).pos ?? 0,
  };
}

export function micromarkErrorPosition(error: unknown): Partial<LineColumn> {
  const place = (error as { place?: MicromarkErrorPlace }).place;
  const line = place?.line ?? place?.start?.line;
  const column = place?.column ?? place?.start?.column;
  return { ...(line ? { line } : {}), ...(column ? { column } : {}) };
}
