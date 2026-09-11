import crypto from "node:crypto";

import {
  contentTriggerLookbackWindows,
  contentTriggers,
  githubIntegrations,
} from "@notra/db/schema";
import { QstashError } from "@notra/schemas/api/qstash";
import { scheduleSourceConfigSchema } from "@notra/schemas/api/schedules";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { Effect } from "effect";

import {
  ScheduleDatabaseError,
  ScheduleDuplicateError,
  ScheduleMissingTargetsError,
  ScheduleNotFoundError,
  ScheduleQstashError,
} from "../errors/schedules";
import {
  deleteQstashWithRetry,
  QstashService,
  qstashLayer,
} from "../lib/qstash";
import type { QstashEnv } from "../types/qstash";
import type { DbClient } from "../types/db";
import type {
  CreateScheduleProgramInput,
  DeleteScheduleProgramInput,
  ListSchedulesProgramInput,
  PatchScheduleProgramInput,
} from "../types/schedules";
import { logError } from "../utils/logging";
import { buildCronExpression, createQstashSchedule } from "../utils/qstash";
import {
  DEFAULT_SCHEDULE_NAME,
  ensureScheduleTargetsExist,
  filterSchedulesByRepositoryIds,
  hashSchedule,
  isQstashScheduleError,
  mapQstashError,
  normalizeSchedule,
  safeSerializeSchedule,
  serializeSchedule,
} from "../utils/schedules";
import { deleteQstashScheduleWithRetry } from "../utils/triggers";

const DELETE_CONCURRENCY_ATTEMPTS = 5;

const database = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => new ScheduleDatabaseError({ cause }),
  });

type ScheduleDeleteSnapshot = {
  qstashScheduleId: string | null;
  updatedAt: Date;
};

type ScheduleDeleteCommitResult = "deleted" | "stale" | "gone";

const scheduleDeleteScope = (organizationId: string, scheduleId: string) =>
  and(
    eq(contentTriggers.id, scheduleId),
    eq(contentTriggers.organizationId, organizationId),
    eq(contentTriggers.sourceType, "cron")
  );

async function lockScheduleDeleteSnapshot(
  db: DbClient,
  organizationId: string,
  scheduleId: string
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        qstashScheduleId: contentTriggers.qstashScheduleId,
        updatedAt: contentTriggers.updatedAt,
      })
      .from(contentTriggers)
      .where(scheduleDeleteScope(organizationId, scheduleId))
      .for("update");

    return row ?? null;
  });
}

async function commitScheduleDeleteIfUnchanged(
  db: DbClient,
  organizationId: string,
  scheduleId: string,
  snapshot: ScheduleDeleteSnapshot
): Promise<ScheduleDeleteCommitResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ updatedAt: contentTriggers.updatedAt })
      .from(contentTriggers)
      .where(scheduleDeleteScope(organizationId, scheduleId))
      .for("update");

    if (!row) {
      return "gone";
    }

    if (row.updatedAt.getTime() !== snapshot.updatedAt.getTime()) {
      return "stale";
    }

    await tx
      .delete(contentTriggers)
      .where(scheduleDeleteScope(organizationId, scheduleId));

    return "deleted";
  });
}

async function ensureEnabledScheduleQstash(
  db: DbClient,
  organizationId: string,
  scheduleId: string,
  env: QstashEnv
) {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(contentTriggers)
      .where(scheduleDeleteScope(organizationId, scheduleId))
      .for("update");

    if (!current?.enabled || !current.qstashScheduleId) {
      return;
    }

    const config = scheduleSourceConfigSchema.parse(current.sourceConfig);
    const restoredId = await createQstashSchedule(env, {
      triggerId: scheduleId,
      cron: buildCronExpression(config.cron),
      scheduleId: current.qstashScheduleId,
    });

    if (restoredId !== current.qstashScheduleId) {
      await deleteQstashScheduleWithRetry(env, restoredId);
      throw new Error("QStash returned an unexpected restoration ID");
    }
  });
}

function attemptEnsureEnabledScheduleQstash(
  db: DbClient,
  organizationId: string,
  scheduleId: string,
  env: QstashEnv
) {
  return Effect.tryPromise({
    try: () => ensureEnabledScheduleQstash(db, organizationId, scheduleId, env),
    catch: (cause) => cause,
  }).pipe(
    Effect.catch((recoveryError) =>
      Effect.sync(() => {
        logError(
          `Failed to ensure QStash schedule for schedule ${scheduleId} after delete reconciliation`,
          recoveryError
        );
      })
    )
  );
}

function isScheduleDomainError(
  error: unknown
): error is
  | ScheduleNotFoundError
  | ScheduleDuplicateError
  | ScheduleMissingTargetsError
  | ScheduleQstashError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    (error._tag === "ScheduleNotFoundError" ||
      error._tag === "ScheduleDuplicateError" ||
      error._tag === "ScheduleMissingTargetsError" ||
      error._tag === "ScheduleQstashError")
  );
}

function scheduleQstashFailureMessage(
  mapped: ReturnType<typeof mapQstashError>,
  operation: "create" | "update" | "delete"
) {
  if (mapped.status === 400 || operation === "create") {
    return mapped.error;
  }

  if (operation === "delete") {
    return "Failed to delete schedule";
  }

  return "Failed to update schedule";
}

function scheduleQstashFailure(
  error: unknown,
  operation: "create" | "update" | "delete"
): ScheduleQstashError {
  const mapped = mapQstashError(
    error instanceof QstashError ? new Error(error.message) : error
  );

  return new ScheduleQstashError({
    message: scheduleQstashFailureMessage(mapped, operation),
    status: mapped.status,
  });
}

function cleanupQstashSchedule(
  env: QstashEnv,
  qstashScheduleId: string,
  {
    failureMessage,
    failureMode,
    operation,
  }: {
    failureMessage: string;
    failureMode: "log" | "fail";
    operation: "create" | "update" | "delete";
  }
) {
  return deleteQstashWithRetry(qstashScheduleId).pipe(
    Effect.provide(qstashLayer(env)),
    Effect.catch((cleanupError) => {
      logError(failureMessage, cleanupError);
      if (failureMode === "log") {
        return Effect.void;
      }

      return Effect.fail(scheduleQstashFailure(cleanupError, operation));
    })
  );
}

function withQstashLayer<A, E>(
  env: QstashEnv,
  effect: Effect.Effect<A, E, QstashService>
) {
  return effect.pipe(Effect.provide(qstashLayer(env)));
}

async function executePatchSchedule({
  db,
  organizationId,
  scheduleId,
  body,
  env,
}: PatchScheduleProgramInput) {
  const normalized = normalizeSchedule(body);
  const dedupeHash = hashSchedule(body);
  const affectedQstashIds = new Set<string>();
  let committed = false;

  try {
    const schedule = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(contentTriggers)
        .where(
          and(
            eq(contentTriggers.id, scheduleId),
            eq(contentTriggers.organizationId, organizationId),
            eq(contentTriggers.sourceType, "cron")
          )
        )
        .for("update");

      if (!existing) {
        throw new ScheduleNotFoundError();
      }

      let qstashScheduleId: string | null = null;
      if (body.enabled) {
        qstashScheduleId = existing.qstashScheduleId ?? crypto.randomUUID();
        affectedQstashIds.add(qstashScheduleId);
        const returnedId = await createQstashSchedule(env, {
          triggerId: scheduleId,
          cron: buildCronExpression(normalized.sourceConfig.cron),
          scheduleId: qstashScheduleId,
        });
        affectedQstashIds.add(returnedId);
        if (returnedId !== qstashScheduleId) {
          throw new Error("QStash returned an unexpected schedule ID");
        }
      } else if (existing.qstashScheduleId) {
        affectedQstashIds.add(existing.qstashScheduleId);
        await deleteQstashScheduleWithRetry(env, existing.qstashScheduleId);
      }

      const [updatedTrigger] = await tx
        .update(contentTriggers)
        .set({
          name: body.name.trim() || existing.name || DEFAULT_SCHEDULE_NAME,
          sourceType: "cron",
          sourceConfig: normalized.sourceConfig,
          targets: normalized.targets,
          outputType: body.outputType,
          outputConfig: body.outputConfig ?? null,
          dedupeHash,
          enabled: body.enabled,
          autoPublish: body.autoPublish,
          qstashScheduleId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contentTriggers.id, scheduleId),
            eq(contentTriggers.organizationId, organizationId)
          )
        )
        .returning();

      if (!updatedTrigger) {
        throw new Error("Failed to update schedule");
      }

      await tx
        .insert(contentTriggerLookbackWindows)
        .values({
          triggerId: scheduleId,
          window: body.lookbackWindow,
        })
        .onConflictDoUpdate({
          target: contentTriggerLookbackWindows.triggerId,
          set: {
            window: body.lookbackWindow,
            updatedAt: new Date(),
          },
        });

      return serializeSchedule({
        ...updatedTrigger,
        lookbackWindow: body.lookbackWindow,
      });
    });
    committed = true;
    return schedule;
  } catch (error) {
    if (!committed && affectedQstashIds.size > 0) {
      try {
        await db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(contentTriggers)
            .where(
              and(
                eq(contentTriggers.id, scheduleId),
                eq(contentTriggers.organizationId, organizationId),
                eq(contentTriggers.sourceType, "cron")
              )
            )
            .for("update");
          const currentQstashId = current?.enabled
            ? current.qstashScheduleId
            : null;

          if (currentQstashId && current) {
            const config = scheduleSourceConfigSchema.parse(
              current.sourceConfig
            );
            const restoredId = await createQstashSchedule(env, {
              triggerId: scheduleId,
              cron: buildCronExpression(config.cron),
              scheduleId: currentQstashId,
            });
            if (restoredId !== currentQstashId) {
              await deleteQstashScheduleWithRetry(env, restoredId);
              throw new Error("QStash returned an unexpected restoration ID");
            }
          }

          for (const affectedId of affectedQstashIds) {
            if (affectedId !== currentQstashId) {
              await deleteQstashScheduleWithRetry(env, affectedId);
            }
          }
        });
      } catch (recoveryError) {
        logError(
          `Failed to reconcile QStash schedules ${[...affectedQstashIds].join(", ")} for schedule ${scheduleId}; retry PATCH to heal`,
          recoveryError
        );
      }
    }

    throw error;
  }
}

export const listSchedules = Effect.fn("schedules.list")(function* ({
  db,
  organizationId,
  repositoryIds,
}: ListSchedulesProgramInput) {
  const triggers = yield* database(() =>
    db.query.contentTriggers.findMany({
      where: and(
        eq(contentTriggers.organizationId, organizationId),
        eq(contentTriggers.sourceType, "cron")
      ),
      orderBy: [desc(contentTriggers.createdAt)],
    })
  );

  const triggerIds = triggers.map((trigger) => trigger.id);
  const lookbackWindows =
    triggerIds.length > 0
      ? yield* database(() =>
          db.query.contentTriggerLookbackWindows.findMany({
            where: inArray(contentTriggerLookbackWindows.triggerId, triggerIds),
          })
        )
      : [];

  const lookbackWindowByTriggerId = new Map(
    lookbackWindows.map((item) => [item.triggerId, item.window])
  );
  const filteredTriggers = filterSchedulesByRepositoryIds(
    triggers,
    repositoryIds
  );

  const schedules = filteredTriggers
    .map((trigger) =>
      safeSerializeSchedule({
        ...trigger,
        lookbackWindow:
          lookbackWindowByTriggerId.get(trigger.id) ?? "last_7_days",
      })
    )
    .filter((schedule) => schedule !== null);

  const allRepositoryIds = [
    ...new Set(schedules.flatMap((schedule) => schedule.targets.repositoryIds)),
  ];
  const repositories =
    allRepositoryIds.length > 0
      ? yield* database(() =>
          db
            .select({
              id: githubIntegrations.id,
              owner: githubIntegrations.owner,
              repo: githubIntegrations.repo,
              defaultBranch: githubIntegrations.defaultBranch,
            })
            .from(githubIntegrations)
            .where(inArray(githubIntegrations.id, allRepositoryIds))
        )
      : [];

  const repositoryMap = Object.fromEntries(
    repositories
      .filter((repository) => repository.owner && repository.repo)
      .map((repository) => [
        repository.id,
        repository.defaultBranch?.trim()
          ? `${repository.owner}/${repository.repo} · ${repository.defaultBranch.trim()}`
          : `${repository.owner}/${repository.repo}`,
      ])
  );

  return { schedules, repositoryMap };
});

export const createSchedule = Effect.fn("schedules.create")(function* ({
  db,
  organizationId,
  body,
  env,
}: CreateScheduleProgramInput) {
  const normalized = normalizeSchedule(body);
  const dedupeHash = hashSchedule(body);

  const existing = yield* database(() =>
    db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.organizationId, organizationId),
        eq(contentTriggers.dedupeHash, dedupeHash)
      ),
    })
  );

  if (existing) {
    return yield* new ScheduleDuplicateError();
  }

  if (body.enabled) {
    const missingTargets = yield* database(() =>
      ensureScheduleTargetsExist(
        db,
        organizationId,
        normalized.targets.repositoryIds,
        "Cannot create enabled schedule: one or more integrations not found"
      )
    );

    if (missingTargets) {
      return yield* new ScheduleMissingTargetsError({
        message: missingTargets.error,
      });
    }
  }

  const triggerId = crypto.randomUUID();
  const persistedName = body.name.trim() || DEFAULT_SCHEDULE_NAME;
  let qstashScheduleId: string | null = null;

  if (body.enabled) {
    qstashScheduleId = yield* withQstashLayer(
      env,
      Effect.gen(function* () {
        const service = yield* QstashService;
        return yield* service.create({
          triggerId,
          cron: buildCronExpression(normalized.sourceConfig.cron),
        });
      })
    ).pipe(Effect.mapError((error) => scheduleQstashFailure(error, "create")));
  }

  const schedule = yield* database(() =>
    db.transaction(async (tx) => {
      const [createdTrigger] = await tx
        .insert(contentTriggers)
        .values({
          id: triggerId,
          organizationId,
          name: persistedName,
          sourceType: "cron",
          sourceConfig: normalized.sourceConfig,
          targets: normalized.targets,
          outputType: body.outputType,
          outputConfig: body.outputConfig ?? null,
          dedupeHash,
          enabled: body.enabled,
          autoPublish: body.autoPublish,
          qstashScheduleId,
        })
        .returning();

      if (!createdTrigger) {
        throw new Error("Failed to create schedule");
      }

      await tx.insert(contentTriggerLookbackWindows).values({
        triggerId,
        window: body.lookbackWindow,
      });

      return serializeSchedule({
        ...createdTrigger,
        lookbackWindow: body.lookbackWindow,
      });
    })
  ).pipe(
    Effect.catch((dbError: ScheduleDatabaseError) =>
      Effect.gen(function* () {
        if (qstashScheduleId) {
          yield* cleanupQstashSchedule(env, qstashScheduleId, {
            failureMessage: `Failed to clean up replacement QStash schedule ${qstashScheduleId} for new schedule ${triggerId}`,
            failureMode: "log",
            operation: "create",
          });
        }

        return yield* Effect.fail(dbError);
      })
    )
  );

  return schedule;
});

export const deleteSchedule = Effect.fn("schedules.delete")(function* ({
  db,
  organizationId,
  scheduleId,
  env,
}: DeleteScheduleProgramInput) {
  for (let attempt = 0; attempt < DELETE_CONCURRENCY_ATTEMPTS; attempt++) {
    const snapshot = yield* database(() =>
      lockScheduleDeleteSnapshot(db, organizationId, scheduleId)
    );

    if (!snapshot) {
      if (attempt === 0) {
        return yield* new ScheduleNotFoundError();
      }

      return scheduleId;
    }

    let removedQstashScheduleId: string | null = null;
    if (snapshot.qstashScheduleId) {
      removedQstashScheduleId = snapshot.qstashScheduleId;
      yield* cleanupQstashSchedule(env, snapshot.qstashScheduleId, {
        failureMessage: `Failed to delete QStash schedule ${snapshot.qstashScheduleId} for schedule ${scheduleId}`,
        failureMode: "fail",
        operation: "delete",
      });
    }

    const commitResult = yield* database(() =>
      commitScheduleDeleteIfUnchanged(
        db,
        organizationId,
        scheduleId,
        snapshot
      )
    ).pipe(
      Effect.catchTag("ScheduleDatabaseError", (dbError) =>
        removedQstashScheduleId
          ? attemptEnsureEnabledScheduleQstash(
              db,
              organizationId,
              scheduleId,
              env
            ).pipe(Effect.flatMap(() => Effect.fail(dbError)))
          : Effect.fail(dbError)
      )
    );

    if (commitResult === "deleted" || commitResult === "gone") {
      return scheduleId;
    }

    if (commitResult === "stale" && removedQstashScheduleId) {
      yield* attemptEnsureEnabledScheduleQstash(
        db,
        organizationId,
        scheduleId,
        env
      );
    }
  }

  yield* attemptEnsureEnabledScheduleQstash(db, organizationId, scheduleId, env);

  return yield* new ScheduleQstashError({
    message: "Failed to delete schedule",
    status: 500,
  });
});

export const patchSchedule = Effect.fn("schedules.patch")(function* ({
  db,
  organizationId,
  scheduleId,
  body,
  env,
}: PatchScheduleProgramInput) {
  const normalized = normalizeSchedule(body);
  const dedupeHash = hashSchedule(body);

  const duplicate = yield* database(() =>
    db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.organizationId, organizationId),
        eq(contentTriggers.dedupeHash, dedupeHash),
        ne(contentTriggers.id, scheduleId)
      ),
    })
  );

  if (duplicate) {
    return yield* new ScheduleDuplicateError();
  }

  if (body.enabled) {
    const missingTargets = yield* database(() =>
      ensureScheduleTargetsExist(
        db,
        organizationId,
        normalized.targets.repositoryIds,
        "Cannot enable schedule: one or more integrations have been deleted"
      )
    );

    if (missingTargets) {
      return yield* new ScheduleMissingTargetsError({
        message: missingTargets.error,
      });
    }
  }

  return yield* Effect.tryPromise({
    try: () =>
      executePatchSchedule({
        db,
        organizationId,
        scheduleId,
        body,
        env,
      }),
    catch: (cause) => {
      if (isScheduleDomainError(cause)) {
        return cause;
      }

      if (isQstashScheduleError(cause)) {
        logError("Failed to update schedule", cause);
        const mapped = mapQstashError(cause);
        return new ScheduleQstashError({
          message:
            mapped.status === 400
              ? mapped.error
              : "Failed to update schedule",
          status: mapped.status,
        });
      }

      return new ScheduleDatabaseError({ cause });
    },
  });
});
