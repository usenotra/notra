export interface McpTelemetryFields {
  organizationId: string;
  integrationId: string;
  toolId: string;
  surface: string;
}

export type McpToolOutcome =
  | { outcome: "success"; errorKind?: never }
  | { outcome: "error"; errorKind: "operation_error" | "tool_error" }
  | { outcome: "cancelled"; errorKind: "cancelled" };

export type McpToolTelemetryEvent = McpTelemetryFields &
  McpToolOutcome & {
    event: "mcp.tool.completed";
    requestId?: string;
    userId?: string | null;
    callId: string;
    durationMs: number;
  };

export interface McpToolTelemetryOptions {
  signal?: AbortSignal;
  emit?: (event: McpToolTelemetryEvent) => void;
}
