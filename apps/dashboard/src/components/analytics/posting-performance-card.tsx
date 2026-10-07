"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@notra/ui/components/instrument/instrument-module";
import { Button } from "@notra/ui/components/ui/button";
import { SPRING } from "@notra/ui/lib/motion";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "use-intl";

import { CursorTooltip } from "@/components/analytics/cursor-tooltip";
import { POSTING_ACTIVITY_BAR_CLASSES } from "@/constants/analytics";
import {
  DAY_MS,
  WEEKDAY_REFERENCE_MONDAY_UTC,
} from "@/constants/analytics-weekdays";
import { useFormatMetric } from "@/lib/hooks/use-format-metric";
import { cn } from "@/lib/utils";
import type {
  CursorTipState,
  PostingPerformanceCardProps,
} from "@/types/analytics";
import {
  buildPostingHeatmap,
  buildPostingTimeSlots,
  cursorTipPosition,
  findBestPostingSlot,
  formatHourRange,
  postingSlotHeightPercent,
  timezoneAbbreviation,
  WEEKDAY_LABELS,
} from "@/utils/analytics-charts";

const PANEL_SLIDE = 24;
export function PostingPerformanceCard({
  points,
  action,
}: PostingPerformanceCardProps) {
  const t = useTranslations("analytics.postingPerformance");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const formatMetric = useFormatMetric();
  const format = useFormatter();
  const weekdayLabel = (index: number) =>
    format.dateTime(new Date(WEEKDAY_REFERENCE_MONDAY_UTC + index * DAY_MS), {
      weekday: "short",
      timeZone: "UTC",
    });
  const postsDetail = (posts: number) =>
    posts > 0
      ? ` · ${tCommon("messages.countPluralOnePostOther", { count: posts })}`
      : "";
  const reduceMotion = useReducedMotion();
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [tip, setTip] = useState<CursorTipState | null>(null);

  const heatmap = useMemo(() => buildPostingHeatmap(points), [points]);
  const slots = useMemo(
    () => buildPostingTimeSlots(points, selectedWeekday),
    [points, selectedWeekday]
  );
  const best = useMemo(
    () => findBestPostingSlot(points, selectedWeekday),
    [points, selectedWeekday]
  );

  const hasData = points.some((point) => point.posts > 0);
  const maxAvgEngagement = slots.reduce(
    (max, slot) => Math.max(max, slot.avgEngagement),
    0
  );
  const selectedLabel =
    selectedWeekday === null ? null : weekdayLabel(selectedWeekday - 1);
  const bestWeekdayLabel = best
    ? weekdayLabel(WEEKDAY_LABELS.indexOf(best.weekday))
    : "";
  const direction = selectedWeekday === null ? -1 : 1;
  const slide = reduceMotion ? 0 : PANEL_SLIDE;

  return (
    <InstrumentModule
      action={action}
      description={t("description")}
      eyebrow={t("title")}
      variant="panel"
    >
      {hasData ? (
        <LazyMotion features={domAnimation}>
          <div className="relative h-56">
            <m.div
              animate={{ x: 0, opacity: 1 }}
              className="flex h-full flex-col justify-center gap-4"
              initial={
                reduceMotion ? false : { x: direction * slide, opacity: 0 }
              }
              key={selectedWeekday === null ? "week" : "day"}
              transition={SPRING.snappy}
            >
              {selectedWeekday === null ? (
                <>
                  {best && (
                    <div>
                      <p className="font-mono text-xl tracking-tight tabular-nums">
                        {bestWeekdayLabel} {formatHourRange(best.hour)}
                        <span className="text-muted-foreground ml-2 text-sm">
                          {timezoneAbbreviation(locale)}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t("highestEngagement", {
                          value: formatMetric(best.avgEngagement),
                        })}
                      </p>
                    </div>
                  )}
                  <div>
                    <div
                      className="flex cursor-pointer flex-col gap-1"
                      onPointerLeave={() => setTip(null)}
                      onPointerMove={(event) =>
                        setTip((previous) =>
                          previous
                            ? { ...previous, ...cursorTipPosition(event) }
                            : previous
                        )
                      }
                    >
                      {heatmap.map((row, dayIndex) => (
                        <div
                          className="flex items-center gap-2"
                          key={WEEKDAY_LABELS[dayIndex]}
                        >
                          <span className="text-muted-foreground w-7 shrink-0 font-mono text-[0.625rem]">
                            {weekdayLabel(dayIndex)}
                          </span>
                          <div className="flex min-w-0 flex-1 gap-0.5">
                            {row.map((cell) => (
                              <button
                                aria-label={`${weekdayLabel(dayIndex)} ${formatHourRange(cell.hour)}: ${t(`activity.${cell.level}`)}`}
                                className={cn(
                                  "h-3.5 min-w-0 flex-1 cursor-pointer rounded-[0.1875rem]",
                                  POSTING_ACTIVITY_BAR_CLASSES[cell.level]
                                )}
                                key={cell.hour}
                                onClick={() => setSelectedWeekday(cell.weekday)}
                                onPointerMove={(event) =>
                                  setTip({
                                    ...cursorTipPosition(event),
                                    title: `${weekdayLabel(dayIndex)} ${formatHourRange(cell.hour)}`,
                                    detail: `${t(`activity.${cell.level}`)}${postsDetail(cell.posts)}`,
                                  })
                                }
                                type="button"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-muted-foreground mt-1.5 ml-9 flex justify-between font-mono text-[0.6875rem] tabular-nums">
                      <span>0:00</span>
                      <span>12:00</span>
                      <span>24:00</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Button
                      className="cursor-pointer"
                      onClick={() => setSelectedWeekday(null)}
                      size="xs"
                      variant="ghost"
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
                      {t("week")}
                    </Button>
                  </div>
                  {best && (
                    <div>
                      <p className="font-mono text-xl tracking-tight tabular-nums">
                        {selectedLabel} {formatHourRange(best.hour)}
                        <span className="text-muted-foreground ml-2 text-sm">
                          {timezoneAbbreviation(locale)}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t("highestEngagement", {
                          value: formatMetric(best.avgEngagement),
                        })}
                      </p>
                    </div>
                  )}
                  <div>
                    <div
                      className="flex h-14 items-end gap-1"
                      onPointerLeave={() => setTip(null)}
                      onPointerMove={(event) =>
                        setTip((previous) =>
                          previous
                            ? { ...previous, ...cursorTipPosition(event) }
                            : previous
                        )
                      }
                    >
                      {slots.map((slot) => {
                        const isBest = best?.hour === slot.hour;
                        return (
                          <button
                            aria-label={`${formatHourRange(slot.hour)}: ${t(`activity.${slot.level}`)}`}
                            className={cn(
                              "min-w-0 flex-1 rounded-full",
                              isBest &&
                                "ring-ring ring-offset-card ring-2 ring-offset-1"
                            )}
                            key={slot.hour}
                            onPointerMove={(event) =>
                              setTip({
                                ...cursorTipPosition(event),
                                title: formatHourRange(slot.hour),
                                detail: `${t(`activity.${slot.level}`)}${postsDetail(slot.posts)}`,
                              })
                            }
                            style={{
                              height: `${postingSlotHeightPercent(slot.avgEngagement, maxAvgEngagement)}%`,
                            }}
                            type="button"
                          >
                            <span
                              className={cn(
                                "block h-full w-full rounded-full",
                                POSTING_ACTIVITY_BAR_CLASSES[slot.level]
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-muted-foreground mt-1.5 flex justify-between font-mono text-[0.6875rem] tabular-nums">
                      <span>0:00</span>
                      <span>12:00</span>
                      <span>24:00</span>
                    </div>
                  </div>
                </>
              )}
            </m.div>
            <CursorTooltip tip={tip} />
          </div>
        </LazyMotion>
      ) : (
        <InstrumentEmpty
          className="h-56"
          message={t("empty")}
          seed="Best time to post"
        />
      )}
    </InstrumentModule>
  );
}
