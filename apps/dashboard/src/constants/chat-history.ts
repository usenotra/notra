import type { ChatHistoryGroupId } from "@/types/chat";

export const CHAT_HISTORY_GROUP_ORDER = [
  "today",
  "yesterday",
  "last7Days",
  "lastMonth",
  "older",
] as const satisfies readonly ChatHistoryGroupId[];

export const CHAT_HISTORY_LAST_7_DAYS = 7;
export const CHAT_HISTORY_LAST_MONTH_DAYS = 30;

export const DEFAULT_CHAT_TITLE = "New chat";
