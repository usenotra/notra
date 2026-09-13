"use client";
import type { TableColumn } from "@/components/motion/table";
import { WebhookStatus } from "@/components/webhooks/status";
import type { OutboundDelivery } from "@/types/webhooks/outbound";
import { formatLogTimestamp } from "@/utils/logs";

export const webhookColumns: TableColumn<OutboundDelivery>[] = [
  {
    key: "eventType",
    header: "Event / destination",
    width: "1fr",
    minWidth: "15rem",
    cell: (row) => (
      <div className="min-w-0 space-y-1">
        <span className="block truncate font-mono text-xs font-medium">
          {row.eventType}
        </span>
        <span
          title={row.url}
          className="text-muted-foreground block truncate text-xs"
        >
          {row.url}
        </span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "7.5rem",
    cell: (row) => <WebhookStatus status={row.status} />,
  },
  {
    key: "statusCode",
    header: "Response",
    width: "5.5rem",
    cell: (row) => (
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {row.statusCode ?? (row.error ? "ERR" : "—")}
      </span>
    ),
  },
  {
    key: "attemptCount",
    header: "Attempts",
    width: "5rem",
    align: "right",
    cell: (row) => (
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {String(row.attemptCount).padStart(2, "0")}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    width: "9rem",
    align: "right",
    cell: (row) => (
      <time
        dateTime={row.createdAt}
        title={new Date(row.createdAt).toLocaleString()}
        className="text-muted-foreground text-xs tabular-nums"
      >
        {formatLogTimestamp(row.createdAt)}
      </time>
    ),
  },
];
