import type { GitHubConnectionMethod } from "@notra/ai/types/github-connection";
import type {
  IntegrationType,
  OutputContentType,
} from "@notra/schemas/dashboard/integrations";

import type { RepositoryOutput } from "@/types/integrations";

export interface CreateGitHubIntegrationParams {
  organizationId: string;
  userId: string;
  token: string | null;
  displayName: string;
  owner: string;
  repo: string;
  defaultBranch: string | null;
}

export interface AddRepositoryParams {
  integrationId: string;
  owner: string;
  repo: string;
  outputs?: Array<{
    type: OutputContentType;
    enabled?: boolean;
    config?: Record<string, unknown>;
  }>;
}

export interface ConfigureOutputParams {
  repositoryId: string;
  outputType: OutputContentType;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface WebhookConfig {
  webhookUrl: string;
  webhookSecret: string;
  repositoryId: string;
  owner: string;
  repo: string;
}

export interface IntegrationWithRepositories {
  id: string;
  displayName: string;
  type: IntegrationType;
  connectionMethod?: GitHubConnectionMethod;
  enabled: boolean;
  createdAt: Date;
  managedByGitHubApp?: boolean;
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    defaultBranch: string | null;
    enabled: boolean;
    outputs?: RepositoryOutput[];
  }>;
}

export interface IntegrationsResponse {
  integrations: IntegrationWithRepositories[];
  count: number;
}

export type IntegrationFetcher = (
  organizationId: string
) => Promise<IntegrationWithRepositories[]>;
