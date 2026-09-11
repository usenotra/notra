import type { Effect } from "effect";
import type { getWorld } from "workflow/runtime";

export type MonitoringWorld = Awaited<ReturnType<typeof getWorld>>;

export type CollectWorkflowMonitoring = (
  world: MonitoringWorld,
  budgetMs?: number,
  sweepId?: string
) => Effect.Effect<WorkflowMonitoringSummary>;

export interface WorkflowTelemetryEvent extends Record<string, unknown> {
  event:
    | "job.queued"
    | "job.completed"
    | "job.failed"
    | "job.snapshot"
    | "job.step.snapshot"
    | "monitoring.sweep.completed"
    | "monitoring.operation.failed"
    | "backend.dependency.checked";
  outcome?: "success" | "error";
  runId?: string;
  organizationId?: string | null;
  projectId?: string | null;
}

export interface MonitoringOperationInput {
  operation: "workflow.world" | "workflow.runs.list" | "workflow.steps.list";
  timeoutMs: number;
  sweepId?: string;
  runId?: string;
  jobStatus?: string;
}

export interface WorkflowMonitoringSummary {
  sweepId: string;
  runs: number;
  pendingRuns: number;
  runningRuns: number;
  steps: number;
  activeTruncated: boolean;
  terminalTruncated: boolean;
  stepsTruncated: boolean;
  statusesChecked: number;
  errors: number;
  budgetExceeded: boolean;
}
