"use client";

import { CompetitorLogo } from "@notra/ui/components/geo/competitor-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { cn } from "@notra/ui/lib/utils";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { ReportPanel } from "@/components/state-of-ai-search/report-section";
import { LOGO_OUTLINE } from "@/components/state-of-ai-search/report-ui";
import type { StateOfAiSearchRankingRow } from "@/types/state-of-ai-search";
import { formatPercent } from "@/utils/state-of-ai-search";

const PERCENT_MAX = 100;
const X_TICKS = [0, 25, 50, 75, 100] as const;
const Y_TICK_COUNT = 4;
/** The named-first axis rounds its top up to this step. */
const Y_STEP = 10;
/** Logo edge in pixels, smaller on narrow plots so crowds stay readable. */
const LOGO_SIZE = 28;
const LOGO_SIZE_COMPACT = 22;
const COMPACT_PLOT_WIDTH = 480;
/** On narrow plots only the leaders get a logo; everyone else is a dot. */
const COMPACT_LOGO_RANKS = 5;
const DOT_SIZE = 10;
/** Space kept between logos that had to move apart. */
const LOGO_GAP = 3;

interface Point {
  row: StateOfAiSearchRankingRow;
  /** Pixels from the plot's left edge. */
  left: number;
  /** Pixels from the plot's bottom edge. */
  bottom: number;
  size: number;
}

/**
 * Logos keep their exact height and only move sideways, just enough to stop
 * overlapping. Each crowd is then shifted back so its centre stays where the
 * data put it.
 */
function placePoints(
  rows: StateOfAiSearchRankingRow[],
  yMax: number,
  width: number,
  height: number,
  sizeOf: (row: StateOfAiSearchRankingRow) => number
): Point[] {
  const sorted = rows
    .map((row) => ({
      row,
      size: sizeOf(row),
      origin: (row.visibility / PERCENT_MAX) * width,
      left: (row.visibility / PERCENT_MAX) * width,
      bottom: (row.topPick / yMax) * height,
    }))
    .toSorted((a, b) => a.origin - b.origin);

  const crowds: (typeof sorted)[] = [];
  for (const point of sorted) {
    const blockers = crowds
      .flat()
      .filter(
        (placed) =>
          Math.abs(placed.bottom - point.bottom) <
          (placed.size + point.size) / 2
      );
    const minLeft = Math.max(
      ...blockers.map(
        (placed) => placed.left + (placed.size + point.size) / 2 + LOGO_GAP
      ),
      Number.NEGATIVE_INFINITY
    );
    if (minLeft > point.left) {
      point.left = minLeft;
      const crowd = crowds.find((members) =>
        members.some((member) => blockers.includes(member))
      );
      crowd?.push(point);
      if (crowd) {
        continue;
      }
    }
    crowds.push([point]);
  }

  return crowds.flatMap((members) => {
    const drift =
      members.reduce((sum, member) => sum + member.left - member.origin, 0) /
      members.length;
    const first = members[0];
    const last = members.at(-1);
    const minShift = last ? last.left - (width - last.size / 2) : 0;
    const maxShift = first ? first.left - first.size / 2 : 0;
    // Recentre, but keep the whole crowd inside the plot.
    const shift = Math.min(Math.max(drift, minShift), maxShift);
    return members.map(({ row, left, bottom, size }) => ({
      row,
      left: left - shift,
      bottom,
      size,
    }));
  });
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

function PointTooltip({ row }: { row: StateOfAiSearchRankingRow }) {
  return (
    <span className="flex min-w-44 flex-col gap-1.5 py-0.5">
      <span className="font-medium">
        #{row.rank} {row.name}
      </span>
      <span className="flex justify-between gap-4 opacity-70">
        Named in
        <span className="font-medium tabular-nums opacity-100">
          {formatPercent(row.visibility)}
        </span>
      </span>
      <span className="flex justify-between gap-4 opacity-70">
        Named first in
        <span className="font-medium tabular-nums opacity-100">
          {formatPercent(row.topPick)}
        </span>
      </span>
    </span>
  );
}

/** Faint label in a corner of the plot, naming what that corner means. */
function Corner({ className, label }: { className: string; label: string }) {
  return (
    <span
      className={cn(
        "text-muted-foreground/70 pointer-events-none absolute hidden text-xs sm:block",
        className
      )}
    >
      {label}
    </span>
  );
}

/**
 * Every brand by how often it is named (right) against how often it is named
 * first (up): the top right is the default pick, the bottom right the brand
 * that comes up but rarely leads.
 */
export function VisibilityScatter({
  rows,
  onSelect,
}: {
  rows: StateOfAiSearchRankingRow[];
  onSelect: (row: StateOfAiSearchRankingRow) => void;
}) {
  const [plotRef, plot] = useElementSize<HTMLDivElement>();
  const topPickMax = Math.max(...rows.map((row) => row.topPick), 0);
  const yMax = Math.max(Y_STEP, Math.ceil(topPickMax / Y_STEP) * Y_STEP);
  const yTicks = Array.from(
    { length: Y_TICK_COUNT + 1 },
    (_, index) => (yMax / Y_TICK_COUNT) * index
  );
  const compact = plot.width < COMPACT_PLOT_WIDTH;
  const sizeOf = (row: StateOfAiSearchRankingRow) => {
    if (!compact) {
      return LOGO_SIZE;
    }
    return row.rank <= COMPACT_LOGO_RANKS ? LOGO_SIZE_COMPACT : DOT_SIZE;
  };
  // Lower ranks paint first, so the leaders sit on top where logos touch.
  const points =
    plot.width > 0
      ? placePoints(rows, yMax, plot.width, plot.height, sizeOf).toSorted(
          (a, b) => b.row.rank - a.row.rank
        )
      : [];

  return (
    <ReportPanel
      footer={
        <div className="text-muted-foreground flex h-10 items-center justify-between px-4 text-sm font-medium">
          <span>← Named less</span>
          <span>Named more often →</span>
        </div>
      }
      header={
        <>
          <span>Named first ↑</span>
          <span className="ml-auto text-xs font-normal">
            Click a logo for details
          </span>
        </>
      }
    >
      <div className="relative h-[22rem] pt-6 pr-6 pb-10 pl-12 sm:h-[26rem]">
        <div className="relative size-full" ref={plotRef}>
          {X_TICKS.map((tick) => (
            <span
              className="border-border/60 absolute inset-y-0 left-(--tick) border-l border-dashed"
              key={`x-${tick}`}
              style={{ "--tick": `${tick}%` } as CSSProperties}
            >
              <span className="text-muted-foreground absolute -bottom-8 -translate-x-1/2 text-xs tabular-nums">
                {tick}%
              </span>
            </span>
          ))}
          {yTicks.map((tick) => (
            <span
              className="border-border/60 absolute inset-x-0 bottom-(--tick) border-t border-dashed"
              key={`y-${tick}`}
              style={
                {
                  "--tick": `${(tick / yMax) * PERCENT_MAX}%`,
                } as CSSProperties
              }
            >
              <span className="text-muted-foreground absolute -left-10 w-8 -translate-y-1/2 text-right text-xs tabular-nums">
                {Math.round(tick)}%
              </span>
            </span>
          ))}

          <Corner className="top-2 right-3" label="Default pick" />
          <Corner className="right-3 bottom-8" label="Named, rarely first" />

          {points.map(({ row, left, bottom, size }) => (
            <Tooltip key={row.name}>
              <TooltipTrigger
                render={
                  <button
                    aria-label={`${row.name}: named in ${formatPercent(row.visibility)}, named first in ${formatPercent(row.topPick)}`}
                    className="focus-visible:outline-ring absolute bottom-(--y) left-(--x) -translate-x-1/2 translate-y-1/2 rounded-md transition-transform duration-150 ease-out hover:z-20 hover:scale-125 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
                    onClick={() => onSelect(row)}
                    style={
                      {
                        "--x": `${left}px`,
                        "--y": `${bottom}px`,
                        "--size": `${size}px`,
                      } as CSSProperties
                    }
                    type="button"
                  />
                }
              >
                {size === DOT_SIZE ? (
                  <span className="bg-muted-foreground/60 ring-card block size-(--size) rounded-full ring-2" />
                ) : (
                  <CompetitorLogo
                    className={cn(
                      LOGO_OUTLINE,
                      "size-(--size) rounded-md bg-white shadow-sm"
                    )}
                    domain={row.domain}
                    name={row.name}
                  />
                )}
              </TooltipTrigger>
              <TooltipContent side="top">
                <PointTooltip row={row} />
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </ReportPanel>
  );
}
