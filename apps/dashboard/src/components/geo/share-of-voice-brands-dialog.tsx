"use client";

import { Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import {
  PermissionOption,
  PermissionRow,
} from "@notra/ui/components/ui/permission-selector";
import { useRef, useState } from "react";

import { Button } from "@/components/button";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { TrackBrandButton } from "@/components/geo/share-of-voice-brand-tag";
import type {
  ShareOfVoiceBrandFilter,
  ShareOfVoiceBrandRowProps,
  ShareOfVoiceBrandsDialogProps,
} from "@/types/geo";
import { formatChartInteger, formatUsageShare } from "@/utils/geo-charts";
import { isOwnBrandName } from "@/utils/geo-competitors";

function ShareOfVoiceBrandRow({
  row,
  own,
  competitors,
  onOpen,
  onPrefetch,
  onTrack,
}: ShareOfVoiceBrandRowProps) {
  const tracked = own || row.tracked;
  const brand = (
    <>
      <CompetitorLogo
        className="size-6 shrink-0 rounded-md"
        competitors={competitors}
        name={row.brand}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm" title={row.brand}>
          {row.brand}
        </span>
        <span className="text-muted-foreground block text-xs tabular-nums sm:hidden">
          {formatChartInteger(row.mentions)} mentions
        </span>
      </span>
    </>
  );

  return (
    <tr className="border-border/60 hover:bg-muted/40 border-b last:border-b-0">
      <th className="min-w-0 px-3 text-left font-normal" scope="row">
        {onOpen ? (
          <button
            className="hover:text-primary flex min-h-12 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md py-2 text-left transition-colors"
            onClick={() => onOpen(row)}
            onFocus={() => onPrefetch?.(row)}
            onPointerEnter={() => onPrefetch?.(row)}
            type="button"
          >
            {brand}
          </button>
        ) : (
          <div className="flex min-h-12 min-w-0 items-center gap-2.5 py-2">
            {brand}
          </div>
        )}
      </th>
      <td className="text-muted-foreground hidden px-3 text-right text-sm tabular-nums sm:table-cell">
        {formatChartInteger(row.mentions)}
      </td>
      <td className="px-3 text-right text-sm tabular-nums">
        {formatUsageShare(row.share)}
      </td>
      <td className="px-3 text-right">
        {tracked ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <HugeiconsIcon
              aria-hidden="true"
              className="size-3.5"
              icon={Tick02Icon}
            />
            {own ? "Your brand" : "Tracked"}
          </span>
        ) : null}
        {!tracked && onTrack ? (
          <TrackBrandButton brand={row.brand} onTrack={onTrack} />
        ) : null}
        {!tracked && !onTrack ? (
          <span className="text-muted-foreground text-xs">Discovered</span>
        ) : null}
      </td>
    </tr>
  );
}

function ShareOfVoiceBrandsContent({
  onOpenChange,
  other,
  others,
  competitors,
  companyName,
  aliases,
  onBrandClick,
  onBrandPointerEnter,
  onTrackBrand,
}: ShareOfVoiceBrandsDialogProps) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<ShareOfVoiceBrandFilter>("all");
  const query = search.trim().toLowerCase();
  const rows = others
    .filter((row) => {
      const tracked =
        row.tracked || isOwnBrandName(row.brand, companyName, aliases);
      return (
        row.brand.toLowerCase().includes(query) &&
        (filter === "all" || (filter === "tracked" ? tracked : !tracked))
      );
    })
    .toSorted((a, b) => b.mentions - a.mentions);

  return (
    <>
      <ResponsiveDialogHeader className="bg-muted shrink-0 gap-2 px-5 pt-5 pr-12 pb-8 text-left">
        <ResponsiveDialogTitle className="text-base font-medium">
          Additional brands
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="text-xs">
          Brands grouped under “Other” in the selected period.
        </ResponsiveDialogDescription>
        <dl className="mt-3 grid grid-cols-3 gap-4">
          <div>
            <dt className="text-muted-foreground text-xs">Brands</dt>
            <dd className="mt-1 text-xl font-medium tabular-nums">
              {formatChartInteger(others.length)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Share</dt>
            <dd className="mt-1 text-xl font-medium tabular-nums">
              {formatUsageShare(other.share)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Mentions</dt>
            <dd className="mt-1 text-xl font-medium tabular-nums">
              {formatChartInteger(other.mentions)}
            </dd>
          </div>
        </dl>
      </ResponsiveDialogHeader>
      <div className="border-border bg-card relative -mt-4 flex min-h-0 flex-1 flex-col rounded-t-2xl border-t px-0!">
        <div className="flex shrink-0 flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <InputGroup className="min-w-0 flex-1">
            <InputGroupAddon>
              <HugeiconsIcon
                aria-hidden="true"
                className="size-4"
                icon={Search01Icon}
              />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              aria-label="Search brands"
              className="text-base sm:text-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search brands…"
              type="search"
              value={search}
            />
          </InputGroup>
          <PermissionRow
            className="w-fit shrink-0"
            label="Filter brands by tracking status"
            layout="compact"
            onValueChange={(value) => {
              if (
                value === "all" ||
                value === "tracked" ||
                value === "discovered"
              ) {
                setFilter(value);
              }
            }}
            value={filter}
          >
            <PermissionOption value="all">All</PermissionOption>
            <PermissionOption value="tracked">Tracked</PermissionOption>
            <PermissionOption value="discovered">Discovered</PermissionOption>
          </PermissionRow>
        </div>
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4">
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">
              Additional brands sorted by mentions. Share is based on all brand
              mentions in the selected period.
            </caption>
            <thead className="bg-card text-muted-foreground sticky top-0 z-10 text-xs">
              <tr className="border-border border-b">
                <th className="px-3 py-2 text-left font-normal" scope="col">
                  Brand
                </th>
                <th
                  className="hidden w-20 px-3 py-2 text-right font-normal sm:table-cell"
                  scope="col"
                >
                  Mentions
                </th>
                <th
                  className="w-16 px-3 py-2 text-right font-normal sm:w-20"
                  scope="col"
                >
                  Share
                </th>
                <th
                  className="w-24 px-3 py-2 text-right font-normal"
                  scope="col"
                >
                  Tracking
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ShareOfVoiceBrandRow
                  competitors={competitors}
                  key={row.id}
                  onOpen={
                    onBrandClick
                      ? (brand) => {
                          onOpenChange(false);
                          onBrandClick(brand);
                        }
                      : undefined
                  }
                  onPrefetch={onBrandPointerEnter}
                  onTrack={
                    onTrackBrand
                      ? (brand) => {
                          onOpenChange(false);
                          onTrackBrand(brand);
                        }
                      : undefined
                  }
                  own={isOwnBrandName(row.brand, companyName, aliases)}
                  row={row}
                />
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-sm font-medium">
                {query ? "No matching brands" : "No brands in this view"}
              </p>
              <p className="text-muted-foreground text-xs">
                {query
                  ? "Try another name or clear your filters."
                  : "Select another tracking status to see more brands."}
              </p>
              <Button
                className="mt-1"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  searchRef.current?.focus();
                }}
                size="sm"
                variant="outline"
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
        <div className="border-border text-muted-foreground flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-xs">
          <span role="status">
            {rows.length} of {others.length} brands
          </span>
          <span>Share of all brand mentions</span>
        </div>
      </div>
    </>
  );
}

export function ShareOfVoiceBrandsDialog(props: ShareOfVoiceBrandsDialogProps) {
  return (
    <ResponsiveDialog onOpenChange={props.onOpenChange} open={props.open}>
      <ResponsiveDialogContent
        className="bg-muted flex h-[min(42rem,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl"
        drawerClassName="h-[92svh] max-h-[92svh] rounded-b-none"
      >
        <ShareOfVoiceBrandsContent {...props} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
