import {
  appendChatMessageIfMissing,
  getChatSession,
} from "@notra/ai/chat/history";
import { publishChatMirrorMessage } from "@notra/ai/chat/mirror";
import { chatIdSchema, relayChatMessageSchema } from "@notra/ai/schemas/chat";
import type { UIMessage } from "ai";

import { withOrganizationAuth } from "@/lib/auth/organization";
import {
  parseSlackExternalChannelKey,
  postSlackRelayMessage,
} from "@/lib/slack/relay";
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
    return Response.json({ error: "Invalid chat ID" }, { status: 400 });
  }

  const bodyParse = relayChatMessageSchema.safeParse(await request.json());
  if (!bodyParse.success) {
    return Response.json(
      { error: "Invalid message", details: bodyParse.error.issues },
      { status: 400 }
    );
  }

  const { success: withinLimit, reset } = await ratelimit.chatRelay.limit(
    `${organizationId}:${auth.context.user.id}`
  );
  if (!withinLimit) {
    return Response.json(
      { error: "Rate limit exceeded", reset },
      { status: 429 }
    );
  }

  const session = await getChatSession(organizationId, chatIdParse.data);
  if (!session) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const externalChannelId = session.externalChannelId;
  if (externalChannelId?.source !== "slack" || !externalChannelId.id) {
    return Response.json(
      { error: "Chat is not mirrored from Slack" },
      { status: 409 }
    );
  }

  const target = parseSlackExternalChannelKey(externalChannelId.id);
  if (!target) {
    return Response.json(
      { error: "Chat has an invalid Slack thread reference" },
      { status: 409 }
    );
  }

  const userName =
    auth.context.user.name?.trim() ||
    auth.context.user.email?.trim() ||
    "Teammate";
  const { ts } = await postSlackRelayMessage({
    target,
    text: bodyParse.data.text,
    userName,
    chatId: chatIdParse.data,
    organizationId,
  });

  const message: UIMessage = {
    id: `slack:${target.channelId}:${ts}`,
    role: "user",
    parts: [{ type: "text", text: bodyParse.data.text }],
  };
  await appendChatMessageIfMissing(organizationId, chatIdParse.data, message);
  await publishChatMirrorMessage(organizationId, chatIdParse.data, message);

  return Response.json({ message });
}
