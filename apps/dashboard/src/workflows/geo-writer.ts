import { describeContentBillingDenial } from "@notra/ai/billing/content-billing";
import { GEO_WRITER_MODEL } from "@notra/ai/constants/models";
import type { ContentBillingReservation } from "@notra/ai/types/billing";
import { GEO_WRITER_TRIGGER_ID } from "@notra/geo-core/constants/geo";
import { geoWriterWorkflowPayloadSchema } from "@notra/geo-core/schemas/geo";
import { flattenError } from "zod";

import { GEO_WRITER_FAILURE_REASONS } from "@/constants/geo-analytics";
import type { GeoWriterContext, GeoWriterWorkflowResult } from "@/types/geo";

import {
  appendAutomationLog,
  claimWorkflowExecution,
  finalizeContentBilling,
  gateContentBilling,
} from "./steps/content-generation-steps";
import {
  failGeoWriter,
  finishGeoWriter,
  loadGeoWriterContext,
  runGeoWriterStep,
  trackGeoWriterSkipped,
} from "./steps/geo-writer-steps";
import { reconcileCollectionAttempt } from "./steps/on-demand-steps";

const LOG_PREFIX = "GeoWriter";

function describeFailure(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Unexpected writer error";
}

export async function geoWriterWorkflow(
  payload: unknown
): Promise<GeoWriterWorkflowResult> {
  "use workflow";

  const parseResult = geoWriterWorkflowPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error(
      `[${LOG_PREFIX}] Invalid payload:`,
      flattenError(parseResult.error)
    );
    return { status: "invalid_payload" };
  }
  const { organizationId, projectId, briefId, runId } = parseResult.data;

  let context: GeoWriterContext | null = null;
  let billing: ContentBillingReservation | null = null;
  try {
    const claimToken = crypto.randomUUID();
    const claim = await claimWorkflowExecution({
      executionId: runId,
      claimToken,
    });
    if (!claim.claimed) {
      console.warn(
        `[${LOG_PREFIX}] Duplicate execution ${runId} for org ${organizationId}, skipping`
      );
      await trackGeoWriterSkipped({
        organizationId,
        projectId,
        briefId,
        runId,
        reason: GEO_WRITER_FAILURE_REASONS.DUPLICATE_EXECUTION,
      });
      return { status: "duplicate_execution" };
    }

    context = await loadGeoWriterContext({
      organizationId,
      projectId,
      briefId,
      runId,
    });
    if (!context) {
      console.warn(
        `[${LOG_PREFIX}] Brief ${briefId} is not ready for writing, skipping`
      );
      await trackGeoWriterSkipped({
        organizationId,
        projectId,
        briefId,
        runId,
        reason: GEO_WRITER_FAILURE_REASONS.INVALID_STATE,
      });
      return { status: "invalid_state" };
    }

    const gate = await gateContentBilling({
      organizationId,
      executionId: runId,
      outputType: "blog_post",
    });
    if (!gate.allowed) {
      await failGeoWriter({
        organizationId,
        projectId,
        briefId,
        runId,
        reason: describeContentBillingDenial(gate),
        failureReason: GEO_WRITER_FAILURE_REASONS.CREDITS_EXHAUSTED,
      });
      await reconcileCollectionAttempt({
        collectionId: context.collectionId,
        organizationId,
        runId,
      });
      return { status: "credits_exhausted" };
    }
    billing = gate;

    const result = await runGeoWriterStep(context, runId);

    await finishGeoWriter({
      organizationId,
      projectId,
      briefId,
      runId,
      postId: result.postId,
      title: result.title,
      humanized: result.humanized,
    });

    try {
      await finalizeContentBilling({
        reservation: gate,
        action: "confirm",
        usage: result.usage,
        fallbackModelId: GEO_WRITER_MODEL,
        properties: {
          source: "geo_writer",
          output_type: "blog_post",
          trigger_id: GEO_WRITER_TRIGGER_ID,
          run_id: runId,
          markup_applied: gate.useMarkup,
        },
        logPrefix: LOG_PREFIX,
      });
      await appendAutomationLog({
        organizationId,
        integrationId: GEO_WRITER_TRIGGER_ID,
        integrationType: "geo",
        title: `GEO writer created "${result.title}"`,
        status: "success",
        referenceId: result.postId,
      });
    } catch (postSuccessError) {
      console.error(
        `[${LOG_PREFIX}] Post-success effects failed for run ${runId}; content remains created`,
        postSuccessError
      );
    }

    return {
      status: "success",
      postId: result.postId,
      humanized: result.humanized,
    };
  } catch (error) {
    const reason = describeFailure(error);
    console.error(`[${LOG_PREFIX}] Run ${runId} failed:`, error);
    const cleanup = [
      failGeoWriter({
        organizationId,
        projectId,
        briefId,
        runId,
        reason,
        failureReason: GEO_WRITER_FAILURE_REASONS.MODEL_ERROR,
      }),
      billing
        ? finalizeContentBilling({
            reservation: billing,
            action: "release",
            logPrefix: LOG_PREFIX,
          })
        : Promise.resolve(),
      appendAutomationLog({
        organizationId,
        integrationId: GEO_WRITER_TRIGGER_ID,
        integrationType: "geo",
        title: "GEO writer failed",
        status: "failed",
        errorMessage: reason,
      }),
    ];
    if (context) {
      cleanup.push(
        reconcileCollectionAttempt({
          collectionId: context.collectionId,
          organizationId,
          runId,
        })
      );
    }
    const cleanupResults = await Promise.allSettled(cleanup);
    for (const cleanupResult of cleanupResults) {
      if (cleanupResult.status === "rejected") {
        console.error(
          `[${LOG_PREFIX}] Failure cleanup failed for run ${runId}:`,
          cleanupResult.reason
        );
      }
    }
    return { status: "failed", reason };
  }
}
