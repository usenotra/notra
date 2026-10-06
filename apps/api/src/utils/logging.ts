import { logError as logServerError } from "@notra/ai/utils/server-log";

export function logError(prefix: string, error: unknown) {
  logServerError(prefix, error);
}
