"use client";

import { Spinner } from "@notra/ui/components/ui/spinner";
import { tween } from "@notra/ui/lib/motion";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "use-intl";

import { ChartDownloadButton } from "@/components/charts/chart-download-button";
import { cn } from "@/lib/utils";
import type { EChartsPlotFrameProps } from "@/types/charts";

const EXPORT_REVEAL =
  "pointer-events-none opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-hover/chart:opacity-100 group-focus-within/chart:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 group-hover/chart:pointer-events-auto group-focus-within/chart:pointer-events-auto motion-reduce:transition-none";

// The Notra watermark only goes into the downloaded PNG (utils/chart-download).
function ChartPlotChrome() {
  return (
    <div
      className={cn(
        "absolute top-1 right-1 z-[1] hidden @min-[12rem]:block",
        EXPORT_REVEAL
      )}
    >
      <ChartDownloadButton className="bg-background/80 hover:bg-background" />
    </div>
  );
}

export function EChartsPlotFrame({
  chartId,
  className,
  containerRef,
  css,
  isLoading,
  mountRef,
  plotBefore,
  children,
}: EChartsPlotFrameProps) {
  const tCommon = useTranslations("common");
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn("group/chart relative flex flex-col text-xs", className)}
      data-chart={chartId}
      ref={containerRef}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="@container relative min-h-0 w-full flex-1">
        {plotBefore}
        <div className="relative h-full min-h-0 w-full" ref={mountRef} />
        {isLoading ? null : <ChartPlotChrome />}
      </div>
      {children}
      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background text-primary flex items-center justify-center gap-2 rounded-md border px-2 py-0.5 text-sm"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.92 }}
            transition={tween("slow")}
          >
            <Spinner className="size-3" />
            <span>{tCommon("states.loading")}</span>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
