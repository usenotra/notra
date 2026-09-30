import type {
  ChatMessageMetadata,
  ChatSessionSummary,
} from "@notra/ai/types/chat";

import type { ClientSessionData } from "@/types/auth/session";

export interface ChatMessageAuthor {
  id: string;
  name: string | null;
  image: string | null;
  seed: string;
}

export interface ResolveChatMessageAuthorInput {
  metadata: ChatMessageMetadata | undefined;
  membersById: Map<string, ChatMessageAuthor>;
  sessionUser: ClientSessionData["user"] | undefined;
}

export type ChatHistoryGroupId =
  | "today"
  | "yesterday"
  | "last7Days"
  | "lastMonth"
  | "older";

export interface ChatHistoryGroup {
  id: ChatHistoryGroupId;
  sessions: ChatSessionSummary[];
}
