import {
  ensureIrisCollection,
  executeIrisTask,
} from "@notra/ai/autonomy/capabilities";
import { acquireClaim, reapExpiredClaims } from "@notra/ai/autonomy/claims";
import { deliverPendingOutbox } from "@notra/ai/autonomy/deliver";
import {
  countActionsInLast24h,
  evaluateGate,
  sumRunCostCentsInLast24h,
} from "@notra/ai/autonomy/gate";
import {
  acquireControllerLease,
  releaseControllerLease,
  renewControllerLease,
} from "@notra/ai/autonomy/leases";
import { enqueueOutboxMessage } from "@notra/ai/autonomy/outbox";
import { invokeIrisPlanner } from "@notra/ai/autonomy/planner";
import { pollIrisSources } from "@notra/ai/autonomy/poll";
import {
  appendCheckpoint,
  completeRun,
  createGoalWithTasks,
  createRun,
  finishAction,
  markTask,
  recordPlannerOutput,
  startAction,
  updateGoalStatus,
  updateRunCost,
} from "@notra/ai/autonomy/run-store";
import {
  coalesceSignals,
  listPendingSignals,
  markSignalsProcessed,
  restoreSignalsToPending,
} from "@notra/ai/autonomy/signals";
import { validatePlannerOutputAgainstMandate } from "@notra/ai/autonomy/validate-plan";
import {
  CONTROLLER_CLAIM_TTL_SECONDS,
  CONTROLLER_LEASE_RENEW_TTL_SECONDS,
  CONTROLLER_LEASE_TTL_SECONDS,
  IRIS_CONTROLLER_CLAIM_SCOPE,
  OUTBOX_DESTINATION_SLACK,
  PENDING_SIGNAL_FETCH_LIMIT,
} from "@notra/ai/constants/autonomy";
import { IRIS_CAPABILITY_CATALOG } from "@notra/ai/constants/autonomy-capabilities";
import type { Mandate } from "@notra/ai/schemas/autonomy/mandate";
import type { IrisOutboxPayload } from "@notra/ai/schemas/autonomy/outbox";
import {
  PLANNER_CONTRACT_VERSION,
  type PlannerGoal,
  type PlannerOutput,
  type PlannerTask,
} from "@notra/ai/schemas/autonomy/planner";
import type {
  AutonomyGoalStatus,
  AutonomyRunStatus,
  AutonomyRunTrigger,
  CreateGoalWithTasksResult,
} from "@notra/ai/types/autonomy";
import { buildControllerLeaseName } from "@notra/ai/utils/autonomy-lease-name";
import { trackIrisRunUsage } from "@notra/ai/utils/iris-billing";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Effect } from "effect";

import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { resolveIrisFlagState } from "@/lib/iris/flag";
import {
  failOpenRun,
  isRepeatedGateBlock,
  loadRecentActionSummaries,
} from "@/lib/iris/history";
import {
  loadActiveMandateRow,
  loadIrisMandateContext,
} from "@/lib/iris/mandate";
import type {
  IrisCoalesceResult,
  IrisFlagState,
  IrisGatherResult,
  IrisMandateContext,
  IrisPlannedTask,
  IrisPlanResult,
  IrisPollSummary,
  IrisTaskOutcome,
} from "@/types/iris";
import { extractIrisArtifacts } from "@/utils/iris-artifacts";
import { describeIrisError } from "@/utils/iris-error";
import {
  buildIrisActionIdempotencyKey,
  buildIrisGateInputHash,
} from "@/utils/iris-hash";
import { buildSignalSummaryLine } from "@/utils/iris-signal-summary";
import { registerWorkflowRuntime } from "@/workflows/runtime";

const FIRST_ATTEMPT = 1;

export async function claimIrisExecution(input: {
  organizationId: string;
  executionId: string;
  claimToken: string;
}): Promise<{ claimed: boolean }> {
  "use step";
  await registerWorkflowRuntime();
  return await acquireClaim({
    scope: IRIS_CONTROLLER_CLAIM_SCOPE,
    claimKey: input.executionId,
    ownerToken: input.claimToken,
    ttlSeconds: CONTROLLER_CLAIM_TTL_SECONDS,
    organizationId: input.organizationId,
  });
}

export async function acquireIrisLease(input: {
  organizationId: string;
  ownerToken: string;
}): Promise<{ acquired: boolean; fencingToken: number | null }> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    acquireControllerLease({
      leaseName: buildControllerLeaseName(input.organizationId),
      ownerToken: input.ownerToken,
      ttlSeconds: CONTROLLER_LEASE_TTL_SECONDS,
      organizationId: input.organizationId,
    })
  );
}

export async function renewIrisLease(input: {
  organizationId: string;
  ownerToken: string;
}): Promise<boolean> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    renewControllerLease({
      leaseName: buildControllerLeaseName(input.organizationId),
      ownerToken: input.ownerToken,
      ttlSeconds: CONTROLLER_LEASE_RENEW_TTL_SECONDS,
    }).pipe(Effect.catch(() => Effect.succeed(false)))
  );
}

export async function isIrisMandateActive(
  organizationId: string
): Promise<boolean> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    loadActiveMandateRow(organizationId).pipe(Effect.map((row) => row !== null))
  );
}

export async function persistIrisRunCost(input: {
  organizationId: string;
  runId: string;
  costCents: number;
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await Effect.runPromise(
    updateRunCost(input).pipe(
      Effect.catch((error) =>
        Effect.annotateLogs(Effect.logWarning("iris.run.costPersistFailed"), {
          runId: input.runId,
          error: describeIrisError(error),
        })
      )
    )
  );
}

export async function releaseIrisLease(input: {
  organizationId: string;
  ownerToken: string;
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await Effect.runPromise(
    releaseControllerLease({
      leaseName: buildControllerLeaseName(input.organizationId),
      ownerToken: input.ownerToken,
    }).pipe(
      Effect.catch((error) =>
        Effect.annotateLogs(Effect.logWarning("iris.lease.releaseFailed"), {
          organizationId: input.organizationId,
          error: describeIrisError(error),
        })
      )
    )
  );
}

export async function loadIrisMandate(
  organizationId: string
): Promise<IrisMandateContext> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(loadIrisMandateContext(organizationId));
}

export async function resolveIrisFlagForRun(
  organizationId: string
): Promise<IrisFlagState> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    resolveIrisFlagState(organizationId).pipe(
      Effect.tap((state) =>
        state === "disabled"
          ? Effect.annotateLogs(Effect.logInfo("iris.flag.disabled"), {
              organizationId,
            })
          : Effect.void
      )
    )
  );
}

export async function gatherIrisContext(
  organizationId: string
): Promise<IrisGatherResult> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    Effect.gen(function* () {
      const [
        signals,
        actionsInLast24h,
        costCentsInLast24h,
        recentActionSummaries,
      ] = yield* Effect.all([
        listPendingSignals(organizationId, PENDING_SIGNAL_FETCH_LIMIT),
        countActionsInLast24h(organizationId),
        sumRunCostCentsInLast24h(organizationId),
        loadRecentActionSummaries(organizationId),
      ]);

      return {
        pendingSignalIds: signals.map((signal) => signal.id),
        pendingSignalCount: signals.length,
        actionsInLast24h,
        costCentsInLast24h,
        recentActionSummaries,
      };
    })
  );
}

export async function pollIrisSourcesStep(input: {
  organizationId: string;
}): Promise<IrisPollSummary> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    pollIrisSources({ organizationId: input.organizationId }).pipe(
      Effect.map((result): IrisPollSummary => ({
        recordedCount: result.recordedCount,
        deduplicatedCount: result.deduplicatedCount,
        sources: result.sources.map((source) => source.source),
      })),
      Effect.catch((error) =>
        Effect.annotateLogs(Effect.logWarning("iris.poll.failed"), {
          organizationId: input.organizationId,
          error: describeIrisError(error),
        }).pipe(
          Effect.as({ recordedCount: 0, deduplicatedCount: 0, sources: [] })
        )
      )
    )
  );
}

export async function evaluateIrisGate(input: {
  mandate: Mandate;
  pendingSignalCount: number;
  actionsInLast24h: number;
  costCentsInLast24h: number;
}): Promise<{ proceed: boolean; reason: string }> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    evaluateGate({
      mandate: input.mandate,
      pendingSignalCount: input.pendingSignalCount,
      actionsInLast24h: input.actionsInLast24h,
      costCentsInLast24h: input.costCentsInLast24h,
      now: new Date(),
    })
  );
}

export async function isRepeatedIrisGateBlock(input: {
  organizationId: string;
  reason: string;
}): Promise<boolean> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    isRepeatedGateBlock(input).pipe(
      Effect.catch((error) =>
        Effect.annotateLogs(Effect.logWarning("iris.gate.repeatCheckFailed"), {
          organizationId: input.organizationId,
          error: describeIrisError(error),
        }).pipe(Effect.as(false))
      )
    )
  );
}

export async function createIrisRun(input: {
  organizationId: string;
  mandateId: string;
  mandateVersion: number;
  trigger: AutonomyRunTrigger;
}): Promise<{ runId: string }> {
  "use step";
  await registerWorkflowRuntime();
  const run = await Effect.runPromise(createRun(input));
  return { runId: run.id };
}

export async function recordIrisNoOpRun(input: {
  runId: string;
  mandate: Mandate;
  reason: string;
  consumedSignalIds: string[];
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  const plannerOutput: PlannerOutput = {
    contractVersion: PLANNER_CONTRACT_VERSION,
    mandate: {
      mandateId: input.mandate.id,
      mandateVersion: input.mandate.version,
    },
    decision: "no_op",
    reason: input.reason,
    consumedSignalIds: input.consumedSignalIds,
    tasks: [],
  };

  await Effect.runPromise(
    Effect.gen(function* () {
      yield* recordPlannerOutput({
        runId: input.runId,
        plannerOutput,
        plannerInputHash: buildIrisGateInputHash({
          mandateId: input.mandate.id,
          mandateVersion: input.mandate.version,
          reason: input.reason,
          consumedSignalIds: input.consumedSignalIds,
        }),
      });
      yield* completeRun({ runId: input.runId, status: "completed" });
    })
  );

  await trackServerEventAndFlush({
    event: POSTHOG_EVENTS.IRIS_RUN_NOOP,
    organizationId: input.mandate.organizationId,
    properties: {
      run_id: input.runId,
      mandate_id: input.mandate.id,
      mandate_version: input.mandate.version,
      gate_reason: input.reason,
      signal_count: input.consumedSignalIds.length,
      artifact_count: 0,
      cost_cents: 0,
    },
  });
}

export async function coalesceIrisSignals(input: {
  organizationId: string;
  signalIds: string[];
}): Promise<IrisCoalesceResult> {
  "use step";
  await registerWorkflowRuntime();
  if (input.signalIds.length === 0) {
    return {
      primarySignalId: null,
      primarySignal: null,
      signalIds: [],
      summaries: [],
    };
  }

  const result = await Effect.runPromise(
    coalesceSignals({
      organizationId: input.organizationId,
      signalIds: input.signalIds,
    })
  );

  return {
    primarySignalId: result.primarySignalId,
    primarySignal: result.primarySignal.payload,
    signalIds: input.signalIds,
    summaries: result.summaries.map(buildSignalSummaryLine),
  };
}

export async function planIrisRun(input: {
  runId: string;
  mandate: Mandate;
  signalSummaries: string[];
  recentActionSummaries: string[];
}): Promise<IrisPlanResult> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    Effect.gen(function* () {
      const invoked = yield* Effect.result(
        invokeIrisPlanner({
          mandate: input.mandate,
          signalSummaries: input.signalSummaries,
          recentActionSummaries: input.recentActionSummaries,
          capabilityCatalog: IRIS_CAPABILITY_CATALOG,
        })
      );

      if (invoked._tag === "Failure") {
        const failure = invoked.failure;
        const violations =
          failure.violations.length > 0
            ? [...failure.violations]
            : [failure.message];

        yield* Effect.annotateLogs(Effect.logWarning("iris.plan.failed"), {
          runId: input.runId,
          costCents: failure.costCents,
          violations: violations.join("; "),
        });

        return {
          status: "rejected",
          output: null,
          violations,
          costCents: failure.costCents,
        } satisfies IrisPlanResult;
      }

      const planned = invoked.success;

      yield* recordPlannerOutput({
        runId: input.runId,
        plannerOutput: planned.output,
        plannerInputHash: planned.inputHash,
        costCents: planned.costCents,
      });

      const violations = validatePlannerOutputAgainstMandate(
        planned.output,
        input.mandate
      );

      if (violations.length > 0) {
        yield* Effect.annotateLogs(Effect.logWarning("iris.plan.rejected"), {
          runId: input.runId,
          violations: violations.join("; "),
        });
        return {
          status: "rejected",
          output: planned.output,
          violations,
          costCents: planned.costCents,
        } satisfies IrisPlanResult;
      }

      return {
        status: "planned",
        output: planned.output,
        violations: [],
        costCents: planned.costCents,
      } satisfies IrisPlanResult;
    })
  );
}

export async function persistIrisPlan(input: {
  organizationId: string;
  mandateId: string;
  runId: string;
  goal: PlannerGoal;
  tasks: PlannerTask[];
  originSignalIds: string[];
}): Promise<CreateGoalWithTasksResult> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(createGoalWithTasks(input));
}

export async function ensureIrisRunCollection(input: {
  organizationId: string;
  runId: string;
}): Promise<{ collectionId: string }> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    ensureIrisCollection(input.organizationId, input.runId)
  );
}

export async function runIrisTask(input: {
  organizationId: string;
  runId: string;
  mandate: Mandate;
  collectionId: string;
  task: IrisPlannedTask;
  signalContext: { primarySignal: unknown; summaries: string[] };
}): Promise<IrisTaskOutcome> {
  "use step";
  await registerWorkflowRuntime();
  return await Effect.runPromise(
    Effect.gen(function* () {
      yield* markTask({
        taskId: input.task.taskId,
        status: "running",
        attempt: FIRST_ATTEMPT,
      });

      const started = yield* startAction({
        organizationId: input.organizationId,
        runId: input.runId,
        taskId: input.task.taskId,
        capabilityName: input.task.capabilityName,
        capabilityVersion: input.task.capabilityVersion,
        idempotencyKey: buildIrisActionIdempotencyKey(
          input.runId,
          input.task.localId
        ),
      });

      if (started.alreadyExisted && started.action.status === "succeeded") {
        const artifacts = extractIrisArtifacts(started.action.externalRef);
        yield* markTask({
          taskId: input.task.taskId,
          status: "completed",
          result: { artifacts, reused: true },
        });
        yield* appendCheckpoint({
          organizationId: input.organizationId,
          runId: input.runId,
          taskId: input.task.taskId,
          kind: "task.reused",
          state: {
            localId: input.task.localId,
            artifactCount: artifacts.length,
          },
        });
        return {
          taskId: input.task.taskId,
          localId: input.task.localId,
          status: "succeeded",
          reused: true,
          artifacts,
          costCents: 0,
          errorMessage: null,
        } satisfies IrisTaskOutcome;
      }

      if (started.alreadyExisted && started.action.status === "executing") {
        const errorMessage =
          "A previous attempt of this action is still recorded as executing, so it was not run again";
        yield* finishAction({
          actionId: started.action.id,
          status: "unknown",
          error: { message: errorMessage },
        });
        yield* markTask({
          taskId: input.task.taskId,
          status: "failed",
          errorMessage,
        });
        yield* appendCheckpoint({
          organizationId: input.organizationId,
          runId: input.runId,
          taskId: input.task.taskId,
          kind: "task.unknown",
          state: { localId: input.task.localId, errorMessage },
        });
        return {
          taskId: input.task.taskId,
          localId: input.task.localId,
          status: "failed",
          reused: false,
          artifacts: [],
          costCents: 0,
          errorMessage,
        } satisfies IrisTaskOutcome;
      }

      const executed = yield* Effect.result(
        executeIrisTask({
          organizationId: input.organizationId,
          runId: input.runId,
          mandate: input.mandate,
          task: {
            id: input.task.taskId,
            capabilityName: input.task.capabilityName,
            capabilityVersion: input.task.capabilityVersion,
            params: input.task.params,
          },
          signalContext: input.signalContext,
          collectionId: input.collectionId,
        })
      );

      if (executed._tag === "Failure") {
        const errorMessage = describeIrisError(executed.failure);
        yield* finishAction({
          actionId: started.action.id,
          status: "failed",
          error: { message: errorMessage },
        });
        yield* markTask({
          taskId: input.task.taskId,
          status: "failed",
          errorMessage,
        });
        yield* appendCheckpoint({
          organizationId: input.organizationId,
          runId: input.runId,
          taskId: input.task.taskId,
          kind: "task.failed",
          state: { localId: input.task.localId, errorMessage },
        });
        return {
          taskId: input.task.taskId,
          localId: input.task.localId,
          status: "failed",
          reused: false,
          artifacts: [],
          costCents: 0,
          errorMessage,
        } satisfies IrisTaskOutcome;
      }

      const result = executed.success;
      yield* finishAction({
        actionId: started.action.id,
        status: "succeeded",
        externalRef: {
          artifacts: result.artifacts,
          details: result.externalRef ?? null,
        },
      });
      yield* markTask({
        taskId: input.task.taskId,
        status: "completed",
        result: { artifacts: result.artifacts, costCents: result.costCents },
      });
      yield* appendCheckpoint({
        organizationId: input.organizationId,
        runId: input.runId,
        taskId: input.task.taskId,
        kind: "task.completed",
        state: {
          localId: input.task.localId,
          artifactCount: result.artifacts.length,
        },
      });

      return {
        taskId: input.task.taskId,
        localId: input.task.localId,
        status: "succeeded",
        reused: false,
        artifacts: result.artifacts,
        costCents: result.costCents,
        errorMessage: null,
      } satisfies IrisTaskOutcome;
    })
  );
}

export async function cancelIrisTasks(input: {
  taskIds: string[];
  reason: string;
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  if (input.taskIds.length === 0) {
    return;
  }

  await Effect.runPromise(
    Effect.forEach(
      input.taskIds,
      (taskId) =>
        markTask({
          taskId,
          status: "canceled",
          errorMessage: input.reason,
        }),
      { discard: true }
    )
  );
}

export async function finalizeIrisRun(input: {
  organizationId: string;
  runId: string;
  status: AutonomyRunStatus;
  costCents: number;
  goalId: string | null;
  goalStatus: AutonomyGoalStatus | null;
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await Effect.runPromise(
    Effect.gen(function* () {
      yield* completeRun({
        runId: input.runId,
        status: input.status,
        costCents: input.costCents,
      });

      yield* trackIrisRunUsage({
        organizationId: input.organizationId,
        runId: input.runId,
        costCents: input.costCents,
      });

      if (input.goalId !== null && input.goalStatus !== null) {
        yield* updateGoalStatus({
          goalId: input.goalId,
          status: input.goalStatus,
        });
      }
    })
  );

  await trackServerEventAndFlush({
    event:
      input.status === "failed"
        ? POSTHOG_EVENTS.IRIS_RUN_FAILED
        : POSTHOG_EVENTS.IRIS_RUN_COMPLETED,
    organizationId: input.organizationId,
    properties: {
      run_id: input.runId,
      run_status: input.status,
      cost_cents: input.costCents,
      has_goal: input.goalId !== null,
      goal_status: input.goalStatus,
    },
  });
}

export async function publishIrisOutbox(input: {
  organizationId: string;
  runId: string;
  allowedDestinations: string[];
  payload: IrisOutboxPayload;
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await Effect.runPromise(
    Effect.gen(function* () {
      if (!input.allowedDestinations.includes(OUTBOX_DESTINATION_SLACK)) {
        yield* Effect.annotateLogs(
          Effect.logInfo("iris.outbox.destinationNotAllowed"),
          {
            organizationId: input.organizationId,
            runId: input.runId,
            destination: OUTBOX_DESTINATION_SLACK,
          }
        );
        return;
      }

      const mandate = yield* Effect.result(
        loadActiveMandateRow(input.organizationId)
      );
      if (mandate._tag !== "Success" || mandate.success === null) {
        yield* Effect.annotateLogs(
          Effect.logWarning("iris.outbox.skippedWithoutActiveMission"),
          {
            organizationId: input.organizationId,
            runId: input.runId,
            lookupFailed: mandate._tag !== "Success",
          }
        );
        return;
      }

      yield* enqueueOutboxMessage({
        organizationId: input.organizationId,
        runId: input.runId,
        destination: OUTBOX_DESTINATION_SLACK,
        dedupeKey: `iris-run-${input.runId}`,
        payload: input.payload,
      });
      yield* deliverPendingOutbox(input.organizationId);
    })
  );
}

export async function sweepIrisOutbox(input: {
  organizationId: string;
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await Effect.runPromise(
    deliverPendingOutbox(input.organizationId).pipe(
      Effect.asVoid,
      Effect.catch((error) =>
        Effect.annotateLogs(Effect.logWarning("iris.outbox.sweepFailed"), {
          organizationId: input.organizationId,
          error: describeIrisError(error),
        })
      )
    )
  );
}

export async function markIrisSignalsProcessed(input: {
  organizationId: string;
  signalIds: string[];
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await Effect.runPromise(
    markSignalsProcessed(input.organizationId, input.signalIds)
  );
}

export async function restoreIrisSignals(input: {
  organizationId: string;
  signalIds: string[];
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await Effect.runPromise(
    restoreSignalsToPending(input.organizationId, input.signalIds).pipe(
      Effect.catch((error) =>
        Effect.annotateLogs(Effect.logError("iris.signals.restoreFailed"), {
          organizationId: input.organizationId,
          error: describeIrisError(error),
        })
      )
    )
  );
}

export async function reapIrisExpiredClaims(): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  const reaped = await reapExpiredClaims();
  await Effect.runPromise(
    Effect.annotateLogs(Effect.logDebug("iris.claims.reapStep"), {
      claims: reaped.claims,
      leases: reaped.leases,
    })
  );
}

export async function closeOpenIrisRun(input: {
  organizationId: string;
  runId: string;
}): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await Effect.runPromise(
    failOpenRun(input).pipe(
      Effect.catch((error) =>
        Effect.annotateLogs(Effect.logError("iris.run.closeFailed"), {
          organizationId: input.organizationId,
          runId: input.runId,
          error: describeIrisError(error),
        })
      )
    )
  );

  await trackServerEventAndFlush({
    event: POSTHOG_EVENTS.IRIS_RUN_FAILED,
    organizationId: input.organizationId,
    properties: {
      run_id: input.runId,
      run_status: "failed",
      gate_reason: "stale_open_run",
    },
  });
}
