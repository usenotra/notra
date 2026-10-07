import { AGENT_FEEDBACK_STATUSES } from "@notra/db/constants/agent-feedback";
import type { AgentFeedbackStatus } from "@notra/db/types/agent-feedback";

import {
  AGENT_FEEDBACK_SNIPPET_TABS,
  AGENT_FEEDBACK_STATUS_FILTERS,
} from "@/constants/agent-feedback";
import type {
  AgentFeedbackListData,
  AgentFeedbackSnippetKey,
  AgentFeedbackStatusChange,
  AgentFeedbackStatusFilter,
} from "@/types/agent-feedback";

export function isAgentFeedbackStatus(
  value: string
): value is AgentFeedbackStatus {
  return AGENT_FEEDBACK_STATUSES.some((status) => status === value);
}

export function isAgentFeedbackStatusFilter(
  value: string
): value is AgentFeedbackStatusFilter {
  return AGENT_FEEDBACK_STATUS_FILTERS.some((filter) => filter.value === value);
}

/** The statuses a filter tab lists, or undefined for every status. */
export function agentFeedbackFilterStatuses(
  filter: AgentFeedbackStatusFilter
): AgentFeedbackStatus[] | undefined {
  const statuses = AGENT_FEEDBACK_STATUS_FILTERS.find(
    (entry) => entry.value === filter
  )?.statuses;
  return statuses ? [...statuses] : undefined;
}

export function isAgentFeedbackSnippetKey(
  value: string
): value is AgentFeedbackSnippetKey {
  return AGENT_FEEDBACK_SNIPPET_TABS.some((tab) => tab.value === value);
}

/**
 * Applies a status change to cached list pages. Counts move in every cache,
 * including lists that don't hold the item, so tabs stay consistent. Items
 * stay in lists whose filter they no longer match until the follow-up
 * refetch, so rows don't vanish mid-click.
 */
export function withFeedbackStatus(
  data: AgentFeedbackListData,
  { feedbackId, previousStatus, status }: AgentFeedbackStatusChange
): AgentFeedbackListData {
  if (previousStatus === status) {
    return data;
  }

  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.map((item) =>
      item.id === feedbackId ? { ...item, status } : item
    ),
  }));

  const [first, ...rest] = pages;
  if (!first?.counts) {
    return { ...data, pages };
  }

  const counts = { ...first.counts };
  counts[previousStatus] = Math.max(0, counts[previousStatus] - 1);
  counts[status] += 1;
  return { ...data, pages: [{ ...first, counts }, ...rest] };
}
