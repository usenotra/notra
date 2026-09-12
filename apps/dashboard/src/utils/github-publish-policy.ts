import { GITHUB_INSTALLATION_ID_REGEX } from "@/constants/github";
import type {
  GitHubPublishFailureContext,
  GitHubPublishFailurePolicy,
} from "@/types/integrations/github-publish-policy";

import { classifyGitHubPublishFailure } from "./github-publish-failure";

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
    let permissionsUrl: string | undefined;
    if (installationId && GITHUB_INSTALLATION_ID_REGEX.test(installationId)) {
      permissionsUrl =
        installationAccountType === "Organization" && installationAccountLogin
          ? `https://github.com/organizations/${encodeURIComponent(installationAccountLogin)}/settings/installations/${installationId}`
          : `https://github.com/settings/installations/${installationId}/permissions`;
    }
    return {
      failureKind,
      recordFailure: false,
      recovery: {
        message:
          "The GitHub App needs read and write access to Contents and Pull requests.",
        data: {
          code: "github_app_permissions_required",
          ...(permissionsUrl ? { permissionsUrl } : {}),
        },
      },
    };
  }
  return failureKind === "rate_limit"
    ? { failureKind, recordFailure: false }
    : { failureKind, recordFailure: true };
}
