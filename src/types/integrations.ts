import type React from "react";
import type { IntegrationType } from "@/utils/schemas/integrations";

export type RepositoryOutput = {
  id: string;
  outputType: string;
  enabled: boolean;
};

export type GitHubRepository = {
  id: string;
  owner: string;
  repo: string;
  enabled: boolean;
  outputs?: RepositoryOutput[];
};

export type Repository = GitHubRepository;

export type GitHubIntegration = {
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
};

export type GitHubRepoInfo = {
  owner: string;
  repo: string;
  fullUrl: string;
};

export type AvailableRepo = {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
};

export type IntegrationUIConfig = {
  id: IntegrationType;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
  category: "input" | "output";
};

export type AddIntegrationDialogProps = {
  organizationId?: string;
  organizationSlug?: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

export type AddRepositoryDialogProps = {
  integrationId: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

export type IntegrationCardProps = {
  integration: GitHubIntegration;
  organizationSlug: string;
  onUpdate?: () => void;
};

export type RepositoryListProps = {
  integrationId: string;
};
