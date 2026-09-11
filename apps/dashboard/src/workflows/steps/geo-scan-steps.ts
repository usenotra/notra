import { flushGeoLog } from "@notra/ai/evlog";
import {
  finalizeGeoScanProject,
  listGeoScanProjects,
  prepareGeoScanProject,
  runGeoScanSequenceBatch,
  runGeoScanTaskBatch,
} from "@notra/geo-core/geo/scan";
import { renewGeoScanClaimIfDue } from "@notra/geo-core/geo/scan-status";
import type {
  GeoScanBatchOutcome,
  GeoScanPlannedSequence,
  GeoScanPlannedTask,
  GeoScanProjectContext,
  GeoScanProjectPlanResult,
  GeoScanProjectTotals,
} from "@notra/geo-core/types/geo";
import { flushPostHogServer } from "@notra/posthog/server";
import { Effect } from "effect";

import {
  trackGeoScanFailure,
  trackGeoScanStepResult,
} from "@/lib/analytics/geo-workflow-events";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";

function parseClaimedAt(claimedAt?: string): Date | undefined {
  if (!claimedAt) {
    return;
  }
  const parsed = new Date(claimedAt);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function flushObservability(): Promise<void> {
  await flushGeoLog();
  await flushPostHogServer();
}

export async function listGeoScanProjectsStep(
  organizationId: string,
  options: { projectId?: string; projectIds?: string[]; claimedAt?: string }
): Promise<string[]> {
  "use step";
  try {
    return await Effect.runPromise(
      listGeoScanProjects(organizationId, {
        projectId: options.projectId,
        projectIds: options.projectIds,
        claimedAt: parseClaimedAt(options.claimedAt),
      }).pipe(Effect.provide(geoCoreDashboardLayer))
    );
  } finally {
    await flushObservability();
  }
}

export async function prepareGeoScanProjectStep(
  organizationId: string,
  projectId: string,
  options: {
    claimedAt?: string;
    scanId?: string;
    retried: boolean;
    promptIds?: string[];
    engines?: string[];
  }
): Promise<GeoScanProjectPlanResult> {
  "use step";
  const startedAt = Date.now();
  try {
    const result = await Effect.runPromise(
      prepareGeoScanProject(organizationId, projectId, {
        claimedAt: parseClaimedAt(options.claimedAt),
        scanId: options.scanId,
        promptIds: options.promptIds,
        engines: options.engines,
      }).pipe(Effect.provide(geoCoreDashboardLayer))
    );
    if (result.status === "skipped") {
      await trackGeoScanStepResult({
        organizationId,
        projectId,
        scanId: options.scanId,
        result: { status: "skipped" },
        durationMs: Date.now() - startedAt,
        retried: options.retried,
      });
    }
    return result;
  } finally {
    await flushObservability();
  }
}

/**
 * Rotates the scan claim once it is old enough. Runs between batch waves so
 * the parallel batches of one wave never race each other for the token.
 */
export async function renewGeoScanClaimStep(
  projectId: string,
  claimedAt: string,
  renewalToken: string
): Promise<string> {
  "use step";
  try {
    return await Effect.runPromise(
      renewGeoScanClaimIfDue(projectId, claimedAt, renewalToken).pipe(
        Effect.provide(geoCoreDashboardLayer)
      )
    );
  } finally {
    await flushObservability();
  }
}

export async function runGeoScanTaskBatchStep(
  context: GeoScanProjectContext,
  tasks: GeoScanPlannedTask[]
): Promise<GeoScanBatchOutcome> {
  "use step";
  try {
    return await Effect.runPromise(
      runGeoScanTaskBatch(context, tasks).pipe(
        Effect.provide(geoCoreDashboardLayer)
      )
    );
  } finally {
    await flushObservability();
  }
}

export async function runGeoScanSequenceBatchStep(
  context: GeoScanProjectContext,
  sequences: GeoScanPlannedSequence[]
): Promise<GeoScanBatchOutcome> {
  "use step";
  try {
    return await Effect.runPromise(
      runGeoScanSequenceBatch(context, sequences).pipe(
        Effect.provide(geoCoreDashboardLayer)
      )
    );
  } finally {
    await flushObservability();
  }
}

export async function finalizeGeoScanProjectStep(
  context: GeoScanProjectContext,
  totals: GeoScanProjectTotals,
  status: "completed" | "failed",
  claimedAt: string,
  options: { retried: boolean; failureReason?: string }
): Promise<void> {
  "use step";
  try {
    await Effect.runPromise(
      finalizeGeoScanProject(context, totals, status, claimedAt).pipe(
        Effect.provide(geoCoreDashboardLayer)
      )
    );
    const durationMs = Date.now() - context.startedAtMs;
    if (status === "completed") {
      await trackGeoScanStepResult({
        organizationId: context.organizationId,
        projectId: context.projectId,
        scanId: context.scanId,
        result: {
          status: "completed",
          checks: totals.checks,
          mentions: totals.mentions,
        },
        durationMs,
        retried: options.retried,
      });
    } else {
      await trackGeoScanFailure({
        organizationId: context.organizationId,
        projectId: context.projectId,
        scanId: context.scanId,
        reason: options.failureReason ?? "no_successful_checks",
        durationMs,
        retried: options.retried,
      });
    }
  } finally {
    await flushObservability();
  }
}

export async function trackGeoScanRetryScheduledStep(
  organizationId: string,
  retryProjectIds: string[],
  checks: number,
  durationMs: number
): Promise<void> {
  "use step";
  try {
    await trackGeoScanStepResult({
      organizationId,
      result: { status: "retry_no_successful_checks", checks, retryProjectIds },
      durationMs,
      retried: false,
    });
  } finally {
    await flushObservability();
  }
}
