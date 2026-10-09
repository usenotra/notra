import type { Mandate } from "@notra/ai/schemas/autonomy/mandate";
import type {
  PlannerGoal,
  PlannerOutput,
  PlannerTask,
} from "@notra/ai/schemas/autonomy/planner";
import type {
  autonomyActions,
  autonomyGoals,
  autonomyOutbox,
  autonomyRuns,
  autonomySignals,
  autonomyTasks,
} from "@notra/db/schema";

export interface AcquireAutonomyClaimInput {
  scope: string;
  claimKey: string;
  ownerToken: string;
  ttlSeconds: number;
  organizationId?: string | null;
}

export interface ReleaseAutonomyClaimInput {
  scope: string;
  claimKey: string;
  ownerToken: string;
}

export interface AutonomyClaimResult {
  claimed: boolean;
}

export interface ReapExpiredClaimsResult {
  claims: number;
  leases: number;
}

export type AutonomySignalRow = typeof autonomySignals.$inferSelect;
export type AutonomyGoalRow = typeof autonomyGoals.$inferSelect;
export type AutonomyRunRow = typeof autonomyRuns.$inferSelect;
export type AutonomyTaskRow = typeof autonomyTasks.$inferSelect;
export type AutonomyActionRow = typeof autonomyActions.$inferSelect;
export type AutonomyOutboxRow = typeof autonomyOutbox.$inferSelect;

export type AutonomyRunTrigger = (typeof autonomyRuns.$inferInsert)["trigger"];
export type AutonomyRunStatus = NonNullable<
  (typeof autonomyRuns.$inferInsert)["status"]
>;
export type AutonomyGoalStatus = NonNullable<
  (typeof autonomyGoals.$inferInsert)["status"]
>;
export type AutonomyTaskStatus = NonNullable<
  (typeof autonomyTasks.$inferInsert)["status"]
>;
export type AutonomyActionStatus = NonNullable<
  (typeof autonomyActions.$inferInsert)["status"]
>;

export interface RecordSignalInput {
  organizationId: string;
  source: string;
  kind: string;
  sourceEventId?: string | null;
  occurredAt: Date;
  payload: Record<string, unknown>;
  dedupeHash: string;
}

export interface RecordSignalResult {
  signalId: string;
  deduplicated: boolean;
}

export interface RecordSignalsInput {
  organizationId: string;
  signals: readonly Omit<RecordSignalInput, "organizationId">[];
}

export interface SignalSummary {
  signalId: string;
  source: string;
  kind: string;
  sourceEventId: string | null;
  occurredAt: Date;
  payload: unknown;
}

export interface CoalesceSignalsInput {
  organizationId: string;
  signalIds: readonly string[];
}

export interface CoalesceSignalsResult {
  primarySignalId: string;
  primarySignal: AutonomySignalRow;
  coalescedSignalIds: string[];
  summaries: SignalSummary[];
}

export interface AcquireControllerLeaseInput {
  leaseName: string;
  ownerToken: string;
  ttlSeconds: number;
  organizationId: string;
}

export interface ControllerLeaseResult {
  acquired: boolean;
  fencingToken: number | null;
}

export interface RenewControllerLeaseInput {
  leaseName: string;
  ownerToken: string;
  ttlSeconds: number;
}

export interface ReleaseControllerLeaseInput {
  leaseName: string;
  ownerToken: string;
}

export interface GateEvaluationInput {
  mandate: Pick<Mandate, "id" | "status" | "policy">;
  pendingSignalCount: number;
  actionsInLast24h: number;
  costCentsInLast24h: number;
  now: Date;
}

export interface GateEvaluation {
  proceed: boolean;
  reason: string;
}

export interface TopologicalNode {
  localId: string;
  dependsOn: readonly string[];
}

export interface TopologicalSortResult<NodeType extends TopologicalNode> {
  ordered: NodeType[];
  cycleDetected: boolean;
}

export interface CreateRunInput {
  organizationId: string;
  mandateId: string;
  mandateVersion: number;
  trigger: AutonomyRunTrigger;
}

export interface RecordPlannerOutputInput {
  runId: string;
  plannerOutput: PlannerOutput;
  plannerInputHash: string;
  costCents?: number;
}

export interface CreateGoalWithTasksInput {
  organizationId: string;
  mandateId: string;
  runId: string;
  goal: PlannerGoal;
  tasks: readonly PlannerTask[];
  originSignalIds?: readonly string[];
}

export interface PlannedTaskRecord {
  taskId: string;
  localId: string;
  capabilityName: string;
  capabilityVersion: number;
  params: Record<string, unknown>;
  dependsOnTaskIds: string[];
}

export interface CreateGoalWithTasksResult {
  goalId: string;
  tasks: PlannedTaskRecord[];
}

export interface StartActionInput {
  organizationId: string;
  runId: string;
  taskId: string | null;
  capabilityName: string;
  capabilityVersion: number;
  idempotencyKey: string;
}

export interface StartActionResult {
  action: AutonomyActionRow;
  alreadyExisted: boolean;
}

export interface FinishActionInput {
  actionId: string;
  status: AutonomyActionStatus;
  externalRef?: unknown;
  error?: unknown;
}

export interface MarkTaskInput {
  taskId: string;
  status: AutonomyTaskStatus;
  result?: unknown;
  errorMessage?: string | null;
  attempt?: number;
}

export interface CompleteRunInput {
  runId: string;
  status: AutonomyRunStatus;
  costCents?: number;
}

export interface UpdateGoalStatusInput {
  goalId: string;
  status: AutonomyGoalStatus;
}

export interface AppendCheckpointInput {
  organizationId: string;
  runId: string;
  taskId?: string | null;
  kind: string;
  state: unknown;
}

export interface EnqueueOutboxMessageInput {
  organizationId: string;
  runId: string | null;
  destination: string;
  dedupeKey: string;
  payload: unknown;
}

export interface EnqueueOutboxMessageResult {
  outboxId: string;
  deduplicated: boolean;
}

export interface TrackIrisRunUsageInput {
  organizationId: string;
  runId: string;
  costCents: number;
}
