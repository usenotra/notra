"use client";

import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@notra/ui/components/kibo-ui/contribution-graph";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { cn } from "@notra/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import { shortMonthLabels } from "@/lib/i18n/month-labels";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  ContentActivityEntry,
  ContentPublishingMetricsData,
} from "@/types/dashboard";

import { useOrganizationsContext } from "../providers/organization-provider";

export const ContentActivityCard = () => {
  const t = useTranslations("dashboard.contentActivity");
  const tCommon = useTranslations("common");
  const formatter = useFormatter();
  const locale = useLocale();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;

  const { data: metrics, isPending } = useQuery({
    ...dashboardOrpc.content.metrics.get.queryOptions({
      input: { organizationId: organizationId ?? "" },
    }),
    enabled: Boolean(organizationId),
    meta: { errorMessage: t("loadFailed") },
  }) as { data?: ContentPublishingMetricsData; isPending: boolean };

  if (isPending) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  return (
    <div className="border-border/80 bg-background w-full min-w-0 overflow-hidden rounded-lg border px-4 py-3">
      {metrics?.graph.activity ? (
        <ContributionGraph
          blockMargin={3}
          blockSize={13}
          data={metrics.graph.activity}
          fontSize={12}
          labels={{
            months: shortMonthLabels(locale),
            title: tCommon("labels.contentActivity"),
            levelTitle: (level) => t("level", { level }),
            legend: { less: t("legendLess"), more: tCommon("labels.more") },
          }}
        >
          <TooltipProvider>
            <ContributionGraphCalendar>
              {({ activity, dayIndex, weekIndex }) => {
                const entry = activity as unknown as ContentActivityEntry;

                return (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <g>
                          <ContributionGraphBlock
                            activity={activity}
                            className={cn(
                              'data-[level="0"]:fill-muted dark:data-[level="0"]:fill-white/5',
                              'data-[level="1"]:fill-primary/20 dark:data-[level="1"]:fill-primary/30',
                              'data-[level="2"]:fill-primary/40 dark:data-[level="2"]:fill-primary/50',
                              'data-[level="3"]:fill-primary/60 dark:data-[level="3"]:fill-primary/70',
                              'data-[level="4"]:fill-primary/80 dark:data-[level="4"]:fill-primary/90'
                            )}
                            dayIndex={dayIndex}
                            weekIndex={weekIndex}
                          />
                        </g>
                      }
                    />
                    <TooltipContent className="space-y-1.5">
                      <p className="font-semibold">
                        {formatter.dateTime(parseISO(entry.date), {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm font-medium">
                        {tCommon("messages.countPluralOnePostOther", {
                          count: entry.count,
                        })}
                      </p>
                      {entry.count > 0 && (
                        <div className="text-muted-foreground flex gap-3 text-xs">
                          <span>{t("drafts", { count: entry.drafts })}</span>
                          <span>
                            {t("published", { count: entry.published })}
                          </span>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              }}
            </ContributionGraphCalendar>
          </TooltipProvider>
          <ContributionGraphFooter>
            <ContributionGraphTotalCount>
              {({ totalCount }) => (
                <span className="text-muted-foreground text-sm">
                  {t.rich("yearSummary", {
                    total: formatter.number(totalCount),
                    drafts: formatter.number(metrics.drafts),
                    draftCount: metrics.drafts,
                    published: formatter.number(metrics.published),
                    strong: (chunks) => (
                      <span className="text-foreground font-semibold">
                        {chunks}
                      </span>
                    ),
                  })}
                </span>
              )}
            </ContributionGraphTotalCount>
            <ContributionGraphLegend>
              {({ level }) => (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div
                        className={cn(
                          "border-border h-3 w-3 rounded-sm border",
                          level === 0 && "bg-muted dark:bg-white/5",
                          level === 1 && "bg-primary/20 dark:bg-primary/30",
                          level === 2 && "bg-primary/40 dark:bg-primary/50",
                          level === 3 && "bg-primary/60 dark:bg-primary/70",
                          level === 4 && "bg-primary/80 dark:bg-primary/90"
                        )}
                      />
                    }
                  />
                  <TooltipContent>{t("level", { level })}</TooltipContent>
                </Tooltip>
              )}
            </ContributionGraphLegend>
          </ContributionGraphFooter>
        </ContributionGraph>
      ) : (
        <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
          {t("empty")}
        </div>
      )}
    </div>
  );
};

export { ContentActivityCard as PublishingActivityCard };
