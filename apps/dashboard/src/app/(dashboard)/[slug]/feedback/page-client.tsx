"use client";

import { Confetti } from "@neoconfetti/react";
import type { AgentFeedbackStatus } from "@notra/db/types/agent-feedback";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import {
  PermissionOption,
  PermissionRow,
} from "@notra/ui/components/ui/permission-selector";
import { cn } from "@notra/ui/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useState } from "react";

import { AgentFeedbackDetailDialog } from "@/components/agent-feedback/feedback-detail-dialog";
import { AgentFeedbackEmpty } from "@/components/agent-feedback/feedback-empty";
import { AgentFeedbackSetupDialog } from "@/components/agent-feedback/feedback-setup-dialog";
import { AgentFeedbackTable } from "@/components/agent-feedback/feedback-table";
import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { AGENT_FEEDBACK_STATUS_FILTERS } from "@/constants/agent-feedback";
import {
  useAgentFeedbackDelete,
  useAgentFeedbackList,
  useAgentFeedbackUpdateStatus,
} from "@/lib/hooks/use-agent-feedback";
import type {
  AgentFeedbackItem,
  AgentFeedbackPageClientProps,
  AgentFeedbackStatusFilter,
} from "@/types/agent-feedback";
import { isAgentFeedbackStatusFilter } from "@/utils/agent-feedback";

const FEEDBACK_CONFETTI_COLORS = [
  "var(--primary)",
  "#FFC700",
  "#FF6B6B",
  "#41BBC7",
  "#A78BFA",
  "#34D399",
];

export default function PageClient(_props: AgentFeedbackPageClientProps) {
  const reduceMotion = useReducedMotion();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const [statusFilter, setStatusFilter] =
    useState<AgentFeedbackStatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
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
    updateStatus.mutate(
      { feedbackId: item.id, status },
      {
        onSuccess: () => {
          if (status === "resolved" && !wasResolved) {
            setResolvedCelebration((current) => current + 1);
          }
        },
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
        setSelectedId((current) => (current === feedbackId ? null : current));
      },
    });
  };

  const countFor = (filter: AgentFeedbackStatusFilter) => {
    if (!counts) {
      return null;
    }
    return filter === "all" ? totalCount : counts[filter];
  };

  return (
    <PageContainer
      className={cn(
        "flex flex-1 flex-col py-4 md:py-6",
        !showEmptyState && "h-full min-h-full overflow-hidden"
      )}
    >
      {resolvedCelebration > 0 && !reduceMotion ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-1/2 z-[100] -translate-x-1/2"
        >
          <Confetti
            colors={FEEDBACK_CONFETTI_COLORS}
            duration={3000}
            force={0.5}
            key={resolvedCelebration}
            particleCount={120}
            particleShape="mix"
            particleSize={8}
            stageHeight={600}
            stageWidth={800}
          />
        </div>
      ) : null}
      <div
        className={cn(
          "w-full px-4 lg:px-6",
          showEmptyState ? "space-y-6" : "flex min-h-0 flex-1 flex-col gap-6"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
            <p className="text-muted-foreground">
              What AI agents are saying about your product.
            </p>
          </div>
          {organizationId && !showEmptyState ? (
            <AgentFeedbackSetupDialog organizationId={organizationId} />
          ) : null}
        </div>

        {showEmptyState ? (
          <AgentFeedbackEmpty organizationId={organizationId} />
        ) : (
          <>
            <PermissionRow
              className="w-fit shrink-0"
              label="Filter by status"
              layout="compact"
              onValueChange={(value) => {
                if (isAgentFeedbackStatusFilter(value)) {
                  setStatusFilter(value);
                }
              }}
              value={statusFilter}
            >
              {AGENT_FEEDBACK_STATUS_FILTERS.map((filter) => {
                const count = countFor(filter.value);
                return (
                  <PermissionOption key={filter.value} value={filter.value}>
                    {filter.label}
                    {count !== null ? (
                      <span className="text-xs tabular-nums opacity-70">
                        {count}
                      </span>
                    ) : null}
                  </PermissionOption>
                );
              })}
            </PermissionRow>

            <div className="min-h-0 flex-1">
              <AgentFeedbackTable
                isDeleting={deleteFeedback.isPending}
                isPending={isLoading || list.isPlaceholderData}
                isUpdatingStatus={updateStatus.isPending}
                items={items}
                onDelete={setDeleteCandidate}
                onSelect={(item) => setSelectedId(item.id)}
                onStatusChange={handleStatusChange}
                selectedId={selectedId}
              />
            </div>

            {list.hasNextPage ? (
              <div className="flex shrink-0 justify-center">
                <Button
                  disabled={list.isFetchingNextPage}
                  onClick={() => list.fetchNextPage()}
                  size="sm"
                  variant="outline"
                >
                  {list.isFetchingNextPage ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <AgentFeedbackDetailDialog
        isUpdating={updateStatus.isPending}
        item={selectedItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
        onStatusChange={(status) => {
          if (selectedItem) {
            handleStatusChange(selectedItem, status);
          }
        }}
        open={selectedItem !== null}
      />

      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!open && !deleteFeedback.isPending) {
            setDeleteCandidate(null);
          }
        }}
        open={deleteCandidate !== null}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              Delete feedback?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              This will permanently delete &quot;
              {deleteCandidate?.title ?? deleteCandidate?.message}&quot;. This
              action cannot be undone.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={deleteFeedback.isPending}>
              Cancel
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              disabled={deleteFeedback.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
              variant="destructive"
            >
              {deleteFeedback.isPending ? "Deleting..." : "Delete"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </PageContainer>
  );
}
