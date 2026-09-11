import { getChatSession } from "@notra/ai/chat/history";
import { chatIdSchema } from "@notra/ai/schemas/chat";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withOrganizationAuth } from "@/lib/auth/organization";
import type { RouteContext } from "@/types/api/routes";

import { GET as getChatHistory } from "../../../chat/[chatId]/route";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<{ organizationId: string; chatId: string }>
) {
  const { organizationId, chatId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const parsedChatId = chatIdSchema.safeParse(chatId);
  if (!parsedChatId.success) {
    return NextResponse.json(
      { error: "Invalid chat ID", details: parsedChatId.error.issues },
      { status: 400 }
    );
  }

  const session = await getChatSession(organizationId, parsedChatId.data);
  if (
    !session ||
    (session.externalChannelId && session.externalChannelId.source !== "agent")
  ) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return getChatHistory(request, { params });
}
