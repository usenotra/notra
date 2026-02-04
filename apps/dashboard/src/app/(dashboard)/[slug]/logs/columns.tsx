"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Link04Icon,
  PlayCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Slack } from "@notra/ui/components/ui/svgs/slack";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { createColumnHelper } from "@tanstack/react-table";
import type {
  IntegrationType,
  Log,
  LogDirection,
  StatusWithCode,
} from "@/types/webhook-logs";

const columnHelper = createColumnHelper<Log>();

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: StatusWithCode }) {
  const variants: Record<
    StatusWithCode["label"],
    "default" | "destructive" | "secondary"
  > = {
    success: "default",
    failed: "destructive",
    pending: "secondary",
  };

  return <Badge variant={variants[status.label]}>{status.label}</Badge>;
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

function DirectionBadge({ direction }: { direction: LogDirection }) {
  return (
    <Badge className="capitalize" variant="outline">
      {direction}
    </Badge>
  );
}

function IntegrationIcon({ type }: { type: IntegrationType }) {
  switch (type) {
    case "github":
      return <Github className="size-4" />;
    case "linear":
      return <Linear className="size-4" />;
    case "slack":
      return <Slack className="size-4" />;
    case "webhook":
      return (
        <HugeiconsIcon
          className="size-4 text-muted-foreground"
          icon={Link04Icon}
        />
      );
    case "manual":
      return (
        <HugeiconsIcon
          className="size-4 text-muted-foreground"
          icon={PlayCircleIcon}
        />
      );
    default: {
      return type;
    }
  }
}

export const columns = [
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("integrationType", {
    header: "Integration",
    cell: (info) => {
      const type = info.getValue();
      return (
        <div className="flex items-center gap-2">
          <IntegrationIcon type={type} />
          <span className="capitalize">{type}</span>
        </div>
      );
    },
  }),
  columnHelper.accessor("direction", {
    header: "Direction",
    cell: (info) => <DirectionBadge direction={info.getValue()} />,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const label = info.getValue();
      const code = info.row.original.statusCode;
      const status = { label, code } as StatusWithCode;
      return status.code !== null ? (
        <Tooltip>
          <TooltipTrigger>
            <StatusBadge status={status} />
          </TooltipTrigger>
          <TooltipContent>{`Status code: ${status.code}`}</TooltipContent>
        </Tooltip>
      ) : (
        <StatusBadge status={status} />
      );
    },
  }),
  columnHelper.accessor("referenceId", {
    header: "Reference ID",
    cell: (info) => {
      const refId = info.getValue();
      return (
        <span className="font-mono text-muted-foreground text-sm">
          {refId ?? "-"}
        </span>
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
