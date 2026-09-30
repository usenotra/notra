import { assertOrganizationAccess } from "@/lib/auth/organization";
import type { User } from "@/types/auth/organization";
import type { ParsedChatChannel } from "@/types/realtime/channel";

const CHAT_CHANNEL_PREFIX = "chat";
const CHAT_CHANNEL_SEGMENT_COUNT = 4;
const FORBIDDEN_CHANNEL_CHARS = /[*?\s]/;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseChatChannel(channel: string): ParsedChatChannel | null {
  if (!channel || FORBIDDEN_CHANNEL_CHARS.test(channel)) {
    return null;
  }

  const parts = channel.split(":");
  if (parts.length !== CHAT_CHANNEL_SEGMENT_COUNT) {
    return null;
  }

  const [prefix, organizationId, chatId, streamId] = parts;
  if (prefix !== CHAT_CHANNEL_PREFIX) {
    return null;
  }
  if (!(organizationId && chatId && streamId)) {
    return null;
  }

  return { organizationId, chatId, streamId };
}

export async function authorizeRealtimeChannels({
  headers,
  channels,
  user,
}: {
  headers: Headers;
  channels: string[];
  user: User;
}): Promise<Response | undefined> {
  if (channels.length === 0) {
    return jsonResponse(400, { error: "No channels requested" });
  }

  const authorizedOrganizationIds = new Set<string>();

  for (const channel of channels) {
    const discussion =
      /^discussion:([^:*?\s]+):(feedback|shelf):([^:*?\s]+)$/.exec(channel);
    let parsed = parseChatChannel(channel);
    if (discussion?.[1] && discussion[2] && discussion[3]) {
      try {
        parsed = {
          organizationId: decodeURIComponent(discussion[1]),
          chatId: discussion[3],
          streamId: discussion[2],
        };
      } catch {
        return jsonResponse(403, { error: "Forbidden channel" });
      }
    }
    if (!parsed) {
      return jsonResponse(403, { error: "Forbidden channel" });
    }

    if (authorizedOrganizationIds.has(parsed.organizationId)) {
      continue;
    }

    try {
      await assertOrganizationAccess({
        headers,
        organizationId: parsed.organizationId,
        user,
      });
    } catch {
      return jsonResponse(403, { error: "Forbidden channel" });
    }

    authorizedOrganizationIds.add(parsed.organizationId);
  }

  return undefined;
}
