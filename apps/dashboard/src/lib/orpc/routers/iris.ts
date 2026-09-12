import { cancelPendingOutboxForOrganization } from "@notra/ai/autonomy/outbox";
import { IRIS_MANDATE_NAME } from "@notra/ai/constants/autonomy";
import { db } from "@notra/db/drizzle";
import {
  autonomyActions,
  autonomyMandates,
  autonomyRuns,
  autonomySignals,
  organizations,
  slackIntegrations,
} from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { IRIS_SIGNALS_PAGE_SIZE } from "@notra/schemas/constants/dashboard/iris";
import {
  irisListRunsInputSchema,
  irisListSignalsInputSchema,
  irisMandateInputSchema,
  irisOrganizationInputSchema,
} from "@notra/schemas/dashboard/iris";
import { and, count, desc, eq, gte, isNotNull, lt } from "drizzle-orm";
import { Effect } from "effect";

import {
  IRIS_DEFAULT_POLICY,
  IRIS_MANDATE_INITIAL_VERSION,
  IRIS_RUNS_PAGE_SIZE,
  IRIS_STATS_WINDOW_MS,
} from "@/constants/iris";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { assertActiveSubscription } from "@/lib/billing/subscription";
import { assertIrisEnabled } from "@/lib/iris/access";
import { isIrisEnabledForOrganization } from "@/lib/iris/flag";
import { hasOpenRun } from "@/lib/iris/history";
import { buildIrisObjective } from "@/lib/iris/objective";
import {
  toIrisMandateView,
  toIrisRunView,
  toIrisSignalView,
} from "@/lib/iris/serialize";
import {
  createIrisWakeSchedule,
  deleteIrisWakeSchedule,
} from "@/lib/iris/wake-schedule";
import { authorizedProcedure } from "@/lib/orpc/base";
import {
  conflict,
  internalServerError,
  notFound,
} from "@/lib/orpc/utils/errors";
import { startIrisRun } from "@/lib/workflows/start";
import type {
  IrisListRunsResult,
  IrisMandateRow,
  IrisMandateView,
  IrisOverview,
  IrisSignalView,
} from "@/types/iris";
import { describeIrisError } from "@/utils/iris-error";

async function loadMandateRow(
  organizationId: string,
  mandateId?: string
): Promise<IrisMandateRow | null> {
  const filters = [eq(autonomyMandates.organizationId, organizationId)];
  if (mandateId) {
    filters.push(eq(autonomyMandates.id, mandateId));
  } else {
    filters.push(eq(autonomyMandates.name, IRIS_MANDATE_NAME));
  }

  const rows = await db
    .select()
    .from(autonomyMandates)
    .where(and(...filters))
    .limit(1);

  return rows.at(0) ?? null;
}

async function ensureWakeSchedule(mandate: IrisMandateRow): Promise<void> {
  if (mandate.qstashScheduleId) {
    return;
  }

  try {
    await Effect.runPromise(
      createIrisWakeSchedule(mandate.organizationId, mandate.id)
    );
  } catch (error) {
    console.error("[Iris] Failed to create the wake schedule", {
      organizationId: mandate.organizationId,
      mandateId: mandate.id,
      error: describeIrisError(error),
    });
  }
}

async function kickManualRun(organizationId: string): Promise<string | null> {
  try {
    const { runId } = await startIrisRun({
      organizationId,
      trigger: "manual",
      executionId: `iris-manual-${crypto.randomUUID()}`,
    });
    return runId;
  } catch (error) {
    console.error("[Iris] Failed to start a manual run", {
      organizationId,
      error: describeIrisError(error),
    });
    return null;
  }
}

async function reloadMandateView(
  organizationId: string,
  mandateId: string
): Promise<IrisMandateView> {
  const row = await loadMandateRow(organizationId, mandateId);
  if (!row) {
    throw internalServerError("Iris mission could not be loaded");
  }
  return toIrisMandateView(row);
}

export const irisRouter = {
  getOverview: authorizedProcedure
    .input(irisOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<IrisOverview> => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const since = new Date(Date.now() - IRIS_STATS_WINDOW_MS);

      const [
        enabled,
        mandateRow,
        slackRows,
        runCountRows,
        artifactCountRows,
        pendingSignalRows,
        lastRunRows,
      ] = await Promise.all([
        isIrisEnabledForOrganization(input.organizationId),
        loadMandateRow(input.organizationId),
        db
          .select({
            notificationChannelId: slackIntegrations.notificationChannelId,
          })
          .from(slackIntegrations)
          .where(
            and(
              eq(slackIntegrations.organizationId, input.organizationId),
              eq(slackIntegrations.enabled, true),
              isNotNull(slackIntegrations.notificationChannelId)
            )
          )
          .limit(1),
        db
          .select({ total: count() })
          .from(autonomyRuns)
          .where(
            and(
              eq(autonomyRuns.organizationId, input.organizationId),
              gte(autonomyRuns.startedAt, since)
            )
          ),
        db
          .select({ total: count() })
          .from(autonomyActions)
          .where(
            and(
              eq(autonomyActions.organizationId, input.organizationId),
              eq(autonomyActions.status, "succeeded"),
              gte(autonomyActions.createdAt, since)
            )
          ),
        db
          .select({ total: count() })
          .from(autonomySignals)
          .where(
            and(
              eq(autonomySignals.organizationId, input.organizationId),
              eq(autonomySignals.status, "pending")
            )
          ),
        db
          .select({ startedAt: autonomyRuns.startedAt })
          .from(autonomyRuns)
          .where(eq(autonomyRuns.organizationId, input.organizationId))
          .orderBy(desc(autonomyRuns.startedAt))
          .limit(1),
      ]);

      const slack = slackRows.at(0) ?? null;

      return {
        enabled,
        mandate: mandateRow ? toIrisMandateView(mandateRow) : null,
        slackReady: slack !== null,
        slackChannelName: slack?.notificationChannelId ?? null,
        stats: {
          runs30d: runCountRows.at(0)?.total ?? 0,
          artifacts30d: artifactCountRows.at(0)?.total ?? 0,
          signalsPending: pendingSignalRows.at(0)?.total ?? 0,
          lastRunAt: lastRunRows.at(0)?.startedAt.toISOString() ?? null,
        },
      };
    }),

  start: authorizedProcedure
    .input(irisOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<IrisMandateView> => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      await assertIrisEnabled(input.organizationId);
      await assertActiveSubscription(input.organizationId);

      const organization = await db.query.organizations.findFirst({
        columns: { name: true },
        where: eq(organizations.id, input.organizationId),
      });

      const now = new Date();
      const inserted = await db
        .insert(autonomyMandates)
        .values({
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          name: IRIS_MANDATE_NAME,
          objective: buildIrisObjective(organization?.name ?? "your team"),
          policy: IRIS_DEFAULT_POLICY,
          status: "active",
          version: IRIS_MANDATE_INITIAL_VERSION,
          createdByUserId: context.user.id,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [autonomyMandates.organizationId, autonomyMandates.name],
          set: { status: "active", pausedAt: null, updatedAt: now },
        })
        .returning();

      const mandate = inserted.at(0);
      if (!mandate) {
        throw internalServerError("Iris could not be started");
      }

      const [, manualRunId] = await Promise.all([
        ensureWakeSchedule(mandate),
        kickManualRun(input.organizationId),
      ]);

      trackServerEvent({
        event: POSTHOG_EVENTS.IRIS_STARTED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          mandate_id: mandate.id,
          mandate_version: mandate.version,
          manual_run_started: manualRunId !== null,
        },
      });

      return await reloadMandateView(input.organizationId, mandate.id);
    }),

  pause: authorizedProcedure
    .input(irisMandateInputSchema)
    .handler(async ({ context, input }): Promise<IrisMandateView> => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const mandate = await loadMandateRow(
        input.organizationId,
        input.mandateId
      );
      if (!mandate) {
        throw notFound("Iris mission not found");
      }

      await db
        .update(autonomyMandates)
        .set({ status: "paused", pausedAt: new Date(), updatedAt: new Date() })
        .where(eq(autonomyMandates.id, mandate.id));

      try {
        const removed = await Effect.runPromise(
          deleteIrisWakeSchedule(mandate)
        );
        if (!removed) {
          console.warn("[Iris] The wake schedule was kept for a later retry", {
            mandateId: mandate.id,
            scheduleId: mandate.qstashScheduleId,
          });
        }
      } catch (error) {
        console.error("[Iris] Failed to delete the wake schedule", {
          mandateId: mandate.id,
          error: describeIrisError(error),
        });
      }

      try {
        await Effect.runPromise(
          cancelPendingOutboxForOrganization(input.organizationId)
        );
      } catch (error) {
        console.error("[Iris] Failed to cancel pending messages", {
          organizationId: input.organizationId,
          error: describeIrisError(error),
        });
      }

      trackServerEvent({
        event: POSTHOG_EVENTS.IRIS_PAUSED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          mandate_id: mandate.id,
          pause_reason: "manual",
        },
      });

      return await reloadMandateView(input.organizationId, mandate.id);
    }),

  resume: authorizedProcedure
    .input(irisMandateInputSchema)
    .handler(async ({ context, input }): Promise<IrisMandateView> => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      await assertIrisEnabled(input.organizationId);
      await assertActiveSubscription(input.organizationId);

      const mandate = await loadMandateRow(
        input.organizationId,
        input.mandateId
      );
      if (!mandate) {
        throw notFound("Iris mission not found");
      }

      await db
        .update(autonomyMandates)
        .set({ status: "active", pausedAt: null, updatedAt: new Date() })
        .where(eq(autonomyMandates.id, mandate.id));

      await ensureWakeSchedule(mandate);

      trackServerEvent({
        event: POSTHOG_EVENTS.IRIS_RESUMED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          mandate_id: mandate.id,
        },
      });

      return await reloadMandateView(input.organizationId, mandate.id);
    }),

  runNow: authorizedProcedure
    .input(irisOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<{ runId: string }> => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      await assertIrisEnabled(input.organizationId);
      await assertActiveSubscription(input.organizationId);

      const busy = await Effect.runPromise(hasOpenRun(input.organizationId));
      if (busy) {
        throw conflict("Iris is already working on a run");
      }

      const { runId } = await startIrisRun({
        organizationId: input.organizationId,
        trigger: "manual",
        executionId: `iris-manual-${crypto.randomUUID()}`,
      });
      if (!runId) {
        throw conflict("Iris is already working on a run");
      }

      trackServerEvent({
        event: POSTHOG_EVENTS.IRIS_RUN_NOW,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          run_id: runId,
        },
      });

      return { runId };
    }),

  listRuns: authorizedProcedure
    .input(irisListRunsInputSchema)
    .handler(async ({ context, input }): Promise<IrisListRunsResult> => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const cursorDate = input.cursor ? new Date(input.cursor) : null;
      const rows = await db.query.autonomyRuns.findMany({
        where: cursorDate
          ? and(
              eq(autonomyRuns.organizationId, input.organizationId),
              lt(autonomyRuns.startedAt, cursorDate)
            )
          : eq(autonomyRuns.organizationId, input.organizationId),
        orderBy: (run, { desc: descending }) => [descending(run.startedAt)],
        limit: IRIS_RUNS_PAGE_SIZE + 1,
        with: {
          goal: true,
          tasks: true,
          actions: true,
          outboxMessages: true,
        },
      });

      const page = rows.slice(0, IRIS_RUNS_PAGE_SIZE);
      const nextCursor =
        rows.length > IRIS_RUNS_PAGE_SIZE
          ? (page.at(-1)?.startedAt.toISOString() ?? null)
          : null;

      return { runs: page.map(toIrisRunView), nextCursor };
    }),

  listSignals: authorizedProcedure
    .input(irisListSignalsInputSchema)
    .handler(async ({ context, input }): Promise<IrisSignalView[]> => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const rows = await db
        .select()
        .from(autonomySignals)
        .where(eq(autonomySignals.organizationId, input.organizationId))
        .orderBy(desc(autonomySignals.occurredAt))
        .limit(input.limit);

      return rows.map(toIrisSignalView);
    }),
};
