import { getTranslations } from "next-intl/server";

import { recordGitHubPublishFailure } from "@/lib/integrations/github/github-publish-failure-state";
import {
  GitHubContentBranchConflictError,
  GitHubContentPublishError,
  GitHubContentTargetExistsError,
  GitHubLinkedPullRequestUnavailableError,
  GitHubRepositoryEmptyError,
} from "@/lib/integrations/github/publish-content-to-github";
import type { GitHubPublishRecovery } from "@/types/integrations/github";
import type { GitHubPublishFailureContext } from "@/types/integrations/github-publish-policy";
import { hasGitHubStatus } from "@/utils/github-publish-failure";
import { getGitHubPublishFailurePolicy } from "@/utils/github-publish-policy";

import {
  badRequest,
  conflict,
  forbidden,
  internalServerError,
  tooManyRequests,
  unauthorized,
} from "./errors";

export async function getGitHubRecoveryMessage(
  recovery: GitHubPublishRecovery
): Promise<string> {
  const tErrors = await getTranslations("errors.github");
  switch (recovery.code) {
    case "github_app_permissions_required":
      return tErrors("recovery.appPermissions");
    case "github_token_authentication_required":
      return tErrors("recovery.tokenRejected");
    case "github_authentication_required":
      return tErrors("recovery.appAuthenticationFailed");
    case "github_token_permissions_required":
      return tErrors("recovery.tokenPermissions");
    case "github_content_publishing_paused":
      return tErrors("publishingPausedAfterFailures");
    case "github_repository_connection_required": {
      const tContentErrors = await getTranslations("errors.content");
      return tContentErrors("connectViaGithubApp");
    }
    default:
      return tErrors("recovery.appAuthenticationFailed");
  }
}

export async function toGitHubPublishOrpcError(
  error: unknown,
  context: GitHubPublishFailureContext
) {
  if (error instanceof GitHubContentTargetExistsError) {
    return conflict(error.message);
  }
  if (error instanceof GitHubContentBranchConflictError) {
    return conflict(error.message, { branchName: error.branchName });
  }
  if (error instanceof GitHubLinkedPullRequestUnavailableError) {
    return badRequest(error.message);
  }
  if (error instanceof GitHubRepositoryEmptyError) {
    const tErrors = await getTranslations("errors.github");
    return badRequest(tErrors("repositoryEmpty"));
  }
  if (!(error instanceof GitHubContentPublishError)) {
    return internalServerError("Failed to publish content to GitHub", error);
  }

  const policy = getGitHubPublishFailurePolicy(error.cause, context);
  const {
    organizationId,
    repositoryId,
    outputId,
    outputType,
    connectionMethod,
    installationId,
  } = context;
  console.warn("GitHub content publishing failed", {
    organizationId,
    repositoryId,
    connectionMethod,
    installationId,
    failureKind: policy.failureKind,
  });
  if (policy.recordFailure) {
    let paused = false;
    try {
      const result = await recordGitHubPublishFailure({
        organizationId,
        repositoryId,
        outputId,
        outputType,
      });
      paused = result.paused;
    } catch (trackingError) {
      console.warn("Failed to record GitHub publish failure state", {
        organizationId,
        repositoryId,
        error: trackingError,
      });
    }
    if (paused) {
      const tErrors = await getTranslations("errors.github");
      return forbidden(tErrors("publishingPausedAfterFailures"), {
        code: "github_content_publishing_paused",
      });
    }
  }
  if (policy.recovery) {
    const respond =
      policy.failureKind === "authentication" ? unauthorized : forbidden;
    return respond(
      await getGitHubRecoveryMessage(policy.recovery.data),
      policy.recovery.data
    );
  }
  if (policy.failureKind === "rate_limit") {
    const tErrors = await getTranslations("errors.github");
    return tooManyRequests(tErrors("apiRateLimited"));
  }
  if (policy.failureKind === "forbidden") {
    const tErrors = await getTranslations("errors.github");
    return forbidden(tErrors("requestBlocked"));
  }
  if (hasGitHubStatus(error.cause, 404) || hasGitHubStatus(error.cause, 422)) {
    return badRequest(error.message, { branchName: error.branchName });
  }
  return internalServerError(error.message, error.cause);
}
