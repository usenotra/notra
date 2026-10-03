import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { dashboardOrpc } from "@/lib/orpc/query";
import type { GitHubIntegration } from "@/types/integrations";

export function useGitHubRepositoryMigration(
  organizationId: string,
  startInstall: () => Promise<void>
) {
  const t = useTranslations("integrations.github.toasts");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (integration: GitHubIntegration) => {
      const app = await dashboardOrpc.github.app.catalog
        .call({ organizationId })
        .catch(() => null);
      if (!app) {
        throw new Error(t("migrationLoadFailed"));
      }
      const repositoryIds = integration.repositories.map(
        (legacyRepository) =>
          app.repositories.find(
            (repository) =>
              repository.owner.toLowerCase() ===
                legacyRepository.owner.toLowerCase() &&
              repository.name.toLowerCase() ===
                legacyRepository.repo.toLowerCase()
          )?.id
      );
      if (repositoryIds.length === 0) {
        throw new Error(t("migrationNoRepository"));
      }
      if (repositoryIds.some((id) => !id)) {
        toast.info(t("migrationAllowAccess"));
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
      toast.success(t("migrated"));
    },
    onError: () => toast.error(t("migrationFailed")),
  });
}
