import { loadContentChatHistory } from "@notra/ai/chat/history";
import { chatIdSchema } from "@notra/ai/schemas/chat";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import { withOrganizationAuth } from "@/lib/auth/organization";
import type { RouteContext } from "@/types/api/routes";

export async function GET(
  request: Request,
  {
    params,
  }: RouteContext<{
    organizationId: string;
    contentId: string;
    chatId: string;
  }>
) {
  const { organizationId, contentId, chatId } = await params;
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

  const contentExists = await db.query.posts.findFirst({
    where: and(
      eq(posts.id, contentId),
      eq(posts.organizationId, organizationId)
    ),
    columns: { id: true },
  });
  if (!contentExists) {
    return Response.json({ error: "Content not found" }, { status: 404 });
  }

  const messages = await loadContentChatHistory(
    organizationId,
    contentId,
    chatIdParse.data
  );
  if (!messages) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  return Response.json({ chatId: chatIdParse.data, messages });
}
