import { getContentBillingLimitLabel } from "@notra/ai/billing/content-billing";
import { eventWorkflowPayloadSchema } from "@notra/schemas/dashboard/workflows";
import { flattenError } from "zod";

import { WORKFLOW_ANALYTICS_NAMES } from "@/constants/workflow-analytics";
import type { EventContentWorkflowResult } from "@/types/workflows/event-generation";
import { resolveContentLimitPauseReason } from "@/utils/content-billing";

import {
  appendAutomationLog,
  claimWorkflowExecution,
  cleanupEmptyCollection,
  clearWorkflowPause,
  createGenerationCollection,
  enqueueDigest,
  fetchBrandSettingsData,
  fetchEventRepository,
  fetchEventTrigger,
  fetchLogRetention,
  fetchNotificationData,
  finalizeContentBilling,
  finishGeneration,
  gateContentBilling,
  notifyContentLimitReached,
  recordWorkflowPause,
  startGenerationTracking,
  trackContentOutcome,
} from "./steps/content-generation-steps";
import { runEventGeneration } from "./steps/event-generation-step";

const LOG_PREFIX = "Event";

export async function eventContentWorkflow(payload: {
  triggerId: string;
  eventType: string;
  eventAction: string;
  eventData: Record<string, unknown>;
  repositoryId: string;
  deliveryId?: string;
  executionId?: string;
}): Promise<EventContentWorkflowResult> {
  "use workflow";

  const parseResult = eventWorkflowPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error("[Event] Invalid payload:", flattenError(parseResult.error));
    return { status: "invalid_payload" };
  }
  const {
    triggerId,
    eventType,
    eventAction,
    eventData,
    repositoryId,
    executionId,
  } = parseResult.data;
  const manual = eventData.manualRun === true;
  const workflowStartedAt = Date.now();
  const resolvedExecutionId = executionId ?? crypto.randomUUID();
  const claimToken = crypto.randomUUID();

  const claim = await claimWorkflowExecution({
    executionId: resolvedExecutionId,
    claimToken,
    workflow: WORKFLOW_ANALYTICS_NAMES.EVENT_CONTENT,
  });
  if (!claim.claimed) {
    console.warn(
      `[Event] Duplicate execution ${resolvedExecutionId} for trigger ${triggerId}, skipping`
    );
    return { status: "duplicate_execution" };
  }

  const { trigger, lookbackWindow } = await fetchEventTrigger(triggerId);
  if (!trigger) {
    console.log(`[Event] Trigger ${triggerId} not found, canceling`);
    return { status: "trigger_not_found" };
  }
  if (!trigger.enabled) {
    console.log(`[Event] Trigger ${triggerId} is disabled, canceling`);
    return { status: "trigger_disabled" };
  }
  const automationName = trigger.name.trim() || `${eventType} event`;

  const gate = await gateContentBilling({
    organizationId: trigger.organizationId,
    executionId: resolvedExecutionId,
    outputType: trigger.outputType,
  });
  if (!gate.allowed) {
    if (gate.shouldNotify) {
      await notifyContentLimitReached({
        organizationId: trigger.organizationId,
        automationName,
        logPrefix: LOG_PREFIX,
        limitLabel: getContentBillingLimitLabel(gate),
      });
      if (!manual) {
        await recordWorkflowPause({
          triggerId,
          organizationId: trigger.organizationId,
          automationName,
          reason: resolveContentLimitPauseReason(gate),
          logPrefix: LOG_PREFIX,
        });
      }
    }
    return { status: "credits_exhausted" };
  }

  let repository: Awaited<ReturnType<typeof fetchEventRepository>>;
  let brand: Awaited<ReturnType<typeof fetchBrandSettingsData>>;
  let logRetentionDays: Awaited<ReturnType<typeof fetchLogRetention>>;
  try {
    [repository, brand, logRetentionDays] = await Promise.all([
      fetchEventRepository({
        repositoryId,
        organizationId: trigger.organizationId,
      }),
      fetchBrandSettingsData({
        organizationId: trigger.organizationId,
        outputConfig: trigger.outputConfig,
      }),
      fetchLogRetention(trigger.organizationId),
    ]);
  } catch (error) {
    await finalizeContentBilling({
      reservation: gate,
      action: "release",
      logPrefix: LOG_PREFIX,
    });
    throw error;
  }

  if (!repository) {
    console.log(
      `[Event] Repository ${repositoryId} not found for trigger ${triggerId}, canceling`
    );
    await finalizeContentBilling({
      reservation: gate,
      action: "release",
      logPrefix: LOG_PREFIX,
    });
    return { status: "repository_not_found" };
  }

  const runId = `${triggerId}-${Date.now()}`;
  const collectionId = `group_${runId}`;

  try {
    await startGenerationTracking({
      organizationId: trigger.organizationId,
      runId,
      triggerId: trigger.id,
      outputType: trigger.outputType,
      triggerName: trigger.name.trim() || trigger.outputType,
    });
    await createGenerationCollection({
      collectionId,
      organizationId: trigger.organizationId,
      source: "automation",
      sourceId: runId,
      outputType: trigger.outputType,
      sourceMetadata: {
        triggerId: trigger.id,
        triggerName: trigger.name,
        triggerSourceType: "github_webhook",
        eventType,
        eventAction,
      },
    });

    const contentResult = await runEventGeneration({
      trigger,
      repository,
      brand,
      collectionId,
      eventType,
      eventAction,
      eventData,
      chargeAiCredits: gate.mode === "ai_credits",
    });

    if (contentResult.status === "unsupported_output_type") {
      await finishGeneration({
        organizationId: trigger.organizationId,
        runId,
        workflow: WORKFLOW_ANALYTICS_NAMES.EVENT_CONTENT,
        startedAt: workflowStartedAt,
        triggerId,
        outputType: trigger.outputType,
        triggerName: automationName,
        status: "failed",
        reason: "Unsupported output type",
      });
      await finalizeContentBilling({
        reservation: gate,
        action: "release",
        logPrefix: LOG_PREFIX,
      });
      if (!manual) {
        await recordWorkflowPause({
          triggerId,
          organizationId: trigger.organizationId,
          automationName,
          reason: "workflow_errors",
          logPrefix: LOG_PREFIX,
        });
      }
      await cleanupEmptyCollection({
        collectionId,
        organizationId: trigger.organizationId,
      });
      return { status: "unsupported_output_type" };
    }

    if (contentResult.status === "generation_failed") {
      await finishGeneration({
        organizationId: trigger.organizationId,
        runId,
        workflow: WORKFLOW_ANALYTICS_NAMES.EVENT_CONTENT,
        startedAt: workflowStartedAt,
        triggerId,
        outputType: trigger.outputType,
        triggerName: automationName,
        status: "failed",
        reason: contentResult.reason,
      });
      await finalizeContentBilling({
        reservation: gate,
        action: "release",
        logPrefix: LOG_PREFIX,
      });
      await appendAutomationLog({
        organizationId: trigger.organizationId,
        integrationId: triggerId,
        integrationType: "events",
        title: `Event "${trigger.name.trim() || eventType}" failed to generate content`,
        payload: {
          runId,
          triggerName: trigger.name,
          outputType: trigger.outputType,
          lookbackWindow,
          repositoryCount: 1,
        },
        status: "failed",
        errorMessage: contentResult.reason,
        retentionDays: logRetentionDays,
      });
      await trackContentOutcome({
        kind: "failed",
        triggerId: trigger.id,
        organizationId: trigger.organizationId,
        outputType: trigger.outputType,
        creationMode: "automatic",
        reason: contentResult.reason,
        lookbackWindow,
        repositoryCount: 1,
        source: "event",
        logPrefix: LOG_PREFIX,
      });
      if (!manual) {
        await recordWorkflowPause({
          triggerId,
          organizationId: trigger.organizationId,
          automationName,
          reason: "workflow_errors",
          logPrefix: LOG_PREFIX,
        });
      }
      await cleanupEmptyCollection({
        collectionId,
        organizationId: trigger.organizationId,
      });
      return { status: "generation_failed", reason: contentResult.reason };
    }

    if (contentResult.status === "skipped") {
      await finishGeneration({
        organizationId: trigger.organizationId,
        runId,
        workflow: WORKFLOW_ANALYTICS_NAMES.EVENT_CONTENT,
        startedAt: workflowStartedAt,
        triggerId,
        outputType: trigger.outputType,
        triggerName: automationName,
        status: "skipped",
        reason: contentResult.reason,
      });
      await finalizeContentBilling({
        reservation: gate,
        action: "release",
        logPrefix: LOG_PREFIX,
      });
      await appendAutomationLog({
        organizationId: trigger.organizationId,
        integrationId: triggerId,
        integrationType: "events",
        title: `Event "${trigger.name.trim() || eventType}" skipped content generation`,
        payload: {
          runId,
          triggerName: trigger.name,
          outputType: trigger.outputType,
          lookbackWindow,
          repositoryCount: 1,
        },
        status: "skipped",
        errorMessage: contentResult.reason,
        retentionDays: logRetentionDays,
      });
      await trackContentOutcome({
        kind: "skipped",
        triggerId: trigger.id,
        organizationId: trigger.organizationId,
        outputType: trigger.outputType,
        creationMode: "automatic",
        reason: contentResult.reason,
        lookbackWindow,
        repositoryCount: 1,
        source: "event",
        logPrefix: LOG_PREFIX,
      });
      await cleanupEmptyCollection({
        collectionId,
        organizationId: trigger.organizationId,
      });
      if (!manual) {
        await clearWorkflowPause({ triggerId, logPrefix: LOG_PREFIX });
      }
      return { status: "skipped", reason: contentResult.reason };
    }

    const createdPosts = contentResult.posts;
    const [primaryPost] = createdPosts;

    if (!primaryPost) {
      console.warn("[Event] Content generation returned no posts", {
        triggerId,
      });
      await finishGeneration({
        organizationId: trigger.organizationId,
        runId,
        workflow: WORKFLOW_ANALYTICS_NAMES.EVENT_CONTENT,
        startedAt: workflowStartedAt,
        triggerId,
        outputType: trigger.outputType,
        triggerName: automationName,
        status: "failed",
        reason: "Content generation returned no posts",
      });
      await finalizeContentBilling({
        reservation: gate,
        action: "release",
        logPrefix: LOG_PREFIX,
      });
      if (!manual) {
        await recordWorkflowPause({
          triggerId,
          organizationId: trigger.organizationId,
          automationName,
          reason: "workflow_errors",
          logPrefix: LOG_PREFIX,
        });
      }
      await cleanupEmptyCollection({
        collectionId,
        organizationId: trigger.organizationId,
      });
      return { status: "empty_result" };
    }

    const postId = primaryPost.postId;
    const contentTitle =
      createdPosts.length === 1
        ? primaryPost.title
        : `${createdPosts.length} ${trigger.outputType.replaceAll("_", " ")} drafts`;

    await finishGeneration({
      organizationId: trigger.organizationId,
      runId,
      workflow: WORKFLOW_ANALYTICS_NAMES.EVENT_CONTENT,
      startedAt: workflowStartedAt,
      triggerId,
      outputType: trigger.outputType,
      triggerName: automationName,
      status: "success",
      title: contentTitle,
    });

    await finalizeContentBilling({
      reservation: gate,
      action: "confirm",
      units: createdPosts.length,
      usage: contentResult.usage,
      fallbackModelId: "anthropic/claude-sonnet-4.6",
      properties: {
        source: "workflow_event",
        output_type: trigger.outputType,
        trigger_name: trigger.name,
        trigger_id: triggerId,
        run_id: runId,
        event_type: eventType,
        markup_applied: gate.useMarkup,
      },
      logPrefix: LOG_PREFIX,
    });

    try {
      await appendAutomationLog({
        organizationId: trigger.organizationId,
        integrationId: triggerId,
        integrationType: "events",
        title:
          createdPosts.length === 1
            ? `Event "${trigger.name.trim() || eventType}" created "${contentTitle}"`
            : `Event "${trigger.name.trim() || eventType}" created ${createdPosts.length} drafts`,
        status: "success",
        referenceId: postId,
        retentionDays: logRetentionDays,
        payload: {
          runId,
          triggerName: trigger.name,
          outputType: trigger.outputType,
          lookbackWindow,
          repositoryCount: 1,
        },
      });
      await trackContentOutcome({
        kind: "created",
        triggerId: trigger.id,
        organizationId: trigger.organizationId,
        outputType: trigger.outputType,
        creationMode: "automatic",
        lookbackWindow,
        repositoryCount: 1,
        source: "event",
        postIds: createdPosts.map((createdPost) => createdPost.postId),
        logPrefix: LOG_PREFIX,
      });
      const notificationData = await fetchNotificationData({
        organizationId: trigger.organizationId,
        setting: "scheduledContentCreation",
      });
      if (notificationData.enabled && notificationData.ownerEmails.length > 0) {
        const baseUrl = process.env.APP_URL ?? "https://app.usenotra.com";
        const contentOverviewLink = `${baseUrl}/${notificationData.organizationSlug}/content`;
        await enqueueDigest({
          organizationId: trigger.organizationId,
          recipientEmails: notificationData.ownerEmails,
          kind: "scheduled_content_created",
          event: {
            organizationName: notificationData.organizationName,
            organizationSlug: notificationData.organizationSlug,
            scheduleName: automationName,
            createdContent: createdPosts.map((createdPost) => ({
              title: createdPost.title,
              contentLink: `${contentOverviewLink}/${createdPost.postId}`,
            })),
            contentType: trigger.outputType,
            contentOverviewLink,
            subject: `New content created from ${eventType} event`,
          },
          logPrefix: LOG_PREFIX,
        });
      }
      if (!manual) {
        await clearWorkflowPause({ triggerId, logPrefix: LOG_PREFIX });
      }
    } catch (postSuccessError) {
      console.error(
        `[Event] Post-success effects failed for trigger ${triggerId}; content remains created`,
        postSuccessError
      );
    }

    return { status: "success", triggerId, postId, eventType };
  } catch (error) {
    await finishGeneration({
      organizationId: trigger.organizationId,
      runId,
      workflow: WORKFLOW_ANALYTICS_NAMES.EVENT_CONTENT,
      startedAt: workflowStartedAt,
      triggerId,
      outputType: trigger.outputType,
      triggerName: automationName,
      status: "failed",
      reason: "Unexpected workflow error",
    });
    await finalizeContentBilling({
      reservation: gate,
      action: "release",
      logPrefix: LOG_PREFIX,
    });
    await cleanupEmptyCollection({
      collectionId,
      organizationId: trigger.organizationId,
    });
    if (!manual) {
      await recordWorkflowPause({
        triggerId,
        organizationId: trigger.organizationId,
        automationName,
        reason: "workflow_errors",
        logPrefix: LOG_PREFIX,
      });
    }
    throw error;
  }
}
