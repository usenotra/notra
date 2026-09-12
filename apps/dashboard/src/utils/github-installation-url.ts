import { GITHUB_INSTALLATION_ID_REGEX } from "@/constants/github";

export function getGitHubInstallationPermissionsUrl({
  installationId,
  accountType,
  accountLogin,
}: {
  installationId: string | null | undefined;
  accountType?: string | null;
  accountLogin?: string | null;
}): string | undefined {
  if (!(installationId && GITHUB_INSTALLATION_ID_REGEX.test(installationId))) {
    return undefined;
  }

  if (accountType === "Organization" && accountLogin) {
    return `https://github.com/organizations/${encodeURIComponent(accountLogin)}/settings/installations/${installationId}/permissions`;
  }

  return `https://github.com/settings/installations/${installationId}/permissions`;
}
