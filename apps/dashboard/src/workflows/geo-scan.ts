import {
  GEO_SCAN_NO_RESULTS_RETRY_DELAY,
  GEO_SCAN_SEQUENCE_BATCH_SIZE,
  GEO_SCAN_TASK_BATCH_SIZE,
} from "@notra/geo-core/constants/geo";
import { geoScanWorkflowPayloadSchema } from "@notra/geo-core/schemas/geo";
import type {
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
  runGeoScanSequenceBatchStep,
  runGeoScanTaskBatchStep,
  trackGeoScanRetryScheduledStep,
} from "./steps/geo-scan-steps";

interface GeoScanProjectOutcome {
  totals: GeoScanProjectTotals;
  attempted: number;
  noSuccessfulChecks: boolean;
}

/**
 * One project scan as a chain of small steps: plan → task batches → sequence
 * batches → finalize. Each batch persists its own results and rotates the
 * claim token, so a killed invocation costs one batch, not the scan — the
 * previous single-step design was killed wholesale by the function timeout
 * once an organization tracked enough engines, leaving the scan on "running"
 * forever with zero rows written.
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
  let claimedAt = plan.claimedAt;
  const totals: GeoScanProjectTotals = {
    checks: 0,
    mentions: 0,
    dropped: 0,
    usage: EMPTY_AGENT_TOKEN_USAGE,
  };
  const attempted = plan.tasks.length + plan.sequences.length;

  try {
    for (const batch of chunkGeoScanItems(
      plan.tasks,
      GEO_SCAN_TASK_BATCH_SIZE
    )) {
      const outcome = await runGeoScanTaskBatchStep(
        plan.context,
        batch,
        claimedAt
      );
      claimedAt = outcome.claimedAt;
      totals.checks += outcome.checks;
      totals.mentions += outcome.mentions;
      totals.dropped += outcome.dropped;
      totals.usage = addAgentTokenUsage(totals.usage, outcome.usage);
    }
    for (const batch of chunkGeoScanItems(
      plan.sequences,
      GEO_SCAN_SEQUENCE_BATCH_SIZE
    )) {
      const outcome = await runGeoScanSequenceBatchStep(
        plan.context,
        batch,
        claimedAt
      );
      claimedAt = outcome.claimedAt;
      totals.checks += outcome.checks;
      totals.mentions += outcome.mentions;
      totals.dropped += outcome.dropped;
      totals.usage = addAgentTokenUsage(totals.usage, outcome.usage);
    }
  } catch (error) {
    await finalizeGeoScanProjectStep(
      plan.context,
      totals,
      "failed",
      claimedAt,
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
      claimedAt,
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
    claimedAt,
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

  let checks = 0;
  let mentions = 0;
  const retryProjectIds: string[] = [];
  const outcomes = await Promise.all(
    projectIds.map(async (scanProjectId) => {
      const claimed = scanProjectId === projectId;
      const outcome = await runGeoScanProjectRun(
        organizationId,
        scanProjectId,
        {
          claimedAt: claimed ? claimedAt : undefined,
          scanId: claimed ? scanId : undefined,
          retried: false,
          promptIds,
          engines,
        }
      );
      return { scanProjectId, outcome };
    })
  );
  if (outcomes.every(({ outcome }) => outcome === null)) {
    return { status: "skipped" };
  }
  for (const { scanProjectId, outcome } of outcomes) {
    if (!outcome) {
      continue;
    }
    checks += outcome.totals.checks;
    mentions += outcome.totals.mentions;
    if (outcome.noSuccessfulChecks && outcome.attempted > 0) {
      retryProjectIds.push(scanProjectId);
    }
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

  const retryOutcomes = await Promise.all(
    retryProjectIds.map((retryProjectId) =>
      runGeoScanProjectRun(organizationId, retryProjectId, {
        retried: true,
        promptIds,
        engines,
      })
    )
  );
  for (const outcome of retryOutcomes) {
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
