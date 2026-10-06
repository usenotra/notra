import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";

export function useImportableRepositories(organizationId: string) {
  return useQuery(
    dashboardOrpc.sites.importableRepositories.queryOptions({
      input: { organizationId },
      enabled: organizationId.length > 0,
    })
  );
}

export function useConnectSiteRepository(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (githubRepositoryId: string) =>
      dashboardOrpc.sites.connectRepository.call({
        organizationId,
        githubRepositoryId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.sites.importableRepositories.key(),
      });
    },
  });
}
