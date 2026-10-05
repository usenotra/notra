import { describe, expect, test } from "bun:test";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

import { ShelfBoard } from "@/components/geo/shelf/shelf-board";
import { ShelfView } from "@/components/geo/shelf/shelf-view";
import { buildGeoShelfFixture } from "@/lib/geo-shelf/fixtures";
import type { GeoShelfViewProps } from "@/types/geo-shelf";
import { toShelfRows } from "@/utils/geo-shelf";

const sources = buildGeoShelfFixture(
  {
    ownBrandName: "Example",
    ownDomain: "example.com",
    competitors: [],
    engines: [],
    members: [],
    now: new Date("2026-10-05T00:00:00Z"),
  },
  { organizationId: "test", projectId: "test" }
);
const source = sources.find((item) => item.opportunity?.status === "open");
if (!source) {
  throw new Error("The shelf fixture must include an open ticket");
}
const rows = toShelfRows(
  Array.from({ length: 10_000 }, (_, index) => ({
    ...source,
    id: `shelf-${index}`,
    title: `Shelf ${index}`,
  })),
  []
);
const props: GeoShelfViewProps = {
  view: "table",
  rows,
  totalCount: rows.length,
  filteredCount: rows.length,
  boardCounts: {
    untracked: 0,
    open: rows.length,
    in_progress: 0,
    won: 0,
    lost: 0,
    dismissed: 0,
  },
  sort: { key: "citations", direction: "desc" },
  onSortChange: () => undefined,
  hasNextPage: false,
  isFetching: false,
  isFetchingNextPage: false,
  onLoadMore: () => undefined,
  ticketFilter: "any",
  currentMemberId: null,
  pendingSourceIds: new Set(),
  hasScanData: true,
  onAddShelf: () => undefined,
  onRowClick: () => undefined,
  onUpdateOpportunity: () => undefined,
  onSetPlacementStatus: () => undefined,
  competitorCount: 0,
};

describe("Shelf Space bounded rendering", () => {
  test("a 10k-row table renders only its virtual window", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <ShelfView {...props} />
      </QueryClientProvider>
    );
    expect(markup).toContain("Shelf 0");
    expect(markup).not.toContain("Shelf 9999");
    expect(markup.match(/<tr\b/g)?.length).toBeLessThan(50);
  });

  test("a 10k-card board renders only its virtual window and full count", () => {
    const markup = renderToStaticMarkup(<ShelfView {...props} view="board" />);
    expect(markup).toContain("10000");
    expect(markup).toContain("Shelf 0");
    expect(markup).not.toContain("Shelf 9999");
    expect(markup.match(/data-index=/g)?.length).toBeLessThan(50);
  });

  test("a filtered empty board preserves the no-matches state", () => {
    const markup = renderToStaticMarkup(
      <ShelfView {...props} filteredCount={0} rows={[]} view="board" />
    );
    expect(markup).toContain("No shelves match these filters");
    expect(markup).not.toContain("data-index=");
  });

  test("the board uses the available height and selected ticket columns", () => {
    const markup = renderToStaticMarkup(
      <ShelfBoard {...props} height={380} ticketFilter="open" />
    );
    expect(markup).toContain("--shelf-height:380px");
    expect(markup.match(/<section\b/g)?.length).toBe(1);
    expect(markup).toContain("10000");
  });
});
