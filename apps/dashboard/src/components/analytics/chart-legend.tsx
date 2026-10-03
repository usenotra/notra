"use client";

import { useId, useMemo } from "react";

import { buildChartCss } from "@/components/evilcharts/ui/echarts-chart";
import { cn } from "@/lib/utils";
import type { ChartSeriesLegendProps } from "@/types/analytics";

export function ChartSeriesLegend({
  config,
  orderedKeys,
  hiddenKeys,
  onToggle,
}: ChartSeriesLegendProps) {
  const rawId = useId();
  const legendId = `legend-${rawId.replace(/:/g, "")}`;
  const css = useMemo(
    () => buildChartCss(legendId, config),
    [legendId, config]
  );

  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5"
      data-chart={legendId}
    >
      <style>{css}</style>
      {orderedKeys.map((key) => {
        const entry = config[key];
        if (!entry) {
          return null;
        }
        const hidden = hiddenKeys.has(key);
        return (
          <button
            aria-pressed={!hidden}
            className={cn(
              "flex max-w-full min-w-0 cursor-pointer items-center gap-1.5 font-mono text-[0.6875rem] transition-opacity",
              hidden
                ? "opacity-40 hover:opacity-70"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={key}
            onClick={() => onToggle(key)}
            type="button"
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-[0.0625rem]",
                hidden && "opacity-50"
              )}
              style={{ backgroundColor: `var(--color-${key}-0)` }}
            />
            <span
              className={cn("min-w-0 truncate", hidden && "line-through")}
              title={typeof entry.label === "string" ? entry.label : key}
            >
              {entry.label ?? key}
            </span>
          </button>
        );
      })}
    </div>
  );
}
