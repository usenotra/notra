"use client";

import { Delete02Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AGENT_FEEDBACK_STATUSES } from "@notra/db/constants/agent-feedback";
import {
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
} from "@notra/ui/components/ui/context-menu";

import { AgentFeedbackAgent } from "@/components/agent-feedback/feedback-agent-icon";
import {
  AgentFeedbackKindBadge,
  AgentFeedbackSentimentLabel,
  AgentFeedbackStatusBadge,
} from "@/components/agent-feedback/feedback-badges";
import { Table, type TableColumn } from "@/components/motion/table";
import { useAvailableTableHeight } from "@/lib/hooks/use-available-table-height";
import type {
  AgentFeedbackItem,
  AgentFeedbackTableProps,
} from "@/types/agent-feedback";
import { formatRelative } from "@/utils/format-relative";
import { tableHeightFor } from "@/utils/table";

const FEEDBACK_SKELETON_ROW_COUNT = 6;
const FEEDBACK_TABLE_ROW_HEIGHT = 48;

const FEEDBACK_COLUMNS: TableColumn<AgentFeedbackItem>[] = [
  {
    key: "feedback",
    header: "Feedback",
    width: "1fr",
    minWidth: "16rem",
    sortable: true,
    sortValue: (item) => item.title ?? item.message,
    cell: (item) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">
          {item.title ?? item.message}
        </span>
        {item.title ? (
          <span className="text-muted-foreground truncate text-xs">
            {item.message}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: "kind",
    collapsePriority: 1,
    header: "Kind",
    width: "8rem",
    sortable: true,
    cell: (item) => <AgentFeedbackKindBadge kind={item.kind} />,
  },
  {
    key: "sentiment",
    collapsePriority: 3,
    header: "Sentiment",
    width: "9rem",
    sortable: true,
    sortValue: (item) => item.sentiment ?? "",
    cell: (item) => <AgentFeedbackSentimentLabel sentiment={item.sentiment} />,
  },
  {
    key: "agentClient",
    collapsePriority: 4,
    header: "Agent",
    width: "10rem",
    sortable: true,
    sortValue: (item) => item.agentClient ?? "",
    cell: (item) => (
      <AgentFeedbackAgent
        className="text-muted-foreground text-xs"
        client={item.agentClient}
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "8rem",
    sortable: true,
    cell: (item) => <AgentFeedbackStatusBadge status={item.status} />,
  },
  {
    key: "createdAt",
    collapsePriority: 2,
    header: "Received",
    width: "8rem",
    align: "right",
    sortable: true,
    sortValue: (item) => item.createdAt,
    cell: (item) => (
      <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
        {formatRelative(item.createdAt)}
      </span>
    ),
  },
];

function feedbackTableHeight(rowCount: number): number {
  return tableHeightFor(rowCount, FEEDBACK_TABLE_ROW_HEIGHT);
}

export function AgentFeedbackTableSkeleton() {
  const fallback = feedbackTableHeight(FEEDBACK_SKELETON_ROW_COUNT);
  const [tableRef, tableHeight] = useAvailableTableHeight(fallback);

  return (
    <div className="h-full min-h-0" ref={tableRef}>
      <Table
        className="rounded-2xl"
        columns={FEEDBACK_COLUMNS}
        data={[]}
        height={tableHeight}
        loading
        resizable
        rowHeight={FEEDBACK_TABLE_ROW_HEIGHT}
      />
    </div>
  );
}

export function AgentFeedbackTable({
  items,
  isPending,
  isDeleting,
  isUpdatingStatus,
  selectedId,
  onSelect,
  onStatusChange,
  onDelete,
}: AgentFeedbackTableProps) {
  const rowCount = isPending ? FEEDBACK_SKELETON_ROW_COUNT : items.length;
  const [tableRef, tableHeight] = useAvailableTableHeight(
    feedbackTableHeight(rowCount)
  );

  return (
    <div className="h-full min-h-0" ref={tableRef}>
      <Table
        className="rounded-2xl"
        columns={FEEDBACK_COLUMNS}
        data={items}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        emptyState="No feedback matches this filter"
        getRowId={(item) => item.id}
        height={tableHeight}
        loading={isPending}
        onRowClick={onSelect}
        renderRowContextMenu={(item) => (
          <>
            <ContextMenuItem onClick={() => onSelect(item)}>
              <HugeiconsIcon icon={ViewIcon} />
              View details
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuGroup>
              <ContextMenuLabel>Set status</ContextMenuLabel>
              <ContextMenuRadioGroup
                onValueChange={(status) => {
                  if (status !== item.status) {
                    onStatusChange(item, status);
                  }
                }}
                value={item.status}
              >
                {AGENT_FEEDBACK_STATUSES.map((status) => (
                  <ContextMenuRadioItem
                    disabled={isUpdatingStatus}
                    key={status}
                    value={status}
                  >
                    <AgentFeedbackStatusBadge status={status} />
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={isDeleting}
              onClick={() => onDelete(item)}
              variant="destructive"
            >
              <HugeiconsIcon icon={Delete02Icon} />
              Delete
            </ContextMenuItem>
          </>
        )}
        resizable
        rowHeight={FEEDBACK_TABLE_ROW_HEIGHT}
        selectedRowIds={selectedId ? [selectedId] : undefined}
      />
    </div>
  );
}
