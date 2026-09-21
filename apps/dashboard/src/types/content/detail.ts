import type { PostGitHubPublish } from "@notra/db/types/post-github-publish";

import type { GitHubRepository } from "@/types/integrations";
import type {
  GitHubPublishContentType,
  GitHubPublishPullRequestResult,
  GitHubPublishRecovery,
} from "@/types/integrations/github";

export interface ContentDetailPageClientProps {
  contentId: string;
  organizationSlug: string;
  organizationId: string;
}

export interface PublishContentToGitHubDialogProps {
  contentId: string;
  contentType: GitHubPublishContentType;
  githubPublish: PostGitHubPublish | null;
  onSave: () => Promise<boolean>;
  organizationId: string;
  organizationSlug: string;
  title: string;
}

export interface GitHubPublishDialogBodyProps {
  contentLabel: string;
  connectedRepositoryCount: number;
  integrationsLoadFailed: boolean;
  isLoadingIntegrations: boolean;
  isPublishing: boolean;
  onRepositoryChange: (repositoryId: string) => void;
  onRetryIntegrations: () => void;
  organizationSlug: string;
  linkedPublish: PostGitHubPublish | null;
  publishRecovery: GitHubPublishRecovery | null;
  pullRequest: GitHubPublishPullRequestResult | undefined;
  repositories: GitHubRepository[];
  selectedPublishingEnabled: boolean;
  selectedRepository: GitHubRepository | undefined;
  title: string;
}

export interface GitHubPublishResultCardProps {
  pullRequest: GitHubPublishPullRequestResult;
  repositoryLabel: string;
  title: string;
}

export interface GitHubPublishRepositoryFieldProps {
  connectedRepositoryCount: number;
  contentLabel: string;
  integrationsLoadFailed: boolean;
  isLoadingIntegrations: boolean;
  isPublishing: boolean;
  onRepositoryChange: (repositoryId: string) => void;
  onRetryIntegrations: () => void;
  organizationSlug: string;
  repositories: GitHubRepository[];
  selectedPublishingEnabled: boolean;
  selectedRepository: GitHubRepository | undefined;
}

export interface GitHubPublishRepositoryStatusProps {
  connectedRepositoryCount: number;
  contentTypeLabel: string;
  githubIntegrationHref: string;
  integrationsLoadFailed: boolean;
  isLoadingIntegrations: boolean;
  onRetryIntegrations: () => void;
  repositoriesCount: number;
  selectedPublishingEnabled: boolean;
  selectedRepository: GitHubRepository | undefined;
}

export interface GitHubPublishRecoveryAlertProps {
  publishRecovery: GitHubPublishRecovery;
}

export interface GitHubPublishDialogFooterProps {
  hasSelectedRepository: boolean;
  isPublishing: boolean;
  organizationSlug: string;
  publishRecovery: GitHubPublishRecovery | null;
  pullRequest: GitHubPublishPullRequestResult | undefined;
  selectedPublishingEnabled: boolean;
  updatingLinkedPullRequest: boolean;
}
