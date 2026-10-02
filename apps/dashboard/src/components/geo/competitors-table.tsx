"use client";

import { Delete02Icon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { COMPETITORS_TABLE_ROW_HEIGHT } from "@notra/geo-core/constants/geo";
import { Input } from "@notra/ui/components/ui/input";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { GeoRemoveDialog } from "@/components/geo/geo-remove-dialog";
import { ProjectLogo } from "@/components/geo/project-logo";
import { ShareOfVoiceCell } from "@/components/geo/share-of-voice-cell";
import { Table, type TableColumn } from "@/components/motion/table";
import { GEO_COMPETITORS_TABLE_VISIBLE_ROWS } from "@/constants/geo-competitors";
import { useGeoCompetitorRowNavigation } from "@/lib/hooks/use-geo";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import type { CompetitorsTableProps } from "@/types/geo";
import type { GeoCompetitorRowEntry } from "@/types/geo-competitors";
import {
  buildCompetitorRows,
  findOwnBrandDomain,
} from "@/utils/geo-competitors";

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
  shareByBrand,
}: CompetitorsTableProps) {
  const t = useTranslations("geo.competitorsTable");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const competitorNouns = {
    singular: t("nounSingular"),
    plural: t("nounPlural"),
  };
  const competitorRemoveDescription = (items: string[]): string =>
    items.length > 1
      ? t("removeDescriptionMany")
      : t("removeDescriptionOne", { name: items[0] ?? "" });
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
    search
  );
  const shareOf = (row: GeoCompetitorRowEntry) =>
    shareByBrand.get(row.name.toLowerCase());
  const topShare = Math.max(...rows.map((row) => shareOf(row)?.share ?? 0), 0);
  const hasShareData = [...shareByBrand.values()].some(
    (row) => row.mentions > 0
  );

  const selectedIdSet = new Set(selectedIds);
  const selectedNames = rows.flatMap((row) =>
    !row.isOwnBrand && selectedIdSet.has(row.id) ? [row.name] : []
  );

  const columns: TableColumn<GeoCompetitorRowEntry>[] = [
    {
      key: "name",
      header: tCommon("labels.brand"),
      sortable: true,
      width: "1fr",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-3">
          {row.isOwnBrand ? (
            <ProjectLogo
              className="size-7 shrink-0 rounded-md"
              domain={row.domain}
              fallbackClassName="bg-background p-1 ring-1 ring-foreground/10"
              name={row.name}
            />
          ) : (
            <CompetitorLogo
              className="size-7 shrink-0 rounded-md"
              domain={row.domain}
              name={row.name}
            />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium">{row.name}</span>
              {row.isOwnBrand && (
                <span className="bg-primary/10 text-primary inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-xs font-medium">
                  {tGeoShared("youLabel")}
                </span>
              )}
              {!row.isOwnBrand && row.kind === "indirect" && (
                <span className="bg-muted text-muted-foreground inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-xs">
                  {tGeoShared("indirect")}
                </span>
              )}
            </span>
            {row.domain ? (
              <a
                className="text-muted-foreground hover:text-foreground w-fit max-w-full truncate text-xs hover:underline"
                href={`https://${row.domain}`}
                onClick={(event) => event.stopPropagation()}
                rel="noopener"
                target="_blank"
              >
                {row.domain}
              </a>
            ) : null}
          </span>
        </span>
      ),
    },
    {
      key: "share",
      header: tGeoShared("shareOfVoice"),
      width: "16rem",
      sortable: true,
      collapsePriority: 1,
      sortValue: (row) => shareOf(row)?.share ?? 0,
      cell: (row) => {
        const share = shareOf(row);
        if (!share || share.mentions === 0) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <ShareOfVoiceCell
            max={topShare}
            own={row.isOwnBrand}
            share={share.share}
          />
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "3.5rem",
      align: "right",
      cell: (row) =>
        row.isOwnBrand ? null : (
          <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
            <Button
              aria-label={tCommon("labels.removeName", { name: row.name })}
              disabled={pendingCompetitorIds.has(row.id)}
              onClick={(event) => {
                event.stopPropagation();
                requestDelete([row.name]);
              }}
              size="icon-sm"
              variant="ghost"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} />
            </Button>
          </span>
        ),
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          {t("title")}
          <span className="text-muted-foreground font-normal tabular-nums">
            {competitors.length}
          </span>
        </h2>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {selectedNames.length > 0 && (
            <Button
              onClick={() => requestDelete(selectedNames)}
              size="sm"
              variant="outline"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} />
              {tGeoShared("removeCount", { count: selectedNames.length })}
            </Button>
          )}
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <HugeiconsIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
              icon={SearchIcon}
              size={14}
            />
            <Input
              aria-label={t("filterLabel")}
              className="h-8 pl-8"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("filterPlaceholder")}
              value={search}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Table
          className="rounded-2xl"
          columns={
            hasShareData
              ? columns
              : columns.filter((column) => column.key !== "share")
          }
          data={rows}
          defaultSort={{ key: "name", direction: "asc" }}
          emptyState={t("empty")}
          getRowId={(row) => row.id}
          height={
            (Math.min(rows.length, GEO_COMPETITORS_TABLE_VISIBLE_ROWS) + 1) *
            COMPETITORS_TABLE_ROW_HEIGHT
          }
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
          rowHeight={COMPETITORS_TABLE_ROW_HEIGHT}
          selectable
          selectedRowIds={selectedIds}
        />
      </div>

      <GeoRemoveDialog
        description={competitorRemoveDescription}
        isPending={false}
        items={pendingDeleteNames}
        nouns={competitorNouns}
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
    </section>
  );
}
