"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Github01Icon,
  Link04Icon,
  Notification01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IntegrationType, Log, LogDirection } from "@/types/webhook-logs";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: Log["status"] }) {
  const variants: Record<
    Log["status"],
    "default" | "destructive" | "secondary"
  > = {
    success: "default",
    failed: "destructive",
    pending: "secondary",
  };

  return <Badge variant={variants[status]}>{status}</Badge>;
}

function DirectionBadge({ direction }: { direction: LogDirection }) {
  return (
    <Badge className="capitalize" variant="outline">
      {direction}
    </Badge>
  );
}

function IntegrationIcon({ type }: { type: IntegrationType }) {
  const icons: Record<IntegrationType, typeof Github01Icon> = {
    github: Github01Icon,
    linear: Link04Icon,
    slack: Notification01Icon,
    webhook: Link04Icon,
  };

  return (
    <HugeiconsIcon
      className="size-4 text-muted-foreground"
      icon={icons[type]}
    />
  );
}

export const columns: ColumnDef<Log>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("title")}</span>
    ),
  },
  {
    accessorKey: "integrationType",
    header: "Integration",
    cell: ({ row }) => {
      const type = row.getValue("integrationType") as IntegrationType;
      return (
        <div className="flex items-center gap-2">
          <IntegrationIcon type={type} />
          <span className="capitalize">{type}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "direction",
    header: "Direction",
    cell: ({ row }) => <DirectionBadge direction={row.getValue("direction")} />,
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
    accessorKey: "referenceId",
    header: "Reference ID",
    cell: ({ row }) => {
      const refId = row.getValue("referenceId") as string | null;
      return (
        <span className="font-mono text-muted-foreground text-sm">
          {refId ?? "-"}
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          variant="ghost"
        >
          Created At
          <HugeiconsIcon
            className="ml-2 size-4"
            icon={
              isSorted === "asc"
                ? ArrowUp01Icon
                : isSorted === "desc"
                  ? ArrowDown01Icon
                  : ArrowUpDownIcon
            }
          />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.getValue("createdAt"))}
      </span>
    ),
  },
];
