import type React from "react";
import type { IntegrationType } from "@/utils/schemas/integrations";

export interface RepositoryOutput {
  id: string;
  outputType: string;
  enabled: boolean;
}

export interface GitHubRepository {
  id: string;
  owner: string;
  repo: string;
  enabled: boolean;
  hasWebhook?: boolean;
  outputs?: RepositoryOutput[];
}

export type Repository = GitHubRepository;

export interface GitHubIntegration {
  id: string;
  displayName: string;
  enabled: boolean;
  createdAt: string;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  repositories: GitHubRepository[];
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

export interface IntegrationCardProps {
  integration: GitHubIntegration;
  organizationId: string;
  organizationSlug: string;
  onUpdate?: () => void;
}

export interface RepositoryListProps {
  integrationId: string;
  organizationId: string;
}

export interface WebhookConfig {
  webhookUrl: string;
  webhookSecret: string;
  repositoryId: string;
  owner: string;
  repo: string;
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
