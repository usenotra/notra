import { getChatSession } from "@notra/ai/chat/history";
import { chatIdSchema } from "@notra/ai/schemas/chat";
import { relaySlackApprovalSchema } from "@notra/schemas/dashboard/slack-relay";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withOrganizationAuth } from "@/lib/auth/organization";
import {
  parseSlackExternalChannelKey,
  postSlackApprovalInteraction,
} from "@/lib/slack/relay";
import { ratelimit } from "@/utils/ratelimit";

interface RouteContext {
  params: Promise<{ organizationId: string; chatId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { organizationId, chatId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const chatIdParse = chatIdSchema.safeParse(chatId);
  if (!chatIdParse.success) {
    return NextResponse.json({ error: "Invalid chat ID" }, { status: 400 });
  }

  const bodyParse = relaySlackApprovalSchema.safeParse(await request.json());
  if (!bodyParse.success) {
    return NextResponse.json(
      { error: "Invalid approval", details: bodyParse.error.issues },
      { status: 400 }
    );
  }

  const { success: withinLimit, reset } = await ratelimit.chatRelay.limit(
    `${organizationId}:${auth.context.user.id}`
  );
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Rate limit exceeded", reset },
      { status: 429 }
    );
  }

  const session = await getChatSession(organizationId, chatIdParse.data);
  if (!session) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const externalChannelId = session.externalChannelId;
  if (externalChannelId?.source !== "slack" || !externalChannelId.id) {
    return NextResponse.json(
      { error: "Chat is not mirrored from Slack" },
      { status: 409 }
    );
  }

  const target = parseSlackExternalChannelKey(externalChannelId.id);
  if (!target) {
    return NextResponse.json(
      { error: "Chat has an invalid Slack thread reference" },
      { status: 409 }
    );
  }

  const userName =
    auth.context.user.name?.trim() ||
    auth.context.user.email?.trim() ||
    "Teammate";
  const delivered = await postSlackApprovalInteraction({
    target,
    requestId: bodyParse.data.requestId,
    approved: bodyParse.data.approved,
    userName,
  });

  if (!delivered) {
    return NextResponse.json(
      { error: "Approval card was not found in the Slack thread" },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
