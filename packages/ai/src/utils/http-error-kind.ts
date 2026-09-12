import type { OperationalLogEvent } from "@notra/ai/types/operational-log";

export function httpErrorKind(
  status: number
): OperationalLogEvent["errorKind"] {
  if (status >= 500) {
    return "server_error";
  }
  return status >= 400 ? "client_error" : undefined;
}
