import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { IntlProvider } from "use-intl";

import { ShelfView } from "@/components/geo/shelf/shelf-view";
import { buildGeoShelfFixture } from "@/lib/geo-shelf/fixtures";
import type { GeoShelfView } from "@/types/geo-shelf";
import { toShelfRows } from "@/utils/geo-shelf";

import messages from "../../messages/en.json";

import "./shelf.css";

const source = buildGeoShelfFixture(
  {
    ownBrandName: "Example",
    ownDomain: "example.com",
    competitors: [],
    engines: [],
    members: [],
    now: new Date("2026-10-05T00:00:00Z"),
  },
  { organizationId: "test", projectId: "test" }
).find((row) => row.opportunity?.status === "open");
if (!source) {
  throw new Error("The shelf fixture must include an open ticket");
}
const seed = toShelfRows(
  Array.from({ length: 10_000 }, (_, index) => ({
    ...source,
    id: `shelf-${index}`,
    title: `Shelf ${index}`,
  })),
  []
);

export function ShelfFixture() {
  const query = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const windowScroll = query.get("scroll") === "window";
  const [view, setView] = useState<GeoShelfView>(
    query.get("view") === "board" ? "board" : "table"
  );
  const [client] = useState(() => new QueryClient());
  const [rows, setRows] = useState(seed);
  const [event, setEvent] = useState("");

  return (
    <QueryClientProvider client={client}>
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <div data-fixture={windowScroll ? "window" : "shell"}>
          <div data-fixture="toolbar">
            <button
              onClick={() => setView(view === "table" ? "board" : "table")}
              type="button"
            >
              Switch view
            </button>
            <output aria-label="Shelf event">{event}</output>
          </div>
          <main data-testid="scrollport" data-fixture="scrollport">
            <div data-fixture="content">
              <header
                data-partial={query.has("partial") || undefined}
                data-fixture={
                  query.has("compact") ? "compact-header" : "tall-header"
                }
              >
                <h1>Shelf Space</h1>
                <p>Synthetic shelves for mounted browser regression tests.</p>
              </header>
              <div data-testid="shelf">
                <ShelfView
                  boardCounts={{
                    untracked: 0,
                    open: rows.filter(
                      (row) => row.opportunity?.status === "open"
                    ).length,
                    in_progress: rows.filter(
                      (row) => row.opportunity?.status === "in_progress"
                    ).length,
                    won: 0,
                    lost: 0,
                    dismissed: 0,
                  }}
                  competitorCount={0}
                  currentMemberId={null}
                  filteredCount={rows.length}
                  hasNextPage={false}
                  hasScanData
                  isFetching={false}
                  isFetchingNextPage={false}
                  onAddShelf={() => setEvent("add")}
                  onLoadMore={() => setEvent("loadMore")}
                  onRowClick={(row) => setEvent(`open:${row.id}`)}
                  onSetPlacementStatus={(id) => setEvent(`placement:${id}`)}
                  onSortChange={(sort) => setEvent(`sort:${sort.key}`)}
                  onUpdateOpportunity={(id, change) => {
                    setEvent(`move:${id}:${change.status}`);
                    setRows((previous) =>
                      previous.map((row) =>
                        row.id === id && row.opportunity
                          ? {
                              ...row,
                              opportunity: { ...row.opportunity, ...change },
                            }
                          : row
                      )
                    );
                  }}
                  pendingSourceIds={new Set()}
                  rows={rows}
                  sort={{ key: "citations", direction: "desc" }}
                  ticketFilter="any"
                  totalCount={rows.length}
                  view={view}
                />
              </div>
              {query.has("no-footer") ? null : <footer data-fixture="footer" />}
            </div>
          </main>
        </div>
      </IntlProvider>
    </QueryClientProvider>
  );
}
