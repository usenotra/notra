import { recordGitHubPublishFailure } from "@/lib/integrations/github/github-publish-failure-state";
import {
  GitHubContentBranchConflictError,
  GitHubContentPublishError,
  GitHubContentTargetExistsError,
  GitHubRepositoryEmptyError,
} from "@/lib/integrations/github/publish-content-to-github";
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
  if (error instanceof GitHubRepositoryEmptyError) {
    return badRequest(
      "Initialize the GitHub repository with a first commit before publishing"
    );
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
      return forbidden(
        "GitHub content publishing was paused after repeated failures",
        { code: "github_content_publishing_paused" }
      );
    }
  }
  if (policy.recovery) {
    const respond =
      policy.failureKind === "authentication" ? unauthorized : forbidden;
    return respond(policy.recovery.message, policy.recovery.data);
  }
  if (policy.failureKind === "rate_limit") {
    return tooManyRequests(
      "GitHub's API rate limit was reached. Please try again later."
    );
  }
  if (policy.failureKind === "forbidden") {
    return forbidden(
      "GitHub blocked this request. An organization owner may need to review repository access and organization policies."
    );
  }
  if (hasGitHubStatus(error.cause, 404) || hasGitHubStatus(error.cause, 422)) {
    return badRequest(error.message, { branchName: error.branchName });
  }
  return internalServerError(error.message, error.cause);
}
