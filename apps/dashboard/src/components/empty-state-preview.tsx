"use client";

import { Card, CardHeader } from "@notra/ui/components/ui/card";
import { useId } from "react";

import {
  EMPTY_STATE_CARD_COUNT,
  EMPTY_STATE_CARD_KEYS,
  EMPTY_STATE_CHART_BARS,
  EMPTY_STATE_COLUMN_KEYS,
  EMPTY_STATE_GUIDELINE_ASSET_KEYS,
  EMPTY_STATE_GUIDELINE_COLOR_KEYS,
  EMPTY_STATE_READINESS_ISSUE_COUNT,
  EMPTY_STATE_READINESS_SCORE_PERCENT,
  EMPTY_STATE_READINESS_TIER_KEYS,
  EMPTY_STATE_ROW_KEYS,
  EMPTY_STATE_SKILL_CARD_LAYOUTS,
  EMPTY_STATE_STAT_KEYS,
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
  EMPTY_STATE_TRAFFIC_STAT_COUNT,
} from "@/constants/empty-state";
import { cn } from "@/lib/utils";
import type {
  EmptyStateCardsPreviewProps,
  EmptyStateCardsPreviewVariant,
  EmptyStateTablePreviewProps,
} from "@/types/components/empty-state";

const ROW_SCALE = [1, 0.74, 0.9, 0.62, 0.84, 0.7] as const;

function GhostBar({
  className,
  width,
}: {
  className?: string;
  width?: number | string;
}) {
  return (
    <div
      className={cn("bg-muted-foreground/20 h-3.5 rounded-md", className)}
      style={width === undefined ? undefined : { width }}
    />
  );
}

function scaledWidth(base: number, row: number, column: number) {
  const scale = ROW_SCALE[row % ROW_SCALE.length] ?? 1;
  const columnNudge = 1 - (column % 3) * 0.08;
  return Math.max(28, Math.round(base * scale * columnNudge));
}

export function EmptyStateTablePreview({
  columns,
  rows = 6,
}: EmptyStateTablePreviewProps) {
  const id = useId();
  return (
    <div className="border-border/80 border-b-border/40 bg-muted/80 overflow-hidden rounded-lg border shadow-2xs">
      <div className="border-border/60 bg-muted/80 flex items-center gap-4 border-b px-4 py-2.5">
        {columns.map((width, column) => {
          const columnKey = EMPTY_STATE_COLUMN_KEYS[column];
          if (!columnKey) {
            return null;
          }
          return (
            <GhostBar
              className="h-3"
              key={`${id}-header-${columnKey}`}
              width={Math.round(width * 0.7)}
            />
          );
        })}
      </div>
      {EMPTY_STATE_ROW_KEYS.slice(0, rows).map((rowKey, row) => (
        <div
          className="border-border/60 bg-background flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
          key={`${id}-${rowKey}`}
        >
          {columns.map((width, column) => {
            const columnKey = EMPTY_STATE_COLUMN_KEYS[column];
            if (!columnKey) {
              return null;
            }
            return (
              <GhostBar
                className="h-4"
                key={`${id}-${rowKey}-${columnKey}`}
                width={scaledWidth(width, row, column)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ContentCardGhost() {
  return (
    <div className="border-border/80 border-b-border/40 bg-muted/80 flex h-[8.75rem] flex-col gap-1.5 rounded-xl border p-1.5 shadow-2xs">
      <div className="border-border/60 bg-background flex flex-1 flex-col gap-2 rounded-lg border px-3 pt-3 pb-3">
        <GhostBar className="h-4" width="68%" />
        <div className="flex-1 space-y-2">
          <GhostBar className="h-2.5 w-full" />
          <GhostBar className="h-2.5 w-4/5" />
          <GhostBar className="h-2.5 w-2/5" />
        </div>
      </div>
      <div className="flex gap-1.5 px-1 pb-0.5">
        <GhostBar className="h-5 w-12 rounded-full" />
        <GhostBar className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

function SkillCardGhost({ index }: { index: number }) {
  const layout =
    EMPTY_STATE_SKILL_CARD_LAYOUTS[
      index % EMPTY_STATE_SKILL_CARD_LAYOUTS.length
    ];

  if (!layout) {
    return null;
  }

  return (
    <Card className="h-full min-h-[9.5rem] gap-3">
      <CardHeader>
        <GhostBar className="h-5 rounded-md" width={layout.title} />
        <div className="space-y-2 pt-1">
          {layout.lines.map((line) => (
            <GhostBar className="h-3.5" key={line.key} width={line.width} />
          ))}
        </div>
        <GhostBar className="mt-2 h-3" width={layout.date} />
      </CardHeader>
    </Card>
  );
}

function ReferenceCardGhost() {
  return (
    <div className="border-border/80 bg-card flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div className="bg-muted-foreground/20 size-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <GhostBar className="h-3.5 w-28" />
          <GhostBar className="h-3 w-16" />
        </div>
      </div>
      <GhostBar className="h-3.5 w-full" />
      <GhostBar className="h-3.5 w-5/6" />
      <GhostBar className="h-3.5 w-2/3" />
    </div>
  );
}

function RunCardGhost() {
  return (
    <div className="border-border space-y-4 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <GhostBar className="h-5 w-16 rounded-full" />
        <GhostBar className="h-5 w-20 rounded-full" />
        <GhostBar className="ml-auto h-3 w-16" />
      </div>
      <div className="space-y-2">
        <GhostBar className="h-4 w-3/4" />
        <GhostBar className="h-3 w-full" />
        <GhostBar className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function IntegrationCardGhost() {
  return (
    <div className="border-border/80 bg-card flex items-center gap-3 rounded-xl border p-4">
      <div className="bg-muted-foreground/20 size-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <GhostBar className="h-4 w-36" />
        <GhostBar className="h-3 w-52" />
      </div>
      <GhostBar className="h-6 w-16 rounded-full" />
    </div>
  );
}

function AnalyticsChartGhost({ bars }: { bars: readonly number[] }) {
  return (
    <div className="border-border/80 bg-card rounded-2xl border p-4">
      <GhostBar className="h-4 w-24" />
      <GhostBar className="mt-2 h-3 w-40" />
      <div className="mt-5 flex h-32 items-end gap-1.5">
        {bars.map((height) => (
          <div
            className="bg-muted-foreground/20 flex-1 rounded-sm"
            key={`bar-${height}`}
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}

export function EmptyStateTrendPreview() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground h-full w-full"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 1200 320"
    >
      <g
        className="text-border"
        stroke="currentColor"
        strokeDasharray="3 3"
        strokeWidth="1"
      >
        <path d="M48 32H1176" />
        <path d="M48 96H1176" />
        <path d="M48 160H1176" />
        <path d="M48 224H1176" />
        <path d="M48 288H1176" />
      </g>
      <path
        d="M48 237C100 224 134 188 189 196C244 204 277 173 330 181C383 189 418 139 471 151C524 163 559 128 612 137C665 146 700 97 753 112C806 127 841 91 894 102C947 113 982 69 1035 83C1088 97 1123 61 1176 72V288H48Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="none"
      />
      <path
        d="M48 237C100 224 134 188 189 196C244 204 277 173 330 181C383 189 418 139 471 151C524 163 559 128 612 137C665 146 700 97 753 112C806 127 841 91 894 102C947 113 982 69 1035 83C1088 97 1123 61 1176 72"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M48 273C101 266 135 240 189 247C243 254 277 224 330 232C383 240 418 204 471 215C524 226 559 195 612 202C665 209 700 175 753 184C806 193 841 160 894 171C947 182 982 147 1035 157C1088 167 1123 137 1176 145"
        stroke="currentColor"
        strokeLinecap="round"
        strokeOpacity="0.58"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M48 257C101 248 135 258 189 238C243 218 277 227 330 207C383 187 418 202 471 178C524 154 559 173 612 151C665 129 700 148 753 128C806 108 841 123 894 103C947 83 982 101 1035 81C1088 61 1123 76 1176 55"
        stroke="currentColor"
        strokeLinecap="round"
        strokeOpacity="0.34"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="text-border"
        d="M48 257L1176 91"
        stroke="currentColor"
        strokeDasharray="5 5"
        strokeLinecap="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function EmptyStateAnalyticsPreview() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {EMPTY_STATE_STAT_KEYS.map((key) => (
          <div
            className="border-border/80 bg-card flex flex-col justify-center gap-2 rounded-xl border p-4"
            key={key}
          >
            <GhostBar className="h-3 w-20" />
            <GhostBar className="h-7 w-16" />
            <GhostBar className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnalyticsChartGhost bars={EMPTY_STATE_CHART_BARS} />
        </div>
        <AnalyticsChartGhost bars={EMPTY_STATE_CHART_BARS.slice(3, 11)} />
      </div>
    </div>
  );
}

export function EmptyStateTrafficPreview() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {EMPTY_STATE_STAT_KEYS.slice(0, EMPTY_STATE_TRAFFIC_STAT_COUNT).map(
          (key) => (
            <div
              className="border-border/80 bg-card flex flex-col justify-center gap-2 rounded-xl border p-4"
              key={key}
            >
              <GhostBar className="h-3 w-16" />
              <GhostBar className="h-7 w-12" />
              <GhostBar className="h-3 w-24" />
            </div>
          )
        )}
      </div>
      <EmptyStateTablePreview
        columns={EMPTY_STATE_TABLE_COLUMNS.traffic}
        rows={EMPTY_STATE_TABLE_ROWS}
      />
    </div>
  );
}

export function EmptyStateGuidelinesPreview() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {EMPTY_STATE_GUIDELINE_ASSET_KEYS.map((key) => (
          <div
            className="border-border/80 bg-card overflow-hidden rounded-xl border"
            key={key}
          >
            <div className="bg-muted/50 flex h-28 items-center justify-center">
              <div className="bg-muted-foreground/20 size-12 rounded-lg" />
            </div>
            <div className="space-y-2 p-3">
              <GhostBar className="h-3.5 w-24" />
              <GhostBar className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {EMPTY_STATE_GUIDELINE_COLOR_KEYS.map((key) => (
          <div
            className="border-border/80 bg-card flex items-center gap-3 rounded-xl border p-3"
            key={key}
          >
            <div className="bg-muted-foreground/20 size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <GhostBar className="h-3.5 w-24" />
              <GhostBar className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCardGridClass(
  variant: EmptyStateCardsPreviewVariant,
  columns?: 2 | 3
) {
  if (columns === 2) {
    return "grid-cols-1 sm:grid-cols-2";
  }
  if (columns === 3) {
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  }
  if (variant === "run" || variant === "integration") {
    return "grid-cols-1";
  }
  if (variant === "reference") {
    return "grid-cols-1 sm:grid-cols-2";
  }
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

export function EmptyStateCardsPreview({
  variant = "content",
  count,
  columns,
}: EmptyStateCardsPreviewProps) {
  const id = useId();
  const resolvedCount = count ?? EMPTY_STATE_CARD_COUNT[variant];

  return (
    <div
      className={cn(
        "grid",
        variant === "skill" ? "gap-4" : "gap-3",
        getCardGridClass(variant, columns)
      )}
    >
      {EMPTY_STATE_CARD_KEYS.slice(0, resolvedCount).map((cardKey, index) => {
        if (variant === "skill") {
          return <SkillCardGhost index={index} key={`${id}-${cardKey}`} />;
        }
        if (variant === "reference") {
          return <ReferenceCardGhost key={`${id}-${cardKey}`} />;
        }
        if (variant === "run") {
          return <RunCardGhost key={`${id}-${cardKey}`} />;
        }
        if (variant === "integration") {
          return <IntegrationCardGhost key={`${id}-${cardKey}`} />;
        }
        return <ContentCardGhost key={`${id}-${cardKey}`} />;
      })}
    </div>
  );
}

export function EmptyStateReadinessPreview() {
  return (
    <div className="h-80 space-y-3 overflow-hidden">
      <div className="border-border/80 bg-card flex flex-col gap-4 rounded-2xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <GhostBar className="h-8 w-24" />
            <GhostBar className="h-3 w-32" />
          </div>
          <GhostBar className="h-7 w-20 rounded-lg" />
        </div>
        <div className="bg-muted-foreground/10 h-2 w-full overflow-hidden rounded-full">
          <GhostBar
            className="h-2 rounded-full"
            width={EMPTY_STATE_READINESS_SCORE_PERCENT}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {EMPTY_STATE_READINESS_TIER_KEYS.map((key) => (
            <div
              className="border-border/80 bg-muted/40 flex flex-col gap-2 rounded-xl border p-4"
              key={key}
            >
              <GhostBar className="h-3 w-16" />
              <GhostBar className="h-5 w-14" />
              <GhostBar className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="border-border/80 bg-card overflow-hidden rounded-2xl border">
        <div className="border-border/60 space-y-2 border-b px-5 py-4">
          <GhostBar className="h-4 w-24" />
          <GhostBar className="h-3 w-56" />
        </div>
        <div className="divide-border/60 divide-y">
          {EMPTY_STATE_ROW_KEYS.slice(0, EMPTY_STATE_READINESS_ISSUE_COUNT).map(
            (key) => (
              <div className="space-y-2 px-5 py-4" key={key}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GhostBar className="h-4 w-12 rounded-full" />
                    <GhostBar className="h-4 w-16 rounded-full" />
                    <GhostBar className="h-4 w-32" />
                  </div>
                  <GhostBar className="h-6 w-28 rounded-lg" />
                </div>
                <GhostBar className="h-3 w-3/4" />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
