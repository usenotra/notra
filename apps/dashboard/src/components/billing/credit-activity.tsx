"use client";

import { FEATURES } from "@notra/ai/billing/features";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@notra/ui/components/ui/pagination";
import { cn } from "@notra/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAutumnClient } from "autumn-js/react";
import { parseAsInteger, useQueryState } from "nuqs";

import { Table, type TableColumn } from "@/components/motion/table";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CREDIT_EVENTS_PAGE_SIZE } from "@/constants/billing-credits";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { authClient } from "@/lib/auth/client";
import type { ListEventsRow } from "@/types/billing/credits";
import { getCreditEventLabel } from "@/utils/credit-events";
import { formatDollars, formatFullDate } from "@/utils/format";
import { hasMorePaginatedResults } from "@/utils/pagination";
import { paginatedTableHeightFor } from "@/utils/table";

const eventColumns: TableColumn<ListEventsRow>[] = [
  {
    key: "timestamp",
    header: "Date",
    width: "14rem",
    cell: (event) => (
      <span className="text-muted-foreground text-sm">
        {formatFullDate(event.timestamp)}
      </span>
    ),
  },
  {
    key: "type",
    header: "Type",
    width: "1fr",
    minWidth: "10rem",
    cell: getCreditEventLabel,
  },
  {
    key: "value",
    header: "Amount",
    width: "8rem",
    align: "right",
    cell: (event) => (
      <span className="font-medium tabular-nums">
        {formatDollars(event.value)}
      </span>
    ),
  },
];

export function CreditActivity() {
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );
  const eventsOffset = Math.max(0, page - 1) * CREDIT_EVENTS_PAGE_SIZE;
  const autumnClient = useAutumnClient({ caller: "CreditsPageClient" });
  const { activeOrganization } = useOrganizationsContext();
  const { data: session } = authClient.useSession();
  const sessionMatchesOrganization =
    Boolean(activeOrganization?.id) &&
    session?.session.activeOrganizationId === activeOrganization?.id;
  const { data: eventsData, isLoading } = useQuery({
    queryKey: [
      "autumn",
      "events",
      "list",
      activeOrganization?.id,
      FEATURES.AI_CREDITS,
      eventsOffset,
      CREDIT_EVENTS_PAGE_SIZE,
    ],
    queryFn: () => {
      const params = {
        featureId: FEATURES.AI_CREDITS,
        offset: eventsOffset,
        limit: CREDIT_EVENTS_PAGE_SIZE,
      };
      return autumnClient.listEvents(params);
    },
    enabled: sessionMatchesOrganization,
  });
  const hasMore = hasMorePaginatedResults(eventsData, CREDIT_EVENTS_PAGE_SIZE);
  const hasPrevious = page > 1;
  const visibleEvents =
    eventsData?.list.filter((event) => event.value !== 0) ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Activity</h2>
      <Table
        columns={eventColumns}
        data={isLoading ? [] : visibleEvents}
        emptyState="No usage events yet"
        getRowId={(event) => event.id}
        height={paginatedTableHeightFor(isLoading ? 5 : visibleEvents.length)}
        loading={isLoading}
        rowHeight={TABLE_ROW_HEIGHT}
      />
      {(hasPrevious || hasMore) && (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                className={cn(!hasPrevious && "pointer-events-none opacity-50")}
                onClick={(event) => {
                  event.preventDefault();
                  if (hasPrevious) {
                    setPage(Math.max(1, page - 1));
                  }
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                className={cn(!hasMore && "pointer-events-none opacity-50")}
                onClick={(event) => {
                  event.preventDefault();
                  if (hasMore) {
                    setPage(page + 1);
                  }
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
