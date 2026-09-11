import type {
  GitHubRepositorySelectionError,
  GitHubPublishTokenError,
} from "@notra/ai/types/github-operations";

import {
  badRequest,
  conflict,
  forbidden,
  internalServerError,
  tooManyRequests,
  unauthorized,
} from "@/lib/orpc/utils/errors";

import { classifyGitHubPublishFailure } from "./github-publish-failure";

export function toGitHubOperationOrpcError(
  error: GitHubRepositorySelectionError | GitHubPublishTokenError
) {
  switch (error._tag) {
    case "GitHubAppRequiredForPublishError":
      return forbidden(
        "Connect the GitHub App so Notra can open pull requests as a bot.",
        { code: "github_authentication_required" }
      );
    case "GitHubCredentialsMissingError":
      return forbidden(
        "Connect this repository through the GitHub App before publishing.",
        {
          code: "github_repository_connection_required",
        }
      );
    case "GitHubInstallationMissingError":
      return unauthorized(
        "Review the GitHub App installation and save your repository selection again.",
        {
          code: "github_authentication_required",
        }
      );
    case "GitHubRepositoryUnavailableError":
      return badRequest(error.message);
    case "GitHubRepositoryConflictError":
      return conflict(error.message);
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
        return tooManyRequests(
          "GitHub's API rate limit was reached. Please try again later."
        );
      }
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.status === 404
      ) {
        return forbidden(
          "GitHub denied access to the installation. Review its repository access and organization policies.",
          {
            code: "github_authentication_required",
          }
        );
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
