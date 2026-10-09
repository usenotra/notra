"use client";

import { CompetitorLogo } from "@notra/ui/components/geo/competitor-logo";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { cn } from "@notra/ui/lib/utils";
import { type CSSProperties, useState } from "react";

import {
  Brand,
  LOGO_OUTLINE,
  MutedText,
  PercentBar,
} from "@/components/state-of-ai-search/report-ui";
import {
  BRANDS_PAGE_SIZE,
  HEATMAP_LIGHT_TEXT_TINT,
  HEATMAP_MAX_TINT,
  HEATMAP_MIN_TINT,
  PROMPTS_PAGE_SIZE,
  REPORT_ROW_HEIGHT,
} from "@/constants/state-of-ai-search";
import type {
  StateOfAiSearchEngine,
  StateOfAiSearchPromptRow,
  StateOfAiSearchRankingRow,
  StateOfAiSearchSource,
} from "@/types/state-of-ai-search";
import { brandColor, formatPercent } from "@/utils/state-of-ai-search";

/**
 * Tooltips invert the page colors, so themed logos (OpenAI) need the variant
 * of the opposite theme. Themed icons render the light and dark SVG as a
 * pair; single-SVG icons are left alone.
 */
const INVERTED_ICON =
  "inline-flex [&_svg:first-child:not(:last-child)]:!hidden [&_svg:last-child:not(:first-child)]:!block dark:[&_svg:first-child:not(:last-child)]:!block dark:[&_svg:last-child:not(:first-child)]:!hidden";
const BRAND_STACK_LIMIT = 6;

/** Same tint scale as the dashboard's recommendations-by-assistant heatmap. */
function heatTint(rate: number, min: number, max: number): number {
  if (rate <= 0 || max <= 0) {
    return 0;
  }
  const span = max - min;
  const position = span > 0 ? (rate - min) / span : 1;
  return Math.round(
    HEATMAP_MIN_TINT + position * (HEATMAP_MAX_TINT - HEATMAP_MIN_TINT)
  );
}

interface HeatCellDetail {
  brand: StateOfAiSearchRankingRow;
  engine: StateOfAiSearchEngine;
  /** 1-based rank of the brand among all brands for this assistant. */
  rank: number;
  total: number;
}

function HeatCellTooltip({ detail }: { detail: HeatCellDetail }) {
  const { brand, engine, rank, total } = detail;
  const rate = brand.byEngine[engine.id] ?? 0;
  return (
    <span className="flex min-w-48 flex-col gap-1.5 py-0.5">
      <span className="flex items-center gap-1.5 font-medium">
        <span className={INVERTED_ICON}>
          <EngineIcon className="size-3.5" engine={engine.model} />
        </span>
        {brand.name}
      </span>
      <span className="flex justify-between gap-4 opacity-70">
        Named in
        <span className="font-medium tabular-nums opacity-100">
          {formatPercent(rate)} of {engine.answers} answers
        </span>
      </span>
      <span className="flex justify-between gap-4 opacity-70">
        Rank with {engine.label}
        <span className="font-medium tabular-nums opacity-100">
          #{rank} of {total}
        </span>
      </span>
    </span>
  );
}

function HeatCell({
  value,
  min,
  max,
  detail,
}: {
  value: number | null;
  min: number;
  max: number;
  detail: HeatCellDetail;
}) {
  if (value === null) {
    return (
      <span className="bg-muted/60 text-muted-foreground flex h-9 w-full items-center justify-center rounded-lg text-sm">
        –
      </span>
    );
  }
  const tint = heatTint(value, min, max);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "flex h-9 w-full items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--primary)_var(--heat-tint),var(--muted))] text-sm tabular-nums transition-shadow duration-150 ease-out hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_0_0_1px_rgb(255_255_255/0.12),inset_0_10px_18px_-12px_rgb(255_255_255/0.14)]",
              tint > HEATMAP_LIGHT_TEXT_TINT
                ? "text-primary-foreground"
                : "text-foreground"
            )}
            style={{ "--heat-tint": `${tint}%` } as CSSProperties}
          />
        }
      >
        {formatPercent(value)}
      </TooltipTrigger>
      <TooltipContent side="top">
        <HeatCellTooltip detail={detail} />
      </TooltipContent>
    </Tooltip>
  );
}

/** Page state shared by tables that sit side by side and flip together. */
export interface SharedPage {
  page: number;
  onPageChange: (page: number) => void;
}

/**
 * Fixed rows, so two tables with the same page size end on the same line.
 * The viewport height counts the header row too, as in the dashboard.
 */
function pagedTableProps(rowCount: number, pageSize: number) {
  const height = (Math.min(rowCount, pageSize) + 1) * REPORT_ROW_HEIGHT;
  return { height, minHeight: height, rowHeight: REPORT_ROW_HEIGHT };
}

export function RankingTable({
  rows,
  shared,
  onSelect,
}: {
  rows: StateOfAiSearchRankingRow[];
  shared: SharedPage;
  onSelect: (row: StateOfAiSearchRankingRow) => void;
}) {
  const columns: TableColumn<StateOfAiSearchRankingRow>[] = [
    {
      key: "rank",
      header: "#",
      width: "3rem",
      cell: (row) => <MutedText>{row.rank}</MutedText>,
    },
    {
      key: "name",
      header: "Brand",
      width: "1fr",
      minWidth: "8rem",
      cell: (row) => <Brand domain={row.domain} name={row.name} />,
    },
    {
      key: "topPick",
      header: "Named first",
      hint: "Share of answers that name this brand before any other tracked brand, averaged across the assistants.",
      width: "7.5rem",
      align: "right",
      collapsePriority: 1,
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums">
          {formatPercent(row.topPick)}
        </span>
      ),
    },
    {
      key: "visibility",
      header: "Visibility",
      width: "9.5rem",
      cell: (row) => (
        <PercentBar color={brandColor(row.rank)} value={row.visibility} />
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.name}
      onRowClick={onSelect}
      pagination={{
        ...shared,
        pageSize: BRANDS_PAGE_SIZE,
        itemLabel: "brands",
        pageSizeSelector: false,
      }}
      {...pagedTableProps(rows.length, BRANDS_PAGE_SIZE)}
    />
  );
}

/** Brands × assistants, tinted like the dashboard heatmap. */
export function EngineHeatmap({
  rows,
  engines,
  shared,
  onSelect,
}: {
  rows: StateOfAiSearchRankingRow[];
  engines: StateOfAiSearchEngine[];
  shared: SharedPage;
  onSelect: (row: StateOfAiSearchRankingRow) => void;
}) {
  const rates = rows.flatMap((row) =>
    engines.flatMap((engine) => {
      const value = row.byEngine[engine.id];
      return value && value > 0 ? [value] : [];
    })
  );
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const rankWith = (
    engine: StateOfAiSearchEngine,
    row: StateOfAiSearchRankingRow
  ) =>
    1 +
    rows.filter(
      (other) =>
        (other.byEngine[engine.id] ?? 0) > (row.byEngine[engine.id] ?? 0)
    ).length;
  const columns: TableColumn<StateOfAiSearchRankingRow>[] = [
    {
      key: "name",
      header: "Brand",
      width: "1fr",
      minWidth: "8rem",
      cell: (row) => <Brand domain={row.domain} name={row.name} />,
    },
    ...engines.map((engine): TableColumn<StateOfAiSearchRankingRow> => ({
      key: engine.id,
      // Icons only: five assistants have to fit half the page width. The
      // label stays for screen readers and in the cell tooltips.
      header: (
        <span className="inline-flex" title={engine.label}>
          <EngineIcon className="size-4" engine={engine.model} />
          <span className="sr-only">{engine.label}</span>
        </span>
      ),
      width: "4.75rem",
      align: "center",
      sortValue: (row) => row.byEngine[engine.id] ?? -1,
      cell: (row) => (
        <HeatCell
          detail={{
            brand: row,
            engine,
            rank: rankWith(engine, row),
            total: rows.length,
          }}
          max={max}
          min={min}
          value={row.byEngine[engine.id]}
        />
      ),
    })),
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.name}
      onRowClick={onSelect}
      pagination={{
        ...shared,
        pageSize: BRANDS_PAGE_SIZE,
        itemLabel: "brands",
        pageSizeSelector: false,
      }}
      {...pagedTableProps(rows.length, BRANDS_PAGE_SIZE)}
    />
  );
}

export function PromptsTable({
  rows,
  onSelect,
}: {
  rows: StateOfAiSearchPromptRow[];
  onSelect: (row: StateOfAiSearchPromptRow) => void;
}) {
  const [page, setPage] = useState(1);
  const columns: TableColumn<StateOfAiSearchPromptRow>[] = [
    {
      key: "prompt",
      header: "Prompt",
      width: "1fr",
      minWidth: "12rem",
      cell: (row) => <span className="truncate">{row.prompt}</span>,
    },
    {
      key: "brands",
      header: "Brands mentioned",
      width: "12rem",
      collapsePriority: 1,
      cell: (row) => (
        <LogoStack
          items={row.brands.map((brand) => ({
            key: brand.name,
            label: brand.name,
            detail: `Named in ${row.mentions[brand.name] ?? 0} of ${row.answers} answers`,
            renderIcon: (className) => (
              <CompetitorLogo
                className={cn(className, LOGO_OUTLINE)}
                domain={brand.domain}
                name={brand.name}
              />
            ),
          }))}
          labels={{ additionalItems: "More brands" }}
          limit={BRAND_STACK_LIMIT}
        />
      ),
    },
    {
      key: "topPick",
      header: "Named first",
      width: "11rem",
      cell: (row) =>
        row.topPick ? (
          <Brand domain={row.topPick.domain} name={row.topPick.name} />
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => String(row.id)}
      onRowClick={onSelect}
      pagination={{
        page,
        onPageChange: setPage,
        pageSize: PROMPTS_PAGE_SIZE,
        itemLabel: "prompts",
        pageSizeSelector: false,
      }}
      {...pagedTableProps(rows.length, PROMPTS_PAGE_SIZE)}
    />
  );
}

export function SourcesTable({
  rows,
  engines,
  onSelect,
}: {
  rows: StateOfAiSearchSource[];
  engines: StateOfAiSearchEngine[];
  onSelect: (row: StateOfAiSearchSource) => void;
}) {
  const max = Math.max(...rows.map((row) => row.share), 1);
  // One column for the assistant that links the domain most; the full split
  // per assistant is in the source drawer.
  const leaderOf = (row: StateOfAiSearchSource) => {
    let leader: { engine: StateOfAiSearchEngine; value: number } | null = null;
    for (const engine of engines) {
      const value = row.byEngine[engine.id] ?? 0;
      if (value > 0 && value > (leader?.value ?? 0)) {
        leader = { engine, value };
      }
    }
    return leader;
  };
  const columns: TableColumn<StateOfAiSearchSource>[] = [
    {
      key: "domain",
      header: "Domain",
      width: "1fr",
      minWidth: "8rem",
      cell: (row) => <Brand domain={row.domain} name={row.domain} />,
    },
    {
      key: "leader",
      header: "Most cited by",
      width: "11rem",
      collapsePriority: 1,
      cell: (row) => {
        const leader = leaderOf(row);
        if (!leader) {
          return <MutedText>–</MutedText>;
        }
        return (
          <span className="flex items-center gap-2">
            <EngineIcon className="size-3.5" engine={leader.engine.model} />
            <span className="truncate">{leader.engine.label}</span>
            <MutedText>{formatPercent(leader.value)}</MutedText>
          </span>
        );
      },
    },
    {
      key: "share",
      header: "Cited in",
      width: "8.5rem",
      cell: (row) => <PercentBar max={max} value={row.share} />,
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.domain}
      onRowClick={onSelect}
      {...pagedTableProps(rows.length, rows.length)}
    />
  );
}
