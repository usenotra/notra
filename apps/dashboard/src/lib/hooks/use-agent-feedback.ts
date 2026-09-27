"use client";

import type { AgentFeedbackStatus } from "@notra/db/types/agent-feedback";
import { AGENT_FEEDBACK_PAGE_SIZE } from "@notra/schemas/constants/dashboard/agent-feedback";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  AgentFeedbackSetupResponse,
  AgentFeedbackStatusFilter,
} from "@/types/agent-feedback";

function toListInput(
  organizationId: string,
  status: AgentFeedbackStatusFilter,
  cursor: string | undefined
) {
  return {
    organizationId,
    status: status === "all" ? undefined : status,
    cursor,
    limit: AGENT_FEEDBACK_PAGE_SIZE,
  };
}

export function useAgentFeedbackList(
  organizationId: string,
  status: AgentFeedbackStatusFilter
) {
  const t = useTranslations("feedback.toasts");
  return useInfiniteQuery({
    ...dashboardOrpc.agentFeedback.list.infiniteOptions({
      input: (cursor: string | undefined) =>
        toListInput(organizationId, status, cursor),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: t("loadFailed") },
  });
}

export function useAgentFeedbackUpdateStatus(organizationId: string) {
  const t = useTranslations("feedback.toasts");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { feedbackId: string; status: AgentFeedbackStatus }) =>
      dashboardOrpc.agentFeedback.updateStatus.call({
        organizationId,
        ...input,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.agentFeedback.list.key(),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("updateFailed"));
    },
  });
}

export function useAgentFeedbackDelete(organizationId: string) {
  const t = useTranslations("feedback.toasts");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feedbackId: string) =>
      dashboardOrpc.agentFeedback.delete.call({
        organizationId,
        feedbackId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.agentFeedback.list.key(),
      });
      toast.success(t("deleted"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("deleteFailed"));
    },
  });
}

export function useAgentFeedbackSetup(organizationId: string) {
  return useQuery<AgentFeedbackSetupResponse>({
    ...dashboardOrpc.agentFeedback.setup.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    retry: false,
  });
}
