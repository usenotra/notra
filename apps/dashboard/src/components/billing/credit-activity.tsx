"use client";

import { FEATURES } from "@notra/ai/billing/features";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { cn } from "@notra/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAutumnClient } from "autumn-js/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { parseAsInteger, useQueryState } from "nuqs";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CREDIT_EVENTS_PAGE_SIZE } from "@/constants/billing-credits";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { authClient } from "@/lib/auth/client";
import { useOutputTypeLabel } from "@/lib/hooks/use-output-type-label";
import { useScopedPreviousData } from "@/lib/hooks/use-scoped-previous-data";
import type { ListEventsRow } from "@/types/billing/credits";
import { getCreditEventLabel } from "@/utils/credit-events";
import { formatDollars } from "@/utils/format";
import { hasMorePaginatedResults } from "@/utils/pagination";
import { paginatedTableHeightFor } from "@/utils/table";

export function CreditActivity() {
  const t = useTranslations("billing.creditActivity");
  const tCommon = useTranslations("common");
  const outputTypeLabel = useOutputTypeLabel();
  const locale = useLocale();
  const format = useFormatter();
  const eventColumns: TableColumn<ListEventsRow>[] = [
    {
      key: "timestamp",
      header: tCommon("labels.date"),
      width: "14rem",
      cell: (event) => (
        <span className="text-muted-foreground text-sm">
          {format.dateTime(new Date(event.timestamp), {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "type",
      header: tCommon("labels.type"),
      width: "1fr",
      minWidth: "10rem",
      cell: (event) => getCreditEventLabel(event, t("aiChat"), outputTypeLabel),
    },
    {
      key: "value",
      header: tCommon("labels.amount"),
      width: "8rem",
      align: "right",
      cell: (event) => (
        <span className="font-medium tabular-nums">
          {formatDollars(event.value, locale)}
        </span>
      ),
    },
  ];
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger
      .withDefault(CREDIT_EVENTS_PAGE_SIZE)
      .withOptions({ clearOnDefault: true })
  );
  const eventsOffset = Math.max(0, page - 1) * pageSize;
  const autumnClient = useAutumnClient({ caller: "CreditsPageClient" });
  const { activeOrganization } = useOrganizationsContext();
  const { data: session } = authClient.useSession();
  const placeholderData = useScopedPreviousData<
    Awaited<ReturnType<typeof autumnClient.listEvents>>
  >(activeOrganization?.id);
  const sessionMatchesOrganization =
    Boolean(activeOrganization?.id) &&
    session?.session.activeOrganizationId === activeOrganization?.id;
  const {
    data: eventsData,
    isPending,
    isPlaceholderData,
  } = useQuery({
    queryKey: [
      "autumn",
      "events",
      "list",
      activeOrganization?.id,
      FEATURES.AI_CREDITS,
      eventsOffset,
      pageSize,
    ],
    queryFn: () => {
      const params = {
        featureId: FEATURES.AI_CREDITS,
        offset: eventsOffset,
        limit: pageSize,
      };
      return autumnClient.listEvents(params);
    },
    enabled: sessionMatchesOrganization,
    placeholderData,
  });
  const hasMore = hasMorePaginatedResults(eventsData, pageSize);
  const visibleEvents =
    eventsData?.list.filter((event) => event.value !== 0) ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <DataTable
        columns={eventColumns}
        data={visibleEvents}
        emptyState={t("empty")}
        pagination={{
          mode: "cursor",
          page,
          pageSize,
          onPageSizeChange: setPageSize,
          hasNextPage: hasMore,
          onPageChange: setPage,
          itemLabel: t("itemLabel"),
        }}
        getRowId={(event) => event.id}
        height={paginatedTableHeightFor(
          isPending && visibleEvents.length === 0 ? 5 : visibleEvents.length
        )}
        loading={isPending || isPlaceholderData}
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </div>
  );
}
