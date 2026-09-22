"use client";

import { Delete02Icon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  COMPETITOR_TYPE_FILTER_VALUES,
  COMPETITOR_TYPE_FILTERS,
  COMPETITORS_TABLE_HEIGHT,
  COMPETITORS_TABLE_ROW_HEIGHT,
} from "@notra/geo-core/constants/geo";
import type { GeoCompetitorTypeFilter } from "@notra/geo-core/types/geo";
import { Badge } from "@notra/ui/components/ui/badge";
import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";

import { Button } from "@/components/button";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { GeoRemoveDialog } from "@/components/geo/geo-remove-dialog";
import { ProjectLogo } from "@/components/geo/project-logo";
import { Table, type TableColumn } from "@/components/motion/table";
import { useGeoCompetitorRowNavigation } from "@/lib/hooks/use-geo";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import type { CompetitorsTableProps } from "@/types/geo";
import type { GeoCompetitorRowEntry } from "@/types/geo-competitors";
import {
  buildCompetitorRows,
  findOwnBrandDomain,
  formatCompetitorKind,
} from "@/utils/geo-competitors";

const COMPETITOR_NOUNS = {
  singular: "competitor",
  plural: "competitors",
} as const;

function competitorRemoveDescription(items: string[]): string {
  if (items.length > 1) {
    return "These brands will no longer be called out in GEO scans. Historical mentions stay in your results.";
  }
  return `"${items[0]}" will no longer be called out in GEO scans. Historical mentions stay in your results.`;
}

function toTypeFilter(value: string): GeoCompetitorTypeFilter {
  if (value === "direct" || value === "indirect") {
    return value;
  }
  return "all";
}

function isOwnBrandRow(row: GeoCompetitorRowEntry): boolean {
  return row.isOwnBrand;
}

export function CompetitorsTable({
  competitors,
  organizationId,
  organizationSlug,
  companyName,
  aliases,
  ownDomain: projectDomain,
}: CompetitorsTableProps) {
  const { pendingCompetitorIds, removeCompetitor } =
    useGeoCompetitorsDb(organizationId);
  const { openRow, prefetchRow } = useGeoCompetitorRowNavigation(
    organizationSlug,
    organizationId
  );
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const [typeFilter, setTypeFilter] = useQueryState(
    "type",
    parseAsStringLiteral(COMPETITOR_TYPE_FILTER_VALUES)
      .withDefault("all")
      .withOptions({ clearOnDefault: true })
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteNames, setPendingDeleteNames] = useState<string[]>([]);

  const requestDelete = (names: string[]) => {
    setPendingDeleteNames(names);
    setDeleteOpen(true);
  };

  const ownDomain = projectDomain ?? findOwnBrandDomain(aliases);

  const rows = buildCompetitorRows(
    competitors,
    companyName,
    aliases,
    ownDomain,
    search,
    typeFilter
  );

  const selectedIdSet = new Set(selectedIds);
  const selectedNames = rows.flatMap((row) =>
    !row.isOwnBrand && selectedIdSet.has(row.id) ? [row.name] : []
  );

  const columns: TableColumn<GeoCompetitorRowEntry>[] = [
    {
      key: "name",
      header: (
        <span className="inline-flex items-center gap-1.5">
          Brand
          <span className="text-muted-foreground font-normal tabular-nums">
            ({rows.length})
          </span>
        </span>
      ),
      sortable: true,
      width: "1.4fr",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2.5">
          {row.isOwnBrand ? (
            <ProjectLogo
              className="size-6 shrink-0 rounded-md"
              domain={row.domain}
              fallbackClassName="bg-background p-1 ring-1 ring-foreground/10"
              name={row.name}
            />
          ) : (
            <CompetitorLogo
              className="size-6 shrink-0 rounded-md"
              domain={row.domain}
              name={row.name}
            />
          )}
          <span className="truncate font-medium">
            {row.name}
            {row.isOwnBrand && (
              <span className="text-muted-foreground ml-1">(You)</span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: "domain",
      header: "Domain",
      width: "1.2fr",
      cell: (row) =>
        row.domain ? (
          <a
            className="text-muted-foreground hover:text-foreground hover:underline"
            href={`https://${row.domain}`}
            onClick={(event) => event.stopPropagation()}
            rel="noopener"
            target="_blank"
          >
            {row.domain}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "kind",
      header: "Type",
      width: "7rem",
      sortable: true,
      cell: (row) =>
        row.isOwnBrand ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <Badge variant={row.kind === "direct" ? "default" : "secondary"}>
            {formatCompetitorKind(row.kind)}
          </Badge>
        ),
    },
    {
      key: "synonyms",
      header: "Synonyms",
      width: "1fr",
      cell: (row) =>
        row.synonyms.length > 0 ? (
          <span
            className="text-muted-foreground truncate"
            title={row.synonyms.join(", ")}
          >
            {row.synonyms.join(", ")}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      sortValue: (row) => row.synonyms.length,
    },
    {
      key: "actions",
      header: "",
      width: "4rem",
      align: "right",
      cell: (row) =>
        row.isOwnBrand ? null : (
          <Button
            aria-label={`Remove ${row.name}`}
            disabled={pendingCompetitorIds.has(row.id)}
            onClick={(event) => {
              event.stopPropagation();
              requestDelete([row.name]);
            }}
            size="icon"
            variant="ghost"
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} />
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-72">
          <HugeiconsIcon
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            icon={SearchIcon}
            size={15}
          />
          <Input
            aria-label="Filter competitors by name"
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter by name..."
            value={search}
          />
        </div>
        <Select
          onValueChange={(value) => setTypeFilter(toTypeFilter(value ?? "all"))}
          value={typeFilter}
        >
          <SelectTrigger className="w-40 capitalize">
            <SelectValue>
              {COMPETITOR_TYPE_FILTERS.find(
                (option) => option.value === typeFilter
              )?.label ?? "All types"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-64">
            {COMPETITOR_TYPE_FILTERS.map((option) => (
              <SelectItem
                className="items-start py-1.5"
                key={option.value}
                value={option.value}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span>{option.label}</span>
                  <span className="text-muted-foreground text-xs whitespace-normal">
                    {option.description}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedNames.length > 0 && (
          <Button
            onClick={() => requestDelete(selectedNames)}
            size="sm"
            variant="outline"
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} />
            Remove ({selectedNames.length})
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Table
          className="rounded-2xl"
          columns={columns}
          data={rows}
          defaultSort={{ key: "name", direction: "asc" }}
          emptyState="No competitors match these filters"
          getRowId={(row) => row.id}
          height={COMPETITORS_TABLE_HEIGHT}
          isRowPinned={isOwnBrandRow}
          onRowClick={(row) => {
            if (row.isOwnBrand) {
              return;
            }
            openRow(row.name);
          }}
          onRowPointerEnter={(row) => {
            if (row.isOwnBrand) {
              return;
            }
            prefetchRow(row.name);
          }}
          onSelectionChange={setSelectedIds}
          resizable
          rowHeight={COMPETITORS_TABLE_ROW_HEIGHT}
          selectable
          selectedRowIds={selectedIds}
        />
      </div>

      <GeoRemoveDialog
        description={competitorRemoveDescription}
        isPending={false}
        items={pendingDeleteNames}
        nouns={COMPETITOR_NOUNS}
        onConfirm={() => {
          const idsByName = new Map(
            competitors.map((competitor) => [competitor.name, competitor.id])
          );
          for (const name of pendingDeleteNames) {
            const competitorId = idsByName.get(name);
            if (competitorId) {
              removeCompetitor(competitorId);
            }
          }
          setSelectedIds([]);
          setDeleteOpen(false);
        }}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setPendingDeleteNames([]);
          }
        }}
        open={deleteOpen}
      />
    </div>
  );
}
