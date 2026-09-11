import { mandatePolicySchema } from "@notra/ai/schemas/autonomy/mandate";
import type { IrisOutboxArtifact } from "@notra/ai/schemas/autonomy/outbox";
import { irisPlannerDecisionPreviewSchema } from "@notra/schemas/dashboard/iris";

import { IRIS_DEFAULT_POLICY } from "@/constants/iris";
import type {
  IrisMandateRow,
  IrisMandateView,
  IrisRunRowWithRelations,
  IrisRunView,
  IrisSignalRow,
  IrisSignalView,
} from "@/types/iris";
import { extractIrisArtifacts } from "@/utils/iris-artifacts";

const toIso = (value: Date | null): string | null =>
  value === null ? null : value.toISOString();

export const toIrisMandateView = (row: IrisMandateRow): IrisMandateView => {
  const policy = mandatePolicySchema.safeParse(row.policy);
  const resolved = policy.success ? policy.data : IRIS_DEFAULT_POLICY;

  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    objective: row.objective,
    status: row.status,
    version: row.version,
    autoPublish: resolved.autoPublish,
    maxActionsPerDay: resolved.maxActionsPerDay,
    maxTasksPerPlan: resolved.maxTasksPerPlan,
    qstashScheduleId: row.qstashScheduleId,
    pausedAt: toIso(row.pausedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

export const toIrisRunView = (row: IrisRunRowWithRelations): IrisRunView => {
  const preview = irisPlannerDecisionPreviewSchema.safeParse(row.plannerOutput);

  const artifacts: IrisOutboxArtifact[] = [];
  for (const task of row.tasks) {
    artifacts.push(...extractIrisArtifacts(task.result));
  }

  return {
    id: row.id,
    trigger: row.trigger,
    status: row.status,
    decision: preview.success ? (preview.data.decision ?? null) : null,
    reason: preview.success ? (preview.data.reason ?? null) : null,
    costCents: row.costCents,
    startedAt: row.startedAt.toISOString(),
    completedAt: toIso(row.completedAt),
    goal: row.goal
      ? {
          id: row.goal.id,
          title: row.goal.title,
          summary: row.goal.summary,
          status: row.goal.status,
        }
      : null,
    tasks: row.tasks.map((task) => ({
      id: task.id,
      capabilityName: task.capabilityName,
      capabilityVersion: task.capabilityVersion,
      status: task.status,
      attempt: task.attempt,
      errorMessage: task.errorMessage,
      completedAt: toIso(task.completedAt),
    })),
    actions: row.actions.map((action) => ({
      id: action.id,
      capabilityName: action.capabilityName,
      status: action.status,
      finishedAt: toIso(action.finishedAt),
    })),
    outbox: row.outboxMessages.map((message) => ({
      id: message.id,
      destination: message.destination,
      status: message.status,
      attempts: message.attempts,
      lastError: message.lastError,
      deliveredAt: toIso(message.deliveredAt),
    })),
    artifacts,
  };
};

export const toIrisSignalView = (row: IrisSignalRow): IrisSignalView => ({
  id: row.id,
  source: row.source,
  kind: row.kind,
  status: row.status,
  sourceEventId: row.sourceEventId,
  occurredAt: row.occurredAt.toISOString(),
  processedAt: toIso(row.processedAt),
});
