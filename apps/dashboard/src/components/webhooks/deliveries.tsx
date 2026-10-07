"use client";
import {
  FilterHorizontalIcon,
  PlusSignIcon,
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
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useWebhookColumns } from "@/components/webhooks/columns";
import {
  WEBHOOK_FILTERS,
  WEBHOOK_PAGE_SIZE,
  WEBHOOK_TABLE_EMPTY_HEIGHT,
  WEBHOOK_TABLE_ROW_HEIGHT,
} from "@/constants/outbound-webhooks";
import type {
  WebhookDeliveriesProps,
  WebhookStatusFilterProps,
} from "@/types/webhooks/outbound";
import { isWebhookFilter } from "@/utils/outbound-webhooks";
import { paginatedTableHeightFor } from "@/utils/table";

export function WebhookStatusFilter({
  filter,
  onFilter,
}: WebhookStatusFilterProps) {
  const t = useTranslations("settings.panes.webhooks");
  const tStatuses = useTranslations("settings.panes.webhooks.statuses");
  return (
    <Select onValueChange={(value) => onFilter(value ?? "all")} value={filter}>
      <SelectTrigger aria-label={t("filterLabel")} className="w-36">
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
  );
}

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
  const columns = useWebhookColumns();
  // A paged table shows the whole page; the header takes one row of height.
  const tableHeight =
    rows.length === 0
      ? WEBHOOK_TABLE_EMPTY_HEIGHT
      : paginatedTableHeightFor(rows.length, WEBHOOK_TABLE_ROW_HEIGHT);
  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyState={
        <WebhookDeliveriesEmpty
          canCreate={canCreate}
          filter={filter}
          hasEndpoints={hasEndpoints}
          onCreate={onCreate}
          onShowAll={() => onFilter("all")}
        />
      }
      getRowId={(row) => row.id}
      height={tableHeight}
      loading={loading}
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
      skeletonRows={4}
    />
  );
}

function WebhookDeliveriesEmpty({
  filter,
  hasEndpoints,
  canCreate,
  onCreate,
  onShowAll,
}: {
  filter: WebhookDeliveriesProps["filter"];
  hasEndpoints: boolean;
  canCreate: boolean;
  onCreate: () => void;
  onShowAll: () => void;
}) {
  const t = useTranslations("settings.panes.webhooks");
  const filtered = filter !== "all";
  let action: ReactNode = null;
  if (filtered) {
    action = (
      <Button onClick={onShowAll} size="sm" variant="outline">
        {t("empty.showAll")}
      </Button>
    );
  } else if (!hasEndpoints) {
    action = (
      <Button disabled={!canCreate} onClick={onCreate} size="sm">
        <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
        {t("addEndpoint")}
      </Button>
    );
  }
  return (
    <Empty className="py-8 md:py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={filtered ? FilterHorizontalIcon : WebhookIcon} />
        </EmptyMedia>
        <EmptyTitle>
          {filtered ? t("empty.filteredTitle") : t("empty.allTitle")}
        </EmptyTitle>
        <EmptyDescription>
          {filtered
            ? t("empty.filteredDescription")
            : t("empty.allDescription")}
        </EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
