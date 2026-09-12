import {
  githubIntegrations,
  linearIntegrations,
  repositoryOutputs,
} from "@notra/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GitHubAccessError,
  IntegrationCreateError,
  IntegrationCreateFailedError,
  IntegrationDatabaseError,
  IntegrationDuplicateError,
  IntegrationNotFoundError,
  IntegrationUnavailableError,
} from "../errors/integrations";
import type { DbClient } from "../types/db";
import type {
  AssertNoGitHubIntegrationDuplicateInput,
  CreateGitHubIntegrationProgramInput,
  CreateGitHubIntegrationProgramSuccess,
  DeleteIntegrationProgramInput,
  DeleteIntegrationProgramSuccess,
  ListIntegrationsProgramInput,
  ListIntegrationsProgramSuccess,
} from "../types/integrations";
import {
  encryptGitHubIntegrationToken,
  findMatchingGitHubIntegration,
  generateGitHubIntegrationId,
  generateGitHubWebhookSecret,
  getGitHubIntegrationCreatorUserId,
  getSafeGitHubIntegrationErrorMessage,
  isGitHubIntegrationUnavailableError,
  validateGitHubRepositoryAccess,
} from "../utils/github-integrations";
import { serializeDisabledTriggers } from "../utils/integrations";
import { isConstraintViolation, isPgUniqueViolation } from "../utils/pg-errors";
import {
  deleteQstashSchedulesForTriggers,
  disableTriggersAndDeleteIntegration,
  getTriggersForIntegration,
} from "../utils/triggers";

type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

const database = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => new IntegrationDatabaseError({ cause }),
  });

const write = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => {
      if (
        isPgUniqueViolation(cause) ||
        isConstraintViolation(
          cause,
          "githubIntegrations_organization_owner_repo_uidx"
        )
      ) {
        return new IntegrationDuplicateError();
      }

      return new IntegrationCreateError({ cause });
    },
  });

const mapGitHubAccessError = (cause: unknown) => {
  if (isGitHubIntegrationUnavailableError(cause)) {
    return new IntegrationUnavailableError();
  }

  const safeMessage = getSafeGitHubIntegrationErrorMessage(cause);
  if (safeMessage) {
    return new GitHubAccessError({ message: safeMessage });
  }

  return new IntegrationCreateError({ cause });
};

const encryptToken = (
  token: string,
  runtimeEnv: CreateGitHubIntegrationProgramInput["runtimeEnv"]
) =>
  Effect.try({
    try: () => encryptGitHubIntegrationToken(token, runtimeEnv),
    catch: (cause) => mapGitHubAccessError(cause),
  });

export const listIntegrations = Effect.fn("integrations.list")(function* ({
  db,
  organizationId,
}: ListIntegrationsProgramInput) {
  const [github, linear] = yield* database(() =>
    Promise.all([
      db.query.githubIntegrations.findMany({
        where: and(
          eq(githubIntegrations.organizationId, organizationId),
          eq(githubIntegrations.enabled, true)
        ),
        orderBy: [
          asc(githubIntegrations.displayName),
          asc(githubIntegrations.id),
        ],
        columns: {
          id: true,
          displayName: true,
          owner: true,
          repo: true,
          defaultBranch: true,
        },
      }),
      db.query.linearIntegrations.findMany({
        where: and(
          eq(linearIntegrations.organizationId, organizationId),
          eq(linearIntegrations.enabled, true)
        ),
        orderBy: [
          asc(linearIntegrations.displayName),
          asc(linearIntegrations.id),
        ],
        columns: {
          id: true,
          displayName: true,
          linearOrganizationId: true,
          linearOrganizationName: true,
          linearTeamId: true,
          linearTeamName: true,
        },
      }),
    ])
  );

  return {
    github,
    linear,
  } satisfies ListIntegrationsProgramSuccess;
});

export const assertNoGitHubIntegrationDuplicate = Effect.fn(
  "integrations.assertNoGitHubDuplicate"
)(function* ({
  db,
  organizationId,
  owner,
  repo,
}: AssertNoGitHubIntegrationDuplicateInput) {
  const existingIntegration = yield* database(() =>
    findMatchingGitHubIntegration(db, organizationId, owner, repo)
  );

  if (existingIntegration) {
    return yield* new IntegrationDuplicateError();
  }
});

export const createGitHubIntegration = Effect.fn("integrations.createGitHub")(
  function* (input: CreateGitHubIntegrationProgramInput) {
    const owner = input.body.owner.trim();
    const repo = input.body.repo.trim();
    const branch = input.body.branch?.trim() || null;
    const token = input.body.token?.trim() || null;

    yield* Effect.tryPromise({
      try: () => validateGitHubRepositoryAccess({ owner, repo, token }),
      catch: (cause) => mapGitHubAccessError(cause),
    });

    const integrationId = generateGitHubIntegrationId();
    const createdByUserId = yield* Effect.tryPromise({
      try: () =>
        getGitHubIntegrationCreatorUserId(input.db, input.organizationId),
      catch: (cause) => mapGitHubAccessError(cause),
    });
    const encryptedToken = token
      ? yield* encryptToken(token, input.runtimeEnv)
      : null;
    const encryptedWebhookSecret = yield* encryptToken(
      generateGitHubWebhookSecret(),
      input.runtimeEnv
    );

    const integration = yield* write(() =>
      input.db.transaction(async (tx) => {
        const [createdIntegration] = await tx
          .insert(githubIntegrations)
          .values({
            id: integrationId,
            organizationId: input.organizationId,
            createdByUserId,
            encryptedToken,
            displayName: `${owner}/${repo}`,
            owner,
            repo,
            defaultBranch: branch,
            repositoryEnabled: true,
            encryptedWebhookSecret,
            enabled: true,
          })
          .returning({
            id: githubIntegrations.id,
            displayName: githubIntegrations.displayName,
            owner: githubIntegrations.owner,
            repo: githubIntegrations.repo,
            defaultBranch: githubIntegrations.defaultBranch,
          });

        if (!createdIntegration) {
          throw new Error("Failed to create GitHub integration record");
        }

        await tx.insert(repositoryOutputs).values([
          {
            id: generateGitHubIntegrationId(),
            repositoryId: integrationId,
            outputType: "changelog",
            enabled: true,
            config: null,
          },
          {
            id: generateGitHubIntegrationId(),
            repositoryId: integrationId,
            outputType: "blog_post",
            enabled: false,
            config: null,
          },
          {
            id: generateGitHubIntegrationId(),
            repositoryId: integrationId,
            outputType: "twitter_post",
            enabled: false,
            config: null,
          },
        ]);

        return createdIntegration;
      })
    );

    if (!integration) {
      return yield* new IntegrationCreateFailedError();
    }

    return integration satisfies CreateGitHubIntegrationProgramSuccess;
  }
);

const deleteIntegrationWithTriggerCleanup = Effect.fnUntraced(function* (
  input: DeleteIntegrationProgramInput,
  deleteIntegrationRecord: (tx: DbTransaction) => Promise<unknown>
) {
  const affectedTriggers = yield* database(() =>
    getTriggersForIntegration(
      input.db,
      input.organizationId,
      input.integrationId
    )
  );

  yield* database(() =>
    disableTriggersAndDeleteIntegration(
      input.db,
      input.organizationId,
      affectedTriggers,
      deleteIntegrationRecord
    )
  );

  yield* database(() =>
    deleteQstashSchedulesForTriggers(input.runtimeEnv, affectedTriggers)
  );

  return {
    id: input.integrationId,
    ...serializeDisabledTriggers(affectedTriggers),
  } satisfies DeleteIntegrationProgramSuccess;
});

export const deleteIntegration = Effect.fn("integrations.delete")(function* ({
  db,
  organizationId,
  integrationId,
  runtimeEnv,
}: DeleteIntegrationProgramInput) {
  const githubIntegration = yield* database(() =>
    db.query.githubIntegrations.findFirst({
      where: and(
        eq(githubIntegrations.id, integrationId),
        eq(githubIntegrations.organizationId, organizationId)
      ),
      columns: {
        id: true,
      },
    })
  );

  if (githubIntegration) {
    return yield* deleteIntegrationWithTriggerCleanup(
      { db, organizationId, integrationId, runtimeEnv },
      (tx) =>
        tx
          .delete(githubIntegrations)
          .where(
            and(
              eq(githubIntegrations.id, integrationId),
              eq(githubIntegrations.organizationId, organizationId)
            )
          )
    );
  }

  const [existingLinearIntegration] = yield* database(() =>
    db
      .select({ id: linearIntegrations.id })
      .from(linearIntegrations)
      .where(
        and(
          eq(linearIntegrations.id, integrationId),
          eq(linearIntegrations.organizationId, organizationId)
        )
      )
      .limit(1)
  );

  if (!existingLinearIntegration) {
    return yield* new IntegrationNotFoundError();
  }

  return yield* deleteIntegrationWithTriggerCleanup(
    { db, organizationId, integrationId, runtimeEnv },
    (tx) =>
      tx
        .delete(linearIntegrations)
        .where(
          and(
            eq(linearIntegrations.id, integrationId),
            eq(linearIntegrations.organizationId, organizationId)
          )
        )
  );
});
