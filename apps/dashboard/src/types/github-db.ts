import type { GitHubIntegration } from "@/types/integrations";

export interface GitHubRepositoriesDbApi {
  repositories: GitHubIntegration[];
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  pendingRepositoryIds: ReadonlySet<string>;
  refetch: () => Promise<void>;
  setRepositoryEnabled: (
    repositoryId: string,
    enabled: boolean
  ) => Promise<void>;
  removeRepository: (repositoryId: string) => Promise<void>;
}
