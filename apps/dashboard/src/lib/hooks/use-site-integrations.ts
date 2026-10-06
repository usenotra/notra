import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteScope } from "@/types/sites";

export function useSiteIntegrations({ organizationId, siteId }: SiteScope) {
  return useQuery(
    dashboardOrpc.sites.integrations.get.queryOptions({
      input: { organizationId, siteId },
      enabled: organizationId.length > 0,
    })
  );
}

export function useSaveSiteIntegration({ organizationId, siteId }: SiteScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      provider: Parameters<
        typeof dashboardOrpc.sites.integrations.save.call
      >[0]["provider"];
      settings: Record<string, unknown> | null;
    }) =>
      dashboardOrpc.sites.integrations.save.call({
        organizationId,
        siteId,
        ...input,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.sites.key(),
      });
    },
  });
}
