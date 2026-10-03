"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { stripWebsiteProtocol } from "@notra/geo-core/utils/geo-website";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { Discussion } from "@/components/comments/discussion";
import { EngineIcon } from "@/components/geo/engine-icon";
import { ShelfPlacementsTable } from "@/components/geo/shelf/shelf-placements-table";
import { ShelfTicketForm } from "@/components/geo/shelf/shelf-ticket-form";
import { GEO_SHELF_CITATION_WINDOW_DAYS } from "@/constants/geo-shelf";
import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type { GeoShelfDetailDialogProps } from "@/types/geo-shelf";
import {
  formatShelfDate,
  groupShelfCitationEngines,
  isGeoShelfFixtureSourceId,
} from "@/utils/geo-shelf";

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
  organizationId,
  open,
  onOpenChange,
  row: rowProp,
  members,
  currentMemberId,
  ownBrandName,
  competitors,
  onUpdateOpportunity,
  onSetPlacementStatus,
  isPending,
}: GeoShelfDetailDialogProps) {
  const t = useTranslations("geo.shelf.shelfDetailDialog");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const tLabels = useTranslations("geo.shelf.labels");
  const locale = useLocale();
  const formatRelative = useFormatRelative();
  const [row, releaseRow] = useRetainedValue(rowProp);
  if (!row) {
    return null;
  }
  const citations = row.citations;
  const stats = [
    {
      label: t("lastDays", { days: GEO_SHELF_CITATION_WINDOW_DAYS }),
      value: citations.windowCount.toLocaleString(locale),
    },
    {
      label: tCommon("labels.allTime"),
      value: citations.totalCount.toLocaleString(locale),
    },
    {
      label: tCommon("labels.prompts"),
      value: citations.promptCount.toLocaleString(locale),
    },
  ];
  const pageLabel = stripWebsiteProtocol(row.url);
  const ticketMeta = row.opportunity
    ? row.opportunity.resolvedAt
      ? t("ticketOpenedClosed", {
          opened: formatRelative(row.opportunity.createdAt),
          closed: formatRelative(row.opportunity.resolvedAt),
        })
      : t("ticketOpened", {
          opened: formatRelative(row.opportunity.createdAt),
        })
    : null;

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releaseRow}
      open={open}
    >
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
            <SectionHeader title={tGeoShared("citations")} />
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
                  {t.rich("firstCited", {
                    date: formatShelfDate(citations.firstCitedAt, locale),
                    value: (chunks) => (
                      <span className="text-foreground">{chunks}</span>
                    ),
                  })}
                </span>
                <span>
                  {t.rich("lastCited", {
                    date: formatShelfDate(citations.lastCitedAt, locale),
                    value: (chunks) => (
                      <span className="text-foreground">{chunks}</span>
                    ),
                  })}
                </span>
              </div>
              {citations.engines.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">
                    {t("citedBy")}
                  </p>
                  <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {groupShelfCitationEngines(citations.engines).map(
                      ({ family, label, models }) => (
                        <li
                          className="flex items-center gap-1.5 text-xs"
                          key={family}
                          title={models.join(", ")}
                        >
                          <EngineIcon
                            className="size-4"
                            engine={models[0] ?? family}
                          />
                          {label}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">{t("noEngine")}</p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader title={t("whoIsOnShelf")} />
            <ShelfPlacementsTable
              competitors={competitors}
              disabled={isPending}
              onSetPlacementStatus={onSetPlacementStatus}
              ownBrandName={ownBrandName}
              row={row}
            />
          </section>

          <section className="space-y-3">
            <SectionHeader meta={ticketMeta} title={tLabels("ticket")} />
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
                    ? t("opportunityHint")
                    : t("nobodyWorking")}
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
                  {t("openTicket")}
                </Button>
              </div>
            )}
          </section>
          {isGeoShelfFixtureSourceId(row.id) ? null : (
            <Discussion
              key={row.id}
              organizationId={organizationId}
              targetId={row.id}
              targetType="shelf"
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
