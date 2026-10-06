import { useDebouncedValue } from "@tanstack/react-pacer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { SITE_CREATE_STARTER_DEBOUNCE_MS } from "@/constants/site-create";
import { SITE_REPOSITORY_SUGGESTIONS_STALE_MS } from "@/constants/sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteStarterInput } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";

export function useSiteStarterStatus(scope: SiteStarterInput) {
  const [branch] = useDebouncedValue(scope.branch.trim(), {
    wait: SITE_CREATE_STARTER_DEBOUNCE_MS,
  });
  const [rootDirectory] = useDebouncedValue(
    scope.rootDirectory.trim().replace(/^\/+|\/+$/g, ""),
    { wait: SITE_CREATE_STARTER_DEBOUNCE_MS }
  );
  const input = {
    organizationId: scope.organizationId,
    repositoryId: scope.repositoryId,
    branch,
    rootDirectory,
  };
  return useQuery({
    ...dashboardOrpc.sites.starterStatus.queryOptions({ input }),
    enabled: Boolean(input.repositoryId),
    staleTime: SITE_REPOSITORY_SUGGESTIONS_STALE_MS,
    retry: false,
  });
}

export function useCreateSiteStarter() {
  const t = useTranslations("sites.new.starter");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SiteStarterInput) =>
      dashboardOrpc.sites.createStarter.call(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.sites.starterStatus.key(),
      });
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("failed")));
    },
  });
}
