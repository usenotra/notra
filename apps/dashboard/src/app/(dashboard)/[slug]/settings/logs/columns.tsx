"use client";

import { Copy01Icon, MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { IntegrationIcon } from "@/components/logs/integration-icon";
import { LogStatusBadge } from "@/components/logs/log-status-badge";
import type { TableColumn } from "@/components/motion/table";
import type { Log, StatusWithCode } from "@/types/webhooks/webhooks";
import { formatLogTimestamp, getSourceLabel } from "@/utils/logs";

export const columns: TableColumn<Log>[] = [
  {
    key: "title",
    header: "Title",
    width: "1fr",
    minWidth: "12rem",
    sortable: true,
    sortValue: (log) => log.title,
    cell: (log) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <TruncateWithTooltip className="font-medium">
          {log.title}
        </TruncateWithTooltip>
        {log.errorMessage ? (
          <TruncateWithTooltip className="text-muted-foreground text-xs">
            {log.errorMessage}
          </TruncateWithTooltip>
        ) : null}
      </span>
    ),
  },
  {
    key: "integrationType",
    header: "Integration",
    width: "9rem",
    sortable: true,
    sortValue: (log) => log.integrationType,
    cell: (log) => (
      <span className="flex items-center gap-2">
        <IntegrationIcon type={log.integrationType} />
        <span className="truncate">{getSourceLabel(log.integrationType)}</span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "7rem",
    sortable: true,
    sortValue: (log) => log.status,
    cell: (log) => {
      const status = {
        label: log.status,
        code: log.statusCode,
      } as StatusWithCode;
      return <LogStatusBadge status={status} />;
    },
  },
  {
    key: "createdAt",
    header: "Created",
    width: "8rem",
    align: "right",
    sortable: true,
    sortValue: (log) => new Date(log.createdAt).getTime(),
    cell: (log) => (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {formatLogTimestamp(log.createdAt)}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    align: "right",
    width: "3.5rem",
    minWidth: "3.5rem",
    cell: (log) => {
      if (!log.referenceId) {
        return null;
      }
      const referenceId = log.referenceId;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Actions for ${log.title}`}
                size="icon"
                variant="ghost"
              >
                <HugeiconsIcon
                  className="text-muted-foreground size-4"
                  icon={MoreVerticalIcon}
                />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(referenceId);
                toast.success("Reference ID copied");
              }}
            >
              <HugeiconsIcon className="size-4" icon={Copy01Icon} />
              Copy reference ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
