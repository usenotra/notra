import {
  clearActiveChatStream,
  getActiveChatStream,
  getChatSession,
  getChatStreamChannelName,
  setChatAbortFlag,
  setLastResponseStopped,
} from "@notra/ai/chat/history";
import { realtime } from "@notra/ai/realtime";
import { chatIdSchema } from "@notra/ai/schemas/chat";
import { logError } from "@notra/ai/utils/server-log";
import { POSTHOG_EVENTS } from "@notra/posthog/events";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { ratelimit } from "@/utils/ratelimit";

interface RouteContext {
  params: Promise<{ organizationId: string; chatId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { organizationId, chatId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const chatIdParse = chatIdSchema.safeParse(chatId);
  if (!chatIdParse.success) {
    return Response.json(
      { error: "Invalid chat ID", details: chatIdParse.error.issues },
      { status: 400 }
    );
  }

  const rateLimitResult = await ratelimit.chatStop.limit(
    `${organizationId}:${auth.context.user.id}`
  );
  if (!rateLimitResult.success) {
    const retryAfter = Math.max(
      0,
      Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
    );
    return Response.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  const safeChatId = chatIdParse.data;
  const session = await getChatSession(organizationId, safeChatId);
  if (!session) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const [, activeStreamId] = await Promise.all([
    setLastResponseStopped(organizationId, safeChatId),
    getActiveChatStream(organizationId, safeChatId),
  ]);

  trackServerEvent({
    event: POSTHOG_EVENTS.CHAT_GENERATION_STOPPED,
    headers: request.headers,
    userId: auth.context.user.id,
    organizationId,
    properties: {
      chat_id: safeChatId,
      had_active_stream: Boolean(activeStreamId),
    },
  });

  if (!activeStreamId) {
    return Response.json({ ok: true, aborted: false });
  }

  await setChatAbortFlag(organizationId, safeChatId, activeStreamId);

  if (realtime) {
    const channel = realtime.channel(
      getChatStreamChannelName(organizationId, safeChatId, activeStreamId)
    );
    try {
      await channel.emit("ai.chunk", {
        type: "abort",
        reason: "user-stopped",
      });
      await channel.emit("ai.chunk", {
        type: "finish",
        finishReason: "stop",
      });
    } catch (error) {
      logError("[Chat Stop] Failed to emit abort chunk", error, {
        organizationId,
        chatId: safeChatId,
        streamId: activeStreamId,
      });
    }
  }

  await clearActiveChatStream(organizationId, safeChatId, activeStreamId);

  return Response.json({ ok: true, aborted: true });
}
