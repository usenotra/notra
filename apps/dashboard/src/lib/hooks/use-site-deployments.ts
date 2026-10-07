import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { SITE_ACTIVE_POLL_INTERVAL_MS } from "@/constants/sites";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SitePollingQuery,
  UseSiteDeploymentParams,
} from "@/types/hooks/sites";
import type { SiteDeploymentDetail, SiteScope } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { isDeploymentInProgress } from "@/utils/site-deployments";

export function useSiteDeployment({
  organizationId,
  siteId,
  deploymentId,
}: UseSiteDeploymentParams) {
  return useQuery(
    dashboardOrpc.sites.deployments.get.queryOptions({
      input: { organizationId, siteId, deploymentId },
      enabled: organizationId.length > 0,
      refetchInterval: (query: SitePollingQuery<SiteDeploymentDetail>) => {
        const status = query.state.data?.deployment.status;
        return status && !isDeploymentInProgress(status)
          ? false
          : SITE_ACTIVE_POLL_INTERVAL_MS;
      },
      refetchIntervalInBackground: false,
    })
  );
}

export function useDeployLatest({ organizationId, siteId }: SiteScope) {
  const t = useTranslations("sites.detail");
  const invalidateSites = useInvalidateSites();
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.deployments.deployLatest.call({
        organizationId,
        siteId,
      }),
    onSuccess: async () => {
      toast.success(t("deployQueued"));
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("deployFailed")));
    },
  });
}

export function useRedeployDeployment({ organizationId, siteId }: SiteScope) {
  const t = useTranslations("sites.deployments");
  const invalidateSites = useInvalidateSites();
  return useMutation({
    mutationFn: (deploymentId: string) =>
      dashboardOrpc.sites.deployments.redeploy.call({
        organizationId,
        siteId,
        deploymentId,
      }),
    onSuccess: async () => {
      toast.success(t("redeployQueued"));
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("redeployFailed")));
    },
  });
}
