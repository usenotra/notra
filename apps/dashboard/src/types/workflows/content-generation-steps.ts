import type {
  ContentCreationMode,
  DatabuddyWorkflowSource,
} from "@notra/content-generation/databuddy";
import type { PostSourceMetadata } from "@notra/db/schema";

export type {
  FinalizeContentBillingInput,
  GateContentBillingInput,
  WorkflowContentBillingGate,
} from "@notra/geo-core/types/content-billing";

import type {
  WorkflowAnalyticsName,
  WorkflowLifecycleFields,
} from "@/types/analytics/workflow-events";
import type {
  IntegrationType,
  LogRetentionDays,
} from "@/types/webhooks/webhooks";
import type { AutomatedWorkflowPauseReason } from "@/types/workflows/auto-pause";
import type {
  ContentEmailDigestKind,
  EnqueueContentEmailDigestEvent,
} from "@/types/workflows/content-email-digest";

export interface NotifyContentLimitInput {
  organizationId: string;
  automationName: string;
  logPrefix: string;
  limitLabel?: string;
}

export interface ClaimWorkflowExecutionInput {
  executionId: string;
  claimToken: string;
  organizationId?: string;
  workflow?: WorkflowAnalyticsName;
}

export interface FinishGenerationInput extends WorkflowLifecycleFields {
  organizationId: string;
  runId: string;
  triggerId: string;
  outputType: string;
  triggerName: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
  title?: string;
}

export interface AppendAutomationLogInput {
  payload?: Record<string, unknown>;
  organizationId: string;
  integrationId: string;
  integrationType: IntegrationType;
  retentionDays?: LogRetentionDays;
  title: string;
  status: "success" | "failed" | "skipped";
  errorMessage?: string;
  referenceId?: string;
}

export interface TrackContentOutcomeInput {
  kind: "created" | "failed" | "skipped";
  triggerId: string;
  organizationId: string;
  outputType: string;
  creationMode: ContentCreationMode;
  lookbackWindow: string;
  repositoryCount: number;
  source: DatabuddyWorkflowSource;
  postIds?: string[];
  reason?: string;
  logPrefix: string;
}

export type NotificationSettingKey =
  | "scheduledContentCreation"
  | "scheduledContentFailed"
  | "scheduledContentSkipped";

export interface NotificationData {
  enabled: boolean;
  ownerEmails: string[];
  organizationName: string;
  organizationSlug: string;
}

export interface EnqueueDigestInput {
  organizationId: string;
  recipientEmails: string[];
  kind: ContentEmailDigestKind;
  event: EnqueueContentEmailDigestEvent;
  logPrefix: string;
}

export interface CreateGenerationCollectionInput {
  collectionId: string;
  organizationId: string;
  source: "schedule" | "automation" | "manual" | "api";
  sourceId: string;
  outputType: string;
  sourceMetadata: PostSourceMetadata & Record<string, unknown>;
}

export interface WorkflowPauseInput {
  triggerId: string;
  organizationId: string;
  automationName: string;
  reason: AutomatedWorkflowPauseReason;
  logPrefix: string;
}
