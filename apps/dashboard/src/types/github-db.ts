import type { GitHubIntegration } from "@/types/integrations";

export interface GitHubRepositoriesDbApi {
  repositories: GitHubIntegration[];
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  pendingRepositoryIds: ReadonlySet<string>;
  refetch: () => Promise<void>;
  setRepositoryEnabled: (
    integrationId: string,
    enabled: boolean
  ) => Promise<void>;
  setRepositoryOutputEnabled: (
    repositoryId: string,
    outputType: string,
    enabled: boolean
  ) => Promise<void>;
  removeRepository: (integrationId: string) => Promise<void>;
}
