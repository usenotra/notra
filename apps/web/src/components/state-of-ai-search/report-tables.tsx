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
import { useState } from "react";

import {
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
const NUMBER_COL = "text-right";

export function Brand({ name, domain }: { name: string; domain: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <CompetitorLogo className={LOGO_OUTLINE} domain={domain} name={name} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** "Show N more" as a footer row on the shell, under the lifted card. */
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
          <button
            aria-expanded={expanded}
            className="text-muted-foreground hover:text-foreground focus-visible:outline-ring h-10 w-full rounded-b-[14px] px-4 text-left text-xs font-medium outline-offset-[-2px] transition-colors focus-visible:outline-2"
            onClick={onToggle}
            type="button"
          >
            {expanded ? "Show less" : `Show ${hidden} more ${noun}`}
          </button>
        </TableCell>
      </TableRow>
    </TableFooter>
  );
}

function useCollapsed<T>(rows: T[], limit: number) {
  const [expanded, setExpanded] = useState(false);
  return {
    expanded,
    visible: expanded ? rows : rows.slice(0, limit),
    hidden: Math.max(0, rows.length - limit),
    toggle: () => setExpanded((current) => !current),
  };
}

export function RankingTable({ rows }: { rows: StateOfAiSearchRankingRow[] }) {
  const { expanded, visible, hidden, toggle } = useCollapsed(
    rows,
    RANKING_COLLAPSED_ROWS
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Brand</TableHead>
          <TableHead className={cn(NUMBER_COL, "hidden sm:table-cell")}>
            Named first
          </TableHead>
          <TableHead>Visibility</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="text-muted-foreground">{row.rank}</TableCell>
            <TableCell className="w-full max-w-0">
              <Brand domain={row.domain} name={row.name} />
            </TableCell>
            <TableCell
              className={cn(
                NUMBER_COL,
                "text-muted-foreground hidden sm:table-cell"
              )}
            >
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
                <span className="font-medium">
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
          onToggle={toggle}
        />
      ) : null}
    </Table>
  );
}

export function EngineTable({
  rows,
  engines,
}: {
  rows: StateOfAiSearchRankingRow[];
  engines: StateOfAiSearchEngine[];
}) {
  const { expanded, visible, hidden, toggle } = useCollapsed(
    rows,
    RANKING_COLLAPSED_ROWS
  );
  const leaders = new Map(
    engines.map((engine) => [
      engine.id,
      Math.max(...rows.map((row) => row.byEngine[engine.id] ?? 0)),
    ])
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Brand</TableHead>
          {engines.map((engine) => (
            <TableHead
              className="w-14 px-2 text-right sm:w-[7.75rem] sm:px-3"
              key={engine.id}
            >
              <span
                className="inline-flex items-center gap-1.5"
                title={engine.label}
              >
                <EngineIcon className="size-3.5" engine={engine.model} />
                <span className="hidden sm:inline">{engine.label}</span>
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="w-full max-w-0">
              <Brand domain={row.domain} name={row.name} />
            </TableCell>
            {engines.map((engine) => {
              const value = row.byEngine[engine.id];
              const isLeader =
                value !== null && value > 0 && value === leaders.get(engine.id);
              return (
                <TableCell
                  className={cn(
                    "px-2 text-right sm:px-3",
                    isLeader ? "font-semibold" : "text-muted-foreground"
                  )}
                  key={engine.id}
                >
                  {formatPercent(value)}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
      {hidden > 0 ? (
        <ShowMoreFooter
          colSpan={engines.length + 1}
          expanded={expanded}
          hidden={hidden}
          noun="brands"
          onToggle={toggle}
        />
      ) : null}
    </Table>
  );
}

export function PromptsTable({ rows }: { rows: StateOfAiSearchPromptRow[] }) {
  const { expanded, visible, hidden, toggle } = useCollapsed(
    rows,
    PROMPTS_PAGE_SIZE
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Prompt</TableHead>
          <TableHead className="hidden md:table-cell md:w-[12rem]">
            Brands mentioned
          </TableHead>
          <TableHead
            className={cn(NUMBER_COL, "hidden lg:table-cell lg:w-[6.5rem]")}
          >
            Assistants
          </TableHead>
          <TableHead>Named first</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((row) => (
          <TableRow key={row.prompt}>
            <TableCell className="w-full py-3 text-pretty whitespace-normal">
              {row.prompt}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <LogoStack
                items={row.brands.map((brand) => ({
                  key: brand.name,
                  label: brand.name,
                  detail: brand.domain,
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
                NUMBER_COL,
                "hidden lg:table-cell",
                !row.consensus && "text-muted-foreground"
              )}
            >
              {row.consensus ? "Agree" : "Split"}
            </TableCell>
            <TableCell className="max-w-[9rem] sm:max-w-[12rem]">
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
          onToggle={toggle}
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
              className="hidden px-2 text-right sm:table-cell sm:w-14"
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
                <span className="font-medium">{formatPercent(row.share)}</span>
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
