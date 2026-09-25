import {
  getActiveChatStream,
  getChatSession,
  getChatStreamChannelName,
} from "@notra/ai/chat/history";
import { CHAT_STREAM_MAX_LIFETIME_MS } from "@notra/ai/constants/chat";
import { realtime } from "@notra/ai/realtime";
import { chatIdSchema } from "@notra/ai/schemas/chat";
import type { HistoryMessage } from "@upstash/realtime";
import type { UIMessageChunk } from "ai";
import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  CHAT_STREAM_CURSOR_HEADER,
  CHAT_STREAM_HISTORY_LIMIT,
  CHAT_STREAM_ID_HEADER,
} from "@/constants/chat-stream";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { chatStreamResumeSchema } from "@/schemas/chat-stream";
import { ratelimit } from "@/utils/ratelimit";

interface RouteContext {
  params: Promise<{ organizationId: string; chatId: string }>;
}

function toSseChunk(chunk: UIMessageChunk, cursor: string) {
  return `id: ${cursor}\ndata: ${JSON.stringify(chunk)}\n\n`;
}

// react-doctor-disable-next-line react-doctor/nextjs-no-side-effect-in-get-handler -- pending.delete only mutates this connection's replay buffer, not application state
export async function GET(request: NextRequest, { params }: RouteContext) {
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

  const safeChatId = chatIdParse.data;
  const resume = chatStreamResumeSchema.safeParse({
    streamId: request.headers.get(CHAT_STREAM_ID_HEADER),
    cursor: request.headers.get(CHAT_STREAM_CURSOR_HEADER),
  });
  if (!resume.success || (resume.data.cursor && !resume.data.streamId)) {
    return NextResponse.json(
      { error: "Invalid stream resume cursor" },
      { status: 400 }
    );
  }
  const { success: withinLimit, reset } = await ratelimit.chatStream.limit(
    `${organizationId}:${auth.context.user.id}`
  );
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Rate limit exceeded", reset },
      { status: 429 }
    );
  }

  const session = await getChatSession(organizationId, safeChatId);
  if (!session) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const activeStreamId = await getActiveChatStream(organizationId, safeChatId);
  // Reconnect to the same generation even after its lease has been released.
  // Its terminal chunk may be in history while a newer generation is active.
  const streamId = resume.data.streamId ?? activeStreamId;

  if (!streamId) {
    return new Response(null, { status: 204 });
  }

  if (!realtime) {
    return new Response("Realtime not configured", { status: 503 });
  }

  const channel = realtime.channel(
    getChatStreamChannelName(organizationId, safeChatId, streamId)
  );

  let unsubscribe: (() => void) | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let removeAbortListener: (() => void) | undefined;

  const toChunks = (data: unknown): UIMessageChunk[] =>
    Array.isArray(data) ? (data as UIMessageChunk[]) : [data as UIMessageChunk];

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
        removeAbortListener?.();
        controller.close();
      };

      // This is a connection deadline, not the end of generation. Leave the
      // active stream and history intact so the client can resume it.
      timeout = setTimeout(close, CHAT_STREAM_MAX_LIFETIME_MS);
      request.signal.addEventListener("abort", close, { once: true });
      removeAbortListener = () =>
        request.signal.removeEventListener("abort", close);
      if (request.signal.aborted) {
        close();
        return;
      }

      const emit = (chunk: UIMessageChunk, cursor: string) => {
        if (closed) {
          return true;
        }
        controller.enqueue(encoder.encode(toSseChunk(chunk, cursor)));
        return chunk.type === "finish" || chunk.type === "abort";
      };

      try {
        const pending = new Map<string, unknown>();
        const replayedIds = new Set<string>();
        let replaying = true;
        const emitData = (id: string, data: unknown, startIndex = 0) => {
          const chunks = toChunks(data);
          for (let index = startIndex; index < chunks.length; index += 1) {
            const chunk = chunks[index];
            if (chunk && emit(chunk, `${id}:${index}`)) {
              close();
              return;
            }
          }
        };

        // Subscribe first, then replay history and deduplicate the overlap by
        // Redis stream ID. A finish arriving during history() must not be lost.
        unsubscribe = await channel.subscribe({
          events: ["ai.chunk"],
          onData: (message) => {
            // realtime 1.0.3 validates and includes id at runtime, but omits it
            // from the subscribe callback's public type.
            const { id, data } = message as HistoryMessage;
            if (closed || replayedIds.has(id)) {
              return;
            }
            if (replaying) {
              pending.set(id, data);
            } else {
              emitData(id, data);
            }
          },
        });
        if (closed) {
          unsubscribe();
          return;
        }
        const [resumeId, resumeIndex] = resume.data.cursor?.split(":") ?? [];
        // Start at the cursor's timestamp instead of the oldest retained item.
        // A full page is ambiguous: fail rather than silently skip its tail.
        const history = await channel.history({
          start: resumeId ? Number(resumeId.split("-")[0]) : undefined,
          limit: CHAT_STREAM_HISTORY_LIMIT,
        });
        if (resumeId && history.length >= CHAT_STREAM_HISTORY_LIMIT) {
          throw new Error("Chat replay window is too large to resume safely");
        }
        const resumeItem = resumeId
          ? history.find((item) => item.id === resumeId)
          : undefined;
        if (
          resumeId &&
          (!resumeItem ||
            Number(resumeIndex) >= toChunks(resumeItem.data).length)
        ) {
          throw new Error("Chat replay cursor is no longer available");
        }
        let reachedCursor = !resumeId;

        for (const item of history) {
          if (item.event !== "ai.chunk") {
            continue;
          }
          pending.delete(item.id);
          replayedIds.add(item.id);
          if (item.id === resumeId) {
            reachedCursor = true;
            emitData(item.id, item.data, Number(resumeIndex) + 1);
          } else if (reachedCursor) {
            emitData(item.id, item.data);
          }
          if (closed) {
            return;
          }
        }

        replaying = false;
        for (const [id, data] of pending) {
          emitData(id, data);
        }
        pending.clear();
      } catch (error) {
        closed = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        unsubscribe?.();
        removeAbortListener?.();
        throw error;
      }
    },
    cancel() {
      closed = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      unsubscribe?.();
      removeAbortListener?.();
    },
  });

  return new Response(stream, {
    headers: {
      ...UI_MESSAGE_STREAM_HEADERS,
      [CHAT_STREAM_ID_HEADER]: streamId,
    },
  });
}
