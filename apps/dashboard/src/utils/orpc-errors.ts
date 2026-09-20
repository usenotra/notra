import { toORPCError } from "@orpc/client";
import { ORPCError } from "@orpc/server";

const SERVER_ERROR_STATUS_THRESHOLD = 500;

export function isServerFailureError(error: unknown): boolean {
  if (error instanceof ORPCError) {
    return error.status >= SERVER_ERROR_STATUS_THRESHOLD;
  }
  return true;
}

export function isNotFoundError(error: unknown): boolean {
  return toORPCError(error).code === "NOT_FOUND";
}

export function getConflictRevision(error: unknown): {
  isConflict: boolean;
  updatedAt: string | null;
} {
  const orpcError = toORPCError(error);
  if (orpcError.code !== "CONFLICT") {
    return { isConflict: false, updatedAt: null };
  }
  const data = orpcError.data;
  if (
    typeof data === "object" &&
    data !== null &&
    "updatedAt" in data &&
    typeof data.updatedAt === "string"
  ) {
    return { isConflict: true, updatedAt: data.updatedAt };
  }
  return { isConflict: true, updatedAt: null };
}
