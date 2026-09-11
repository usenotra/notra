import {
  deleteGitHubAppInstallationForOrganization,
  GitHubAppNotConfiguredError,
  getGitHubAppInstallUrl,
  getSelectedGitHubAppRepositoryIds,
  isGitHubAccountConnectionRequired,
  listGitHubAppInstallationsByOrganization,
  listGitHubAppRepositoriesEffect,
  setSelectedGitHubAppRepositoriesEffect,
} from "@notra/ai/integrations/github";
import { GitHubPersistenceError } from "@notra/ai/schemas/github-operations";
import { createOctokit } from "@notra/ai/utils/octokit";
import { redis } from "@notra/ai/utils/redis";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  disconnectGitHubAppInputSchema,
  type PrepareInstallUrlInput,
  prepareInstallUrlInputSchema,
  probeRepositoryInputSchema,
  saveGitHubAppRepositoriesInputSchema,
} from "@notra/schemas/dashboard/github";
import { Data, Effect } from "effect";

import { GITHUB_INSTALL_STATE_TTL_SECONDS } from "@/constants/github";
import {
  INTEGRATION_AUTH_KINDS,
  INTEGRATION_PROVIDERS,
} from "@/constants/integration-analytics";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import { runOrpcEffect } from "@/lib/orpc/effect";
import {
  badRequest,
  internalServerError,
  notFound,
  tooManyRequests,
} from "@/lib/orpc/utils/errors";
import type { GitHubAccountType } from "@/types/integrations/github";
import { toGitHubOperationOrpcError } from "@/utils/github-operation-error";
import { ratelimit } from "@/utils/ratelimit";

class GitHubAppInstallPreparationError extends Data.TaggedError(
  "GitHubAppInstallPreparationError"
)<{
  readonly message: string;
  readonly cause: unknown;
}> {}

class GitHubRepositoryProbeError extends Data.TaggedError(
  "GitHubRepositoryProbeError"
)<{
  readonly cause: unknown;
}> {}

function mapGitHubAppInstallPreparationError(
  error: GitHubAppInstallPreparationError
): never {
  if (error.cause instanceof GitHubAppNotConfiguredError) {
    throw badRequest("GitHub App is not configured");
  }

  throw internalServerError(error.message, error.cause);
}

function hasNumericStatus(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
  );
}

function mapGitHubRepositoryProbeError(
  error: GitHubRepositoryProbeError
): never {
  const status = hasNumericStatus(error.cause) ? error.cause.status : 500;

  if (status === 404) {
    throw badRequest("Repository not found", { status: "not_found" });
  }

  if (status === 401 || status === 403) {
    throw badRequest("Repository access denied", {
      status: "unauthorized",
    });
  }

  throw internalServerError("Failed to probe repository", error.cause);
}

function toGitHubAccountType(accountType: string): GitHubAccountType {
  return accountType === "Organization" ? "Organization" : "User";
}

const prepareGitHubAppInstall = Effect.fn("prepareGitHubAppInstall")(function* (
  input: PrepareInstallUrlInput & {
    userId: string;
  }
) {
  const requiresAccountConnection = yield* Effect.tryPromise({
    try: () => isGitHubAccountConnectionRequired(input.userId),
    catch: (cause) =>
      new GitHubAppInstallPreparationError({
        message: "Failed to verify GitHub account authorization",
        cause,
      }),
  });

  if (requiresAccountConnection) {
    return { requiresAccountConnection: true as const };
  }

  const redisClient = redis;

  if (!redisClient) {
    return yield* Effect.fail(
      new GitHubAppInstallPreparationError({
        message: "GitHub App is not configured",
        cause: new GitHubAppNotConfiguredError(),
      })
    );
  }

  const state = crypto.randomUUID();

  yield* Effect.tryPromise({
    try: () =>
      redisClient.set(
        `github_app_install:${state}`,
        JSON.stringify({
          organizationId: input.organizationId,
          userId: input.userId,
          callbackPath: input.callbackPath,
        }),
        { ex: GITHUB_INSTALL_STATE_TTL_SECONDS }
      ),
    catch: (cause) =>
      new GitHubAppInstallPreparationError({
        message: "Failed to store GitHub App install state",
        cause,
      }),
  });

  const url = yield* Effect.try({
    try: () => getGitHubAppInstallUrl(state),
    catch: (cause) =>
      new GitHubAppInstallPreparationError({
        message: "Failed to prepare GitHub App install URL",
        cause,
      }),
  });

  return { requiresAccountConnection: false as const, url };
});

export const githubRouter = {
  app: {
    get: authorizedProcedure
      .input(organizationIdInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const installations = await listGitHubAppInstallationsByOrganization(
          input.organizationId
        );

        if (installations.length === 0) {
          return {
            accounts: [],
            repositories: [],
            selectedRepositoryIds: [],
          };
        }

        const { success: withinLimit } =
          await ratelimit.githubAppRepositories.limit(
            `${context.user.id}:${input.organizationId}`
          );
        if (!withinLimit) {
          throw tooManyRequests(
            "Too many GitHub repository requests. Please try again shortly."
          );
        }

        const { repositories, selectedRepositoryIds } = await runOrpcEffect(
          Effect.all(
            {
              repositories: listGitHubAppRepositoriesEffect(
                input.organizationId,
                installations
              ),
              selectedRepositoryIds: Effect.tryPromise({
                try: () =>
                  getSelectedGitHubAppRepositoryIds(
                    input.organizationId,
                    installations.map((installation) => installation.id)
                  ),
                catch: (cause) =>
                  new GitHubPersistenceError({
                    operation: "getSelectedRepositories",
                    cause,
                  }),
              }),
            },
            { concurrency: "unbounded" }
          ),
          toGitHubOperationOrpcError
        );
        return {
          accounts: installations.map((installation) => ({
            id: installation.accountId,
            login: installation.accountLogin,
            name: installation.accountName,
            avatarUrl: installation.accountAvatarUrl,
            type: toGitHubAccountType(installation.accountType),
          })),
          repositories,
          selectedRepositoryIds,
        };
      }),
    saveRepositories: authorizedProcedure
      .input(saveGitHubAppRepositoriesInputSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const selection = await runOrpcEffect(
          setSelectedGitHubAppRepositoriesEffect({
            organizationId: input.organizationId,
            userId: auth.user.id,
            repositoryIds: input.repositoryIds,
            preserveExisting: input.preserveExisting,
          }),
          toGitHubOperationOrpcError
        );

        trackServerEvent({
          event: POSTHOG_EVENTS.GITHUB_REPOSITORIES_SELECTED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: {
            repo_count: input.repositoryIds.length,
          },
        });

        return selection;
      }),
    disconnect: authorizedProcedure
      .input(disconnectGitHubAppInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const installations = await listGitHubAppInstallationsByOrganization(
          input.organizationId
        );
        const hasMatchingInstallation = input.accountId
          ? installations.some(
              (installation) => installation.accountId === input.accountId
            )
          : installations.length > 0;

        if (!hasMatchingInstallation) {
          throw notFound("GitHub App installation not found");
        }

        await deleteGitHubAppInstallationForOrganization(
          input.organizationId,
          input.accountId
        );

        trackServerEvent({
          event: POSTHOG_EVENTS.INTEGRATION_DISCONNECTED,
          headers: context.headers,
          userId: context.user.id,
          organizationId: input.organizationId,
          properties: {
            provider: INTEGRATION_PROVIDERS.GITHUB,
            auth_kind: INTEGRATION_AUTH_KINDS.OAUTH,
            installation_count: installations.length,
          },
        });

        return { success: true };
      }),
    prepareInstallUrl: authorizedProcedure
      .input(prepareInstallUrlInputSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        return Effect.runPromise(
          prepareGitHubAppInstall({
            ...input,
            userId: auth.user.id,
          }).pipe(
            Effect.match({
              onFailure: mapGitHubAppInstallPreparationError,
              onSuccess: (preparedInstall) => preparedInstall,
            })
          )
        );
      }),
  },
  probeRepository: authorizedProcedure
    .input(probeRepositoryInputSchema)
    .handler(async ({ context, input }) => {
      const { success: withinLimit } = await ratelimit.githubProbe.limit(
        context.user.id
      );
      if (!withinLimit) {
        throw tooManyRequests(
          "Too many GitHub repository checks. Please try again shortly."
        );
      }

      const octokit = createOctokit(input.token || undefined);

      return Effect.runPromise(
        Effect.tryPromise({
          try: async () => {
            const { data } = await octokit.request(
              "GET /repos/{owner}/{repo}",
              {
                owner: input.owner,
                repo: input.repo,
                headers: { "X-GitHub-Api-Version": "2022-11-28" },
              }
            );

            return {
              defaultBranch: data.default_branch,
              description: data.description,
              status: data.private ? "private" : "public",
            };
          },
          catch: (cause) => new GitHubRepositoryProbeError({ cause }),
        }).pipe(
          Effect.match({
            onFailure: mapGitHubRepositoryProbeError,
            onSuccess: (repository) => repository,
          })
        )
      );
    }),
};
