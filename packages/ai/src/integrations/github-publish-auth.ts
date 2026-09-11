import { db } from "@notra/db/drizzle";
import { githubIntegrations } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GitHubAppRequiredForPublishError,
  GitHubCredentialsMissingError,
  GitHubPersistenceError,
} from "../schemas/github-operations";
import type { ResolveGitHubTokenParams } from "../types/github-operations";
import { runGitHubEffect } from "../utils/run-github-effect";
import {
  createGitHubAppInstallationTokenForRecordEffect,
  getTokenForIntegrationIdEffect,
  isGitHubAppConfigured,
  listGitHubAppInstallationsByOrganization,
} from "./github";

function selectGitHubAppInstallationForOwner<
  T extends { accountLogin: string },
>(installations: readonly T[], owner: string | null | undefined) {
  const normalizedOwner = owner?.trim().toLowerCase();
  if (!normalizedOwner) {
    return undefined;
  }

  return installations.find(
    (installation) =>
      installation.accountLogin.toLowerCase() === normalizedOwner
  );
}

/**
 * Content publishing authenticates as the GitHub App installation so
 * commits and pull requests are authored by `{slug}[bot]`. Personal access
 * tokens stay available when the GitHub App is not configured.
 */
export const getGitHubPublishTokenEffect = Effect.fn(
  "GitHub.resolvePublishToken"
)(function* (
  integrationId: string,
  options?: Pick<ResolveGitHubTokenParams, "organizationId">
) {
  if (!isGitHubAppConfigured()) {
    return yield* getTokenForIntegrationIdEffect(integrationId, options);
  }

  const integration = yield* Effect.tryPromise({
    try: () =>
      db
        .select({
          githubAppInstallationId: githubIntegrations.githubAppInstallationId,
          organizationId: githubIntegrations.organizationId,
          owner: githubIntegrations.owner,
        })
        .from(githubIntegrations)
        .where(
          options?.organizationId
            ? and(
                eq(githubIntegrations.id, integrationId),
                eq(githubIntegrations.organizationId, options.organizationId)
              )
            : eq(githubIntegrations.id, integrationId)
        )
        .limit(1)
        .$withCache(false)
        .then(([record]) => record),
    catch: (cause) =>
      new GitHubPersistenceError({
        operation: "findPublishIntegration",
        cause,
      }),
  });

  if (!integration) {
    return yield* Effect.fail(
      new GitHubCredentialsMissingError({ integrationId })
    );
  }

  if (integration.githubAppInstallationId) {
    return yield* createGitHubAppInstallationTokenForRecordEffect(
      integration.githubAppInstallationId,
      integration.organizationId
    );
  }

  const installations = yield* Effect.tryPromise({
    try: () =>
      listGitHubAppInstallationsByOrganization(integration.organizationId),
    catch: (cause) =>
      new GitHubPersistenceError({
        operation: "listPublishInstallations",
        cause,
      }),
  });
  const installation = selectGitHubAppInstallationForOwner(
    installations,
    integration.owner
  );

  if (!installation) {
    return yield* Effect.fail(
      new GitHubAppRequiredForPublishError({
        organizationId: integration.organizationId,
      })
    );
  }

  return yield* createGitHubAppInstallationTokenForRecordEffect(
    installation.id,
    integration.organizationId
  );
});

export function getGitHubPublishToken(
  integrationId: string,
  options?: Pick<ResolveGitHubTokenParams, "organizationId">
) {
  return runGitHubEffect(
    getGitHubPublishTokenEffect(integrationId, options).pipe(
      Effect.catchTag("GitHubCredentialsMissingError", () =>
        Effect.succeed(null)
      ),
      Effect.catchTag("GitHubRequestError", (error) => Effect.fail(error.cause))
    )
  );
}
