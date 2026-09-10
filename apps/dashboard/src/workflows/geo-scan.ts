import {
  GEO_SCAN_BATCH_CONCURRENCY,
  GEO_SCAN_CLAIM_RENEW_AFTER_MS,
  GEO_SCAN_NO_RESULTS_RETRY_DELAY,
  GEO_SCAN_SEQUENCE_BATCH_SIZE,
  GEO_SCAN_TASK_BATCH_SIZE,
} from "@notra/geo-core/constants/geo";
import { geoScanWorkflowPayloadSchema } from "@notra/geo-core/schemas/geo";
import type {
  GeoScanBatchOutcome,
  GeoScanProjectContext,
  GeoScanProjectTotals,
  GeoScanResult,
} from "@notra/geo-core/types/geo";
import {
  chunkGeoScanItems,
  describeGeoScanFailure,
} from "@notra/geo-core/utils/geo-scan";
import {
  addAgentTokenUsage,
  EMPTY_AGENT_TOKEN_USAGE,
} from "@notra/geo-core/utils/token-usage";
import { FatalError, sleep } from "workflow";
import { flattenError } from "zod";

import type { GeoScanPayload } from "@/types/geo";

import {
  finalizeGeoScanProjectStep,
  listGeoScanProjectsStep,
  prepareGeoScanProjectStep,
  renewGeoScanClaimStep,
  runGeoScanSequenceBatchStep,
  runGeoScanTaskBatchStep,
  trackGeoScanRetryScheduledStep,
} from "./steps/geo-scan-steps";

interface GeoScanProjectOutcome {
  totals: GeoScanProjectTotals;
  attempted: number;
  noSuccessfulChecks: boolean;
}

type GeoScanBatchRunner<T> = (
  context: GeoScanProjectContext,
  batch: T[]
) => Promise<GeoScanBatchOutcome>;

function addBatchOutcome(
  totals: GeoScanProjectTotals,
  outcome: GeoScanBatchOutcome
): void {
  totals.checks += outcome.checks;
  totals.mentions += outcome.mentions;
  totals.dropped += outcome.dropped;
  totals.usage = addAgentTokenUsage(totals.usage, outcome.usage);
}

function isClaimRenewalDue(claimedAt: string, now: number): boolean {
  return now - Date.parse(claimedAt) >= GEO_SCAN_CLAIM_RENEW_AFTER_MS;
}

function nextClaimRenewalToken(claimedAt: string, now: number): string {
  return new Date(Math.max(now, Date.parse(claimedAt) + 1)).toISOString();
}

type GeoScanBatchSettlement =
  | { index: number; outcome: GeoScanBatchOutcome }
  | { index: number; error: unknown };

/**
 * Runs the batches of one item kind through a sliding window of
 * `GEO_SCAN_BATCH_CONCURRENCY` parallel steps: whenever one batch settles the
 * next one starts, so a slow engine never idles the other slots the way a
 * fixed wave would. The claim token is renewed from here, never inside a
 * batch, so parallel batches cannot race each other for the compare-and-set.
 * After a failure no further batch starts, but the ones already in flight are
 * drained so the rows they persisted count toward billing and the verdict.
 */
async function runGeoScanBatchWindow<T>(
  context: GeoScanProjectContext,
  items: readonly T[],
  batchSize: number,
  runBatch: GeoScanBatchRunner<T>,
  state: { claimedAt: string; totals: GeoScanProjectTotals }
): Promise<void> {
  const batches = chunkGeoScanItems(items, batchSize);
  const inFlight = new Map<number, Promise<GeoScanBatchSettlement>>();
  let nextIndex = 0;
  let failed = false;
  let failure: unknown;

  const hasPendingBatches = () => !failed && nextIndex < batches.length;
  while (hasPendingBatches() || inFlight.size > 0) {
    while (hasPendingBatches() && inFlight.size < GEO_SCAN_BATCH_CONCURRENCY) {
      const now = Date.now();
      if (isClaimRenewalDue(state.claimedAt, now)) {
        try {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- each renewal depends on the previous claim token
          state.claimedAt = await renewGeoScanClaimStep(
            context.projectId,
            state.claimedAt,
            nextClaimRenewalToken(state.claimedAt, now)
          );
        } catch (error) {
          // A failed renewal stops new work, not the batches already running.
          // Drain those before finalizing or releasing their claim.
          failed = true;
          failure = error;
          break;
        }
      }
      const index = nextIndex;
      nextIndex += 1;
      inFlight.set(
        index,
        runBatch(context, batches[index] ?? []).then(
          (outcome) => ({ index, outcome }),
          (error: unknown) => ({ index, error })
        )
      );
    }
    if (inFlight.size === 0) {
      break;
    }
    const settled = await Promise.race(inFlight.values());
    inFlight.delete(settled.index);
    if ("outcome" in settled) {
      addBatchOutcome(state.totals, settled.outcome);
    } else if (!failed) {
      failed = true;
      failure = settled.error;
    }
  }
  if (failed) {
    throw failure;
  }
}

/**
 * One project scan as a chain of small steps: plan → task batches →
 * sequence batches → finalize. Each batch persists its own results, so a
 * killed invocation costs one batch, not the scan — the previous single-step
 * design was killed wholesale by the function timeout once an organization
 * tracked enough engines, leaving the scan on "running" forever with zero
 * rows written. Batches run through a sliding window of parallel steps; the
 * first batched design ran them strictly one after another, which capped a
 * whole project at four model calls in flight and stretched large scans past
 * forty minutes.
 */
async function runGeoScanProjectRun(
  organizationId: string,
  projectId: string,
  options: {
    claimedAt?: string;
    scanId?: string;
    retried: boolean;
    promptIds?: string[];
    engines?: string[];
  }
): Promise<GeoScanProjectOutcome | null> {
  const planResult = await prepareGeoScanProjectStep(
    organizationId,
    projectId,
    options
  );
  if (planResult.status === "skipped") {
    return null;
  }

  const { plan } = planResult;
  const state = {
    claimedAt: plan.claimedAt,
    totals: {
      checks: 0,
      mentions: 0,
      dropped: 0,
      usage: EMPTY_AGENT_TOKEN_USAGE,
    } satisfies GeoScanProjectTotals,
  };
  const { totals } = state;
  const attempted = plan.tasks.length + plan.sequences.length;

  try {
    await runGeoScanBatchWindow(
      plan.context,
      plan.tasks,
      GEO_SCAN_TASK_BATCH_SIZE,
      runGeoScanTaskBatchStep,
      state
    );
    await runGeoScanBatchWindow(
      plan.context,
      plan.sequences,
      GEO_SCAN_SEQUENCE_BATCH_SIZE,
      runGeoScanSequenceBatchStep,
      state
    );
  } catch (error) {
    await finalizeGeoScanProjectStep(
      plan.context,
      totals,
      "failed",
      state.claimedAt,
      {
        retried: options.retried,
        failureReason: describeGeoScanFailure(error),
      }
    );
    return { totals, attempted, noSuccessfulChecks: totals.checks === 0 };
  }

  if (totals.checks === 0 && attempted > 0) {
    await finalizeGeoScanProjectStep(
      plan.context,
      totals,
      "failed",
      state.claimedAt,
      {
        retried: options.retried,
      }
    );
    return { totals, attempted, noSuccessfulChecks: true };
  }

  await finalizeGeoScanProjectStep(
    plan.context,
    totals,
    "completed",
    state.claimedAt,
    {
      retried: options.retried,
    }
  );
  return { totals, attempted, noSuccessfulChecks: false };
}

export async function geoScanWorkflow(
  payload: GeoScanPayload
): Promise<GeoScanResult> {
  "use workflow";

  const startedAt = Date.now();
  const parseResult = geoScanWorkflowPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error("[GEO] Invalid payload:", flattenError(parseResult.error));
    return { status: "invalid_payload" };
  }
  const { organizationId, projectId, claimedAt, scanId, promptIds, engines } =
    parseResult.data;

  const projectIds = await listGeoScanProjectsStep(organizationId, {
    projectId,
    claimedAt,
  });
  if (projectIds.length === 0) {
    return { status: "skipped" };
  }
  const orderedProjectIds =
    projectId && projectIds.includes(projectId)
      ? [projectId, ...projectIds.filter((id) => id !== projectId)]
      : projectIds;

  let checks = 0;
  let mentions = 0;
  const retryProjectIds: string[] = [];
  let ranProject = false;
  // A project already runs several model calls per batch. Keep projects in one
  // workflow sequential so batch concurrency is the aggregate provider bound,
  // rather than multiplying it by every project in the organization. A claim
  // handed to this workflow goes first so prepare can revalidate it immediately.
  for (const scanProjectId of orderedProjectIds) {
    const claimed = scanProjectId === projectId;
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential projects enforce the workflow's provider concurrency budget
    const outcome = await runGeoScanProjectRun(organizationId, scanProjectId, {
      claimedAt: claimed ? claimedAt : undefined,
      scanId: claimed ? scanId : undefined,
      retried: false,
      promptIds,
      engines,
    });
    if (!outcome) {
      continue;
    }
    ranProject = true;
    checks += outcome.totals.checks;
    mentions += outcome.totals.mentions;
    if (outcome.noSuccessfulChecks && outcome.attempted > 0) {
      retryProjectIds.push(scanProjectId);
    }
  }
  if (!ranProject) {
    return { status: "skipped" };
  }

  if (retryProjectIds.length === 0) {
    return { status: "completed", checks, mentions };
  }

  await trackGeoScanRetryScheduledStep(
    organizationId,
    retryProjectIds,
    checks,
    Date.now() - startedAt
  );
  await sleep(GEO_SCAN_NO_RESULTS_RETRY_DELAY);

  for (const retryProjectId of retryProjectIds) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- retries share the same provider concurrency budget
    const outcome = await runGeoScanProjectRun(organizationId, retryProjectId, {
      retried: true,
      promptIds,
      engines,
    });
    if (!outcome) {
      continue;
    }
    checks += outcome.totals.checks;
    mentions += outcome.totals.mentions;
  }

  if (checks === 0) {
    const message = `GEO scan retry produced no successful checks for ${retryProjectIds.length} projects`;
    console.error(`[GEO] ${message}`);
    throw new FatalError(message);
  }
  return { status: "completed", checks, mentions };
}
