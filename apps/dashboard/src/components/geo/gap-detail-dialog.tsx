"use client";

import {
  GEO_SEARCH_GAP_ACTION_CLASS,
  GEO_SEARCH_GAP_ACTION_LABELS,
} from "@notra/geo-core/constants/geo";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
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

import type { GeoGapDetailDialogProps } from "@/types/components/geo-gaps";
import { formatMentionRate } from "@/utils/geo-charts";
import { gapLift, gapMissingEngineFamilies } from "@/utils/geo-gaps";

function PromptGapFacts({ prompt }: Pick<GeoGapDetailDialogProps, "prompt">) {
  if (!prompt) {
    return null;
  }
  const lift = gapLift(prompt);

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground text-xs">Mention rate</dt>
        <dd>{formatMentionRate(prompt.ownMentionRate)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Visible on</dt>
        <dd>
          {gapMissingEngineFamilies(prompt.mentionedEngines)
            .map(engineFamilyLabel)
            .join(", ") || "No engines"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Missing on</dt>
        <dd>
          {gapMissingEngineFamilies(prompt.engines)
            .map(engineFamilyLabel)
            .join(", ") || "No engines"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">
          Brands mentioned instead
        </dt>
        <dd className="break-words">
          {[...prompt.competitors, ...prompt.discoveredCompetitors].join(
            ", "
          ) || "None"}
        </dd>
      </div>
      {lift ? (
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground text-xs">
            Progress since baseline
          </dt>
          <dd className="tabular-nums">
            {lift.before}/{lift.baselineTotal} → {lift.after}/{lift.total}{" "}
            mentions
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function SearchGapFacts({ search }: Pick<GeoGapDetailDialogProps, "search">) {
  if (!search) {
    return null;
  }
  return (
    <>
      <dl className="bg-muted/30 grid grid-cols-3 gap-4 rounded-xl border p-4">
        <div>
          <dt className="text-muted-foreground text-xs">Impressions</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">
            {search.impressions?.toLocaleString() ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Clicks</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">
            {search.clicks?.toLocaleString() ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Position</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">
            {search.position === null ? "—" : `#${search.position.toFixed(1)}`}
          </dd>
        </div>
      </dl>
      <section className="overflow-hidden rounded-xl border">
        <div className="bg-muted/30 space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">Recommendation</h3>
            <Badge
              className={
                GEO_SEARCH_GAP_ACTION_CLASS[search.recommendation.action]
              }
              variant="outline"
            >
              {GEO_SEARCH_GAP_ACTION_LABELS[search.recommendation.action]}
            </Badge>
          </div>
          <p className="text-muted-foreground leading-relaxed text-pretty">
            {search.recommendation.reason}
          </p>
        </div>
        {search.recommendation.targets.length > 0 ? (
          <div className="space-y-3 border-t p-4">
            <h4 className="text-muted-foreground text-xs font-medium">
              Related content
            </h4>
            <ul className="space-y-4">
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
          </div>
        ) : null}
      </section>
      <section className="space-y-2">
        <h3 className="font-medium">
          Search queries ({search.queries.length})
        </h3>
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
      </section>
    </>
  );
}

export function GapDetailDialog({
  prompt,
  search,
  searchActions,
  onOpenChange,
}: GeoGapDetailDialogProps) {
  const row = prompt ?? search;

  if (!prompt) {
    return (
      <Sheet onOpenChange={onOpenChange} open={search !== null}>
        <SheetContent
          side="right"
          className="gap-0 overflow-hidden data-[side=right]:w-full sm:rounded-xl sm:border data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-auto data-[side=right]:sm:max-w-2xl"
        >
          <SheetHeader className="bg-muted/50 shrink-0 border-b pr-14">
            <SheetTitle>Search gap</SheetTitle>
            <SheetDescription>
              Search performance and content recommendation
            </SheetDescription>
          </SheetHeader>
          {search ? (
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 text-sm">
              <section className="space-y-2">
                <h3 className="text-muted-foreground text-xs">
                  Source question
                </h3>
                <p className="text-lg leading-snug font-medium break-words">
                  {search.prompt}
                </p>
              </section>
              <SearchGapFacts search={search} />
              <section className="space-y-2 rounded-xl border p-4">
                <h3 className="font-medium">Suggested asset</h3>
                <p className="text-muted-foreground break-words">
                  {search.brief?.workingTitle ??
                    search.title ??
                    "Title is drafted when you write"}
                </p>
              </section>
            </div>
          ) : null}
          {searchActions ? (
            <SheetFooter className="shrink-0 border-t p-4">
              {searchActions}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={row !== null}>
      <ResponsiveDialogContent className="flex max-h-[85svh] flex-col sm:max-w-2xl">
        <ResponsiveDialogHeader className="shrink-0">
          <ResponsiveDialogTitle>Prompt gap details</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            Source question, supporting metrics, and suggested content.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="min-h-0 space-y-6 overflow-auto overscroll-contain px-4 pb-4 text-sm md:px-0 md:pb-0">
          <div>
            <h3 className="text-muted-foreground mb-1 text-xs">
              Source question
            </h3>
            <p className="break-words">{row?.prompt}</p>
          </div>
          <div>
            <h3 className="text-muted-foreground mb-1 text-xs">
              Suggested asset
            </h3>
            <p className="break-words">
              {row?.brief?.workingTitle ??
                row?.title ??
                "Title is drafted when you write"}
            </p>
          </div>
          <PromptGapFacts prompt={prompt} />
          <SearchGapFacts search={search} />
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
