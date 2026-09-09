"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { IrisPauseDialog } from "@/components/iris/iris-pause-dialog";
import { IrisRunningState } from "@/components/iris/iris-running-state";
import { IrisStartState } from "@/components/iris/iris-start-state";
import { IrisUnavailableState } from "@/components/iris/iris-unavailable-state";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  IRIS_ACTIVE_POLL_INTERVAL_MS,
  IRIS_SIGNALS_PREVIEW_LIMIT,
} from "@/constants/iris";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { IrisListRunsResult, IrisPageClientProps } from "@/types/iris";
import { isIrisRunOpen } from "@/utils/iris-copy";
import { buildIrisReadiness } from "@/utils/iris-readiness";

import { IrisPageSkeleton } from "./skeleton";

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function PageClient({ organizationSlug }: IrisPageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id ?? "";
  const isReady = organizationId.length > 0;
  const queryClient = useQueryClient();
  const [pauseOpen, setPauseOpen] = useState(false);

  const irisKey = dashboardOrpc.iris.key();
  const invalidateIris = () =>
    queryClient.invalidateQueries({ queryKey: irisKey });

  const runsQuery = useInfiniteQuery(
    dashboardOrpc.iris.listRuns.infiniteOptions({
      input: (cursor: string | undefined) => ({ organizationId, cursor }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: isReady,
      // No open run: stop polling entirely instead of falling back to an idle interval.
      refetchInterval: (query: {
        state: { data?: { pages: IrisListRunsResult[] } };
      }) =>
        isIrisRunOpen(query.state.data?.pages.at(0)?.runs.at(0) ?? null)
          ? IRIS_ACTIVE_POLL_INTERVAL_MS
          : false,
      refetchIntervalInBackground: false,
    })
  );

  const runs = runsQuery.data?.pages.flatMap((page) => page.runs) ?? [];
  const latestRun = runs.at(0) ?? null;
  const isBusy = isIrisRunOpen(latestRun);
  const pollInterval = isBusy ? IRIS_ACTIVE_POLL_INTERVAL_MS : false;

  const overviewQuery = useQuery(
    dashboardOrpc.iris.getOverview.queryOptions({
      input: { organizationId },
      enabled: isReady,
      refetchInterval: pollInterval,
      refetchIntervalInBackground: false,
    })
  );

  const overview = overviewQuery.data ?? null;
  const mandate = overview?.mandate ?? null;

  const signalsQuery = useQuery(
    dashboardOrpc.iris.listSignals.queryOptions({
      input: { organizationId, limit: IRIS_SIGNALS_PREVIEW_LIMIT },
      enabled: isReady && mandate !== null,
      refetchInterval: pollInterval,
      refetchIntervalInBackground: false,
    })
  );

  const startMutation = useMutation({
    mutationFn: () => dashboardOrpc.iris.start.call({ organizationId }),
    onSuccess: () => {
      toast.success("Iris is on duty");
      invalidateIris();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Iris could not be started"));
    },
  });

  const runNowMutation = useMutation({
    mutationFn: () => dashboardOrpc.iris.runNow.call({ organizationId }),
    onSuccess: () => {
      toast.success("Iris is on it");
      invalidateIris();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Iris could not start a run"));
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => {
      if (!mandate) {
        throw new Error("Iris is not running");
      }
      return dashboardOrpc.iris.pause.call({
        organizationId,
        mandateId: mandate.id,
      });
    },
    onSuccess: () => {
      toast.success("Iris is paused");
      setPauseOpen(false);
      invalidateIris();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Iris could not be paused"));
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => {
      if (!mandate) {
        throw new Error("Iris is not running");
      }
      return dashboardOrpc.iris.resume.call({
        organizationId,
        mandateId: mandate.id,
      });
    },
    onSuccess: () => {
      toast.success("Iris is back on duty");
      invalidateIris();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Iris could not be resumed"));
    },
  });

  const integrationsQuery = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId },
      enabled: isReady,
    })
  );

  const githubConnected = (integrationsQuery.data?.integrations ?? []).some(
    (integration) => integration.type === "github" && integration.enabled
  );

  const readiness = buildIrisReadiness({
    organizationSlug,
    slackReady: overview?.slackReady ?? false,
    githubConnected,
  });

  const content = (() => {
    if (!(isReady && overview)) {
      return <IrisPageSkeleton />;
    }

    if (!overview.enabled) {
      return <IrisUnavailableState />;
    }

    if (!mandate) {
      return (
        <IrisStartState
          isStarting={startMutation.isPending}
          onStart={() => startMutation.mutate()}
          organizationSlug={organizationSlug}
          readiness={readiness}
          slackReady={overview.slackReady}
        />
      );
    }

    return (
      <IrisRunningState
        isBusy={isBusy}
        isRunNowPending={runNowMutation.isPending}
        isStatusPending={pauseMutation.isPending || resumeMutation.isPending}
        mandate={mandate}
        onLoadMoreRuns={() => runsQuery.fetchNextPage()}
        onPause={() => setPauseOpen(true)}
        onResume={() => resumeMutation.mutate()}
        onRunNow={() => runNowMutation.mutate()}
        organizationSlug={organizationSlug}
        overview={overview}
        readiness={readiness}
        runs={runs}
        runsState={{
          isPending: runsQuery.isPending,
          isError: runsQuery.isError,
          hasMore: runsQuery.hasNextPage,
          isLoadingMore: runsQuery.isFetchingNextPage,
        }}
        signals={signalsQuery.data ?? []}
        signalsState={{
          isPending: signalsQuery.isPending,
          isError: signalsQuery.isError,
        }}
      />
    );
  })();

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">{content}</div>
      <IrisPauseDialog
        isPausing={pauseMutation.isPending}
        onConfirm={() => pauseMutation.mutate()}
        onOpenChange={setPauseOpen}
        open={pauseOpen}
      />
    </PageContainer>
  );
}
