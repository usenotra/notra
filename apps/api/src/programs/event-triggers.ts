import crypto from "node:crypto";

import {
  hashTrigger,
  normalizeTriggerConfig,
} from "@notra/ai/utils/trigger-hash";
import { contentTriggers, githubIntegrations } from "@notra/db/schema";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { DateTime, Effect } from "effect";

import {
  EventTriggerDatabaseError,
  EventTriggerDuplicateError,
  EventTriggerNotFoundError,
  EventTriggerTargetsNotFoundError,
} from "../errors/event-triggers";
import type {
  CreateEventTriggerProgramInput,
  ListEventTriggersProgramInput,
  NamedEventTriggerProgramInput,
  UpdateEventTriggerProgramInput,
} from "../types/event-triggers";
import {
  ensureEventTriggerTargetsExist,
  filterEventTriggersByRepositoryIds,
  safeSerializeEventTrigger,
} from "../utils/event-triggers";
import { isPgUniqueViolation } from "../utils/pg-errors";

const GITHUB_WEBHOOK_SOURCE = "github_webhook" as const;

const database = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => new EventTriggerDatabaseError({ cause }),
  });

const write = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) =>
      isPgUniqueViolation(cause)
        ? new EventTriggerDuplicateError()
        : new EventTriggerDatabaseError({ cause }),
  });

const ensureTargets = (
  input: CreateEventTriggerProgramInput | UpdateEventTriggerProgramInput,
  repositoryIds: string[],
  message: string
) =>
  Effect.gen(function* () {
    const missingTargets = yield* database(() =>
      ensureEventTriggerTargetsExist(
        input.db,
        input.organizationId,
        repositoryIds,
        message
      )
    );

    if (missingTargets) {
      return yield* new EventTriggerTargetsNotFoundError({
        message: missingTargets.error,
      });
    }
  });

const findGithubWebhookTrigger = (input: NamedEventTriggerProgramInput) =>
  database(() =>
    input.db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.id, input.triggerId),
        eq(contentTriggers.organizationId, input.organizationId),
        eq(contentTriggers.sourceType, GITHUB_WEBHOOK_SOURCE)
      ),
    })
  );

export const listEventTriggers = Effect.fn("eventTriggers.list")(function* (
  input: ListEventTriggersProgramInput
) {
  const triggers = yield* database(() =>
    input.db.query.contentTriggers.findMany({
      where: and(
        eq(contentTriggers.organizationId, input.organizationId),
        eq(contentTriggers.sourceType, GITHUB_WEBHOOK_SOURCE)
      ),
      orderBy: [desc(contentTriggers.createdAt)],
    })
  );

  const filteredTriggers = filterEventTriggersByRepositoryIds(
    triggers,
    input.repositoryIds
  );

  const eventTriggers = filteredTriggers
    .map((trigger) => safeSerializeEventTrigger(trigger))
    .filter((trigger) => trigger !== null);

  const allRepositoryIds = [
    ...new Set(
      eventTriggers.flatMap((trigger) => trigger.targets.repositoryIds)
    ),
  ];

  const repositories =
    allRepositoryIds.length > 0
      ? yield* database(() =>
          input.db
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

  return { eventTriggers, repositoryMap };
});

export const createEventTrigger = Effect.fn("eventTriggers.create")(function* (
  input: CreateEventTriggerProgramInput
) {
  const { body } = input;
  const normalized = normalizeTriggerConfig({
    sourceConfig: body.sourceConfig,
    targets: body.targets,
  });
  const dedupeHash = hashTrigger({
    sourceType: body.sourceType,
    sourceConfig: body.sourceConfig,
    targets: body.targets,
    outputType: body.outputType,
  });

  const existing = yield* database(() =>
    input.db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.organizationId, input.organizationId),
        eq(contentTriggers.dedupeHash, dedupeHash)
      ),
    })
  );

  if (existing) {
    return yield* new EventTriggerDuplicateError();
  }

  yield* ensureTargets(
    input,
    normalized.targets.repositoryIds,
    "Cannot create event trigger: one or more integrations not found"
  );

  const [createdTrigger] = yield* write(() =>
    input.db
      .insert(contentTriggers)
      .values({
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        sourceType: body.sourceType,
        sourceConfig: normalized.sourceConfig,
        targets: normalized.targets,
        outputType: body.outputType,
        outputConfig: body.outputConfig ?? null,
        dedupeHash,
        enabled: body.enabled,
        autoPublish: body.autoPublish,
      })
      .returning()
  );

  return (
    createdTrigger ??
    (yield* new EventTriggerDatabaseError({
      cause: new Error("Failed to create event trigger"),
    }))
  );
});

export const getEventTrigger = Effect.fn("eventTriggers.get")(function* (
  input: NamedEventTriggerProgramInput
) {
  const existing = yield* findGithubWebhookTrigger(input);

  if (!existing) {
    return yield* new EventTriggerNotFoundError();
  }

  return existing;
});

export const updateEventTrigger = Effect.fn("eventTriggers.update")(function* (
  input: UpdateEventTriggerProgramInput
) {
  const { body } = input;
  const normalized = normalizeTriggerConfig({
    sourceConfig: body.sourceConfig,
    targets: body.targets,
  });
  const dedupeHash = hashTrigger({
    sourceType: body.sourceType,
    sourceConfig: body.sourceConfig,
    targets: body.targets,
    outputType: body.outputType,
  });

  const existing = yield* findGithubWebhookTrigger(input);

  if (!existing) {
    return yield* new EventTriggerNotFoundError();
  }

  const duplicate = yield* database(() =>
    input.db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.organizationId, input.organizationId),
        eq(contentTriggers.dedupeHash, dedupeHash),
        ne(contentTriggers.id, input.triggerId)
      ),
    })
  );

  if (duplicate) {
    return yield* new EventTriggerDuplicateError();
  }

  yield* ensureTargets(
    input,
    normalized.targets.repositoryIds,
    "Cannot update event trigger: one or more integrations not found"
  );

  const updatedAt = DateTime.toDateUtc(yield* DateTime.now);
  const [updatedTrigger] = yield* write(() =>
    input.db
      .update(contentTriggers)
      .set({
        sourceType: body.sourceType,
        sourceConfig: normalized.sourceConfig,
        targets: normalized.targets,
        outputType: body.outputType,
        outputConfig: body.outputConfig ?? null,
        dedupeHash,
        enabled: body.enabled,
        autoPublish: body.autoPublish,
        qstashScheduleId: null,
        updatedAt,
      })
      .where(
        and(
          eq(contentTriggers.id, input.triggerId),
          eq(contentTriggers.organizationId, input.organizationId)
        )
      )
      .returning()
  );

  return (
    updatedTrigger ??
    (yield* new EventTriggerDatabaseError({
      cause: new Error("Failed to update event trigger"),
    }))
  );
});

export const deleteEventTrigger = Effect.fn("eventTriggers.delete")(function* (
  input: NamedEventTriggerProgramInput
) {
  const existing = yield* findGithubWebhookTrigger(input);

  if (!existing) {
    return yield* new EventTriggerNotFoundError();
  }

  yield* database(() =>
    input.db
      .delete(contentTriggers)
      .where(
        and(
          eq(contentTriggers.id, input.triggerId),
          eq(contentTriggers.organizationId, input.organizationId)
        )
      )
  );

  return input.triggerId;
});
