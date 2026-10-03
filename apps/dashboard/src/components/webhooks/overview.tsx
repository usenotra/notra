"use client";
import { Delete02Icon, WebhookIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
import type { CSSProperties } from "react";
import { useFormatter, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import {
  WEBHOOK_METRICS,
  WEBHOOK_SPARKLINE_EMPTY_PX,
  WEBHOOK_SPARKLINE_MIN_PERCENT,
} from "@/constants/outbound-webhooks";
import type {
  WebhookEndpointsProps,
  WebhookMetric,
  WebhookMetricsProps,
  WebhookSparklineProps,
} from "@/types/webhooks/outbound";

function WebhookSparkline({ days, series, className }: WebhookSparklineProps) {
  const format = useFormatter();
  const peak = Math.max(1, ...days.map((day) => day[series]));
  return (
    <div aria-hidden className="flex h-6 items-end gap-px">
      {days.map((day) => {
        const value = day[series];
        return (
          <div
            key={day.date}
            title={`${format.dateTime(new Date(`${day.date}T00:00:00Z`), {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}: ${format.number(value)}`}
            className={cn(
              "h-(--bar-height) min-w-0 flex-1 rounded-xs",
              value === 0 ? "bg-muted" : className
            )}
            style={
              {
                "--bar-height":
                  value === 0
                    ? `${WEBHOOK_SPARKLINE_EMPTY_PX}px`
                    : `${Math.max(WEBHOOK_SPARKLINE_MIN_PERCENT, (value / peak) * 100)}%`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

function WebhookActiveState({
  stats,
  value,
}: {
  stats: WebhookMetricsProps["stats"];
  value: number;
}) {
  const t = useTranslations("settings.panes.webhooks");
  if (!stats) {
    return <div className="h-6" />;
  }
  if (value === 0) {
    return (
      <p className="text-muted-foreground/70 mt-auto flex h-6 items-end text-xs">
        {t("idle")}
      </p>
    );
  }
  return (
    <p className="text-warning mt-auto flex h-6 items-end gap-1.5 text-xs">
      <span className="bg-warning mb-1 size-1.5 rounded-full motion-safe:animate-pulse" />
      {t("processing")}
    </p>
  );
}

function WebhookTrace({
  activity,
  series,
  className,
}: Omit<WebhookSparklineProps, "days"> & {
  activity: WebhookMetricsProps["activity"];
}) {
  if (activity === undefined) {
    return <Skeleton className="h-6 w-full" />;
  }
  if (activity === null) {
    return <div className="h-6" />;
  }
  return (
    <WebhookSparkline days={activity} series={series} className={className} />
  );
}

export function WebhookMetrics({ stats, activity }: WebhookMetricsProps) {
  const t = useTranslations("settings.panes.webhooks");
  const format = useFormatter();
  const total = stats?.total ?? 0;
  const hint = (metric: WebhookMetric, value: number) => {
    if (metric.hint === "period") {
      return t("period");
    }
    if (metric.hint === "now") {
      return t("rightNow");
    }
    return total === 0
      ? "–"
      : format.number(value / total, {
          style: "percent",
          maximumFractionDigits: 1,
        });
  };
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {WEBHOOK_METRICS.map((metric) => {
        const value = stats?.[metric.key] ?? 0;
        return (
          <section
            key={metric.key}
            aria-label={t(`metrics.${metric.key}`)}
            className="bg-background flex flex-col gap-3 rounded-xl border p-3.5"
          >
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground truncate">
                {t(`metrics.${metric.key}`)}
              </span>
              {stats ? (
                <span className="text-muted-foreground/70 shrink-0 tabular-nums">
                  {hint(metric, value)}
                </span>
              ) : null}
            </div>
            {stats ? (
              <p className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
                {format.number(value)}
              </p>
            ) : (
              <Skeleton className="h-6 w-16" />
            )}
            {metric.trace ? (
              <WebhookTrace
                activity={activity}
                series={metric.trace.series}
                className={metric.trace.className}
              />
            ) : (
              <WebhookActiveState stats={stats} value={value} />
            )}
          </section>
        );
      })}
    </div>
  );
}

export function WebhookEndpoints({
  endpoints,
  disabled,
  onRemove,
  onCreate,
}: WebhookEndpointsProps) {
  const t = useTranslations("settings.panes.webhooks");
  const tActions = useTranslations("common.actions");
  if (endpoints.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border px-6 py-10 text-center">
        <HugeiconsIcon
          icon={WebhookIcon}
          className="text-muted-foreground mx-auto size-7"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("endpointsEmpty.title")}</p>
          <p className="text-muted-foreground text-xs">
            {t("endpointsEmpty.description")}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onCreate}
        >
          {t("addEndpoint")}
        </Button>
      </div>
    );
  }
  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {endpoints.map((endpoint) => (
        <li key={endpoint.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate font-mono text-xs" title={endpoint.url}>
              {endpoint.url}
            </p>
            <div className="flex flex-wrap gap-1">
              {endpoint.events.map((event) => (
                <Badge key={event} size="sm" variant="secondary">
                  <span className="font-mono">{event}</span>
                </Badge>
              ))}
            </div>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={tActions("remove")}
            disabled={disabled}
            onClick={() => onRemove(endpoint.id)}
          >
            <HugeiconsIcon icon={Delete02Icon} />
          </Button>
        </li>
      ))}
    </ul>
  );
}
