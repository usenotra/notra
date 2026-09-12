import type {
  CHAT_SURFACE,
  STANDALONE_INBOX_SURFACES,
} from "../constants/chat-surface";
import type { ChatSessionSummary } from "./chat";

export type ChatSurface = (typeof CHAT_SURFACE)[keyof typeof CHAT_SURFACE];

export type StandaloneInboxSurface = (typeof STANDALONE_INBOX_SURFACES)[number];

export type ChatSurfaceSession = Pick<ChatSessionSummary, "externalChannelId">;
