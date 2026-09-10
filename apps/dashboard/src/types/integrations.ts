import type { GitHubConnectionMethod } from "@notra/ai/types/github-connection";
import type { IntegrationType } from "@notra/schemas/dashboard/integrations";
import type React from "react";

export interface RepositoryOutput {
  id: string;
  outputType: string;
  enabled: boolean;
}

export interface GitHubRepository {
  id: string;
  owner: string;
  repo: string;
  defaultBranch: string | null;
  enabled: boolean;
  hasWebhook?: boolean;
  outputs?: RepositoryOutput[];
}

export type Repository = GitHubRepository;

export interface GitHubIntegration {
  id: string;
  connectionMethod?: GitHubConnectionMethod;
  displayName: string;
  enabled: boolean;
  managedByGitHubApp: boolean;
  createdAt: string;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  repositories: GitHubRepository[];
}

export interface SlackIntegration {
  id: string;
  displayName: string;
  enabled: boolean;
  createdAt: string;
  slackTeamId: string;
  slackTeamName?: string | null;
  allowedChannelIds: string[] | null;
  notificationChannelId: string | null;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface LinearIntegration {
  id: string;
  displayName: string;
  enabled: boolean;
  createdAt: string;
  linearOrganizationId?: string;
  linearOrganizationName?: string | null;
  linearTeamId?: string | null;
  linearTeamName?: string | null;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface GranolaIntegration {
  id: string;
  displayName: string;
  enabled: boolean;
  createdAt: string;
  workspaceName?: string | null;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface AddGranolaIntegrationDialogProps {
  organizationId: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export interface GranolaIntegrationCardProps {
  integration: GranolaIntegration;
  organizationId: string;
  onUpdate?: () => void;
}

export type WebhookLogType = "release" | "push" | "ping";

export interface IntegrationWebhookLog {
  id: string;
  type: WebhookLogType;
  action: string;
  status: "success" | "failed";
  message?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  fullUrl: string;
}

export interface AvailableRepo {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  url: string;
}

export interface IntegrationUIConfig {
  id: IntegrationType;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
  category: "input" | "output";
}

export interface AddIntegrationDialogProps {
  organizationId?: string;
  organizationSlug?: string;
  onSuccess?: () => void;
  onFlowComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export interface AddRepositoryDialogProps {
  integrationId: string;
  organizationId: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export interface EditTokenDialogProps {
  integration: GitHubIntegration;
  organizationId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export interface IntegrationCardProps {
  integration: GitHubIntegration;
  organizationId: string;
  organizationSlug: string;
  onUpdate?: () => void;
}

export interface IntegrationCardDitherProps {
  active: boolean;
  color: string;
}

export type DitherInteractionProps = Pick<
  React.HTMLAttributes<HTMLElement>,
  "onBlur" | "onFocus" | "onPointerEnter" | "onPointerLeave"
>;

export interface IntegrationCardDitherInteraction {
  active: boolean;
  interactionProps: DitherInteractionProps;
}

export interface RepositoryListProps {
  integrationId: string;
  organizationId: string;
}

export interface WebhookSetupDialogProps {
  repositoryId: string;
  organizationId: string;
  owner: string;
  repo: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export interface AddRepositoryButtonProps {
  onAdd?: () => void;
  label?: string;
}

export interface CreateLinearIntegrationParams {
  organizationId: string;
  userId: string;
  displayName: string;
  accessToken: string;
  linearOrganizationId: string;
  linearOrganizationName?: string;
  linearTeamId?: string;
  linearTeamName?: string;
}
