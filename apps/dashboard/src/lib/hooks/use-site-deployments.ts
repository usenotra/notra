import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  SITE_ACTIVE_POLL_INTERVAL_MS,
  SITE_DEPLOYMENTS_PAGE_LIMIT,
  SITE_ELAPSED_TICK_MS,
  SITE_IDLE_POLL_INTERVAL_MS,
} from "@/constants/sites";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SiteDeployment,
  SiteDeploymentDetail,
  SiteScope,
} from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import {
  hasDeploymentInProgress,
  isDeploymentInProgress,
} from "@/utils/site-deployments";

/** Current time, re-rendered every second while `active`, for ticking build timers. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    setNow(Date.now());
    const timer = window.setInterval(
      () => setNow(Date.now()),
      SITE_ELAPSED_TICK_MS
    );
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/** Full deployment history for the deployments page; polls every 2s while a build runs. */
export function useSiteDeploymentsList({ organizationId, siteId }: SiteScope) {
  return useQuery(
    dashboardOrpc.sites.deployments.list.queryOptions({
      input: { organizationId, siteId, limit: SITE_DEPLOYMENTS_PAGE_LIMIT },
      enabled: organizationId.length > 0,
      refetchInterval: (query: { state: { data?: SiteDeployment[] } }) =>
        hasDeploymentInProgress(query.state.data ?? [])
          ? SITE_ACTIVE_POLL_INTERVAL_MS
          : SITE_IDLE_POLL_INTERVAL_MS,
      refetchIntervalInBackground: false,
    })
  );
}

/**
 * One deployment and its build log. While the build runs the builder
 * re-uploads the log every ~2s, so polling at the same pace follows it live.
 * A finished deployment never changes, so polling stops.
 */
export function useSiteDeployment({
  organizationId,
  siteId,
  deploymentId,
}: SiteScope & { deploymentId: string }) {
  return useQuery(
    dashboardOrpc.sites.deployments.get.queryOptions({
      input: { organizationId, siteId, deploymentId },
      enabled: organizationId.length > 0,
      refetchInterval: (query: { state: { data?: SiteDeploymentDetail } }) => {
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
