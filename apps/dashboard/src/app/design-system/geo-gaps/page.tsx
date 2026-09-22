"use client";

import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import { useState } from "react";

import { Button } from "@/components/button";
import { SearchGapDetailSheet } from "@/components/geo/search-gap-detail";
import { Table, type TableColumn } from "@/components/motion/table";
import { DESIGN_SYSTEM_SEARCH_GAPS } from "@/constants/design-system-gaps";

import { PrototypeAnswerSheet } from "./prototype-answer-sheet";

/**
 * Mocked previews of the two content-gap surfaces: the prompt gap sheet and
 * the search gap sheet. The shipped components read live scan data, so
 * this page mirrors their layout with fixtures.
 */
const SEARCH_COLUMNS: TableColumn<
  (typeof DESIGN_SYSTEM_SEARCH_GAPS)[number]
>[] = [
  {
    key: "question",
    header: "Source question",
    width: "1fr",
    cell: (row) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{row.prompt}</span>
        <span className="text-muted-foreground truncate text-xs">
          {row.queries.length === 1
            ? "1 search query"
            : `${row.queries.length} search queries`}
        </span>
      </span>
    ),
  },
  {
    key: "impressions",
    header: "Impressions",
    width: "7rem",
    cell: (row) => (
      <span className="tabular-nums">
        {row.impressions?.toLocaleString("en-US") ?? "—"}
      </span>
    ),
  },
  {
    key: "recommendation",
    header: "Recommendation",
    width: "9rem",
    cell: (row) => (
      <span className="text-muted-foreground text-xs capitalize">
        {row.recommendation.action}
      </span>
    ),
  },
];

export default function GeoGapsSheetDemoPage() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    DESIGN_SYSTEM_SEARCH_GAPS.find((row) => row.id === selectedId) ?? null;

  return (
    <main className="bg-muted/30 min-h-screen space-y-8 p-8 lg:p-12">
      <Button onClick={() => setOpen(true)}>Prompt gap sheet</Button>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">
          Competitors · overflow stress test
        </h2>
        <LogoStack
          items={Array.from({ length: 129 }, (_, index) => ({
            key: `competitor-${index}`,
            label:
              index === 5
                ? "A competitor with a very long name that must wrap inside the list"
                : `Competitor ${index + 1}`,
            detail: "Discovered in answers, not tracked yet",
            renderIcon: (className) => (
              <span
                aria-hidden="true"
                className={`${className} bg-muted inline-flex items-center justify-center rounded-sm text-xs`}
              >
                C
              </span>
            ),
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Search gaps · side drawer</h2>
        <Table
          className="rounded-2xl"
          columns={SEARCH_COLUMNS}
          data={DESIGN_SYSTEM_SEARCH_GAPS}
          getRowId={(row) => row.id}
          height={520}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </section>

      <PrototypeAnswerSheet onOpenChange={setOpen} open={open} />
      <SearchGapDetailSheet
        actions={
          <Button onClick={() => setSelectedId(null)} variant="outline">
            Close preview
          </Button>
        }
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedId(null);
          }
        }}
        row={selected}
      />
    </main>
  );
}
