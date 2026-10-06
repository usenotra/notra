import { getChatSession } from "@notra/ai/chat/history";
import { getChatMirrorChannelName } from "@notra/ai/chat/mirror";
import { CHAT_STREAM_MAX_LIFETIME_MS } from "@notra/ai/constants/chat";
import { realtime } from "@notra/ai/realtime";
import { chatIdSchema } from "@notra/ai/schemas/chat";

import { withOrganizationAuth } from "@/lib/auth/organization";
import { ratelimit } from "@/utils/ratelimit";

interface RouteContext {
  params: Promise<{ organizationId: string; chatId: string }>;
}

function toSseChunk(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { organizationId, chatId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const chatIdParse = chatIdSchema.safeParse(chatId);
  if (!chatIdParse.success) {
    return Response.json({ error: "Invalid chat ID" }, { status: 400 });
  }

  const safeChatId = chatIdParse.data;
  const { success: withinLimit, reset } = await ratelimit.chatStream.limit(
    `${organizationId}:${auth.context.user.id}`
  );
  if (!withinLimit) {
    return Response.json(
      { error: "Rate limit exceeded", reset },
      { status: 429 }
    );
  }

  const session = await getChatSession(organizationId, safeChatId);
  if (!session) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  if (session.externalChannelId?.source !== "slack") {
    return Response.json(
      { error: "Chat is not mirrored from Slack" },
      { status: 409 }
    );
  }

  if (!realtime) {
    return new Response("Realtime not configured", { status: 503 });
  }

  const channel = realtime.channel(
    getChatMirrorChannelName(organizationId, safeChatId)
  );

  let unsubscribe: (() => void) | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        unsubscribe?.();
        controller.close();
      };

      timeout = setTimeout(close, CHAT_STREAM_MAX_LIFETIME_MS);

      const emit = (data: unknown) => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(toSseChunk(data)));
      };

      try {
        const history = await channel.history();
        for (const item of history) {
          if (item.event === "mirror.message") {
            emit({ event: "message", data: item.data });
          }
        }

        unsubscribe = await channel.subscribe({
          events: ["mirror.message", "mirror.status"],
          onData: ({ event, data }) => {
            emit(
              event === "mirror.status"
                ? { event: "status", data }
                : { event: "message", data }
            );
          },
        });

        if (closed) {
          unsubscribe();
        }
      } catch (error) {
        closed = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        unsubscribe?.();
        throw error;
      }
    },
    cancel() {
      closed = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
