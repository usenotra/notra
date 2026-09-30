import {
  CHAT_STREAM_CURSOR_HEADER,
  CHAT_STREAM_ID_HEADER,
  CHAT_STREAM_MAX_EMPTY_RECONNECTS,
} from "@/constants/chat-stream";

/** Keep one AI SDK stream open across bounded server connections. */
export async function fetchResumableChatStream(
  url: string,
  init?: RequestInit
) {
  const abortController = new AbortController();
  const abort = () => abortController.abort(init?.signal?.reason);
  init?.signal?.addEventListener("abort", abort, { once: true });
  if (init?.signal?.aborted) {
    abort();
  }
  const cleanup = () => {
    init?.signal?.removeEventListener("abort", abort);
    abortController.abort();
  };
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: abortController.signal });
  } catch (error) {
    cleanup();
    throw error;
  }
  if (!response.ok || !response.body) {
    init?.signal?.removeEventListener("abort", abort);
    return response;
  }

  const streamId = response.headers.get(CHAT_STREAM_ID_HEADER);
  if (!streamId) {
    cleanup();
    throw new Error(
      "Unable to resume this chat response. Reload the chat and try again."
    );
  }
  let reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let cursor: string | null = null;
  let emptyReconnects = 0;
  const encoder = new TextEncoder();

  const reconnect = async () => {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
    // Discard any incomplete frame. The server will replay it after cursor.
    buffer = "";
    const headers = new Headers(init?.headers);
    headers.set(CHAT_STREAM_ID_HEADER, streamId);
    if (cursor) {
      headers.set(CHAT_STREAM_CURSOR_HEADER, cursor);
    }
    while (true) {
      abortController.signal.throwIfAborted();
      emptyReconnects += 1;
      if (emptyReconnects > CHAT_STREAM_MAX_EMPTY_RECONNECTS) {
        throw new Error(
          "The chat connection was interrupted. Reload the chat to resume."
        );
      }
      let next: Response;
      try {
        next = await fetch(url, {
          ...init,
          headers,
          signal: abortController.signal,
        });
      } catch {
        continue;
      }
      if (
        !next.ok ||
        !next.body ||
        next.headers.get(CHAT_STREAM_ID_HEADER) !== streamId
      ) {
        await next.body?.cancel();
        throw new Error(
          "Unable to resume the chat response. Reload the chat and try again."
        );
      }
      reader = next.body.pipeThrough(new TextDecoderStream()).getReader();
      return;
    }
  };

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          abortController.signal.throwIfAborted();
          // Our SSE endpoint emits LF-delimited frames, one cursor per chunk.
          const end = buffer.indexOf("\n\n");
          if (end >= 0) {
            const frame = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const lines = frame.split("\n");
            const data = lines
              .find((line) => line.startsWith("data: "))
              ?.slice(6);
            if (!data) {
              continue;
            }
            const id = lines.find((line) => line.startsWith("id: "))?.slice(4);
            if (!id) {
              throw new Error("Chat response is missing its resume cursor.");
            }
            const chunk = JSON.parse(data);
            cursor = id;
            emptyReconnects = 0;
            controller.enqueue(encoder.encode(`${frame}\n\n`));
            if (chunk.type === "finish" || chunk.type === "abort") {
              cleanup();
              // react-doctor-disable-next-line react-doctor/async-await-in-loop -- close the current SSE reader before completing this sequential stream
              await reader.cancel().catch(() => undefined);
              reader.releaseLock();
              controller.close();
            }
            return;
          }
          let result: ReadableStreamReadResult<string>;
          try {
            result = await reader.read();
          } catch {
            await reconnect();
            continue;
          }
          if (result.done) {
            await reconnect();
          } else {
            buffer += result.value;
          }
        }
      } catch (error) {
        cleanup();
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
        controller.error(error);
      }
    },
    async cancel() {
      cleanup();
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    },
  });
  return new Response(body, {
    status: response.status,
    headers: response.headers,
  });
}
