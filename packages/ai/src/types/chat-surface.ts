import type {
  CHAT_SURFACE,
  STANDALONE_INBOX_SURFACES,
} from "../constants/chat-surface";
import type { ChatSessionSummary, ExternalChannelId } from "./chat";

export type ChatSurface = (typeof CHAT_SURFACE)[keyof typeof CHAT_SURFACE];

export type StandaloneInboxSurface = (typeof STANDALONE_INBOX_SURFACES)[number];

export type ChatSessionInbox = "standalone" | "agent";

export type ChatSurfaceSession = Pick<ChatSessionSummary, "externalChannelId">;

export type ChatSurfaceChannel = Pick<ExternalChannelId, "source"> | null;
