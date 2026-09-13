import type { IconSvgElement } from "@hugeicons/react";
import type {
  Mandate,
  MandateStatus,
} from "@notra/ai/schemas/autonomy/mandate";
import type { IrisOutboxArtifact } from "@notra/ai/schemas/autonomy/outbox";
import type { PlannerOutput } from "@notra/ai/schemas/autonomy/planner";
import type {
  AutonomyActionRow,
  AutonomyActionStatus,
  AutonomyGoalRow,
  AutonomyOutboxRow,
  AutonomyRunRow,
  AutonomyRunStatus,
  AutonomyRunTrigger,
  AutonomySignalRow,
  AutonomyTaskRow,
  AutonomyTaskStatus,
  PlannedTaskRecord,
} from "@notra/ai/types/autonomy";
import type { autonomyMandates } from "@notra/db/schema";

export type IrisMandateRow = typeof autonomyMandates.$inferSelect;

export interface IrisRunRowWithRelations extends Pick<
  AutonomyRunRow,
  | "id"
  | "trigger"
  | "status"
  | "plannerOutput"
  | "costCents"
  | "startedAt"
  | "completedAt"
> {
  goal: Pick<AutonomyGoalRow, "id" | "title" | "summary" | "status"> | null;
  tasks: Pick<
    AutonomyTaskRow,
    | "id"
    | "capabilityName"
    | "capabilityVersion"
    | "status"
    | "attempt"
    | "errorMessage"
    | "completedAt"
    | "result"
  >[];
  actions: Pick<
    AutonomyActionRow,
    "id" | "capabilityName" | "status" | "finishedAt"
  >[];
  outboxMessages: Pick<
    AutonomyOutboxRow,
    "id" | "destination" | "status" | "attempts" | "lastError" | "deliveredAt"
  >[];
}

export type IrisSignalRow = Pick<
  AutonomySignalRow,
  | "id"
  | "source"
  | "kind"
  | "status"
  | "sourceEventId"
  | "occurredAt"
  | "processedAt"
>;

export interface IrisMandateContext {
  mandate: Mandate | null;
  organizationName: string | null;
  organizationSlug: string | null;
}

export interface IrisGatherResult {
  pendingSignalIds: string[];
  pendingSignalCount: number;
  actionsInLast24h: number;
  costCentsInLast24h: number;
  recentActionSummaries: string[];
}

export interface IrisPollSummary {
  recordedCount: number;
  deduplicatedCount: number;
  sources: string[];
}

export interface IrisCoalesceResult {
  primarySignalId: string | null;
  primarySignal: unknown;
  signalIds: string[];
  summaries: string[];
}

export interface IrisControllerProgress {
  runId: string | null;
  coalescedSignalIds: string[];
}

export interface IrisPlanResult {
  status: "planned" | "rejected";
  output: PlannerOutput | null;
  violations: string[];
  costCents: number;
}

export interface IrisTaskOutcome {
  taskId: string;
  localId: string;
  status: "succeeded" | "failed";
  reused: boolean;
  artifacts: IrisOutboxArtifact[];
  costCents: number;
  errorMessage: string | null;
}

export type IrisPlannedTask = PlannedTaskRecord;

export type IrisControllerStatus =
  | "invalid_payload"
  | "duplicate_execution"
  | "controller_busy"
  | "no_active_mandate"
  | "flag_disabled"
  | "gate_blocked"
  | "plan_rejected"
  | "no_op"
  | "escalated"
  | "completed"
  | "failed";

export interface IrisControllerResult {
  status: IrisControllerStatus;
  runId: string | null;
  reason: string | null;
}

export interface IrisMandateView {
  id: string;
  organizationId: string;
  name: string;
  objective: string;
  status: MandateStatus;
  version: number;
  autoPublish: boolean;
  maxActionsPerDay: number;
  maxTasksPerPlan: number;
  qstashScheduleId: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IrisStats {
  runs30d: number;
  artifacts30d: number;
  signalsPending: number;
  lastRunAt: string | null;
}

export type IrisFlagState = "enabled" | "disabled" | "unavailable";

export interface IrisOverview {
  enabled: boolean;
  mandate: IrisMandateView | null;
  slackReady: boolean;
  slackChannelName: string | null;
  stats: IrisStats;
}

export interface IrisRunGoalView {
  id: string;
  title: string;
  summary: string | null;
  status: string;
}

export interface IrisRunTaskView {
  id: string;
  capabilityName: string;
  capabilityVersion: number;
  status: AutonomyTaskStatus;
  attempt: number;
  errorMessage: string | null;
  completedAt: string | null;
}

export interface IrisRunActionView {
  id: string;
  capabilityName: string;
  status: AutonomyActionStatus;
  finishedAt: string | null;
}

export interface IrisRunOutboxView {
  id: string;
  destination: string;
  status: string;
  attempts: number;
  lastError: string | null;
  deliveredAt: string | null;
}

export interface IrisRunView {
  id: string;
  trigger: AutonomyRunTrigger;
  status: AutonomyRunStatus;
  decision: string | null;
  reason: string | null;
  costCents: number;
  startedAt: string;
  completedAt: string | null;
  goal: IrisRunGoalView | null;
  tasks: IrisRunTaskView[];
  actions: IrisRunActionView[];
  outbox: IrisRunOutboxView[];
  artifacts: IrisOutboxArtifact[];
}

export interface IrisListRunsResult {
  runs: IrisRunView[];
  nextCursor: string | null;
}

export interface IrisSignalView {
  id: string;
  source: string;
  kind: string;
  status: string;
  sourceEventId: string | null;
  occurredAt: string;
  processedAt: string | null;
}

export interface IrisExplainerStep {
  key: string;
  icon: IconSvgElement;
  title: string;
  description: string;
}

export interface IrisReadinessItem {
  key: string;
  label: string;
  description: string;
  ready: boolean;
  href: string;
  actionLabel: string;
}

export interface IrisDecisionCopy {
  headline: string;
  detail: string | null;
}

export type IrisNoticeTone = "info" | "warning" | "danger";

export interface IrisOutboxNotice {
  tone: IrisNoticeTone;
  message: string;
  needsSlackFix: boolean;
}

export interface IrisStatTile {
  key: string;
  label: string;
  value: string;
  icon: IconSvgElement;
}

export interface IrisPageClientProps {
  organizationSlug: string;
}

export interface IrisRunStatusBadgeProps {
  status: string;
}

export interface IrisReadinessListProps {
  items: IrisReadinessItem[];
}

export interface IrisStatsRowProps {
  stats: IrisStats;
}

export interface IrisSignalsListProps {
  signals: IrisSignalView[];
}

export interface IrisArtifactCardProps {
  artifact: IrisOutboxArtifact;
  organizationSlug: string;
}

export interface IrisRunCardProps {
  run: IrisRunView;
  organizationSlug: string;
}

export interface IrisStartStateProps {
  organizationSlug: string;
  readiness: IrisReadinessItem[];
  slackReady: boolean;
  isStarting: boolean;
  onStart: () => void;
}

export interface IrisPauseDialogProps {
  open: boolean;
  isPausing: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export interface IrisSignalsListState {
  isPending: boolean;
  isError: boolean;
}

export interface IrisRunsListState {
  isPending: boolean;
  isError: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export interface IrisRunningStateProps {
  organizationSlug: string;
  overview: IrisOverview;
  mandate: IrisMandateView;
  readiness: IrisReadinessItem[];
  runs: IrisRunView[];
  signals: IrisSignalView[];
  runsState: IrisRunsListState;
  signalsState: IrisSignalsListState;
  isBusy: boolean;
  isRunNowPending: boolean;
  isStatusPending: boolean;
  onLoadMoreRuns: () => void;
  onRunNow: () => void;
  onPause: () => void;
  onResume: () => void;
}

export interface IrisGithubSignalInput {
  organizationId: string;
  repositoryId: string;
  repositoryName: string;
  eventType: string;
  eventAction: string;
  eventData: Record<string, unknown>;
  deliveryId: string | null;
}
