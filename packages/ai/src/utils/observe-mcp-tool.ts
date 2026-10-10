import { log } from "@notra/ai/evlog";
import type {
  McpTelemetryFields,
  McpToolOutcome,
  McpToolTelemetryOptions,
} from "@notra/ai/types/mcp-telemetry";
import { getOperationalContext } from "@notra/ai/utils/operational-context";

/** One content-free event per logical call, including OAuth retry and local failures. */
export async function observeMcpTool<T>(
  fields: McpTelemetryFields,
  operation: () => Promise<T>,
  {
    signal,
    emit = (event) => log.info({ ...event }),
  }: McpToolTelemetryOptions = {}
): Promise<T> {
  const startedAt = performance.now();
  let outcome: McpToolOutcome = {
    outcome: "error",
    errorKind: "operation_error",
  };
  try {
    const result = await operation();
    const isError = Boolean(
      result &&
      typeof result === "object" &&
      "isError" in result &&
      result.isError === true
    );
    outcome = isError
      ? { outcome: "error", errorKind: "tool_error" }
      : { outcome: "success" };
    return result;
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      outcome = { outcome: "cancelled", errorKind: "cancelled" };
    }
    throw error;
  } finally {
    // Monitoring failure must never change the tool result or original exception.
    try {
      const context = getOperationalContext();
      emit({
        event: "mcp.tool.completed",
        requestId: context?.requestId,
        userId: context?.userId,
        callId: crypto.randomUUID(),
        ...fields,
        ...outcome,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      });
    } catch {
      // Best-effort telemetry, not a tool execution dependency.
    }
  }
}
