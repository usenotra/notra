import { Clock, Effect, Result } from "effect";
import { parseStepName, parseWorkflowName } from "workflow/observability";

import {
  MONITORED_WORKFLOW_STATUSES,
  MONITORED_WORKFLOW_NAMES,
  WORKFLOW_MONITORING,
} from "@/constants/workflow-monitoring";
import type {
  CollectWorkflowMonitoring,
  MonitoringWorld,
  WorkflowMonitoringSummary,
} from "@/types/workflow-monitoring";
import { readMonitoringOperation } from "@/utils/monitoring-operation";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

export const collectWorkflowMonitoring: CollectWorkflowMonitoring = Effect.fn(
  "monitoring.collectWorkflows"
)(function* (
  world: MonitoringWorld,
  budgetMs = WORKFLOW_MONITORING.sweepBudgetMs,
  sweepId?: string
) {
  const observedAt = yield* Clock.currentTimeMillis;
  const summary: WorkflowMonitoringSummary = {
    sweepId: sweepId ?? crypto.randomUUID(),
    runs: 0,
    pendingRuns: 0,
    runningRuns: 0,
    steps: 0,
    activeTruncated: false,
    terminalTruncated: false,
    stepsTruncated: false,
    statusesChecked: 0,
    errors: 0,
    budgetExceeded: false,
  };
  const stepRuns = new Map<string, string>();
  const seenRuns = new Set<string>();

  for (const status of MONITORED_WORKFLOW_STATUSES) {
    const active = status === "pending" || status === "running";
    let cursor: string | undefined;
    let statusFailed = false;
    for (let page = 0; page < WORKFLOW_MONITORING.pagesPerStatus; page++) {
      const remainingMs =
        budgetMs - ((yield* Clock.currentTimeMillis) - observedAt);
      if (remainingMs <= 0) {
        summary.budgetExceeded = true;
        break;
      }
      const pageCursor = cursor;
      const read = yield* readMonitoringOperation(
        {
          operation: "workflow.runs.list",
          sweepId: summary.sweepId,
          jobStatus: status,
          timeoutMs: Math.min(
            WORKFLOW_MONITORING.operationTimeoutMs,
            remainingMs
          ),
        },
        () =>
          world.runs.list({
            status,
            resolveData: "none",
            pagination: {
              cursor: pageCursor,
              limit: WORKFLOW_MONITORING.pageSize,
              sortOrder: active ? "asc" : "desc",
            },
          })
      ).pipe(Effect.result);
      if (Result.isFailure(read)) {
        summary.errors++;
        statusFailed = true;
        summary.budgetExceeded =
          (yield* Clock.currentTimeMillis) - observedAt >= budgetMs;
        break;
      }
      const result = read.success;
      for (const run of result.data) {
        if (seenRuns.has(run.runId)) {
          continue;
        }
        seenRuns.add(run.runId);
        if (
          !active &&
          (!run.completedAt ||
            run.completedAt.getTime() <
              observedAt - WORKFLOW_MONITORING.recentTerminalMs)
        ) {
          continue;
        }
        const workflowName =
          parseWorkflowName(run.workflowName)?.shortName ?? run.workflowName;
        const workflow = MONITORED_WORKFLOW_NAMES[workflowName] ?? workflowName;
        logWorkflowTelemetry({
          event: "job.snapshot",
          sweepId: summary.sweepId,
          runId: run.runId,
          workflow,
          jobStatus: run.status,
          createdAt: run.createdAt.toISOString(),
          startedAt: run.startedAt?.toISOString(),
          completedAt: run.completedAt?.toISOString(),
          updatedAt: run.updatedAt.toISOString(),
          queueWaitMs: Math.max(
            0,
            (run.startedAt?.getTime() ??
              run.completedAt?.getTime() ??
              observedAt) - run.createdAt.getTime()
          ),
          durationMs: run.startedAt
            ? Math.max(
                0,
                (run.completedAt?.getTime() ?? observedAt) -
                  run.startedAt.getTime()
              )
            : undefined,
          errorCode: run.error?.code,
        });
        summary.runs++;
        if (run.status === "pending") {
          summary.pendingRuns++;
        } else if (run.status === "running") {
          summary.runningRuns++;
        }
        if (
          run.status !== "pending" &&
          stepRuns.size < WORKFLOW_MONITORING.stepRunLimit
        ) {
          stepRuns.set(run.runId, workflow);
        }
      }
      if (!result.hasMore) {
        break;
      }
      if (!result.cursor || page + 1 === WORKFLOW_MONITORING.pagesPerStatus) {
        if (active) {
          summary.activeTruncated = true;
        } else {
          summary.terminalTruncated = true;
        }
        break;
      }
      cursor = result.cursor;
    }
    if (!summary.budgetExceeded && !statusFailed) {
      summary.statusesChecked++;
    }
    if (summary.budgetExceeded) {
      break;
    }
  }

  for (const [runId, workflow] of stepRuns) {
    const remainingMs =
      budgetMs - ((yield* Clock.currentTimeMillis) - observedAt);
    if (remainingMs <= 0) {
      summary.budgetExceeded = true;
      break;
    }
    const read = yield* readMonitoringOperation(
      {
        operation: "workflow.steps.list",
        sweepId: summary.sweepId,
        runId,
        timeoutMs: Math.min(
          WORKFLOW_MONITORING.operationTimeoutMs,
          remainingMs
        ),
      },
      () =>
        world.steps.list({
          runId,
          resolveData: "none",
          pagination: {
            limit: WORKFLOW_MONITORING.stepsPerRun,
            sortOrder: "desc",
          },
        })
    ).pipe(Effect.result);
    if (Result.isFailure(read)) {
      summary.errors++;
      summary.budgetExceeded =
        (yield* Clock.currentTimeMillis) - observedAt >= budgetMs;
      if (summary.budgetExceeded) {
        break;
      }
      continue;
    }
    const result = read.success;
    summary.stepsTruncated ||= result.hasMore;
    for (const step of result.data) {
      logWorkflowTelemetry({
        event: "job.step.snapshot",
        sweepId: summary.sweepId,
        runId,
        workflow,
        stepId: step.stepId,
        step: parseStepName(step.stepName)?.shortName ?? step.stepName,
        stepStatus: step.status,
        attempt: step.attempt,
        updatedAt: step.updatedAt.toISOString(),
        retryAfter: step.retryAfter?.toISOString(),
        durationMs: step.startedAt
          ? Math.max(
              0,
              (step.completedAt?.getTime() ?? observedAt) -
                step.startedAt.getTime()
            )
          : undefined,
        errorCode: step.error?.code,
      });
      summary.steps++;
    }
  }

  logWorkflowTelemetry({
    event: "monitoring.sweep.completed",
    ...summary,
    durationMs: (yield* Clock.currentTimeMillis) - observedAt,
    outcome: summary.errors > 0 || summary.budgetExceeded ? "error" : "success",
  });
  return summary;
});
