"use client";
import { WebhookIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";

import { Button } from "@/components/button";
import { Table } from "@/components/motion/table";
import { webhookColumns } from "@/components/webhooks/columns";
import {
  WEBHOOK_FILTER_LABELS,
  WEBHOOK_FILTERS,
  WEBHOOK_PAGE_SIZE,
  WEBHOOK_REFRESH_INTERVAL_MS,
  WEBHOOK_TABLE_EMPTY_HEIGHT,
  WEBHOOK_TABLE_HEADER_HEIGHT,
  WEBHOOK_TABLE_MAX_HEIGHT,
  WEBHOOK_TABLE_ROW_HEIGHT,
} from "@/constants/outbound-webhooks";
import type { WebhookDeliveriesProps } from "@/types/webhooks/outbound";
import { getWebhookFilterLabel } from "@/utils/outbound-webhooks";

export function WebhookDeliveries({
  rows,
  filter,
  offset,
  loading,
  fetching,
  hasMore,
  onSelect,
  onFilter,
  onPage,
}: WebhookDeliveriesProps) {
  const tableHeight =
    rows.length === 0
      ? WEBHOOK_TABLE_EMPTY_HEIGHT
      : Math.min(
          WEBHOOK_TABLE_MAX_HEIGHT,
          rows.length * WEBHOOK_TABLE_ROW_HEIGHT + WEBHOOK_TABLE_HEADER_HEIGHT
        );
  const rangeLabel =
    rows.length === 0 ? "0" : `${offset + 1}–${offset + rows.length}`;
  return (
    <div className="space-y-3">
      <Select
        onValueChange={(value) => onFilter(value ?? "all")}
        value={filter}
      >
        <SelectTrigger
          aria-label="Filter deliveries by status"
          className="w-44"
        >
          <SelectValue>
            {(value: string) => getWebhookFilterLabel(value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {WEBHOOK_FILTERS.map((status) => (
            <SelectItem key={status} value={status}>
              {WEBHOOK_FILTER_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Table
        columns={webhookColumns}
        data={rows}
        getRowId={(row) => row.id}
        onRowClick={onSelect}
        rowHeight={WEBHOOK_TABLE_ROW_HEIGHT}
        height={tableHeight}
        loading={loading}
        skeletonRows={4}
        className="rounded-lg"
        emptyState={
          <div className="space-y-3 px-6 py-8 text-center">
            <HugeiconsIcon
              icon={WebhookIcon}
              className="text-muted-foreground mx-auto size-7"
            />
            <p className="text-sm font-medium">
              {filter === "all"
                ? "Your events will appear here"
                : "No deliveries with this status"}
            </p>
            <p className="text-muted-foreground mx-auto max-w-xs text-xs leading-relaxed">
              {filter === "all"
                ? "Add an endpoint, then generate a post. Every delivery and retry will be recorded here."
                : "Choose another filter to explore your delivery history."}
            </p>
          </div>
        }
      />
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          {rangeLabel} deliveries, refreshes every{" "}
          {WEBHOOK_REFRESH_INTERVAL_MS / 1000}s
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={offset === 0 || fetching}
            onClick={() => onPage(Math.max(0, offset - WEBHOOK_PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!hasMore || fetching}
            onClick={() => onPage(offset + WEBHOOK_PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
