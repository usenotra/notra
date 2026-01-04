"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { WebhookLog } from "@/types/webhook-logs";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: WebhookLog["status"] }) {
  const variants: Record<
    WebhookLog["status"],
    "default" | "destructive" | "secondary"
  > = {
    success: "default",
    failed: "destructive",
    pending: "secondary",
  };

  return <Badge variant={variants[status]}>{status}</Badge>;
}

export const columns: ColumnDef<WebhookLog>[] = [
  {
    accessorKey: "eventType",
    header: "Event",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("eventType")}</span>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="capitalize">{row.getValue("source")}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "statusCode",
    header: "Code",
    cell: ({ row }) => {
      const code = row.getValue("statusCode") as number | null;
      return <span className="text-muted-foreground">{code ?? "-"}</span>;
    },
  },
  {
    accessorKey: "responseTime",
    header: "Response Time",
    cell: ({ row }) => {
      const time = row.getValue("responseTime") as number | null;
      return (
        <span className="text-muted-foreground">
          {time ? `${time}ms` : "-"}
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Time",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.getValue("createdAt"))}
      </span>
    ),
  },
];
