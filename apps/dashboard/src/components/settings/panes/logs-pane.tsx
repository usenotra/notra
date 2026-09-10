"use client";

import { useQuery } from "@tanstack/react-query";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import { useState } from "react";

import { columns } from "@/app/(dashboard)/[slug]/settings/logs/columns";
import { DataTable } from "@/app/(dashboard)/[slug]/settings/logs/data-table";
import { LogsPageSkeleton } from "@/app/(dashboard)/[slug]/settings/logs/skeleton";
import { Button } from "@/components/button";
import { LogDetailsSheet } from "@/components/logs/log-details-sheet";
import { LogFilters } from "@/components/logs/log-filters";
import { LogRetentionHint } from "@/components/logs/log-retention-hint";
import type { SortState } from "@/components/motion/table/types";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SettingsPane } from "@/components/settings/settings-pane";
import {
  SOURCE_VALUES,
  STATUS_VALUES,
  LOGS_PAGE_SIZE,
  LOGS_OVERVIEW_STALE_TIME_MS,
} from "@/constants/logs";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { LogSelection } from "@/types/logs/details-sheet";
import { getLogPage } from "@/utils/log-pagination";

export function LogsSettingsPane() {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [source, setSource] = useQueryState(
    "source",
    parseAsStringLiteral(SOURCE_VALUES).withDefault("all")
  );
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(STATUS_VALUES).withDefault("all")
  );
  const [selection, setSelection] = useState<LogSelection | null>(null);
  const selectedLog =
    selection?.organizationId === organizationId ? selection.log : null;
  const [sort, setSort] = useState<SortState | null>({
    key: "createdAt",
    direction: "desc",
  });
  const resetPage = () => setPage(1);
  const refreshLogs = () => {
    if (organizationId) {
      return logsQuery.refetch();
    }
  };
  const logsQuery = useQuery({
    ...dashboardOrpc.logs.webhooks.overview.queryOptions({
      input: { organizationId },
    }),
    enabled: Boolean(organizationId),
    staleTime: LOGS_OVERVIEW_STALE_TIME_MS,
  });
  const result = getLogPage(logsQuery.data?.logs ?? [], {
    page,
    pageSize: LOGS_PAGE_SIZE,
    source,
    status,
    search,
    sort,
  });
  const filtersActive =
    source !== "all" || status !== "all" || search.length > 0;
  const resetFilters = () => {
    setSearch("");
    setSource("all");
    setStatus("all");
    resetPage();
  };
  return (
    <SettingsPane titleAccessory={<LogRetentionHint />}>
      <LogFilters
        search={search}
        source={source}
        status={status}
        onSearchChange={(value) => {
          setSearch(value);
          resetPage();
        }}
        onSourceChange={(value) => {
          setSource(value);
          resetPage();
        }}
        onStatusChange={(value) => {
          setStatus(value);
          resetPage();
        }}
        onRefresh={refreshLogs}
        isFetching={logsQuery.isFetching}
        hasData={Boolean(logsQuery.data)}
      />
      {logsQuery.isError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 text-sm"
        >
          <p>Unable to load logs. Try refreshing.</p>
          <Button variant="outline" size="sm" onClick={refreshLogs}>
            Retry
          </Button>
        </div>
      ) : null}
      {organizationId && logsQuery.isPending ? <LogsPageSkeleton /> : null}
      {logsQuery.data ? (
        <DataTable
          columns={columns}
          data={result.logs}
          getRowId={(log) => log.id}
          sort={sort}
          onSortChange={(next) => {
            setSort(next);
            resetPage();
          }}
          emptyState={
            filtersActive
              ? {
                  title: "No logs match your filters",
                  description: "Try a different search, source, or status.",
                  actionLabel: "Reset filters",
                  onActionClick: resetFilters,
                }
              : {
                  title: "No logs yet",
                  description:
                    "Activity from your integrations and automations will show up here.",
                }
          }
          onPageChange={setPage}
          onRowClick={(log) => setSelection({ organizationId, log })}
          page={result.page}
          totalPages={result.totalPages}
          totalCount={result.totalCount}
        />
      ) : null}
      <LogDetailsSheet
        key={organizationId}
        organizationId={organizationId}
        organizationSlug={activeOrganization?.slug ?? ""}
        log={selectedLog}
        onOpenChange={(open) => {
          if (!open) {
            setSelection(null);
          }
        }}
        open={selectedLog !== null}
      />
    </SettingsPane>
  );
}
