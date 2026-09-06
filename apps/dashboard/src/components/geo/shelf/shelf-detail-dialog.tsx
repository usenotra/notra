"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { stripWebsiteProtocol } from "@notra/geo-core/utils/geo-website";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Badge } from "@notra/ui/components/ui/badge";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { ShelfPlacementsTable } from "@/components/geo/shelf/shelf-placements-table";
import { ShelfTicketForm } from "@/components/geo/shelf/shelf-ticket-form";
import { GEO_SHELF_CITATION_WINDOW_DAYS } from "@/constants/geo-shelf";
import type { GeoShelfDetailDialogProps } from "@/types/geo-shelf";
import { formatRelative } from "@/utils/format-relative";
import { formatShelfDate } from "@/utils/geo-shelf";

function SectionHeader({
  title,
  meta,
}: {
  title: string;
  meta?: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {meta ? (
        <p className="text-muted-foreground text-xs text-pretty">{meta}</p>
      ) : null}
    </div>
  );
}

export function ShelfDetailDialog({
  open,
  onOpenChange,
  row,
  members,
  currentMemberId,
  ownBrandName,
  onUpdateOpportunity,
  onSetPlacementStatus,
  isPending,
}: GeoShelfDetailDialogProps) {
  if (!row) {
    return null;
  }
  const citations = row.citations;
  const stats = [
    {
      label: `Last ${GEO_SHELF_CITATION_WINDOW_DAYS}d`,
      value: citations.windowCount.toLocaleString(),
    },
    { label: "All time", value: citations.totalCount.toLocaleString() },
    { label: "Prompts", value: citations.promptCount.toLocaleString() },
    { label: "First cited", value: formatShelfDate(citations.firstCitedAt) },
    { label: "Last cited", value: formatShelfDate(citations.lastCitedAt) },
  ];
  const pageLabel = stripWebsiteProtocol(row.url);
  const checkedMeta = row.lastFetchedAt
    ? `Checked ${formatRelative(row.lastFetchedAt)}`
    : null;
  const ticketMeta = row.opportunity
    ? `Opened ${formatRelative(row.opportunity.createdAt)}${
        row.opportunity.resolvedAt
          ? ` · closed ${formatRelative(row.opportunity.resolvedAt)}`
          : ""
      }`
    : null;

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="max-h-[90vh] gap-8 overflow-x-hidden overflow-y-auto p-5 [scrollbar-gutter:stable] sm:max-w-3xl sm:p-6">
        <ResponsiveDialogHeader className="gap-2">
          <ResponsiveDialogTitle className="text-xl font-semibold tracking-tight text-pretty">
            {row.title ?? row.domain}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="min-w-0">
            <a
              className="text-muted-foreground hover:text-foreground inline-flex max-w-full items-center gap-1.5 text-sm underline-offset-4 hover:underline"
              href={row.url}
              rel="noopener noreferrer"
              target="_blank"
              title={row.url}
            >
              <span className="min-w-0 truncate">{pageLabel}</span>
              <HugeiconsIcon
                className="size-3.5 shrink-0"
                icon={ArrowUpRight01Icon}
              />
            </a>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-8">
          <section className="space-y-3">
            <SectionHeader title="Citations" />
            <div className="overflow-hidden rounded-xl border">
              <dl className="divide-border grid grid-cols-2 divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0">
                {stats.map((stat) => (
                  <div
                    className="flex min-w-0 flex-col gap-1 px-4 py-3"
                    key={stat.label}
                  >
                    <dt className="text-muted-foreground text-xs">
                      {stat.label}
                    </dt>
                    <dd className="m-0 text-base font-semibold tabular-nums">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {citations.engines.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 border-t px-4 py-2.5">
                  {citations.engines.map((engine) => (
                    <Badge
                      className="gap-1.5"
                      key={engine}
                      size="sm"
                      variant="secondary"
                    >
                      <EngineIcon className="size-3" engine={engine} />
                      {engineFamilyLabel(engine)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground border-t px-4 py-2.5 text-xs">
                  No engine has cited this page for your prompts yet.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader meta={checkedMeta} title="Who is on the shelf" />
            <ShelfPlacementsTable
              disabled={isPending}
              onSetPlacementStatus={onSetPlacementStatus}
              ownBrandName={ownBrandName}
              row={row}
            />
          </section>

          <section className="space-y-3">
            <SectionHeader meta={ticketMeta} title="Ticket" />
            {row.opportunity ? (
              <ShelfTicketForm
                currentMemberId={currentMemberId}
                disabled={isPending}
                key={row.id}
                members={members}
                onChange={(changes) => onUpdateOpportunity(row.id, changes)}
                opportunity={row.opportunity}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-4">
                <p className="text-muted-foreground text-sm text-pretty">
                  {row.isOpportunity
                    ? "Competitors are listed here and you are not. Open a ticket to work on it."
                    : "No one is working on this page."}
                </p>
                <Button
                  disabled={isPending}
                  onClick={() =>
                    onUpdateOpportunity(row.id, {
                      status: "open",
                      assigneeMemberId: currentMemberId,
                    })
                  }
                  size="sm"
                  variant="outline"
                >
                  Open ticket
                </Button>
              </div>
            )}
          </section>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
