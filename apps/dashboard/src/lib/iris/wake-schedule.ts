import { IRIS_WAKE_CRON } from "@notra/ai/constants/autonomy";
import {
  createQstashRouteSchedule,
  deleteQstashSchedule,
} from "@notra/ai/qstash/triggers";
import { db } from "@notra/db/drizzle";
import { autonomyMandates } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { IRIS_WAKE_ROUTE_PATH } from "@/constants/iris";
import { IrisWakeScheduleError } from "@/lib/iris/errors";

const persistScheduleId = Effect.fn("iris.wake.persistScheduleId")(
  function* (input: { mandateId: string; qstashScheduleId: string | null }) {
    yield* Effect.tryPromise({
      try: () =>
        db
          .update(autonomyMandates)
          .set({
            qstashScheduleId: input.qstashScheduleId,
            updatedAt: new Date(),
          })
          .where(eq(autonomyMandates.id, input.mandateId)),
      catch: (cause) =>
        new IrisWakeScheduleError({
          message: "Failed to store the wake schedule",
          cause,
        }),
    });
  }
);

export const createIrisWakeSchedule = Effect.fn("iris.wake.create")(function* (
  organizationId: string,
  mandateId: string
) {
  const scheduleId = yield* Effect.tryPromise({
    try: () =>
      createQstashRouteSchedule({
        path: IRIS_WAKE_ROUTE_PATH,
        cron: IRIS_WAKE_CRON,
        body: { organizationId, trigger: "wake" },
      }),
    catch: (cause) =>
      new IrisWakeScheduleError({
        message: "Failed to create the wake schedule",
        cause,
      }),
  });

  if (!scheduleId) {
    return yield* Effect.fail(
      new IrisWakeScheduleError({
        message: "The wake schedule was created without an id",
        cause: null,
      })
    );
  }

  const persisted = yield* Effect.result(
    persistScheduleId({ mandateId, qstashScheduleId: scheduleId })
  );

  if (persisted._tag === "Failure") {
    const rollback = yield* Effect.result(
      Effect.tryPromise({
        try: () => deleteQstashSchedule(scheduleId),
        catch: (cause) =>
          new IrisWakeScheduleError({
            message: "Failed to roll back the orphaned wake schedule",
            cause,
          }),
      })
    );
    if (rollback._tag === "Failure") {
      yield* Effect.annotateLogs(
        Effect.logWarning("iris.wake.rollbackFailed"),
        { organizationId, mandateId, scheduleId }
      );
    }

    return yield* Effect.fail(persisted.failure);
  }

  yield* Effect.annotateLogs(Effect.logInfo("iris.wake.created"), {
    organizationId,
    mandateId,
    scheduleId,
  });

  return scheduleId;
});

const SCHEDULE_NOT_FOUND_STATUS = 404;

const isScheduleAlreadyGone = (cause: unknown): boolean =>
  typeof cause === "object" &&
  cause !== null &&
  "status" in cause &&
  cause.status === SCHEDULE_NOT_FOUND_STATUS;

export const deleteIrisWakeSchedule = Effect.fn("iris.wake.delete")(
  function* (mandate: { id: string; qstashScheduleId: string | null }) {
    const scheduleId = mandate.qstashScheduleId;

    if (scheduleId) {
      const deletion = yield* Effect.result(
        Effect.tryPromise({
          try: () => deleteQstashSchedule(scheduleId),
          catch: (cause) =>
            new IrisWakeScheduleError({
              message: "Failed to delete the wake schedule",
              cause,
            }),
        })
      );

      if (
        deletion._tag === "Failure" &&
        !isScheduleAlreadyGone(deletion.failure.cause)
      ) {
        yield* Effect.annotateLogs(
          Effect.logWarning("iris.wake.deleteFailed"),
          {
            mandateId: mandate.id,
            scheduleId,
            error: String(deletion.failure.cause),
          }
        );
        return false;
      }
    }

    yield* persistScheduleId({ mandateId: mandate.id, qstashScheduleId: null });

    yield* Effect.annotateLogs(Effect.logInfo("iris.wake.deleted"), {
      mandateId: mandate.id,
    });

    return true;
  }
);

export const buildIrisWakeExecutionId = (
  organizationId: string,
  messageId: string
): string => `iris-wake-${organizationId}-${messageId}`;
