import {
  getChatSessionForInbox,
  loadChatHistory,
} from "@notra/ai/chat/history";
import { chatIdSchema } from "@notra/ai/schemas/chat";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withOrganizationAuth } from "@/lib/auth/organization";
import type { RouteContext } from "@/types/api/routes";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<{ organizationId: string; chatId: string }>
) {
  const { organizationId, chatId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const chatIdParse = chatIdSchema.safeParse(chatId);
  if (!chatIdParse.success) {
    return NextResponse.json(
      { error: "Invalid chat ID", details: chatIdParse.error.issues },
      { status: 400 }
    );
  }

  const session = await getChatSessionForInbox(
    organizationId,
    chatIdParse.data,
    "agent"
  );
  if (!session) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const messages = await loadChatHistory(organizationId, chatIdParse.data);
  return NextResponse.json({ chatId: chatIdParse.data, messages });
}
