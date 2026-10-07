"use client";

import type { AgentFeedbackStatus } from "@notra/db/types/agent-feedback";
import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import {
  PermissionOption,
  PermissionRow,
} from "@notra/ui/components/ui/permission-selector";
import { cn } from "@notra/ui/lib/utils";
import { useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { useTranslations } from "use-intl";

import { AgentFeedbackDetailDialog } from "@/components/agent-feedback/feedback-detail-dialog";
import { AgentFeedbackEmpty } from "@/components/agent-feedback/feedback-empty";
import { AgentFeedbackStatusIcon } from "@/components/agent-feedback/feedback-status-icon";
import { AgentFeedbackTable } from "@/components/agent-feedback/feedback-table";
import { Button } from "@/components/button";
import { Confetti } from "@/components/confetti";
import { PageContainer } from "@/components/layout/container";
import {
  AGENT_FEEDBACK_DEFAULT_STATUS_FILTER,
  AGENT_FEEDBACK_STATUS_FILTERS,
} from "@/constants/agent-feedback";
import {
  useAgentFeedbackDelete,
  useAgentFeedbackList,
  useAgentFeedbackUpdateStatus,
} from "@/lib/hooks/use-agent-feedback";
import { useAgentFeedbackFilterLabels } from "@/lib/hooks/use-agent-feedback-labels";
import type {
  AgentFeedbackItem,
  AgentFeedbackInboxProps,
  AgentFeedbackStatusFilter,
} from "@/types/agent-feedback";
import {
  agentFeedbackFilterStatuses,
  isAgentFeedbackStatusFilter,
} from "@/utils/agent-feedback";

const FEEDBACK_CONFETTI_COLORS = [
  "var(--primary)",
  "#FFC700",
  "#FF6B6B",
  "#41BBC7",
  "#A78BFA",
  "#34D399",
];

/**
 * The feedback list with its filter, detail and delete dialogs. The caller
 * supplies the heading and, optionally, its own empty state.
 */
export function AgentFeedbackInbox({
  emptyState,
  footer,
  heading,
  organizationId,
}: AgentFeedbackInboxProps) {
  const reduceMotion = useReducedMotion();
  const [statusFilter, setStatusFilter] = useState<AgentFeedbackStatusFilter>(
    AGENT_FEEDBACK_DEFAULT_STATUS_FILTER
  );
  // Held as a snapshot so the sheet stays open when a status change moves the
  // item out of the active filter.
  const [selected, setSelected] = useState<AgentFeedbackItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<AgentFeedbackItem | null>(null);
  const [resolvedCelebration, setResolvedCelebration] = useState(0);

  const list = useAgentFeedbackList(organizationId, statusFilter);
  const updateStatus = useAgentFeedbackUpdateStatus(organizationId);
  const deleteFeedback = useAgentFeedbackDelete(organizationId);

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const counts = list.data?.pages[0]?.counts;
  const totalCount = counts
    ? Object.values(counts).reduce((sum, value) => sum + value, 0)
    : 0;
  const selectedItem = selected
    ? (items.find((item) => item.id === selected.id) ?? selected)
    : null;
  const isLoading = !!organizationId && list.isPending;
  const showEmptyState = !isLoading && totalCount === 0;

  const handleStatusChange = (
    item: AgentFeedbackItem,
    status: AgentFeedbackStatus
  ) => {
    if (item.status === status) {
      return;
    }

    const wasResolved = item.status === "resolved";
    const syncSelected = (next: AgentFeedbackItem) =>
      setSelected((current) => (current?.id === next.id ? next : current));

    syncSelected({ ...item, status });
    updateStatus.mutate(
      { feedbackId: item.id, previousStatus: item.status, status },
      {
        onSuccess: (updated) => {
          syncSelected(updated);
          if (status === "resolved" && !wasResolved) {
            setResolvedCelebration((current) => current + 1);
          }
        },
        onError: () => syncSelected(item),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteCandidate) {
      return;
    }

    const feedbackId = deleteCandidate.id;
    deleteFeedback.mutate(feedbackId, {
      onSuccess: () => {
        setDeleteCandidate(null);
        setSelected((current) => (current?.id === feedbackId ? null : current));
      },
    });
  };

  const countFor = (filter: AgentFeedbackStatusFilter) => {
    if (!counts) {
      return null;
    }
    const statuses = agentFeedbackFilterStatuses(filter);
    return statuses
      ? statuses.reduce((sum, status) => sum + counts[status], 0)
      : totalCount;
  };

  return (
    <PageContainer
      className={cn(
        "flex flex-1 flex-col py-4 md:py-6",
        !showEmptyState && "h-full min-h-full overflow-hidden"
      )}
    >
      {resolvedCelebration > 0 && !reduceMotion ? (
        <FeedbackConfetti celebration={resolvedCelebration} />
      ) : null}
      <div
        className={cn(
          "w-full px-4 lg:px-6",
          showEmptyState ? "space-y-6" : "flex min-h-0 flex-1 flex-col gap-6"
        )}
      >
        {heading(showEmptyState)}

        <FeedbackList
          countFor={countFor}
          emptyState={emptyState}
          isDeleting={deleteFeedback.isPending}
          isFetchingNextPage={list.isFetchingNextPage}
          isLoading={isLoading}
          isPlaceholderData={list.isPlaceholderData}
          isUpdatingStatus={updateStatus.isPending}
          items={items}
          hasNextPage={list.hasNextPage}
          onDelete={setDeleteCandidate}
          onLoadMore={() => list.fetchNextPage()}
          onSelect={setSelected}
          onStatusChange={handleStatusChange}
          onStatusFilterChange={setStatusFilter}
          organizationId={organizationId}
          selectedId={selected?.id ?? null}
          showEmptyState={showEmptyState}
          statusFilter={statusFilter}
          tableGrows={!footer}
        />
        {showEmptyState || !footer ? null : (
          <div className="shrink-0">{footer}</div>
        )}
      </div>

      <AgentFeedbackDetailDialog
        isUpdating={updateStatus.isPending}
        item={selectedItem}
        onDelete={() => {
          if (selectedItem) {
            setDeleteCandidate(selectedItem);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        onStatusChange={(status) => {
          if (selectedItem) {
            handleStatusChange(selectedItem, status);
          }
        }}
        open={selectedItem !== null}
      />

      <FeedbackDeleteDialog
        deleteCandidate={deleteCandidate}
        isPending={deleteFeedback.isPending}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open && !deleteFeedback.isPending) {
            setDeleteCandidate(null);
          }
        }}
      />
    </PageContainer>
  );
}

function FeedbackList({
  countFor,
  emptyState,
  hasNextPage,
  isDeleting,
  isFetchingNextPage,
  isLoading,
  isPlaceholderData,
  isUpdatingStatus,
  items,
  onDelete,
  onLoadMore,
  onSelect,
  onStatusChange,
  onStatusFilterChange,
  organizationId,
  selectedId,
  showEmptyState,
  statusFilter,
  tableGrows,
}: {
  countFor: (filter: AgentFeedbackStatusFilter) => number | null;
  emptyState?: ReactNode;
  hasNextPage: boolean;
  isDeleting: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isPlaceholderData: boolean;
  isUpdatingStatus: boolean;
  items: AgentFeedbackItem[];
  onDelete: (item: AgentFeedbackItem) => void;
  onLoadMore: () => void;
  onSelect: (item: AgentFeedbackItem) => void;
  onStatusChange: (
    item: AgentFeedbackItem,
    status: AgentFeedbackStatus
  ) => void;
  onStatusFilterChange: (value: AgentFeedbackStatusFilter) => void;
  organizationId: string;
  selectedId: string | null;
  showEmptyState: boolean;
  statusFilter: AgentFeedbackStatusFilter;
  /** Fill the leftover height; off when content follows the table. */
  tableGrows: boolean;
}) {
  const tCommon = useTranslations("common");
  const filterLabels = useAgentFeedbackFilterLabels();
  if (showEmptyState) {
    return emptyState ?? <AgentFeedbackEmpty organizationId={organizationId} />;
  }

  return (
    <>
      <PermissionRow
        className="w-fit shrink-0"
        label={tCommon("labels.filterByStatus")}
        layout="compact"
        onValueChange={(value) => {
          if (isAgentFeedbackStatusFilter(value)) {
            onStatusFilterChange(value);
          }
        }}
        value={statusFilter}
      >
        {AGENT_FEEDBACK_STATUS_FILTERS.map((filter) => {
          const count = countFor(filter.value);
          return (
            <PermissionOption key={filter.value} value={filter.value}>
              {filterLabels[filter.value]}
              {count !== null ? (
                <span className="text-xs tabular-nums opacity-70">{count}</span>
              ) : null}
            </PermissionOption>
          );
        })}
      </PermissionRow>

      <div className={tableGrows ? "min-h-0 flex-1" : "min-h-0 flex-initial"}>
        <AgentFeedbackTable
          isDeleting={isDeleting}
          emptyState={
            statusFilter === "all" ? undefined : (
              <FeedbackFilterEmpty
                onShowAll={() => onStatusFilterChange("all")}
                filter={statusFilter}
              />
            )
          }
          isPending={isLoading || isPlaceholderData}
          isUpdatingStatus={isUpdatingStatus}
          items={items}
          loadingMore={isFetchingNextPage}
          onDelete={onDelete}
          onLoadMore={hasNextPage ? onLoadMore : undefined}
          onSelect={onSelect}
          onStatusChange={onStatusChange}
          selectedId={selectedId}
        />
      </div>
    </>
  );
}

function FeedbackFilterEmpty({
  filter,
  onShowAll,
}: {
  filter: Exclude<AgentFeedbackStatusFilter, "all">;
  onShowAll: () => void;
}) {
  const t = useTranslations("feedback.table");
  const status = filter === "open" ? "resolved" : filter;
  return (
    <Empty className="py-8 md:py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AgentFeedbackStatusIcon className="size-5" status={status} />
        </EmptyMedia>
        <EmptyTitle>{t(`filterEmpty.${filter}.title`)}</EmptyTitle>
        <EmptyDescription>
          {t(`filterEmpty.${filter}.description`)}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onShowAll} size="sm" variant="outline">
          {t("showAll")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function FeedbackConfetti({ celebration }: { celebration: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-1/2 z-[100] -translate-x-1/2"
    >
      <Confetti
        colors={FEEDBACK_CONFETTI_COLORS}
        duration={3000}
        force={0.5}
        key={celebration}
        particleCount={120}
        particleShape="mix"
        particleSize={8}
        stageHeight={600}
        stageWidth={800}
      />
    </div>
  );
}

function FeedbackDeleteDialog({
  deleteCandidate,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  deleteCandidate: AgentFeedbackItem | null;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("feedback.delete");
  const tCommon = useTranslations("common");
  return (
    <ConfirmDialog
      confirmLabel={tCommon("actions.delete")}
      description={t("description", {
        name: deleteCandidate?.title ?? deleteCandidate?.message ?? "",
      })}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open={deleteCandidate !== null}
      pending={isPending}
      title={t("title")}
      variant="destructive"
    />
  );
}
