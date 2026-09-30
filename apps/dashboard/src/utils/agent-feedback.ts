import { AGENT_FEEDBACK_STATUSES } from "@notra/db/constants/agent-feedback";
import type { AgentFeedbackStatus } from "@notra/db/types/agent-feedback";

import {
  AGENT_FEEDBACK_SNIPPET_TABS,
  AGENT_FEEDBACK_STATUS_FILTERS,
} from "@/constants/agent-feedback";
import type {
  AgentFeedbackListData,
  AgentFeedbackSnippetKey,
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

export function isAgentFeedbackSnippetKey(
  value: string
): value is AgentFeedbackSnippetKey {
  return AGENT_FEEDBACK_SNIPPET_TABS.some((tab) => tab.value === value);
}

/**
 * Applies a status change to cached list pages. Items stay in lists whose
 * filter they no longer match until the follow-up refetch, so rows don't
 * vanish mid-click.
 */
export function withFeedbackStatus(
  data: AgentFeedbackListData,
  feedbackId: string,
  status: AgentFeedbackStatus
): AgentFeedbackListData {
  const previousStatus = data.pages
    .flatMap((page) => page.items)
    .find((item) => item.id === feedbackId)?.status;
  if (!previousStatus || previousStatus === status) {
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
