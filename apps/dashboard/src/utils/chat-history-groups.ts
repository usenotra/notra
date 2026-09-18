import type { ChatSessionSummary } from "@notra/ai/types/chat";

import {
  CHAT_HISTORY_GROUP_LABELS,
  CHAT_HISTORY_GROUP_ORDER,
  CHAT_HISTORY_LAST_7_DAYS,
  CHAT_HISTORY_LAST_MONTH_DAYS,
} from "@/constants/chat-history";
import type { ChatHistoryGroup, ChatHistoryGroupId } from "@/types/chat";

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function resolveChatHistoryGroupId(
  updatedAt: Date,
  todayStart: Date,
  yesterdayStart: Date,
  last7DaysStart: Date,
  lastMonthStart: Date
): ChatHistoryGroupId {
  if (updatedAt >= todayStart) {
    return "today";
  }

  if (updatedAt >= yesterdayStart) {
    return "yesterday";
  }

  if (updatedAt >= last7DaysStart) {
    return "last7Days";
  }

  if (updatedAt >= lastMonthStart) {
    return "lastMonth";
  }

  return "older";
}

function compareSessionsByUpdatedAtDesc(
  left: ChatSessionSummary,
  right: ChatSessionSummary
): number {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

export function getChatHistoryGroups(
  sessions: ChatSessionSummary[],
  now = new Date()
): ChatHistoryGroup[] {
  const todayStart = startOfLocalDay(now);
  const yesterdayStart = addLocalDays(todayStart, -1);
  const last7DaysStart = addLocalDays(todayStart, -CHAT_HISTORY_LAST_7_DAYS);
  const lastMonthStart = addLocalDays(
    todayStart,
    -CHAT_HISTORY_LAST_MONTH_DAYS
  );

  const sessionsByGroup: Record<ChatHistoryGroupId, ChatSessionSummary[]> = {
    today: [],
    yesterday: [],
    last7Days: [],
    lastMonth: [],
    older: [],
  };

  for (const session of sessions) {
    const updatedAt = new Date(session.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      continue;
    }

    const groupId = resolveChatHistoryGroupId(
      updatedAt,
      todayStart,
      yesterdayStart,
      last7DaysStart,
      lastMonthStart
    );
    sessionsByGroup[groupId].push(session);
  }

  return CHAT_HISTORY_GROUP_ORDER.flatMap((id) => {
    const grouped = sessionsByGroup[id];
    if (grouped.length === 0) {
      return [];
    }

    return [
      {
        id,
        label: CHAT_HISTORY_GROUP_LABELS[id],
        sessions: grouped.slice().sort(compareSessionsByUpdatedAtDesc),
      },
    ];
  });
}

export function mergePendingChatSessions(
  sessions: ChatSessionSummary[],
  pendingSessions: ChatSessionSummary[]
): {
  sessions: ChatSessionSummary[];
  generatingTitleChatIds: Set<string>;
} {
  if (pendingSessions.length === 0) {
    return { sessions, generatingTitleChatIds: new Set() };
  }

  const existingIds = new Set(sessions.map((session) => session.chatId));
  const stillPending = pendingSessions.filter(
    (session) => !existingIds.has(session.chatId)
  );

  if (stillPending.length === 0) {
    return { sessions, generatingTitleChatIds: new Set() };
  }

  return {
    sessions: [...stillPending, ...sessions],
    generatingTitleChatIds: new Set(
      stillPending.map((session) => session.chatId)
    ),
  };
}
