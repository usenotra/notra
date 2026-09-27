import type {
  GitHubRepositorySelectionError,
  GitHubPublishTokenError,
} from "@notra/ai/types/github-operations";
import { getTranslations } from "next-intl/server";

import {
  badRequest,
  conflict,
  forbidden,
  internalServerError,
  tooManyRequests,
  unauthorized,
} from "@/lib/orpc/utils/errors";

import { classifyGitHubPublishFailure } from "./github-publish-failure";

export async function toGitHubOperationOrpcError(
  error: GitHubRepositorySelectionError | GitHubPublishTokenError
) {
  const tErrors = await getTranslations("errors");
  switch (error._tag) {
    case "GitHubAppRequiredForPublishError":
      return forbidden(tErrors("github.appRequiredForPublish"), {
        code: "github_authentication_required",
      });
    case "GitHubCredentialsMissingError":
      return forbidden(tErrors("content.connectViaGithubApp"), {
        code: "github_repository_connection_required",
      });
    case "GitHubInstallationMissingError":
      return unauthorized(tErrors("github.installationMissing"), {
        code: "github_authentication_required",
      });
    case "GitHubRepositoryUnavailableError":
      return badRequest(tErrors("github.repositoryUnavailable"));
    case "GitHubRepositoryConflictError":
      return conflict(
        tErrors("github.repositoryConflict", {
          repository: error.repository,
        })
      );
    case "GitHubAppConfigurationError":
      return internalServerError(
        "The server could not authenticate the GitHub App. Contact support.",
        error
      );
    case "GitHubCredentialDecryptionError":
      return internalServerError(
        "The server could not read the saved GitHub credential. Contact support.",
        error
      );
    case "GitHubPersistenceError":
      return internalServerError(
        "Failed to access the saved GitHub connection. Please try again.",
        error
      );
    case "GitHubRepositoryCacheError":
      return internalServerError(
        "Failed to access the GitHub repository cache. Please try again.",
        error
      );
    case "GitHubResponseError":
      return internalServerError(
        "GitHub returned an invalid repository response. Please try again.",
        error
      );
    case "GitHubRequestError": {
      const failureKind = classifyGitHubPublishFailure(error.cause);
      if (failureKind === "rate_limit") {
        return tooManyRequests(tErrors("github.apiRateLimited"));
      }
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.status === 404
      ) {
        return forbidden(tErrors("github.installationAccessDenied"), {
          code: "github_authentication_required",
        });
      }
      return internalServerError(
        "GitHub could not complete the request. Please try again.",
        error
      );
    }
    default: {
      const unhandled: never = error;
      return internalServerError(
        "Unexpected GitHub operation failure",
        unhandled
      );
    }
  }
}
