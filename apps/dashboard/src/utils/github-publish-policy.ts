import type {
  GitHubPublishFailureContext,
  GitHubPublishFailurePolicy,
} from "@/types/integrations/github-publish-policy";

import { getGitHubInstallationPermissionsUrl } from "./github-installation-url";
import { classifyGitHubPublishFailure } from "./github-publish-failure";

export function getGitHubAppPermissionsRecovery({
  installationId,
  installationAccountType,
  installationAccountLogin,
}: Pick<
  GitHubPublishFailureContext,
  "installationId" | "installationAccountType" | "installationAccountLogin"
>) {
  const permissionsUrl = getGitHubInstallationPermissionsUrl({
    installationId,
    accountType: installationAccountType,
    accountLogin: installationAccountLogin,
  });

  return {
    message: "The GitHub App needs write access to Contents and Pull requests.",
    data: {
      code: "github_app_permissions_required" as const,
      ...(permissionsUrl ? { permissionsUrl } : {}),
    },
  };
}

export function getGitHubPublishFailurePolicy(
  cause: unknown,
  {
    connectionMethod,
    installationId,
    installationAccountType,
    installationAccountLogin,
  }: Pick<
    GitHubPublishFailureContext,
    | "connectionMethod"
    | "installationId"
    | "installationAccountType"
    | "installationAccountLogin"
  >
): GitHubPublishFailurePolicy {
  const failureKind = classifyGitHubPublishFailure(cause);
  const usesToken = connectionMethod === "personal-access-token";
  if (failureKind === "authentication") {
    return {
      failureKind,
      recordFailure: false,
      recovery: {
        message: usesToken
          ? "The saved GitHub token was rejected. Update it or connect this repository through the GitHub App."
          : "GitHub App authentication failed. Review the installation and save your repository selection again.",
        data: {
          code: usesToken
            ? "github_token_authentication_required"
            : "github_authentication_required",
        },
      },
    };
  }
  if (failureKind === "permissions") {
    if (usesToken) {
      return {
        failureKind,
        recordFailure: false,
        recovery: {
          message:
            "The saved GitHub token needs write access to repository contents and pull requests.",
          data: { code: "github_token_permissions_required" },
        },
      };
    }
    return {
      failureKind,
      recordFailure: false,
      recovery: getGitHubAppPermissionsRecovery({
        installationId,
        installationAccountType,
        installationAccountLogin,
      }),
    };
  }
  return failureKind === "rate_limit"
    ? { failureKind, recordFailure: false }
    : { failureKind, recordFailure: true };
}
