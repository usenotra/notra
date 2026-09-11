"use client";

import type { CSSProperties } from "react";
import { useRef } from "react";

import { ChartDownloadButton } from "@/components/charts/chart-download-button";
import {
  CHART_WORDMARK_LIVE_DARK_OPACITY,
  CHART_WORDMARK_LIVE_OPACITY,
  NOTRA_MARK_BLOB_PATH,
  NOTRA_MARK_FILL,
  NOTRA_MARK_SLASH_PATH,
  NOTRA_WORDMARK_HEIGHT,
  NOTRA_WORDMARK_LETTERS_PATH,
  NOTRA_WORDMARK_WIDTH,
} from "@/constants/chart-wordmark";
import { cn } from "@/lib/utils";

const WORDMARK_OPACITY_STYLE = {
  "--chart-wordmark-opacity": CHART_WORDMARK_LIVE_OPACITY,
  "--chart-wordmark-opacity-dark": CHART_WORDMARK_LIVE_DARK_OPACITY,
} as CSSProperties;

const WORDMARK_FADE =
  "opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-hover/chart:opacity-100 group-focus-within/chart:opacity-100 motion-reduce:transition-none";

const EXPORT_REVEAL =
  "pointer-events-none opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-hover/chart:opacity-100 group-focus-within/chart:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 group-hover/chart:pointer-events-auto group-focus-within/chart:pointer-events-auto motion-reduce:transition-none";

export function ChartWordmark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("text-foreground", className)}
      fill="none"
      viewBox={`0 0 ${NOTRA_WORDMARK_WIDTH} ${NOTRA_WORDMARK_HEIGHT}`}
    >
      <g transform="translate(40 40) scale(0.25)">
        <path
          d={NOTRA_MARK_BLOB_PATH}
          fill={NOTRA_MARK_FILL}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="35"
        />
        <path
          d={NOTRA_MARK_SLASH_PATH}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="75"
        />
      </g>
      <path d={NOTRA_WORDMARK_LETTERS_PATH} fill="currentColor" />
    </svg>
  );
}

export function ChartPlotWordmark() {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] hidden @min-[12rem]:block"
      ref={overlayRef}
    >
      <div
        aria-hidden="true"
        className={cn("flex h-full items-center justify-center", WORDMARK_FADE)}
        style={WORDMARK_OPACITY_STYLE}
      >
        <ChartWordmark className="h-[42%] max-h-40 w-auto [opacity:var(--chart-wordmark-opacity)] dark:[opacity:var(--chart-wordmark-opacity-dark)]" />
      </div>
      <div className={cn("absolute top-1 right-1", EXPORT_REVEAL)}>
        <ChartDownloadButton
          className="bg-background/80 hover:bg-background"
          sourceRef={overlayRef}
        />
      </div>
    </div>
  );
}
