import { acquireClaim, releaseClaim } from "@notra/ai/autonomy/claims";
import { chatWorkflowPayloadSchema } from "@notra/ai/schemas/chat";
import type { BrandGuidelinesWorkflowPayload } from "@notra/ai/types/brand-guidelines";
import type { ChatWorkflowPayload } from "@notra/ai/types/chat";
import type { OnboardingAgentWorkflowPayload } from "@notra/ai/types/onboarding-agent";
import { contentGenerationWorkflowPayloadSchema } from "@notra/content-generation/schemas";
import { agentReadinessWorkflowPayloadSchema } from "@notra/geo-core/schemas/agent-readiness";
import {
  geoScanWorkflowPayloadSchema,
  geoWriterWorkflowPayloadSchema,
} from "@notra/geo-core/schemas/geo";
import { gscSyncPayloadSchema } from "@notra/geo-core/schemas/google-search-console";
import type { AgentReadinessWorkflowPayload } from "@notra/geo-core/types/agent-readiness";
import type { GeoWriterPayload } from "@notra/geo-core/types/geo";
import type { GscSyncPayload } from "@notra/geo-core/types/google-search-console";
import { socialAnalyticsSyncPayloadSchema } from "@notra/schemas/dashboard/analytics";
import { brandGuidelinesWorkflowPayloadSchema } from "@notra/schemas/dashboard/brand-guidelines";
import {
  eventWorkflowPayloadSchema,
  scheduleWorkflowPayloadSchema,
} from "@notra/schemas/dashboard/workflows";
import {
  type IrisWorkflowPayload,
  irisWorkflowPayloadSchema,
} from "@notra/schemas/dashboard/workflows/iris";
import { onboardingAgentWorkflowPayloadSchema } from "@notra/schemas/dashboard/workflows/onboarding-agent-payload";
import { start } from "workflow/api";

import {
  IRIS_START_CLAIM_SCOPE,
  IRIS_START_CLAIM_TTL_SECONDS,
} from "@/constants/iris";
import {
  WORKFLOW_ANALYTICS_NAMES,
  WORKFLOW_TRIGGERS,
} from "@/constants/workflow-analytics";
import { trackWorkflowStarted } from "@/lib/analytics/workflow-lifecycle";
import type { BrandAnalysisPayload } from "@/types/brand-analysis";
import { agentReadinessWorkflow } from "@/workflows/agent-readiness";
import {
  brandAnalysisPayloadSchema,
  brandAnalysisWorkflow,
} from "@/workflows/brand-analysis";
import { brandGuidelinesWorkflow } from "@/workflows/brand-guidelines";
import { standaloneChatWorkflow } from "@/workflows/chat";
import { eventContentWorkflow } from "@/workflows/event-content";
import { geoScanWorkflow } from "@/workflows/geo-scan";
import { geoWriterWorkflow } from "@/workflows/geo-writer";
import { gscSyncWorkflow } from "@/workflows/gsc-sync";
import { irisControllerRun } from "@/workflows/iris-controller";
import { onDemandContentWorkflow } from "@/workflows/on-demand-content";
import { onboardingAgentWorkflow } from "@/workflows/onboarding-agent";
import { scheduleContentWorkflow } from "@/workflows/schedule-content";
import { socialAnalyticsSyncWorkflow } from "@/workflows/social-analytics-sync";

export async function startBrandAnalysisRun(
  payload: BrandAnalysisPayload
): Promise<{ runId: string }> {
  const parsed = brandAnalysisPayloadSchema.parse(payload);
  const run = await start(brandAnalysisWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.BRAND_ANALYSIS,
    runId: run.runId,
    organizationId: parsed.organizationId,
    properties: { job_id: parsed.jobId },
  });
  return { runId: run.runId };
}

export async function startBrandGuidelinesRun(
  payload: BrandGuidelinesWorkflowPayload
): Promise<{ runId: string }> {
  const parsed = brandGuidelinesWorkflowPayloadSchema.parse(payload);
  const run = await start(brandGuidelinesWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.BRAND_GUIDELINES,
    runId: run.runId,
    organizationId: parsed.organizationId,
  });
  return { runId: run.runId };
}

export async function startStandaloneChatRun(
  payload: ChatWorkflowPayload
): Promise<{ runId: string }> {
  const parsed = chatWorkflowPayloadSchema.parse(payload);
  const run = await start(standaloneChatWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.CHAT,
    runId: run.runId,
    organizationId: parsed.organizationId,
    userId: parsed.userId,
    properties: { chat_id: parsed.chatId, request_id: parsed.requestId },
  });
  return { runId: run.runId };
}

export async function startOnboardingAgentRun(
  payload: OnboardingAgentWorkflowPayload
): Promise<{ runId: string }> {
  const parsed = onboardingAgentWorkflowPayloadSchema.parse(payload);
  const run = await start(onboardingAgentWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.ONBOARDING_AGENT,
    runId: run.runId,
    organizationId: parsed.organizationId,
  });
  return { runId: run.runId };
}

export async function startIrisRun(
  payload: IrisWorkflowPayload
): Promise<{ runId: string | null }> {
  const parsed = irisWorkflowPayloadSchema.parse(payload);
  const dispatchToken = crypto.randomUUID();
  const dispatch = await acquireClaim({
    scope: IRIS_START_CLAIM_SCOPE,
    claimKey: parsed.executionId,
    ownerToken: dispatchToken,
    ttlSeconds: IRIS_START_CLAIM_TTL_SECONDS,
    organizationId: parsed.organizationId,
  });
  if (!dispatch.claimed) {
    return { runId: null };
  }
  try {
    const run = await start(irisControllerRun, [parsed]);
    trackWorkflowStarted({
      workflow: WORKFLOW_ANALYTICS_NAMES.IRIS_CONTROLLER,
      runId: run.runId,
      organizationId: parsed.organizationId,
      trigger: parsed.trigger,
      properties: { execution_id: parsed.executionId },
    });
    return { runId: run.runId };
  } catch (error) {
    await releaseClaim({
      scope: IRIS_START_CLAIM_SCOPE,
      claimKey: parsed.executionId,
      ownerToken: dispatchToken,
    });
    throw error;
  }
}

export async function startScheduleRun(payload: {
  triggerId: string;
  manual?: boolean;
  executionId?: string;
  delaySeconds?: number;
}): Promise<{ runId: string }> {
  const parsed = scheduleWorkflowPayloadSchema.parse(payload);
  const run = await start(scheduleContentWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.SCHEDULE_CONTENT,
    runId: run.runId,
    trigger: parsed.manual
      ? WORKFLOW_TRIGGERS.MANUAL
      : WORKFLOW_TRIGGERS.SCHEDULE,
    properties: {
      trigger_id: parsed.triggerId,
      execution_id: parsed.executionId,
      delay_seconds: parsed.delaySeconds,
    },
  });
  return { runId: run.runId };
}

export async function startEventRun(payload: {
  triggerId: string;
  eventType: string;
  eventAction: string;
  eventData: Record<string, unknown>;
  repositoryId: string;
  deliveryId?: string;
  executionId?: string;
}): Promise<{ runId: string }> {
  const parsed = eventWorkflowPayloadSchema.parse(payload);
  const run = await start(eventContentWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.EVENT_CONTENT,
    runId: run.runId,
    trigger: WORKFLOW_TRIGGERS.EVENT,
    properties: {
      trigger_id: parsed.triggerId,
      event_type: parsed.eventType,
      event_action: parsed.eventAction,
      execution_id: parsed.executionId,
    },
  });
  return { runId: run.runId };
}

export async function startSocialAnalyticsSyncRun(payload: {
  organizationId?: string;
}): Promise<{ runId: string }> {
  const parsed = socialAnalyticsSyncPayloadSchema.parse(payload);
  const run = await start(socialAnalyticsSyncWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.SOCIAL_ANALYTICS_SYNC,
    runId: run.runId,
    organizationId: parsed.organizationId,
  });
  return { runId: run.runId };
}

export async function startGeoScanRun(payload: {
  organizationId: string;
  projectId?: string;
  claimedAt?: string;
  scanId?: string;
  promptIds?: string[];
  engines?: string[];
}): Promise<{ runId: string }> {
  const parsed = geoScanWorkflowPayloadSchema.parse(payload);
  const run = await start(geoScanWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.GEO_SCAN,
    runId: run.runId,
    organizationId: parsed.organizationId,
    projectId: parsed.projectId,
    properties: { scan_id: parsed.scanId },
  });
  return { runId: run.runId };
}

export async function startGeoWriterRun(
  payload: GeoWriterPayload
): Promise<{ runId: string }> {
  const parsed = geoWriterWorkflowPayloadSchema.parse(payload);
  const run = await start(geoWriterWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.GEO_WRITER,
    runId: run.runId,
    organizationId: parsed.organizationId,
    projectId: parsed.projectId,
    properties: { brief_id: parsed.briefId },
  });
  return { runId: run.runId };
}

export async function startAgentReadinessRun(
  payload: AgentReadinessWorkflowPayload
): Promise<{ runId: string }> {
  const parsed = agentReadinessWorkflowPayloadSchema.parse(payload);
  const run = await start(agentReadinessWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.AGENT_READINESS,
    runId: run.runId,
    organizationId: parsed.organizationId,
    projectId: parsed.projectId,
    properties: { report_id: parsed.reportId },
  });
  return { runId: run.runId };
}

export async function startGscSyncRun(
  payload: GscSyncPayload
): Promise<{ runId: string }> {
  const parsed = gscSyncPayloadSchema.parse(payload);
  const run = await start(gscSyncWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.GSC_SYNC,
    runId: run.runId,
    organizationId: parsed.organizationId,
  });
  return { runId: run.runId };
}

export async function startOnDemandRun(
  payload: unknown
): Promise<{ runId: string }> {
  const parsed = contentGenerationWorkflowPayloadSchema.parse(payload);
  const run = await start(onDemandContentWorkflow, [parsed]);
  trackWorkflowStarted({
    workflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
    runId: run.runId,
    organizationId: parsed.organizationId,
    trigger: parsed.source,
    properties: {
      execution_id: parsed.runId,
      content_type: parsed.contentType,
    },
  });
  return { runId: run.runId };
}
