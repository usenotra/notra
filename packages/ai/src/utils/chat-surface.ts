import {
  CHAT_SURFACE,
  STANDALONE_INBOX_SURFACES,
} from "../constants/chat-surface";
import type {
  ChatSessionInbox,
  ChatSurface,
  ChatSurfaceChannel,
  ChatSurfaceSession,
  StandaloneInboxSurface,
} from "../types/chat-surface";

export function chatSurfaceFromChannelSource(
  source: string | null | undefined
): ChatSurface {
  if (
    source === CHAT_SURFACE.agent ||
    source === CHAT_SURFACE.slack ||
    source === CHAT_SURFACE.discord
  ) {
    return source;
  }

  return CHAT_SURFACE.studio;
}

export function chatSurfaceFromSession(
  session: ChatSurfaceSession | null
): ChatSurface | null {
  if (!session) {
    return null;
  }

  return chatSurfaceFromChannelSource(session.externalChannelId?.source);
}

export function isStandaloneInboxSurface(
  surface: ChatSurface
): surface is StandaloneInboxSurface {
  return (STANDALONE_INBOX_SURFACES as readonly ChatSurface[]).includes(
    surface
  );
}

export function sessionMatchesInbox(
  session: ChatSurfaceSession | null,
  inbox: ChatSessionInbox
): boolean {
  const surface = chatSurfaceFromSession(session);
  if (!surface) {
    return false;
  }

  return inbox === "agent"
    ? surface === CHAT_SURFACE.agent
    : isStandaloneInboxSurface(surface);
}

export function isRelayChannelSource(
  source: string
): source is typeof CHAT_SURFACE.slack | typeof CHAT_SURFACE.discord {
  return source === CHAT_SURFACE.slack || source === CHAT_SURFACE.discord;
}

export function channelIdForInbox(inbox: "agent"): {
  source: typeof CHAT_SURFACE.agent;
};
export function channelIdForInbox(inbox: "standalone"): null;
export function channelIdForInbox(inbox: ChatSessionInbox): ChatSurfaceChannel;
export function channelIdForInbox(inbox: ChatSessionInbox): ChatSurfaceChannel {
  return inbox === "agent" ? { source: CHAT_SURFACE.agent } : null;
}
