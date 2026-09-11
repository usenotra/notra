"use client";

import { tween } from "@notra/ui/lib/motion";
import { motion, useReducedMotion } from "motion/react";

import { ChartPlotWordmark } from "@/components/charts/chart-wordmark";
import { cn } from "@/lib/utils";
import type { EChartsPlotFrameProps } from "@/types/charts";

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
        <ChartPlotWordmark />
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
