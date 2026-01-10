"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Log } from "@/types/webhook-logs";

const columnHelper = createColumnHelper<Log>();

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusVariant(
  status: number
): "default" | "destructive" | "secondary" {
  if (status >= 200 && status < 300) {
    return "default";
  }
  if (status >= 400) {
    return "destructive";
  }
  return "secondary";
}

function getStatusLabel(status: number): string {
  if (status >= 200 && status < 300) {
    return "success";
  }
  if (status >= 400 && status < 500) {
    return "client error";
  }
  if (status >= 500) {
    return "server error";
  }
  return "pending";
}

function getSortIcon(isSorted: false | "asc" | "desc") {
  if (isSorted === "asc") {
    return ArrowUp01Icon;
  }
  if (isSorted === "desc") {
    return ArrowDown01Icon;
  }
  return ArrowUpDownIcon;
}

export const columns = [
  columnHelper.accessor("method", {
    header: "Method",
    cell: (info) => (
      <Badge className="font-mono" variant="outline">
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("path", {
    header: "Path",
    cell: (info) => (
      <span className="font-mono text-sm">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const status = info.getValue();
      return (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={getStatusVariant(status)}>
              {getStatusLabel(status)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Status code: {status}</TooltipContent>
        </Tooltip>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          variant="ghost"
        >
          Created At
          <HugeiconsIcon className="ml-2 size-4" icon={getSortIcon(isSorted)} />
        </Button>
      );
    },
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
];
