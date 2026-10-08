"use client";

import { GEO_SEARCH_GAP_ACTION_CLASS } from "@notra/geo-core/constants/geo";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { Badge } from "@notra/ui/components/ui/badge";
import { DataTable } from "@notra/ui/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetScrollArea,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useRetainedValue } from "@notra/ui/hooks/use-retained-value";
import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";

import { GEO_SEARCH_GAP_ACTION_LABEL_KEYS } from "@/constants/geo-gaps";
import type {
  GeoAiSearchEvidenceProps,
  GeoConsoleSearchGapDetailsProps,
  GeoSearchGapDetailSheetProps,
} from "@/types/components/geo-gaps";
import { formatCount, formatOneDecimal, formatPercent } from "@/utils/format";
import { gapMissingEngineFamilies } from "@/utils/geo-gaps";

function AiSearchEvidence({ ai }: GeoAiSearchEvidenceProps) {
  const t = useTranslations("geo.searchGapDetail");
  const competitors = [
    ...new Set([...ai.competitors, ...ai.discoveredCompetitors]),
  ];
  return (
    <section className="bg-background min-w-0 rounded-xl border p-4">
      <h3 className="text-sm font-medium">{t("aiEvidence")}</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        {t("uncoveredSearches", { count: ai.searches })}
      </p>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">{t("searchedBy")}</dt>
          <dd>
            {gapMissingEngineFamilies(ai.engines)
              .map(engineFamilyLabel)
              .join(", ")}
          </dd>
        </div>
        {ai.prompts.length > 0 ? (
          <div>
            <dt className="text-muted-foreground text-xs">
              {t("relatedPrompts")}
            </dt>
            <dd>
              <ul className="list-inside list-disc">
                {ai.prompts.map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        {competitors.length > 0 ? (
          <div>
            <dt className="text-muted-foreground text-xs">
              {t("mentionedCompetitors")}
            </dt>
            <dd>{competitors.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function ConsoleSearchGapDetails({ gap, ai }: GeoConsoleSearchGapDetailsProps) {
  const t = useTranslations("geo.searchGapDetail");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const title = gap.brief?.workingTitle ?? gap.title;
  const ctr =
    gap.impressions != null && gap.impressions > 0 && gap.clicks !== null
      ? (gap.clicks / gap.impressions) * 100
      : null;
  return (
    <SheetScrollArea
      className="bg-muted/20 min-h-full p-4 sm:px-4"
      key={gap.id}
    >
      <div className="space-y-4">
        <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
          <div className="bg-muted/70 border-b px-4 py-3">
            <h3 className="text-sm font-medium">
              {tGeoShared("searchPerformance")}
            </h3>
          </div>
          <dl className="grid grid-cols-2 gap-5 p-4 sm:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {tCommon("labels.impressions")}
              </dt>
              <dd className="text-xl font-medium tabular-nums">
                {gap.impressions === null
                  ? "—"
                  : formatCount(gap.impressions, locale)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {tCommon("labels.clicks")}
              </dt>
              <dd className="text-xl font-medium tabular-nums">
                {gap.clicks === null ? "—" : formatCount(gap.clicks, locale)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {tGeoShared("clickThroughRate")}
              </dt>
              <dd className="text-xl font-medium tabular-nums">
                {ctr === null ? "—" : `${formatPercent(ctr, locale)}%`}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {tCommon("labels.avgPosition")}
              </dt>
              <dd className="text-xl font-medium tabular-nums">
                {gap.position === null
                  ? "—"
                  : `#${formatOneDecimal(gap.position, locale)}`}
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground px-4 pb-4 text-xs">
            {t("acrossQueries")}
          </p>
        </section>

        <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
          <div className="bg-muted/70 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h3 className="text-sm font-medium">
              {tCommon("labels.recommendation")}
            </h3>
            <Badge
              className={GEO_SEARCH_GAP_ACTION_CLASS[gap.recommendation.action]}
              variant="outline"
            >
              {tGeoShared(
                GEO_SEARCH_GAP_ACTION_LABEL_KEYS[gap.recommendation.action]
              )}
            </Badge>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
              {gap.recommendation.reason}
            </p>
            {title && title !== gap.prompt ? (
              <div className="space-y-1 border-t pt-3">
                <p className="text-muted-foreground text-xs">
                  {gap.brief?.workingTitle
                    ? t("draftTitle")
                    : tGeoShared("suggestedTitle")}
                </p>
                <p className="text-sm leading-relaxed wrap-anywhere">{title}</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="min-w-0 space-y-3">
          <h3 className="text-sm font-medium">
            {tGeoShared("searchQueries")}{" "}
            <span className="text-muted-foreground font-normal tabular-nums">
              {gap.queries.length}
            </span>
          </h3>
          <DataTable
            columns={[
              {
                key: "query",
                header: tCommon("labels.query"),
                width: "1fr",
                minWidth: "10rem",
                sortable: true,
                cell: (query) => (
                  <span className="block leading-relaxed wrap-anywhere">
                    {query.query}
                  </span>
                ),
              },
              {
                key: "impressions",
                header: tCommon("labels.impressions"),
                width: "8.5rem",
                align: "right",
                sortable: true,
                cell: (query) => formatCount(query.impressions, locale),
              },
              {
                key: "clicks",
                header: tCommon("labels.clicks"),
                width: "6rem",
                align: "right",
                sortable: true,
                cell: (query) => formatCount(query.clicks, locale),
              },
              {
                key: "position",
                header: tCommon("labels.position"),
                width: "6.5rem",
                align: "right",
                sortable: true,
                cell: (query) => `#${formatOneDecimal(query.position, locale)}`,
              },
            ]}
            data={gap.queries}
            defaultSort={{ key: "impressions", direction: "desc" }}
            emptyState={t("noQueryData")}
            getRowId={(query) => query.query}
            height={360}
            rowSizing="content"
            autoHeight
          />
        </section>

        <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
          <div className="bg-muted/70 flex items-center justify-between gap-3 border-b px-4 py-3">
            <h3 className="text-sm font-medium">{t("relatedPages")}</h3>
            <span className="text-muted-foreground text-xs tabular-nums">
              {gap.recommendation.targets.length}
            </span>
          </div>
          {gap.recommendation.targets.length > 0 ? (
            <ul className="divide-y">
              {gap.recommendation.targets.map((target) => (
                <li
                  className="min-w-0 space-y-1.5 p-4"
                  key={`${target.kind}:${target.id}`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-muted-foreground text-xs">
                      {target.kind === "post"
                        ? tCommon("labels.content")
                        : t("websitePage")}
                    </p>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {t("match", {
                        percent: Math.round(target.score * 100),
                      })}
                    </span>
                  </div>
                  {target.url ? (
                    <a
                      className="decoration-border focus-visible:ring-ring block rounded-sm text-sm leading-relaxed wrap-anywhere underline underline-offset-4 hover:decoration-current focus-visible:ring-2"
                      href={target.url}
                      rel="noopener"
                      target="_blank"
                      title={target.title || target.url}
                    >
                      {target.title || target.url}
                    </a>
                  ) : (
                    <p className="text-sm leading-relaxed wrap-anywhere">
                      {target.title || t("untitledContent")}
                    </p>
                  )}
                  {target.url && target.title ? (
                    <p className="text-muted-foreground text-xs leading-relaxed wrap-anywhere">
                      {target.url}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground p-4 text-sm">
              {t("noRelatedPage")}
            </p>
          )}
        </section>
        {ai ? <AiSearchEvidence ai={ai} /> : null}
      </div>
    </SheetScrollArea>
  );
}

export function SearchGapDetailSheet({
  row,
  actions,
  onOpenChange,
}: GeoSearchGapDetailSheetProps) {
  const t = useTranslations("geo.searchGapDetail");
  const payload = useMemo(
    () => (row ? { row, actions } : null),
    [row, actions]
  );
  const [retained, releasePayload] = useRetainedValue(payload);
  const selected = retained?.row;
  const gap = selected?.kind === "console" ? selected.row : null;
  const ai =
    selected?.kind === "console" ? selected.ai : (selected?.row ?? null);

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releasePayload}
      open={row !== null}
    >
      <SheetContent
        className="data-[side=right]:w-[calc(100%-1rem)]"
        side="right"
        variant="inset"
      >
        <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
          <SheetDescription>{t("eyebrow")}</SheetDescription>
          <SheetTitle className="leading-snug text-balance wrap-anywhere">
            {gap?.prompt ?? ai?.query ?? t("fallbackTitle")}
          </SheetTitle>
        </SheetHeader>

        {gap ? (
          <ConsoleSearchGapDetails ai={ai} gap={gap} />
        ) : ai ? (
          <SheetScrollArea className="bg-muted/20 min-h-full p-4 sm:px-4">
            <AiSearchEvidence ai={ai} />
          </SheetScrollArea>
        ) : null}

        {retained?.actions ? (
          <SheetFooter className="shrink-0 flex-row flex-wrap justify-end border-t">
            {retained.actions}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
