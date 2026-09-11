"use client";

import { Notra } from "@notra/ui/components/ui/svgs/notra";
import { tween } from "@notra/ui/lib/motion";
import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";

import { ChartDownloadButton } from "@/components/charts/chart-download-button";
import {
  CHART_MARK_LIVE_DARK_OPACITY,
  CHART_MARK_LIVE_OPACITY,
} from "@/constants/chart-download";
import { cn } from "@/lib/utils";
import type { EChartsPlotFrameProps } from "@/types/charts";

const MARK_OPACITY_STYLE = {
  "--chart-mark-opacity": CHART_MARK_LIVE_OPACITY,
  "--chart-mark-opacity-dark": CHART_MARK_LIVE_DARK_OPACITY,
} as CSSProperties;

const HOVER_FADE =
  "opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-hover/chart:opacity-100 group-focus-within/chart:opacity-100 motion-reduce:transition-none";

const EXPORT_REVEAL =
  "pointer-events-none opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-hover/chart:opacity-100 group-focus-within/chart:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 group-hover/chart:pointer-events-auto group-focus-within/chart:pointer-events-auto motion-reduce:transition-none";

function ChartPlotChrome() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] hidden @min-[12rem]:block">
      <div
        aria-hidden="true"
        className={cn("flex h-full items-center justify-center", HOVER_FADE)}
        style={MARK_OPACITY_STYLE}
      >
        <Notra className="h-[42%] max-h-40 w-auto [opacity:var(--chart-mark-opacity)] dark:[opacity:var(--chart-mark-opacity-dark)] [&_path]:stroke-current" />
      </div>
      <div className={cn("absolute top-1 right-1", EXPORT_REVEAL)}>
        <ChartDownloadButton className="bg-background/80 hover:bg-background" />
      </div>
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
            <div className="border-border border-t-primary h-3 w-3 animate-spin rounded-full border" />
            <span>Loading</span>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
