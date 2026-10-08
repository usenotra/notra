"use client";

import { CompetitorLogo } from "@notra/ui/components/geo/competitor-logo";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { cn } from "@notra/ui/lib/utils";
import type { CSSProperties, KeyboardEvent } from "react";
import { useState } from "react";

import { ShellFooterButton } from "@/components/state-of-ai-search/report-section";
import {
  HEATMAP_LIGHT_TEXT_TINT,
  HEATMAP_MAX_TINT,
  HEATMAP_MIN_TINT,
  PROMPTS_PAGE_SIZE,
  RANKING_COLLAPSED_ROWS,
} from "@/constants/state-of-ai-search";
import type {
  StateOfAiSearchEngine,
  StateOfAiSearchPromptRow,
  StateOfAiSearchRankingRow,
  StateOfAiSearchSource,
} from "@/types/state-of-ai-search";
import { brandColor, formatPercent } from "@/utils/state-of-ai-search";

const PERCENT_MAX = 100;
const BRAND_STACK_LIMIT = 6;
const LOGO_OUTLINE =
  "outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10";
const ROW_CLICKABLE =
  "cursor-pointer focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2";

export function Brand({
  name,
  domain,
  className,
}: {
  name: string;
  domain: string;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <CompetitorLogo className={LOGO_OUTLINE} domain={domain} name={name} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Row that opens a drawer on click, Enter or Space. */
function rowActions(onActivate: () => void) {
  return {
    className: ROW_CLICKABLE,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate();
      }
    },
    tabIndex: 0,
  };
}

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

function HeatCell({
  value,
  min,
  max,
  label,
}: {
  value: number | null;
  min: number;
  max: number;
  label: string;
}) {
  if (value === null) {
    return (
      <span className="bg-muted/60 text-muted-foreground flex h-9 items-center justify-center rounded-lg text-sm">
        –
      </span>
    );
  }
  const tint = heatTint(value, min, max);
  return (
    <span
      className={cn(
        "hover:ring-foreground/20 flex h-9 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--primary)_var(--heat-tint),var(--muted))] text-sm tabular-nums transition-shadow ring-inset hover:ring-2",
        tint > HEATMAP_LIGHT_TEXT_TINT
          ? "text-primary-foreground"
          : "text-foreground"
      )}
      style={{ "--heat-tint": `${tint}%` } as CSSProperties}
      title={label}
    >
      {formatPercent(value)}
    </span>
  );
}

function ShowMoreFooter({
  colSpan,
  expanded,
  hidden,
  noun,
  onToggle,
}: {
  colSpan: number;
  expanded: boolean;
  hidden: number;
  noun: string;
  onToggle: () => void;
}) {
  return (
    <TableFooter>
      <TableRow>
        <TableCell className="h-10 p-0" colSpan={colSpan}>
          <ShellFooterButton expanded={expanded} onToggle={onToggle}>
            {expanded ? "Show less" : `Show ${hidden} more ${noun}`}
          </ShellFooterButton>
        </TableCell>
      </TableRow>
    </TableFooter>
  );
}

interface CollapseProps {
  expanded: boolean;
  onToggleExpanded: () => void;
}

export function RankingTable({
  rows,
  expanded,
  onToggleExpanded,
  onSelect,
}: CollapseProps & {
  rows: StateOfAiSearchRankingRow[];
  onSelect: (row: StateOfAiSearchRankingRow) => void;
}) {
  const visible = expanded ? rows : rows.slice(0, RANKING_COLLAPSED_ROWS);
  const hidden = rows.length - RANKING_COLLAPSED_ROWS;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Brand</TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            Named first
          </TableHead>
          <TableHead>Visibility</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((row) => (
          <TableRow key={row.name} {...rowActions(() => onSelect(row))}>
            <TableCell className="text-muted-foreground">{row.rank}</TableCell>
            <TableCell className="w-full max-w-0">
              <Brand domain={row.domain} name={row.name} />
            </TableCell>
            <TableCell className="text-muted-foreground hidden text-right sm:table-cell">
              {formatPercent(row.topPick)}
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-2.5">
                <GeoBar
                  className="w-16"
                  fillColor={brandColor(row.rank)}
                  max={PERCENT_MAX}
                  value={row.visibility}
                />
                <span className="w-9 text-right font-medium">
                  {formatPercent(row.visibility)}
                </span>
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {hidden > 0 ? (
        <ShowMoreFooter
          colSpan={4}
          expanded={expanded}
          hidden={hidden}
          noun="brands"
          onToggle={onToggleExpanded}
        />
      ) : null}
    </Table>
  );
}

/** Brands × assistants, tinted like the dashboard heatmap. */
export function EngineHeatmap({
  rows,
  engines,
  expanded,
  onToggleExpanded,
  onSelect,
}: CollapseProps & {
  rows: StateOfAiSearchRankingRow[];
  engines: StateOfAiSearchEngine[];
  onSelect: (row: StateOfAiSearchRankingRow) => void;
}) {
  const visible = expanded ? rows : rows.slice(0, RANKING_COLLAPSED_ROWS);
  const hidden = rows.length - RANKING_COLLAPSED_ROWS;
  const rates = rows.flatMap((row) =>
    engines.flatMap((engine) => {
      const value = row.byEngine[engine.id];
      return value && value > 0 ? [value] : [];
    })
  );
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Brand</TableHead>
          {engines.map((engine) => (
            <TableHead
              className="max-w-16 min-w-16 px-1 text-center sm:max-w-28 sm:min-w-28"
              key={engine.id}
            >
              <span
                className="inline-flex max-w-full items-center gap-1.5"
                title={engine.label}
              >
                <EngineIcon
                  className="size-3.5 shrink-0"
                  engine={engine.model}
                />
                <span className="hidden truncate sm:inline">
                  {engine.label}
                </span>
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((row) => (
          <TableRow key={row.name} {...rowActions(() => onSelect(row))}>
            <TableCell className="w-full max-w-0">
              <Brand domain={row.domain} name={row.name} />
            </TableCell>
            {engines.map((engine) => (
              <TableCell className="min-w-16 px-1 sm:min-w-28" key={engine.id}>
                <HeatCell
                  label={`${row.name} · ${engine.label}: ${formatPercent(row.byEngine[engine.id])} of answers`}
                  max={max}
                  min={min}
                  value={row.byEngine[engine.id]}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      {hidden > 0 ? (
        <ShowMoreFooter
          colSpan={engines.length + 1}
          expanded={expanded}
          hidden={hidden}
          noun="brands"
          onToggle={onToggleExpanded}
        />
      ) : null}
    </Table>
  );
}

/** The questions, everyone named in the answers and who came first. */
export function PromptsTable({
  rows,
  onSelect,
}: {
  rows: StateOfAiSearchPromptRow[];
  onSelect: (row: StateOfAiSearchPromptRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, PROMPTS_PAGE_SIZE);
  const hidden = rows.length - PROMPTS_PAGE_SIZE;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Prompt</TableHead>
          <TableHead className="hidden md:table-cell">
            Brands mentioned
          </TableHead>
          <TableHead className="hidden text-right lg:table-cell">
            Assistants
          </TableHead>
          <TableHead>Named first</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((row) => (
          <TableRow key={row.id} {...rowActions(() => onSelect(row))}>
            <TableCell className="w-full min-w-48 py-3 text-pretty whitespace-normal">
              {row.prompt}
            </TableCell>
            <TableCell className="hidden md:table-cell">
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
            </TableCell>
            <TableCell
              className={cn(
                "hidden text-right lg:table-cell",
                !row.consensus && "text-muted-foreground"
              )}
            >
              {row.consensus ? "Agree" : "Split"}
            </TableCell>
            <TableCell className="max-w-36 sm:max-w-44">
              {row.topPick ? (
                <Brand domain={row.topPick.domain} name={row.topPick.name} />
              ) : (
                <span className="text-muted-foreground">–</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {hidden > 0 ? (
        <ShowMoreFooter
          colSpan={4}
          expanded={expanded}
          hidden={hidden}
          noun="prompts"
          onToggle={() => setExpanded((current) => !current)}
        />
      ) : null}
    </Table>
  );
}

export function SourcesTable({
  rows,
  engines,
}: {
  rows: StateOfAiSearchSource[];
  engines: StateOfAiSearchEngine[];
}) {
  const max = Math.max(...rows.map((row) => row.share), 1);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Domain</TableHead>
          {engines.map((engine) => (
            <TableHead
              className="hidden px-2 text-right sm:table-cell"
              key={engine.id}
            >
              <span className="inline-flex" title={engine.label}>
                <EngineIcon className="size-3.5" engine={engine.model} />
              </span>
            </TableHead>
          ))}
          <TableHead>Cited in</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.domain}>
            <TableCell className="w-full max-w-0">
              <Brand domain={row.domain} name={row.domain} />
            </TableCell>
            {engines.map((engine) => (
              <TableCell
                className="text-muted-foreground hidden px-2 text-right sm:table-cell"
                key={engine.id}
              >
                {formatPercent(row.byEngine[engine.id])}
              </TableCell>
            ))}
            <TableCell>
              <span className="flex items-center gap-2.5">
                <GeoBar className="w-12" max={max} value={row.share} />
                <span className="w-9 text-right font-medium">
                  {formatPercent(row.share)}
                </span>
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
