"use client";
import type { TableColumn } from "@notra/ui/components/ui/data-table";
import { useFormatter, useTranslations } from "next-intl";

import { WebhookStatus } from "@/components/webhooks/status";
import type { OutboundDelivery } from "@/types/webhooks/outbound";
import { webhookHost } from "@/utils/outbound-webhooks";

function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
}

export function useWebhookColumns(): TableColumn<OutboundDelivery>[] {
  const t = useTranslations("settings.panes.webhooks.columns");
  const tLabels = useTranslations("common.labels");
  const format = useFormatter();
  return [
    {
      key: "eventType",
      header: t("event"),
      width: "1fr",
      minWidth: "10rem",
      cell: (row) => (
        <span
          title={row.eventType}
          className="block truncate text-xs font-medium"
        >
          {row.eventType}
        </span>
      ),
    },
    {
      key: "url",
      header: t("destination"),
      width: "7.5rem",
      cell: (row) => (
        <span
          title={row.url}
          className="text-muted-foreground block truncate text-xs"
        >
          {webhookHost(row.url)}
        </span>
      ),
    },
    {
      key: "status",
      header: tLabels("status"),
      width: "6.5rem",
      cell: (row) => <WebhookStatus status={row.status} />,
    },
    {
      key: "statusCode",
      header: t("response"),
      width: "5.5rem",
      cell: (row) => (
        <span className="text-muted-foreground flex items-baseline gap-1.5 text-xs tabular-nums">
          <span className="font-mono">
            {row.statusCode ?? (row.error ? "ERR" : "-")}
          </span>
          {row.attemptCount > 1 ? (
            <span
              title={t("attemptCount", { count: row.attemptCount })}
              className="text-muted-foreground/70"
            >
              ×{row.attemptCount}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: tLabels("created"),
      width: "5.5rem",
      align: "right",
      cell: (row) => (
        <time
          dateTime={row.createdAt}
          title={format.dateTime(new Date(row.createdAt), {
            dateStyle: "medium",
            timeStyle: "medium",
          })}
          className="text-muted-foreground text-xs tabular-nums"
        >
          {format.dateTime(
            new Date(row.createdAt),
            isToday(new Date(row.createdAt))
              ? { timeStyle: "short" }
              : { month: "short", day: "numeric" }
          )}
        </time>
      ),
    },
  ];
}
