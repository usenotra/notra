"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { stripWebsiteProtocol } from "@notra/geo-core/utils/geo-website";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";

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
      label: `Last ${GEO_SHELF_CITATION_WINDOW_DAYS} days`,
      value: citations.windowCount.toLocaleString(),
    },
    { label: "All time", value: citations.totalCount.toLocaleString() },
    { label: "Prompts", value: citations.promptCount.toLocaleString() },
  ];
  const pageLabel = stripWebsiteProtocol(row.url);
  const ticketMeta = row.opportunity
    ? `Opened ${formatRelative(row.opportunity.createdAt)}${
        row.opportunity.resolvedAt
          ? ` · closed ${formatRelative(row.opportunity.resolvedAt)}`
          : ""
      }`
    : null;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="gap-0 overflow-hidden rounded-2xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="shrink-0 gap-2 border-b p-5 pr-14 sm:p-6 sm:pr-14">
          <SheetTitle className="text-xl font-semibold tracking-tight text-pretty wrap-break-word">
            {row.title ?? row.domain}
          </SheetTitle>
          <SheetDescription className="min-w-0">
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
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <section className="space-y-3">
            <SectionHeader title="Citations" />
            <div className="space-y-5">
              <dl className="grid grid-cols-3 gap-4 py-1">
                {stats.map((stat) => (
                  <div
                    className="flex min-w-0 flex-col gap-1.5"
                    key={stat.label}
                  >
                    <dt className="text-muted-foreground text-xs">
                      {stat.label}
                    </dt>
                    <dd className="m-0 text-2xl font-semibold tracking-tight tabular-nums">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <span>
                  First cited{" "}
                  <span className="text-foreground">
                    {formatShelfDate(citations.firstCitedAt)}
                  </span>
                </span>
                <span>
                  Last cited{" "}
                  <span className="text-foreground">
                    {formatShelfDate(citations.lastCitedAt)}
                  </span>
                </span>
              </div>
              {citations.engines.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">Cited by</p>
                  <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {citations.engines.map((engine) => (
                      <li
                        className="flex items-center gap-1.5 text-xs"
                        key={engine}
                      >
                        <EngineIcon className="size-4" engine={engine} />
                        {engineFamilyLabel(engine)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  No engine has cited this page for your prompts yet.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Who is on the shelf" />
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
      </SheetContent>
    </Sheet>
  );
}
