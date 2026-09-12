import { Effect } from "effect";

import {
  GitHubCredentialsMissingError,
  GitHubInstallationMissingError,
} from "../schemas/github-operations";
import type {
  GitHubTokenDependencies,
  GitHubCredentialDependencies,
  GitHubStoredCredentials,
  ResolveGitHubTokenParams,
} from "../types/github-operations";

export const resolveGitHubToken = Effect.fn("GitHub.resolveToken")(function* (
  params: ResolveGitHubTokenParams,
  dependencies: GitHubTokenDependencies
) {
  const integration = yield* dependencies.findIntegration(params);
  if (!integration) {
    return yield* Effect.fail(
      new GitHubCredentialsMissingError({ integrationId: params.integrationId })
    );
  }

  return yield* resolveGitHubCredentials(
    params.integrationId,
    integration,
    dependencies
  );
});

export const resolveGitHubCredentials = Effect.fn("GitHub.resolveCredentials")(
  function* (
    integrationId: string,
    integration: GitHubStoredCredentials,
    dependencies: GitHubCredentialDependencies
  ) {
    if (integration.githubAppInstallationId) {
      const installation = yield* dependencies.findInstallation(
        integration.githubAppInstallationId,
        integration.organizationId
      );
      if (!installation) {
        return yield* Effect.fail(
          new GitHubInstallationMissingError({
            organizationId: integration.organizationId,
          })
        );
      }
      return yield* dependencies
        .createInstallationToken(installation.installationId)
        .pipe(
          Effect.mapError((error) =>
            error._tag === "GitHubRequestError" && error.status === 404
              ? new GitHubInstallationMissingError({
                  organizationId: integration.organizationId,
                })
              : error
          )
        );
    }

    if (!integration.encryptedToken) {
      return yield* Effect.fail(
        new GitHubCredentialsMissingError({ integrationId })
      );
    }
    return yield* dependencies.decryptToken(
      integration.encryptedToken,
      integrationId
    );
  }
);
