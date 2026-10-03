import { describeContentBillingDenial } from "@notra/ai/billing/content-billing";
import { CONTENT_AGENT_MODEL } from "@notra/ai/constants/models";
import { contentGenerationWorkflowPayloadSchema } from "@notra/content-generation/schemas";
import { flattenError } from "zod";

import { WORKFLOW_ANALYTICS_NAMES } from "@/constants/workflow-analytics";
import type { OnDemandContentWorkflowResult } from "@/types/workflows/on-demand-generation";

import {
  appendAutomationLog,
  claimWorkflowExecution,
  finalizeContentBilling,
  gateContentBilling,
  trackContentOutcome,
} from "./steps/content-generation-steps";
import { runOnDemandGeneration } from "./steps/on-demand-generation-step";
import {
  fetchOnDemandRepositories,
  finishOnDemand,
  logOnDemandGenerating,
  markOnDemandJobRunning,
  reconcileCollectionAttempt,
  resolveManualBrandSettings,
} from "./steps/on-demand-steps";

const LOG_PREFIX = "OnDemandContent";

export async function onDemandContentWorkflow(
  payload: unknown
): Promise<OnDemandContentWorkflowResult> {
  "use workflow";

  const parseResult = contentGenerationWorkflowPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error(
      "[OnDemandContent] Invalid payload:",
      flattenError(parseResult.error)
    );
    return { status: "invalid_payload" };
  }
  const parsed = parseResult.data;
  const {
    organizationId,
    collectionId,
    runId,
    jobId,
    contentType,
    lookbackWindow,
    repositoryIds,
    brandVoiceId,
    dataPoints,
    linearIntegrationIds,
    source,
  } = parsed;

  const workflowStartedAt = Date.now();
  const claimToken = crypto.randomUUID();
  const claim = await claimWorkflowExecution({
    executionId: runId,
    claimToken,
    organizationId,
    workflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
  });
  if (!claim.claimed) {
    console.warn(
      `[OnDemandContent] Duplicate execution ${runId} for org ${organizationId}, skipping`
    );
    return { status: "duplicate_execution" };
  }

  await markOnDemandJobRunning({ jobId, contentType });

  const gate = await gateContentBilling({
    organizationId,
    executionId: runId,
    outputType: contentType,
  });
  if (!gate.allowed) {
    await finishOnDemand({
      organizationId,
      runId,
      workflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
      startedAt: workflowStartedAt,
      contentType,
      status: "failed",
      reason: describeContentBillingDenial(gate),
      source,
      jobId,
    });
    await reconcileCollectionAttempt({ collectionId, organizationId, runId });
    return { status: "credits_exhausted" };
  }

  let repositories: Awaited<ReturnType<typeof fetchOnDemandRepositories>>;
  let brand: Awaited<ReturnType<typeof resolveManualBrandSettings>>;
  try {
    [repositories, brand] = await Promise.all([
      fetchOnDemandRepositories({
        organizationId,
        repositoryIds,
        linearIntegrationIds,
      }),
      resolveManualBrandSettings({ organizationId, brandVoiceId }),
    ]);
  } catch (error) {
    await finalizeContentBilling({
      reservation: gate,
      action: "release",
      logPrefix: LOG_PREFIX,
    });
    throw error;
  }

  const hasLinearSources = Boolean(
    dataPoints.includeLinearData &&
    linearIntegrationIds &&
    linearIntegrationIds.length > 0
  );

  if (repositories.length === 0 && !hasLinearSources) {
    console.error("[OnDemandContent] No valid data sources found, canceling", {
      organizationId,
    });
    await finishOnDemand({
      organizationId,
      runId,
      workflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
      startedAt: workflowStartedAt,
      contentType,
      status: "failed",
      reason: "No valid data sources found",
      source,
      jobId,
    });
    await finalizeContentBilling({
      reservation: gate,
      action: "release",
      logPrefix: LOG_PREFIX,
    });
    await trackContentOutcome({
      kind: "failed",
      triggerId: "manual_on_demand",
      organizationId,
      outputType: contentType,
      creationMode: "manual",
      reason: "No valid data sources found",
      lookbackWindow,
      repositoryCount: 0,
      source: "on_demand",
      logPrefix: LOG_PREFIX,
    });
    await reconcileCollectionAttempt({ collectionId, organizationId, runId });
    return { status: "no_sources" };
  }

  try {
    await logOnDemandGenerating(jobId);

    const contentResult = await runOnDemandGeneration({
      payload: parsed,
      repositories,
      brand,
      hasLinearSources,
      chargeAiCredits: gate.mode === "ai_credits",
    });

    if (contentResult.status === "skipped") {
      await finishOnDemand({
        organizationId,
        runId,
        workflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
        startedAt: workflowStartedAt,
        contentType,
        status: "skipped",
        reason: contentResult.reason,
        source,
        jobId,
      });
      await appendAutomationLog({
        organizationId,
        integrationId: "manual_on_demand",
        integrationType: "manual",
        title: `On-demand generation skipped for ${contentType.replaceAll("_", " ")}`,
        status: "skipped",
        errorMessage: contentResult.reason,
      });
      await finalizeContentBilling({
        reservation: gate,
        action: "release",
        logPrefix: LOG_PREFIX,
      });
      await trackContentOutcome({
        kind: "skipped",
        triggerId: "manual_on_demand",
        organizationId,
        outputType: contentType,
        creationMode: "manual",
        reason: contentResult.reason,
        lookbackWindow,
        repositoryCount: repositories.length,
        source: "on_demand",
        logPrefix: LOG_PREFIX,
      });
      await reconcileCollectionAttempt({ collectionId, organizationId, runId });
      return { status: "skipped", reason: contentResult.reason };
    }

    if (
      contentResult.status === "rate_limited" ||
      contentResult.status === "unsupported_output_type" ||
      contentResult.status === "generation_failed"
    ) {
      let reason: string;
      if (contentResult.status === "rate_limited") {
        reason = "GitHub API rate limit reached";
      } else if (contentResult.status === "unsupported_output_type") {
        reason = `Unsupported content type: ${contentResult.outputType}`;
      } else {
        reason = contentResult.reason;
      }

      await finishOnDemand({
        organizationId,
        runId,
        workflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
        startedAt: workflowStartedAt,
        contentType,
        status: "failed",
        reason,
        source,
        jobId,
      });
      await appendAutomationLog({
        organizationId,
        integrationId: "manual_on_demand",
        integrationType: "manual",
        title: `On-demand generation failed for ${contentType.replaceAll("_", " ")}`,
        status: "failed",
        errorMessage: reason,
      });
      await finalizeContentBilling({
        reservation: gate,
        action: "release",
        logPrefix: LOG_PREFIX,
      });
      await trackContentOutcome({
        kind: "failed",
        triggerId: "manual_on_demand",
        organizationId,
        outputType: contentType,
        creationMode: "manual",
        reason,
        lookbackWindow,
        repositoryCount: repositories.length,
        source: "on_demand",
        logPrefix: LOG_PREFIX,
      });
      await reconcileCollectionAttempt({ collectionId, organizationId, runId });
      return { status: "generation_failed", reason };
    }

    const createdPosts = contentResult.posts;
    if (createdPosts.length === 0) {
      await finishOnDemand({
        organizationId,
        runId,
        workflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
        startedAt: workflowStartedAt,
        contentType,
        status: "failed",
        reason: "No content was generated",
        source,
        jobId,
      });
      await appendAutomationLog({
        organizationId,
        integrationId: "manual_on_demand",
        integrationType: "manual",
        title: `On-demand generation for ${contentType.replaceAll("_", " ")} produced no content`,
        status: "failed",
        errorMessage: "No content was generated",
      });
      await finalizeContentBilling({
        reservation: gate,
        action: "release",
        logPrefix: LOG_PREFIX,
      });
      await trackContentOutcome({
        kind: "failed",
        triggerId: "manual_on_demand",
        organizationId,
        outputType: contentType,
        creationMode: "manual",
        reason: "No content was generated",
        lookbackWindow,
        repositoryCount: repositories.length,
        source: "on_demand",
        logPrefix: LOG_PREFIX,
      });
      await reconcileCollectionAttempt({ collectionId, organizationId, runId });
      return { status: "empty_result" };
    }

    const contentTitle =
      createdPosts.length === 1
        ? (createdPosts[0]?.title ?? contentType)
        : `${createdPosts.length} ${contentType.replaceAll("_", " ")} drafts`;

    await finishOnDemand({
      organizationId,
      runId,
      workflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
      startedAt: workflowStartedAt,
      contentType,
      status: "success",
      title: contentTitle,
      source,
      jobId,
      primaryPostId: createdPosts[0]?.postId,
      postCount: createdPosts.length,
    });

    try {
      await finalizeContentBilling({
        reservation: gate,
        action: "confirm",
        units: createdPosts.length,
        usage: contentResult.usage,
        fallbackModelId: CONTENT_AGENT_MODEL,
        properties: {
          source: "manual",
          output_type: contentType,
          trigger_id: "manual_on_demand",
          run_id: runId,
          markup_applied: gate.useMarkup,
        },
        logPrefix: LOG_PREFIX,
      });
      await appendAutomationLog({
        organizationId,
        integrationId: "manual_on_demand",
        integrationType: "manual",
        title:
          createdPosts.length === 1
            ? `On-demand generation created "${contentTitle}"`
            : `On-demand generation created ${createdPosts.length} drafts`,
        status: "success",
        referenceId: createdPosts[0]?.postId,
      });
      await trackContentOutcome({
        kind: "created",
        triggerId: "manual_on_demand",
        organizationId,
        outputType: contentType,
        creationMode: "manual",
        lookbackWindow,
        repositoryCount: repositories.length,
        source: "on_demand",
        postIds: createdPosts.map((createdPost) => createdPost.postId),
        logPrefix: LOG_PREFIX,
      });
    } catch (postSuccessError) {
      console.error(
        `[OnDemandContent] Post-success effects failed for run ${runId}; content remains created`,
        postSuccessError
      );
    }

    return { status: "success", postId: contentResult.postId };
  } catch (error) {
    await finishOnDemand({
      organizationId,
      runId,
      workflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
      startedAt: workflowStartedAt,
      contentType,
      status: "failed",
      reason: "Unexpected workflow error",
      source,
      jobId,
    });
    await finalizeContentBilling({
      reservation: gate,
      action: "release",
      logPrefix: LOG_PREFIX,
    });
    await trackContentOutcome({
      kind: "failed",
      triggerId: "manual_on_demand",
      organizationId,
      outputType: contentType,
      creationMode: "manual",
      reason: "Unexpected workflow error",
      lookbackWindow,
      repositoryCount: repositories.length,
      source: "on_demand",
      logPrefix: LOG_PREFIX,
    });
    await reconcileCollectionAttempt({ collectionId, organizationId, runId });
    throw error;
  }
}
