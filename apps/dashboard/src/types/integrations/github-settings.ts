import type { useGitHubSettings } from "@/hooks/use-github-settings";

export interface GitHubSettingsPageProps {
  organizationSlug: string;
}
export interface GitHubInstallResumeParams {
  callbackPath: string;
  organizationId: string;
  reauthorizationInstallationId: string | null;
  reauthorizationState: string | null;
  shouldResume: boolean;
}
export type GitHubSettingsState = ReturnType<typeof useGitHubSettings>;
export type GitHubRepositoriesSectionProps = Pick<
  GitHubSettingsState,
  | "githubIntegrations"
  | "organizationId"
  | "isLoadingLegacyIntegrations"
  | "legacyQuery"
  | "handleOpenRepositories"
  | "handleOpenConnect"
  | "isConnected"
  | "migrationMutation"
>;
export type GitHubAppSectionProps = Pick<
  GitHubSettingsState,
  | "githubAppQuery"
  | "isLoading"
  | "isLoadingLegacyIntegrations"
  | "isConnected"
  | "accounts"
  | "repositories"
  | "selectedRepositoryIds"
  | "disconnectMutation"
  | "handleOpenRepositories"
  | "handleOpenConnect"
  | "setLegacyOpen"
>;
