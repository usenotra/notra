"use client";

import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useId } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { IrisReadinessList } from "@/components/iris/iris-readiness-list";
import { IrisRunCard } from "@/components/iris/iris-run-card";
import { IrisSignalsList } from "@/components/iris/iris-signals-list";
import { IrisStatsRow } from "@/components/iris/iris-stats";
import { EMPTY_STATE_CARD_COUNT } from "@/constants/empty-state";
import { cn } from "@/lib/utils";
import type { IrisRunningStateProps } from "@/types/iris";

export function IrisRunningState({
  organizationSlug,
  overview,
  mandate,
  readiness,
  runs,
  signals,
  runsState,
  signalsState,
  isBusy,
  isRunNowPending,
  isStatusPending,
  onLoadMoreRuns,
  onRunNow,
  onPause,
  onResume,
}: IrisRunningStateProps) {
  const t = useTranslations("iris.running");
  const tIrisShared = useTranslations("iris.shared");
  const tCommon = useTranslations("common");
  const skeletonId = useId();
  const isRevoked = mandate.status === "revoked";
  const isPaused = mandate.status !== "active";
  const statusLabel = (() => {
    if (isRevoked) {
      return t("status.retired");
    }
    if (isPaused) {
      return tIrisShared("irisIsPaused");
    }
    return isBusy ? t("status.working") : tIrisShared("irisIsOnDuty");
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Iris</h1>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="relative flex size-2">
              {isPaused ? null : (
                <span className="bg-success/60 absolute inline-flex size-full animate-ping rounded-full" />
              )}
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  isPaused ? "bg-muted-foreground/50" : "bg-success"
                )}
              />
            </span>
            {statusLabel}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={isBusy || isPaused}
            loading={isRunNowPending}
            onClick={onRunNow}
            variant="outline"
          >
            {tCommon("labels.runNow")}
          </Button>
          <Button
            disabled={isRevoked}
            loading={isStatusPending}
            onClick={isPaused ? onResume : onPause}
            variant={isPaused ? "default" : "outline"}
          >
            <HugeiconsIcon
              className="size-4"
              icon={isPaused ? PlayIcon : PauseIcon}
            />
            {isPaused ? tCommon("labels.resume") : tCommon("labels.pause")}
          </Button>
        </div>
      </div>

      <IrisStatsRow stats={overview.stats} />

      {readiness.every((item) => item.ready) ? null : (
        <IrisReadinessList items={readiness} />
      )}

      <Tabs defaultValue="activity">
        <TabsList variant="line">
          <TabsTrigger value="activity">
            {tCommon("labels.activity")}
          </TabsTrigger>
          <TabsTrigger value="signals">{t("tabs.signals")}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-3" value="activity">
          {runsState.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  className="h-36 w-full rounded-xl"
                  key={`${skeletonId}-run-${index + 1}`}
                />
              ))}
            </div>
          ) : null}

          {!runsState.isPending && runsState.isError && runs.length === 0 ? (
            <EmptyState
              description={t("activityUnavailable.description")}
              title={t("activityUnavailable.title")}
            />
          ) : null}

          {!(runsState.isPending || runsState.isError) && runs.length === 0 ? (
            <EmptyState
              description={t("noRuns.description")}
              preview={
                <EmptyStateCardsPreview
                  count={EMPTY_STATE_CARD_COUNT.run}
                  variant="run"
                />
              }
              title={t("noRuns.title")}
            />
          ) : null}

          {runs.map((run) => (
            <IrisRunCard
              key={run.id}
              organizationSlug={organizationSlug}
              run={run}
            />
          ))}

          {runsState.hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                loading={runsState.isLoadingMore}
                onClick={onLoadMoreRuns}
                variant="outline"
              >
                {tCommon("actions.loadMore")}
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent className="mt-4" value="signals">
          {signalsState.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  className="h-12 w-full rounded-xl"
                  key={`${skeletonId}-signal-${index + 1}`}
                />
              ))}
            </div>
          ) : null}
          {!signalsState.isPending && signalsState.isError ? (
            <EmptyState
              description={t("signalsUnavailable.description")}
              title={t("signalsUnavailable.title")}
            />
          ) : null}
          {signalsState.isPending || signalsState.isError ? null : (
            <IrisSignalsList signals={signals} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
