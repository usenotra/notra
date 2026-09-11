import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { useGitHubRepositorySelection } from "@/hooks/use-github-repository-selection";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GitHubIntegration } from "@/types/integrations";

export function useGitHubRepositoryMigration(
  organizationId: string,
  refetch: ReturnType<typeof useGitHubRepositorySelection>["query"]["refetch"],
  startInstall: () => Promise<void>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (integration: GitHubIntegration) => {
      const app = await refetch();
      if (app.error || !app.data) {
        throw new Error("Unable to load GitHub repositories. Try again.");
      }
      const repositoryIds = integration.repositories.map(
        (legacyRepository) =>
          app.data.repositories.find(
            (repository) =>
              repository.owner.toLowerCase() ===
                legacyRepository.owner.toLowerCase() &&
              repository.name.toLowerCase() ===
                legacyRepository.repo.toLowerCase()
          )?.id
      );
      if (repositoryIds.length === 0) {
        throw new Error(
          "Configure a repository before switching to the GitHub App."
        );
      }
      if (repositoryIds.some((id) => !id)) {
        toast.info(
          "Allow the Notra GitHub App to access this repository, then return here and switch again."
        );
        await startInstall();
        return false;
      }
      await dashboardOrpc.github.app.saveRepositories.call({
        organizationId,
        repositoryIds: repositoryIds.filter((id): id is string => Boolean(id)),
        preserveExisting: true,
      });
      return true;
    },
    onSuccess: async (migrated) => {
      if (!migrated) {
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.github.app.get.queryKey({
            input: { organizationId },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.integrations.key(),
        }),
      ]);
      toast.success(
        "Switched to GitHub App. Your repository settings were kept."
      );
    },
    onError: () =>
      toast.error(
        "Unable to switch to the GitHub App. Refresh the page and try again."
      ),
  });
}
