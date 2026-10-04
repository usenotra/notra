import { getChatSession } from "@notra/ai/chat/history";
import { chatIdSchema } from "@notra/ai/schemas/chat";

import { withOrganizationAuth } from "@/lib/auth/organization";
import { loadChatHistoryPayload } from "@/lib/chat/history";
import type { RouteContext } from "@/types/api/routes";

export async function GET(
  request: Request,
  { params }: RouteContext<{ organizationId: string; chatId: string }>
) {
  const { organizationId, chatId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const parsedChatId = chatIdSchema.safeParse(chatId);
  if (!parsedChatId.success) {
    return Response.json(
      { error: "Invalid chat ID", details: parsedChatId.error.issues },
      { status: 400 }
    );
  }

  const session = await getChatSession(organizationId, parsedChatId.data);
  if (
    !session ||
    (session.externalChannelId && session.externalChannelId.source !== "agent")
  ) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const history = await loadChatHistoryPayload(
    organizationId,
    parsedChatId.data
  );
  if (!history) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  return Response.json(history);
}
