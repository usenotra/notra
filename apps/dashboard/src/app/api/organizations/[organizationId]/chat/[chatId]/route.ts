import {
  deleteChatSession,
  getActiveChatStream,
  getChatSession,
  getLastResponseStopped,
  isChatDeleted,
  loadChatHistory,
  renameChatSession,
  setChatSessionPinned,
} from "@notra/ai/chat/history";
import { hydrateSavedChatPosts } from "@notra/ai/chat/posts";
import { updateChatSessionSchema } from "@notra/ai/schemas/chat";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withOrganizationAuth } from "@/lib/auth/organization";
import {
  getSlackThreadPermalink,
  parseSlackExternalChannelKey,
} from "@/lib/slack/relay";

interface RouteContext {
  params: Promise<{ organizationId: string; chatId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { organizationId, chatId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  if (await isChatDeleted(organizationId, chatId)) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const [messages, lastResponseStopped, activeStreamId, chatSession] =
    await Promise.all([
      loadChatHistory(organizationId, chatId),
      getLastResponseStopped(organizationId, chatId),
      getActiveChatStream(organizationId, chatId),
      getChatSession(organizationId, chatId),
    ]);
  const externalChannelId = chatSession?.externalChannelId ?? null;
  let slackThreadUrl: string | null = null;
  if (externalChannelId?.source === "slack" && externalChannelId.id) {
    const target = parseSlackExternalChannelKey(externalChannelId.id);
    if (target) {
      slackThreadUrl = await getSlackThreadPermalink(target);
    }
  }

  return NextResponse.json({
    chatId,
    messages: await hydrateSavedChatPosts(organizationId, chatId, messages),
    lastResponseStopped,
    activeStreamId,
    externalChannelId,
    slackThreadUrl,
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { organizationId, chatId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const body = await request.json();
  const parseResult = updateChatSessionSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parseResult.error.issues },
      { status: 400 }
    );
  }

  const session =
    parseResult.data.title !== undefined
      ? await renameChatSession(organizationId, chatId, parseResult.data.title)
      : await setChatSessionPinned(
          organizationId,
          chatId,
          parseResult.data.pinned ?? false
        );

  if (!session) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { organizationId, chatId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const deleted = await deleteChatSession(organizationId, chatId);

  if (!deleted) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
