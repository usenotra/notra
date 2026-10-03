"use client";
import {
  PlusSignIcon,
  FilterHorizontalIcon,
  WebhookIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DataTable } from "@notra/ui/components/ui/data-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { useWebhookColumns } from "@/components/webhooks/columns";
import {
  WEBHOOK_FILTERS,
  WEBHOOK_PAGE_SIZE,
  WEBHOOK_REFRESH_INTERVAL_MS,
  WEBHOOK_TABLE_EMPTY_HEIGHT,
  WEBHOOK_TABLE_ROW_HEIGHT,
} from "@/constants/outbound-webhooks";
import type { WebhookDeliveriesProps } from "@/types/webhooks/outbound";
import { isWebhookFilter } from "@/utils/outbound-webhooks";
import { paginatedTableHeightFor } from "@/utils/table";

export function WebhookDeliveries({
  rows,
  filter,
  offset,
  loading,
  fetching,
  hasMore,
  hasEndpoints,
  canCreate,
  onCreate,
  onSelect,
  onFilter,
  onPage,
}: WebhookDeliveriesProps) {
  const t = useTranslations("settings.panes.webhooks");
  const tStatuses = useTranslations("settings.panes.webhooks.statuses");
  const columns = useWebhookColumns();
  // A paged table shows the whole page; the header takes one row of height.
  const tableHeight =
    rows.length === 0
      ? WEBHOOK_TABLE_EMPTY_HEIGHT
      : paginatedTableHeightFor(rows.length, WEBHOOK_TABLE_ROW_HEIGHT);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Select
          onValueChange={(value) => onFilter(value ?? "all")}
          value={filter}
        >
          <SelectTrigger aria-label={t("filterLabel")} className="w-44">
            <SelectValue>
              {(value: string) =>
                isWebhookFilter(value) ? tStatuses(value) : value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {WEBHOOK_FILTERS.map((status) => (
              <SelectItem key={status} value={status}>
                {tStatuses(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Shown outside the pager so it stays visible before the first delivery. */}
        <span className="text-muted-foreground text-xs">
          {t("refreshInterval", {
            seconds: WEBHOOK_REFRESH_INTERVAL_MS / 1000,
          })}
        </span>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        onRowClick={onSelect}
        pagination={{
          mode: "cursor",
          page: Math.floor(offset / WEBHOOK_PAGE_SIZE) + 1,
          pageSize: WEBHOOK_PAGE_SIZE,
          hasNextPage: hasMore && !fetching,
          onPageChange: (page) => onPage((page - 1) * WEBHOOK_PAGE_SIZE),
          itemLabel: t("itemLabel"),
        }}
        rowHeight={WEBHOOK_TABLE_ROW_HEIGHT}
        height={tableHeight}
        loading={loading}
        skeletonRows={4}
        emptyState={
          <Empty className="py-8 md:py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon
                  icon={filter === "all" ? WebhookIcon : FilterHorizontalIcon}
                />
              </EmptyMedia>
              <EmptyTitle>
                {filter === "all"
                  ? t("empty.allTitle")
                  : t("empty.filteredTitle")}
              </EmptyTitle>
              <EmptyDescription>
                {filter === "all"
                  ? t("empty.allDescription")
                  : t("empty.filteredDescription")}
              </EmptyDescription>
            </EmptyHeader>
            {filter === "all" && hasEndpoints ? null : (
              <EmptyContent>
                {filter === "all" ? (
                  <Button disabled={!canCreate} onClick={onCreate} size="sm">
                    <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
                    {t("addEndpoint")}
                  </Button>
                ) : (
                  <Button
                    onClick={() => onFilter("all")}
                    size="sm"
                    variant="outline"
                  >
                    {t("empty.showAll")}
                  </Button>
                )}
              </EmptyContent>
            )}
          </Empty>
        }
      />
    </div>
  );
}
