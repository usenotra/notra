import type { createOctokit } from "@notra/ai/utils/octokit";
import type { redis } from "@notra/ai/utils/redis";
import { Data } from "effect";
import type React from "react";

import type { GitHubIntegration, GitHubRepository } from "../integrations";

export interface GitHubRepositoryRowProps {
  integration: GitHubIntegration;
  organizationId: string;
  onMigrate: (integration: GitHubIntegration) => void;
  isMigrating: boolean;
  onManageRepositories: () => void;
}

export interface GitHubRepositoryActionsProps {
  onMigrate: () => void;
  isMigrating: boolean;
  onToggleWebhooks: () => void;
  webhooksOpen: boolean;
  integration: GitHubIntegration;
  organizationId: string;
  onManageRepositories: () => void;
}

export type GitHubRepositoryDialog = "edit" | "token" | "delete" | null;

export interface GitHubRepositoryMenuProps extends GitHubRepositoryActionsProps {
  isEnabled: boolean;
  isPending: boolean;
  onToggle: () => void;
  onDialog: (dialog: GitHubRepositoryDialog) => void;
}

export interface GitHubLegacyPageProps {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface GitHubWebhookSettingsProps {
  repository: GitHubRepository;
  organizationId: string;
}

export interface GitHubWebhookRotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export type GitHubClient = ReturnType<typeof createOctokit>;
export type GitHubPublishContentType = "blog_post" | "changelog";

export class GitHubInstallStartError extends Data.TaggedError(
  "GitHubInstallStartError"
)<{
  readonly cause: unknown;
}> {}

export class GitHubAccountConnectionIncompleteError extends Data.TaggedError(
  "GitHubAccountConnectionIncompleteError"
)<{
  readonly callbackPath: string;
}> {}

export type GitHubAccountType = "User" | "Organization";

export interface GitHubAppAccount {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string;
  type: GitHubAccountType;
}

export interface GitHubAppRepository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  defaultBranch: string;
}

export interface GitHubAccountsSectionProps {
  accounts: GitHubAppAccount[];
  repositories: GitHubAppRepository[];
  selectedRepositoryIds: string[];
  isLoading: boolean;
  isError: boolean;
  onConnect: () => void;
  onRetry: () => void;
  onOpenRepositories: (accountId: string) => void;
  onDisconnect: (accountId: string) => void;
}

export type GitHubInstallFailureReason =
  | "account-connection-incomplete"
  | "install-start-failed";

export type StartGitHubInstallResult =
  | { started: true }
  | { started: false; reason: GitHubInstallFailureReason };

export interface ConnectGitHubDialogProps {
  onConnect: () => void;
  isConnecting?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export interface GitHubAccountSelectProps {
  accounts: GitHubAppAccount[];
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  onAddAccount?: () => void;
  disabled?: boolean;
}

export interface RepositoryMultiSelectProps {
  repositories: GitHubAppRepository[];
  value: string[];
  onChange: (value: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  accounts?: GitHubAppAccount[];
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  onAddAccount?: () => void;
}

export interface SelectRepositoriesDialogProps {
  repositories: GitHubAppRepository[];
  error?: string;
  onRetry?: () => void;
  onSave: (repositoryIds: string[]) => void;
  initialSelected?: string[];
  isLoading?: boolean;
  isSaving?: boolean;
  accounts?: GitHubAppAccount[];
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  onAddAccount?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export interface GitHubIntegrationDialogProps {
  organizationId: string;
  organizationSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface GitHubAccountCardProps {
  isDisconnecting?: boolean;
  account: GitHubAppAccount;
  repositories: GitHubAppRepository[];
  selectedRepositoryIds: string[];
  onAddRepositories: () => void;
  onDisconnect: () => void;
}

export interface GitHubPublishingSettingsProps {
  organizationId: string;
  repository: GitHubRepository;
  disabled?: boolean;
}

export interface GitHubContentPublishingSettingsProps extends GitHubPublishingSettingsProps {
  contentLabel: string;
  contentType: GitHubPublishContentType;
  pluralLabel: string;
}

export interface GitHubContentDirectoryMutationVariables {
  nextDirectory: string;
  targetRepositoryId: string;
}

export interface GitHubOutputMutationVariables {
  enabled: boolean;
  outputId?: string;
}

export interface GitHubDirectoryPickerProps {
  contentLabel: string;
  directory: string;
  disabled?: boolean;
  isSaving?: boolean;
  onSave: (directory: string) => Promise<void>;
  organizationId: string;
  repositoryId: string;
  repositoryName: string;
  triggerId?: string;
}

export interface GitHubDirectoryChoiceProps {
  depth: number;
  helper?: string;
  name: string;
  path: string;
}

export interface GitHubDirectoryEntry {
  name: string;
  path: string;
}

export interface GitHubDirectoryNodeProps {
  depth: number;
  excludedPath?: string;
  missing?: boolean;
  name: string;
  open: boolean;
  organizationId: string;
  path: string;
  repositoryId: string;
}

export interface GitHubDirectoryNodesProps {
  depth: number;
  directories: GitHubDirectoryEntry[];
  excludedPath?: string;
  open: boolean;
  organizationId: string;
  repositoryId: string;
}

export interface GitHubDirectoryExtraChoicesProps {
  customDirectories: string[];
  directory: string;
  rootDirectories: GitHubDirectoryEntry[];
}

export interface GitHubDirectoryRootContentProps {
  directory: string;
  isError: boolean;
  isLoading: boolean;
  open: boolean;
  organizationId: string;
  repositoryId: string;
  rootDirectories: GitHubDirectoryEntry[];
}

export interface GitHubDirectoryNewFolderFieldProps {
  error: string | null;
  inputId: string;
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  selectedDirectory: string;
}

export interface GitHubDirectoryNodeStatusProps {
  depth: number;
  exists: boolean | undefined;
  isError: boolean;
  isLoading: boolean;
}

export interface ResolveGitHubContentPathParams {
  contentId: string;
  customPath?: string;
  directory: string;
  slug: string | null;
  title: string;
}

export interface FindExistingGitHubPullRequestParams {
  branchName: string;
  defaultBranch: string;
  octokit: GitHubClient;
  owner: string;
  repo: string;
}

export interface ValidateExistingGitHubBranchParams {
  baseSha: string;
  branchName: string;
  octokit: GitHubClient;
  owner: string;
  path: string;
  repo: string;
}

export type GitHubPullRequestOperation = "created" | "updated";

export interface GitHubPublishPullRequestResult {
  branchName: string;
  operation: GitHubPullRequestOperation;
  path: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
}

export interface GitHubCreateCommitOnBranchResult {
  createCommitOnBranch: {
    commit: { oid: string };
  } | null;
}

export interface OpenInNotraBadgeUrls {
  dark: string;
  light: string;
}

export interface PublishContentDraftPullRequestParams {
  contentId: string;
  contentType: GitHubPublishContentType;
  owner: string;
  repo: string;
  defaultBranch: string;
  path: string;
  title: string;
  markdown: string;
  /** Deep link to the content in the Notra dashboard, rendered as an "Open in Notra" button. */
  contentUrl?: string;
  /** Absolute URLs of the "Open in Notra" badge images per color scheme. */
  badgeUrls?: OpenInNotraBadgeUrls;
}

export interface GitHubPullRequestSummary {
  number: number;
  html_url: string;
}

export type GitHubErrorHeaders = Record<string, string | number | undefined>;

export type GitHubPublishFailureKind =
  | "authentication"
  | "forbidden"
  | "permissions"
  | "rate_limit"
  | "unknown";

export interface GitHubPublishOutputTarget {
  outputId: string;
  outputType: GitHubPublishContentType;
  repositoryId: string;
}

export interface RecordGitHubPublishFailureParams extends GitHubPublishOutputTarget {
  organizationId: string;
}

export interface ClearGitHubPublishFailuresParams {
  organizationId: string;
  outputType: GitHubPublishContentType;
  repositoryId: string;
}

export type GitHubPublishFailureRedis = Pick<
  NonNullable<typeof redis>,
  "del" | "eval"
>;

export interface GitHubPublishFailureDependencies {
  pauseOutput?: (params: GitHubPublishOutputTarget) => Promise<boolean>;
  redisClient: GitHubPublishFailureRedis | null;
}

export type GitHubPublishRecovery = (
  | { code: "github_authentication_required" }
  | { code: "github_repository_connection_required" }
  | { code: "github_token_authentication_required" }
  | { code: "github_token_permissions_required" }
  | { code: "github_content_publishing_paused" }
  | {
      code: "github_app_permissions_required";
      permissionsUrl?: string;
    }
) & { publishingPaused?: boolean };
export interface UseGitHubRepositorySelectionOptions {
  organizationId: string;
  enabled?: boolean;
  refetchOnMount?: boolean;
  initialAccountId?: string | null;
  onSaved: () => void;
}
