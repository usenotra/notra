import { acquireClaim } from "@notra/ai/autonomy/claims";
import {
  confirmContentBilling,
  releaseContentBilling,
  reserveContentBilling,
} from "@notra/ai/billing/content-billing";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  contentTriggerLookbackWindows,
  contentTriggers,
  githubIntegrations,
  linearIntegrations,
  members,
  organizationNotificationSettings,
  organizations,
  postCollections,
} from "@notra/db/schema";
import { buildPostCollectionName } from "@notra/db/utils/post-collections";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type { LookbackWindow } from "@notra/schemas/dashboard/integrations";
import { and, eq, inArray } from "drizzle-orm";

import { WORKFLOW_OUTCOMES } from "@/constants/workflow-analytics";
import { isAgentContentGenerationEnabled } from "@/lib/agent/flag";
import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import {
  trackContentOutcomeAndFlush,
  trackWorkflowOutcomeAndFlush,
} from "@/lib/analytics/workflow-lifecycle";
import { checkLogRetention } from "@/lib/billing/check-log-retention";
import {
  trackScheduledContentCreated,
  trackScheduledContentFailed,
  trackScheduledContentSkipped,
} from "@/lib/databuddy";
import {
  addActiveGeneration,
  completeActiveGeneration,
} from "@/lib/generations/tracking";
import { appendWebhookLog } from "@/lib/webhooks/logging";
import { sendAiCreditsDepletedEmails } from "@/lib/workflows/shared/ai-credit-notifications";
import {
  clearAutomatedWorkflowPauseSafe,
  recordAutomatedWorkflowPauseSafe,
} from "@/lib/workflows/shared/auto-pause";
import { enqueueContentEmailDigest } from "@/lib/workflows/shared/content-email-digest-enqueue";
import {
  parseLookbackWindow,
  parseTriggerOutputConfig,
  parseTriggerTargets,
} from "@/lib/workflows/shared/parsing";
import type { LogRetentionDays } from "@/types/webhooks/webhooks";
import type {
  AppendAutomationLogInput,
  ClaimWorkflowExecutionInput,
  CreateGenerationCollectionInput,
  EnqueueDigestInput,
  FinalizeContentBillingInput,
  FinishGenerationInput,
  GateContentBillingInput,
  NotificationData,
  NotificationSettingKey,
  NotifyContentLimitInput,
  TrackContentOutcomeInput,
  WorkflowContentBillingGate,
  WorkflowPauseInput,
} from "@/types/workflows/content-generation-steps";
import type {
  ScheduleBrandSettingsData,
  ScheduleRepositoryData,
  ScheduleTriggerData,
  WorkflowRepositoryData,
  WorkflowTriggerData,
} from "@/types/workflows/workflows";

const EXECUTION_CLAIM_TTL_SECONDS = 60 * 60 * 24;
const EXECUTION_CLAIM_SCOPE = "workflow-execution";

export async function claimWorkflowExecution(
  input: ClaimWorkflowExecutionInput
): Promise<{ claimed: boolean }> {
  "use step";
  const claim = await acquireClaim({
    scope: EXECUTION_CLAIM_SCOPE,
    claimKey: input.executionId,
    ownerToken: input.claimToken,
    ttlSeconds: EXECUTION_CLAIM_TTL_SECONDS,
  });
  if (!claim.claimed) {
    await trackServerEventAndFlush({
      event: POSTHOG_EVENTS.WORKFLOW_DUPLICATE_REJECTED,
      organizationId: input.organizationId,
      properties: {
        workflow: input.workflow,
        execution_id: input.executionId,
      },
    });
  }
  return claim;
}

export async function fetchScheduleTriggerContext(triggerId: string): Promise<{
  trigger: ScheduleTriggerData | null;
  lookbackWindow: LookbackWindow;
}> {
  "use step";
  const [result, lookbackResult] = await Promise.all([
    db.query.contentTriggers.findFirst({
      where: eq(contentTriggers.id, triggerId),
    }),
    db.query.contentTriggerLookbackWindows.findFirst({
      where: eq(contentTriggerLookbackWindows.triggerId, triggerId),
    }),
  ]);

  const lookbackWindow = parseLookbackWindow(lookbackResult?.window);
  if (!result) {
    return { trigger: null, lookbackWindow };
  }
  const parsedTargets = parseTriggerTargets(result.targets);
  if (!parsedTargets) {
    return { trigger: null, lookbackWindow };
  }

  return {
    trigger: {
      id: result.id,
      name: result.name,
      organizationId: result.organizationId,
      sourceType: result.sourceType,
      sourceConfig: result.sourceConfig,
      targets: parsedTargets,
      outputType: result.outputType,
      outputConfig: result.outputConfig,
      enabled: result.enabled,
      autoPublish: result.autoPublish,
    },
    lookbackWindow,
  };
}

export async function gateContentBilling(
  input: GateContentBillingInput
): Promise<WorkflowContentBillingGate> {
  "use step";
  return await reserveContentBilling(input);
}

export async function notifyContentLimitReached(
  input: NotifyContentLimitInput
): Promise<void> {
  "use step";
  await sendAiCreditsDepletedEmails(input);
}

export async function recordWorkflowPause(
  input: WorkflowPauseInput
): Promise<void> {
  "use step";
  await recordAutomatedWorkflowPauseSafe(input);
  await trackServerEventAndFlush({
    event: POSTHOG_EVENTS.WORKFLOW_PAUSED,
    organizationId: input.organizationId,
    properties: {
      reason: input.reason,
      trigger_id: input.triggerId,
      source: input.logPrefix.toLowerCase(),
    },
  });
}

export async function clearWorkflowPause(input: {
  triggerId: string;
  logPrefix: string;
}): Promise<void> {
  "use step";
  await clearAutomatedWorkflowPauseSafe(input);
}

export async function fetchScheduleSources(input: {
  organizationId: string;
  repositoryIds: string[];
}): Promise<{
  repositories: ScheduleRepositoryData[];
  linearIntegrationRefs: Array<{ integrationId: string; teamName?: string }>;
}> {
  "use step";
  const [repos, integrations] = await Promise.all([
    input.repositoryIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: githubIntegrations.id,
            owner: githubIntegrations.owner,
            repo: githubIntegrations.repo,
            defaultBranch: githubIntegrations.defaultBranch,
          })
          .from(githubIntegrations)
          .where(
            and(
              eq(githubIntegrations.organizationId, input.organizationId),
              inArray(githubIntegrations.id, input.repositoryIds)
            )
          ),
    db
      .select({
        id: linearIntegrations.id,
        linearTeamName: linearIntegrations.linearTeamName,
      })
      .from(linearIntegrations)
      .where(
        and(
          eq(linearIntegrations.organizationId, input.organizationId),
          eq(linearIntegrations.enabled, true)
        )
      ),
  ]);

  const repositories: ScheduleRepositoryData[] = [];
  for (const repo of repos) {
    if (repo.owner && repo.repo) {
      repositories.push({
        id: repo.id,
        owner: repo.owner,
        repo: repo.repo,
        defaultBranch: repo.defaultBranch,
      });
    }
  }

  return {
    repositories,
    linearIntegrationRefs: integrations.map((integration) => ({
      integrationId: integration.id,
      teamName: integration.linearTeamName ?? undefined,
    })),
  };
}

export async function fetchBrandSettingsData(input: {
  organizationId: string;
  outputConfig?: unknown;
}): Promise<ScheduleBrandSettingsData> {
  "use step";
  const voiceId = parseTriggerOutputConfig(input.outputConfig)?.brandVoiceId;
  let result = voiceId
    ? await db.query.brandSettings.findFirst({
        where: and(
          eq(brandSettings.id, voiceId),
          eq(brandSettings.organizationId, input.organizationId)
        ),
      })
    : null;

  if (!result) {
    result = await db.query.brandSettings.findFirst({
      where: and(
        eq(brandSettings.organizationId, input.organizationId),
        eq(brandSettings.isDefault, true)
      ),
    });
  }

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    name: result.name,
    toneProfile: result.toneProfile,
    companyName: result.companyName,
    companyDescription: result.companyDescription,
    audience: result.audience,
    customInstructions: result.customInstructions,
    language: result.language,
  };
}

export async function startGenerationTracking(input: {
  organizationId: string;
  runId: string;
  triggerId: string;
  outputType: string;
  triggerName: string;
  source?: "dashboard" | "api";
}): Promise<void> {
  "use step";
  await addActiveGeneration(input.organizationId, {
    runId: input.runId,
    triggerId: input.triggerId,
    outputType: input.outputType,
    triggerName: input.triggerName,
    startedAt: new Date().toISOString(),
    ...(input.source ? { source: input.source } : {}),
  });
}

export async function createGenerationCollection(
  input: CreateGenerationCollectionInput
): Promise<void> {
  "use step";
  const now = new Date();
  await db
    .insert(postCollections)
    .values({
      id: input.collectionId,
      organizationId: input.organizationId,
      source: input.source,
      sourceId: input.sourceId,
      name: buildPostCollectionName([input.outputType], now),
      nameSource: "generated",
      contentTypes: [input.outputType],
      sourceMetadata: input.sourceMetadata,
      expectedPostCount: 1,
      completedPostCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: postCollections.id });
}

export async function fetchGenerationUserId(
  organizationId: string
): Promise<string | undefined> {
  "use step";
  const ownerMembership = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, organizationId),
      eq(members.role, "owner")
    ),
    columns: { userId: true },
  });

  if (ownerMembership?.userId) {
    return ownerMembership.userId;
  }

  const membership = await db.query.members.findFirst({
    where: eq(members.organizationId, organizationId),
    columns: { userId: true },
  });

  return membership?.userId;
}

export async function fetchEventTrigger(triggerId: string): Promise<{
  trigger: WorkflowTriggerData | null;
  lookbackWindow: LookbackWindow;
}> {
  "use step";
  const [result, lookbackResult] = await Promise.all([
    db.query.contentTriggers.findFirst({
      where: eq(contentTriggers.id, triggerId),
    }),
    db.query.contentTriggerLookbackWindows.findFirst({
      where: eq(contentTriggerLookbackWindows.triggerId, triggerId),
    }),
  ]);

  const lookbackWindow = parseLookbackWindow(lookbackResult?.window);
  if (!result) {
    return { trigger: null, lookbackWindow };
  }
  return {
    trigger: {
      id: result.id,
      name: result.name,
      organizationId: result.organizationId,
      outputType: result.outputType,
      outputConfig: result.outputConfig,
      enabled: result.enabled,
      autoPublish: result.autoPublish,
    },
    lookbackWindow,
  };
}

export async function fetchEventRepository(input: {
  repositoryId: string;
  organizationId: string;
}): Promise<WorkflowRepositoryData | null> {
  "use step";
  const repo = await db.query.githubIntegrations.findFirst({
    where: and(
      eq(githubIntegrations.id, input.repositoryId),
      eq(githubIntegrations.organizationId, input.organizationId)
    ),
  });
  if (!(repo?.owner && repo.repo)) {
    return null;
  }
  return { id: repo.id, owner: repo.owner, name: repo.repo };
}

export async function fetchLogRetention(
  organizationId: string
): Promise<LogRetentionDays> {
  "use step";
  return await checkLogRetention(organizationId);
}

export async function finishGeneration(
  input: FinishGenerationInput
): Promise<void> {
  "use step";
  await completeActiveGeneration(input.organizationId, {
    runId: input.runId,
    triggerId: input.triggerId,
    outputType: input.outputType,
    triggerName: input.triggerName,
    status: input.status,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.title ? { title: input.title } : {}),
    completedAt: new Date().toISOString(),
  });
  if (input.workflow) {
    await trackWorkflowOutcomeAndFlush({
      workflow: input.workflow,
      outcome:
        input.status === "failed"
          ? WORKFLOW_OUTCOMES.FAILED
          : WORKFLOW_OUTCOMES.COMPLETED,
      organizationId: input.organizationId,
      runId: input.runId,
      startedAt: input.startedAt,
      reason: input.reason,
      properties: {
        status: input.status,
        output_type: input.outputType,
        trigger_id: input.triggerId,
      },
    });
  }
}

export async function finalizeContentBilling(
  input: FinalizeContentBillingInput
): Promise<void> {
  "use step";
  const { reservation } = input;
  if (input.action === "release") {
    await releaseContentBilling(reservation);
    return;
  }
  const releaseUnbilledAgentRun =
    reservation.mode === "ai_credits" &&
    !input.usage &&
    isAgentContentGenerationEnabled();
  if (releaseUnbilledAgentRun) {
    await releaseContentBilling(reservation);
    return;
  }
  await confirmContentBilling({
    reservation,
    units: input.units,
    usage: input.usage,
    fallbackModelId: input.fallbackModelId,
    properties: input.properties,
  });
}

export async function appendAutomationLog(
  input: AppendAutomationLogInput
): Promise<void> {
  "use step";
  await appendWebhookLog({
    payload: input.payload,
    organizationId: input.organizationId,
    integrationId: input.integrationId,
    integrationType: input.integrationType,
    title: input.title,
    status: input.status,
    statusCode: null,
    ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    ...(input.referenceId ? { referenceId: input.referenceId } : {}),
    ...(input.retentionDays ? { retentionDays: input.retentionDays } : {}),
  });
}

export async function trackContentOutcome(
  input: TrackContentOutcomeInput
): Promise<void> {
  "use step";
  await trackContentOutcomeAndFlush(input);
  try {
    if (input.kind === "created") {
      const trackingResults = await Promise.allSettled(
        (input.postIds ?? []).map((postId) =>
          trackScheduledContentCreated({
            triggerId: input.triggerId,
            organizationId: input.organizationId,
            postId,
            outputType: input.outputType,
            creationMode: input.creationMode,
            lookbackWindow: input.lookbackWindow,
            repositoryCount: input.repositoryCount,
            source: input.source,
          })
        )
      );
      const failures = trackingResults.filter(
        (result) => result.status === "rejected"
      );
      if (failures.length > 0) {
        console.warn(
          `[${input.logPrefix}] Failed to track some created posts`,
          {
            triggerId: input.triggerId,
            failureCount: failures.length,
          }
        );
      }
      return;
    }

    if (input.kind === "failed") {
      await trackScheduledContentFailed({
        triggerId: input.triggerId,
        organizationId: input.organizationId,
        outputType: input.outputType,
        creationMode: input.creationMode,
        reason: input.reason ?? "unknown",
        lookbackWindow: input.lookbackWindow,
        repositoryCount: input.repositoryCount,
        source: input.source,
      });
      return;
    }

    await trackScheduledContentSkipped({
      triggerId: input.triggerId,
      organizationId: input.organizationId,
      outputType: input.outputType,
      creationMode: input.creationMode,
      reason: input.reason ?? "unknown",
      lookbackWindow: input.lookbackWindow,
      repositoryCount: input.repositoryCount,
      source: input.source,
    });
  } catch (trackingError) {
    console.warn(`[${input.logPrefix}] Failed to track content outcome`, {
      triggerId: input.triggerId,
      kind: input.kind,
      error: trackingError,
    });
  }
}

export async function fetchNotificationData(input: {
  organizationId: string;
  setting: NotificationSettingKey;
}): Promise<NotificationData> {
  "use step";
  const notificationSettings =
    await db.query.organizationNotificationSettings.findFirst({
      where: eq(
        organizationNotificationSettings.organizationId,
        input.organizationId
      ),
    });

  if (!notificationSettings?.[input.setting]) {
    return {
      enabled: false,
      ownerEmails: [],
      organizationName: "",
      organizationSlug: "",
    };
  }

  const [org, ownerMemberships] = await Promise.all([
    db.query.organizations.findFirst({
      where: eq(organizations.id, input.organizationId),
      columns: { name: true, slug: true },
    }),
    db.query.members.findMany({
      where: and(
        eq(members.organizationId, input.organizationId),
        eq(members.role, "owner")
      ),
      with: { users: { columns: { email: true } } },
    }),
  ]);

  return {
    enabled: true,
    ownerEmails: ownerMemberships.map((membership) => membership.users.email),
    organizationName: org?.name ?? "Your organization",
    organizationSlug: org?.slug ?? "",
  };
}

export async function enqueueDigest(input: EnqueueDigestInput): Promise<void> {
  "use step";
  await enqueueContentEmailDigest(input);
}

export async function cleanupEmptyCollection(input: {
  collectionId: string;
  organizationId: string;
}): Promise<void> {
  "use step";
  await db
    .delete(postCollections)
    .where(
      and(
        eq(postCollections.id, input.collectionId),
        eq(postCollections.organizationId, input.organizationId),
        eq(postCollections.completedPostCount, 0)
      )
    );
}
