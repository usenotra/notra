export interface OperationalLogEvent {
  event: "api.request.completed" | "integration.request.completed";
  surface: "api" | "dashboard-rpc" | "context-dev";
  durationMs: number;
  status?: number;
  outcome: "success" | "error";
  errorKind?:
    | "client_error"
    | "server_error"
    | "transport_error"
    | "operation_error";
  requestId?: string;
  method: string;
  routeId: string;
  organizationId?: string | null;
  projectId?: string | null;
  provider?: string;
  errorName?: string;
}

export interface OperationalContext {
  requestId: string;
  organizationId?: string | null;
  projectId?: string | null;
  runId?: string;
}

export type LogFlushScheduler = (flush: () => Promise<void>) => void;
