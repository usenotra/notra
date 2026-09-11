"use client";

import { useRef } from "react";

import { ChartDownloadButton } from "@/components/charts/chart-download-button";
import {
  NOTRA_MARK_BLOB_PATH,
  NOTRA_MARK_FILL,
  NOTRA_MARK_SLASH_PATH,
  NOTRA_WORDMARK_HEIGHT,
  NOTRA_WORDMARK_LETTERS_PATH,
  NOTRA_WORDMARK_WIDTH,
} from "@/constants/chart-wordmark";
import { cn } from "@/lib/utils";

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

const HOVER_FADE =
  "opacity-0 transition-opacity duration-200 group-hover/chart:opacity-100 group-focus-within/chart:opacity-100 motion-reduce:transition-none";

export function ChartPlotWordmark() {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] hidden @min-[12rem]:block"
      ref={overlayRef}
    >
      <div
        aria-hidden="true"
        className={cn("flex h-full items-center justify-center", HOVER_FADE)}
      >
        <ChartWordmark className="h-[42%] max-h-40 w-auto opacity-[0.08] dark:opacity-[0.12]" />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute top-1 right-1",
          HOVER_FADE,
          "group-focus-within/chart:pointer-events-auto group-hover/chart:pointer-events-auto"
        )}
      >
        <ChartDownloadButton
          className="bg-background/80 hover:bg-background"
          sourceRef={overlayRef}
        />
      </div>
    </div>
  );
}
