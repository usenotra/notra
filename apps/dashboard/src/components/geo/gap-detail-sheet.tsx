"use client";

import {
  GEO_GAPS_COMPETITOR_DETAIL,
  GEO_GAPS_METER_STEPS,
  GEO_GAPS_WON_LABEL,
  GEO_SEARCH_GAP_ACTION_CLASS,
  GEO_SEARCH_GAP_ACTION_LABELS,
} from "@notra/geo-core/constants/geo";
import { findCompetitor } from "@notra/geo-core/geo/domain";
import type {
  GeoCompetitor,
  GeoPromptGapRow,
  GeoSearchGapRow,
} from "@notra/geo-core/types/geo";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { useState } from "react";

import { Button } from "@/components/button";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import type {
  GeoGapBrandListProps,
  GeoGapDetailRow,
  GeoGapDetailSectionProps,
  GeoGapDetailSheetProps,
  GeoGapDetailStatProps,
  GeoGapEngineListProps,
} from "@/types/components/geo-gaps";
import { formatMentionRate } from "@/utils/geo-charts";
import {
  gapLift,
  gapMeterLevel,
  gapMissingEngineFamilies,
} from "@/utils/geo-gaps";

const GAP_SHEET_CONTENT_CLASS =
  "gap-0 overflow-hidden data-[side=right]:w-full sm:rounded-xl sm:border data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-auto data-[side=right]:sm:max-w-2xl";
const GAP_SHEET_BRAND_PREVIEW = 18;

function DetailSection({ title, readout, children }: GeoGapDetailSectionProps) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {readout ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {readout}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DetailStat({ label, value }: GeoGapDetailStatProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-xl leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function EngineList({ families, emptyLabel }: GeoGapEngineListProps) {
  if (families.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {families.map((family) => (
        <li
          className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs"
          key={family}
        >
          <EngineIcon className="size-3.5" engine={family} />
          {engineFamilyLabel(family)}
        </li>
      ))}
    </ul>
  );
}

function BrandList({ competitors, tracked, discovered }: GeoGapBrandListProps) {
  const [showAll, setShowAll] = useState(false);
  const brands = [
    ...tracked.map((name) => ({ name, tracked: true })),
    ...discovered.map((name) => ({ name, tracked: false })),
  ];
  if (brands.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No other brands were mentioned
      </p>
    );
  }
  const visible = showAll ? brands : brands.slice(0, GAP_SHEET_BRAND_PREVIEW);
  const hiddenCount = brands.length - visible.length;

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-1.5">
        {visible.map((brand) => (
          <li
            className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2 text-xs"
            key={`${brand.tracked ? "tracked" : "discovered"}:${brand.name}`}
            title={
              brand.tracked
                ? GEO_GAPS_COMPETITOR_DETAIL.tracked
                : GEO_GAPS_COMPETITOR_DETAIL.discovered
            }
          >
            <CompetitorLogo
              className="size-3.5 shrink-0"
              domain={
                brand.tracked
                  ? (findCompetitor(competitors, brand.name)?.domain ?? null)
                  : null
              }
              name={brand.name}
            />
            <span className="truncate">{brand.name}</span>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <Button onClick={() => setShowAll(true)} size="sm" variant="ghost">
          Show {hiddenCount.toLocaleString()} more
        </Button>
      ) : null}
    </div>
  );
}

function PromptGapBody({
  prompt,
  competitors,
  maxOpportunity,
}: {
  prompt: GeoPromptGapRow;
  competitors: GeoCompetitor[];
  maxOpportunity: number;
}) {
  const lift = gapLift(prompt);
  const visibleFamilies = gapMissingEngineFamilies(prompt.mentionedEngines);
  const missingFamilies = gapMissingEngineFamilies(prompt.engines);
  const allFamilies = gapMissingEngineFamilies([
    ...prompt.mentionedEngines,
    ...prompt.engines,
  ]);
  const brandCount =
    prompt.competitors.length + prompt.discoveredCompetitors.length;
  const level = gapMeterLevel(
    maxOpportunity <= 0 ? 0 : prompt.opportunity / maxOpportunity
  );

  return (
    <>
      <dl className="bg-muted/30 grid grid-cols-3 gap-4 rounded-xl border p-4">
        <DetailStat
          label="Opportunity"
          value={
            prompt.won ? GEO_GAPS_WON_LABEL : `${level}/${GEO_GAPS_METER_STEPS}`
          }
        />
        <DetailStat
          label="Mention rate"
          value={formatMentionRate(prompt.ownMentionRate)}
        />
        <DetailStat
          label="Engines mentioning you"
          value={`${visibleFamilies.length}/${allFamilies.length}`}
        />
      </dl>

      {lift ? (
        <DetailSection title="Progress since baseline">
          <p className="text-muted-foreground tabular-nums">
            {lift.before}/{lift.baselineTotal} → {lift.after}/{lift.total}{" "}
            mentions
          </p>
        </DetailSection>
      ) : null}

      <DetailSection
        readout={missingFamilies.length.toLocaleString()}
        title="Missing on"
      >
        <EngineList emptyLabel="No engines" families={missingFamilies} />
      </DetailSection>

      <DetailSection
        readout={visibleFamilies.length.toLocaleString()}
        title="Mentions you on"
      >
        <EngineList
          emptyLabel="Not visible on any engine yet"
          families={visibleFamilies}
        />
      </DetailSection>

      <DetailSection
        readout={brandCount.toLocaleString()}
        title="Brands mentioned instead"
      >
        <BrandList
          competitors={competitors}
          discovered={prompt.discoveredCompetitors}
          tracked={prompt.competitors}
        />
      </DetailSection>
    </>
  );
}

function SearchGapBody({ search }: { search: GeoSearchGapRow }) {
  return (
    <>
      <dl className="bg-muted/30 grid grid-cols-3 gap-4 rounded-xl border p-4">
        <DetailStat
          label="Impressions"
          value={search.impressions?.toLocaleString() ?? "—"}
        />
        <DetailStat
          label="Clicks"
          value={search.clicks?.toLocaleString() ?? "—"}
        />
        <DetailStat
          label="Position"
          value={
            search.position === null ? "—" : `#${search.position.toFixed(1)}`
          }
        />
      </dl>

      <DetailSection title="Recommendation">
        <div className="space-y-3 rounded-xl border p-4">
          <Badge
            className={
              GEO_SEARCH_GAP_ACTION_CLASS[search.recommendation.action]
            }
            variant="outline"
          >
            {GEO_SEARCH_GAP_ACTION_LABELS[search.recommendation.action]}
          </Badge>
          <p className="text-muted-foreground leading-relaxed text-pretty">
            {search.recommendation.reason}
          </p>
          {search.recommendation.targets.length > 0 ? (
            <ul className="space-y-4 border-t pt-3">
              {search.recommendation.targets.map((target) => (
                <li className="space-y-2" key={`${target.kind}:${target.id}`}>
                  {target.url ? (
                    <a
                      className="focus-visible:ring-ring decoration-border block min-w-0 rounded-sm font-medium break-words underline underline-offset-4 hover:decoration-current focus-visible:ring-2"
                      href={target.url}
                      rel="noopener"
                      target="_blank"
                    >
                      {target.title || target.url}
                    </a>
                  ) : (
                    <span className="block font-medium break-words">
                      {target.title || "Untitled content"}
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <GeoBar
                      className="h-1.5 max-w-32"
                      max={1}
                      value={target.score}
                    />
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {Math.round(target.score * 100)}% match
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection
        readout={search.queries.length.toLocaleString()}
        title="Search queries"
      >
        {search.queries.length === 0 ? (
          <p className="text-muted-foreground">No search queries available</p>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {search.queries.map((query) => (
                  <TableRow key={query.query}>
                    <TableCell className="min-w-32 break-words whitespace-normal">
                      {query.query}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {query.impressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      #{query.position.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailSection>
    </>
  );
}

function selectedDetail(
  prompt: GeoPromptGapRow | null,
  search: GeoSearchGapRow | null
): GeoGapDetailRow | null {
  if (prompt) {
    return { kind: "prompt", row: prompt };
  }
  if (search) {
    return { kind: "search", row: search };
  }
  return null;
}

function GapDetailHeader({ detail }: { detail: GeoGapDetailRow | null }) {
  const row = detail?.row;
  const headline = row?.brief?.workingTitle ?? row?.title ?? null;
  let description =
    detail?.kind === "search"
      ? "Search demand without a page that answers it"
      : "Engines answer this question without mentioning you";
  if (headline && row && headline !== row.prompt) {
    description = row.prompt;
  }

  return (
    <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
      <span className="text-muted-foreground text-xs">
        {detail?.kind === "search" ? "Search gap" : "Prompt gap"}
      </span>
      <SheetTitle className="text-base leading-snug text-balance break-words">
        {headline ?? row?.prompt ?? "Content gap"}
      </SheetTitle>
      <SheetDescription className="break-words">{description}</SheetDescription>
    </SheetHeader>
  );
}

function GapDetailBody({
  detail,
  competitors,
  maxOpportunity,
}: {
  detail: GeoGapDetailRow | null;
  competitors: GeoCompetitor[];
  maxOpportunity: number;
}) {
  if (detail?.kind === "prompt") {
    // Keyed per gap so local UI state (expanded brand list) resets on switch.
    return (
      <PromptGapBody
        competitors={competitors}
        key={detail.row.id}
        maxOpportunity={maxOpportunity}
        prompt={detail.row}
      />
    );
  }
  if (detail?.kind === "search") {
    return <SearchGapBody key={detail.row.id} search={detail.row} />;
  }
  return null;
}

export function GapDetailSheet({
  prompt,
  search,
  competitors,
  maxOpportunity,
  actions,
  onOpenChange,
}: GeoGapDetailSheetProps) {
  const current = selectedDetail(prompt, search);
  // Keep the last row rendered while the sheet animates out, e.g. after an
  // ignored gap disappears from the list.
  const [retained, setRetained] = useState(current);
  if (current && current.row !== retained?.row) {
    setRetained(current);
  }
  const detail = current ?? retained;

  return (
    <Sheet onOpenChange={onOpenChange} open={current !== null}>
      <SheetContent className={GAP_SHEET_CONTENT_CLASS} side="right">
        <GapDetailHeader detail={detail} />
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 text-sm">
          <GapDetailBody
            competitors={competitors}
            detail={detail}
            maxOpportunity={maxOpportunity}
          />
        </div>
        {actions ? (
          <SheetFooter className="shrink-0 flex-row justify-end border-t p-4">
            {actions}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
