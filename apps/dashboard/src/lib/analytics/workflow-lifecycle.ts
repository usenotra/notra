import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";

import {
  BRAND_ANALYSIS_PHASES_BY_STEP,
  BRAND_ANALYSIS_UNEXPECTED_PHASE,
  CONTENT_OUTCOME_EVENTS,
  WORKFLOW_ANALYTICS_NAMES,
  WORKFLOW_OUTCOMES,
} from "@/constants/workflow-analytics";
import {
  trackServerEvent,
  trackServerEventAndFlush,
} from "@/lib/analytics/posthog-server";
import type {
  WorkflowOutcomeInput,
  WorkflowStartedInput,
} from "@/types/analytics/workflow-events";
import type { BrandAnalysisProgressInput } from "@/types/workflows/brand-analysis";
import type { TrackContentOutcomeInput } from "@/types/workflows/content-generation-steps";
import { getCurrentWorkflowRunId } from "@/utils/workflow-run-id";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

function resolveDurationMs(startedAt: number | undefined): number | undefined {
  if (startedAt === undefined) {
    return undefined;
  }
  return Math.max(0, Date.now() - startedAt);
}

export function trackWorkflowStarted(input: WorkflowStartedInput): void {
  // start() acknowledges queue acceptance, not the beginning of execution.
  logWorkflowTelemetry({
    event: "job.queued",
    runId: input.runId,
    workflow: input.workflow,
    organizationId: input.organizationId,
    projectId: input.projectId,
    trigger: input.trigger,
  });
  trackServerEvent({
    event: POSTHOG_EVENTS.WORKFLOW_STARTED,
    userId: input.userId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    properties: {
      workflow: input.workflow,
      run_id: input.runId,
      trigger: input.trigger,
      ...input.properties,
    },
  });
}

function buildWorkflowOutcomeProperties(
  input: WorkflowOutcomeInput
): PostHogProperties {
  return {
    workflow: input.workflow,
    run_id: input.runId,
    duration_ms: resolveDurationMs(input.startedAt),
    step_failed: input.stepFailed,
    reason: input.reason,
    ...input.properties,
  };
}

export async function trackWorkflowOutcomeAndFlush(
  input: WorkflowOutcomeInput
): Promise<void> {
  logWorkflowTelemetry({
    event:
      input.outcome === WORKFLOW_OUTCOMES.FAILED
        ? "job.failed"
        : "job.completed",
    runId: getCurrentWorkflowRunId(),
    executionId: input.runId,
    workflow: input.workflow,
    organizationId: input.organizationId,
    projectId: input.projectId,
    durationMs: resolveDurationMs(input.startedAt),
    outcome: input.outcome === WORKFLOW_OUTCOMES.FAILED ? "error" : "success",
    stepFailed: input.stepFailed,
  });
  await trackServerEventAndFlush({
    event:
      input.outcome === WORKFLOW_OUTCOMES.FAILED
        ? POSTHOG_EVENTS.WORKFLOW_FAILED
        : POSTHOG_EVENTS.WORKFLOW_COMPLETED,
    organizationId: input.organizationId,
    projectId: input.projectId,
    properties: buildWorkflowOutcomeProperties(input),
  });
}

export async function trackContentOutcomeAndFlush(
  input: TrackContentOutcomeInput
): Promise<void> {
  await trackServerEventAndFlush({
    event: CONTENT_OUTCOME_EVENTS[input.kind],
    organizationId: input.organizationId,
    properties: {
      source: input.source,
      creation_mode: input.creationMode,
      output_type: input.outputType,
      reason: input.reason,
      repository_count: input.repositoryCount,
      lookback_window: input.lookbackWindow,
      post_count: input.postIds?.length,
      trigger_id: input.triggerId,
    },
  });
}

export async function trackBrandAnalysisOutcomeAndFlush(
  input: BrandAnalysisProgressInput
): Promise<void> {
  const { status, currentStep, error } = input.progress;
  if (status !== "completed" && status !== "failed") {
    return;
  }
  const failed = status === "failed";
  const phaseFailed = failed
    ? (BRAND_ANALYSIS_PHASES_BY_STEP[currentStep] ??
      BRAND_ANALYSIS_UNEXPECTED_PHASE)
    : undefined;
  const durationMs = resolveDurationMs(input.startedAt);

  await trackServerEventAndFlush({
    event: failed
      ? POSTHOG_EVENTS.BRAND_ANALYSIS_FAILED
      : POSTHOG_EVENTS.BRAND_ANALYSIS_COMPLETED,
    organizationId: input.organizationId,
    properties: {
      duration_ms: durationMs,
      phase_failed: phaseFailed,
      job_id: input.jobId,
    },
  });
  await trackWorkflowOutcomeAndFlush({
    workflow: WORKFLOW_ANALYTICS_NAMES.BRAND_ANALYSIS,
    outcome: failed ? WORKFLOW_OUTCOMES.FAILED : WORKFLOW_OUTCOMES.COMPLETED,
    organizationId: input.organizationId,
    runId: input.jobId,
    startedAt: input.startedAt,
    stepFailed: phaseFailed,
    reason: failed ? error : undefined,
  });
}
